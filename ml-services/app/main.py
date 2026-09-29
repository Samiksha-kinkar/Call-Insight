from pathlib import Path
from tempfile import NamedTemporaryFile

from fastapi import FastAPI, UploadFile, File, HTTPException
from pydantic import BaseModel

from app.models.schemas import CallAnalysis
from app.services.whisper_service import whisper_service
from app.services.call_processor import call_processor
from app.services.llm_service import llm_service
from app.database.mongodb import calls_collection

from fastapi.middleware.cors import CORSMiddleware

from app.rag.rag_service import rag_service

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:5174",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:5174",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)




# ==================================================
# HEALTH CHECK
# ==================================================

@app.get("/health")
def health_check():
    return {
        "status": "ok",
        "service": "callinsight-ai",
    }


# ==================================================
# TRANSCRIPTION
# ==================================================

@app.post("/transcribe")
async def transcribe_audio(
    file: UploadFile = File(...)
):
    if not file.filename:
        raise HTTPException(
            status_code=400,
            detail="No filename provided",
        )

    suffix = Path(file.filename).suffix
    temp_path = None

    try:
        with NamedTemporaryFile(
            delete=False,
            suffix=suffix,
        ) as temp_file:

            contents = await file.read()
            temp_file.write(contents)
            temp_path = temp_file.name

        result = whisper_service.transcribe(temp_path)

        transcript = result["text"]

        transcript_dir = (
            Path(__file__).resolve().parents[2]
            / "data"
            / "transcripts"
        )

        transcript_dir.mkdir(
            parents=True,
            exist_ok=True,
        )

        transcript_filename = (
            Path(file.filename).stem + ".txt"
        )

        transcript_path = (
            transcript_dir / transcript_filename
        )

        transcript_path.write_text(
            transcript,
            encoding="utf-8",
        )

        return {
            "filename": file.filename,
            "transcript": transcript,
            "language": result["language"],
            "transcript_file": str(transcript_path),
        }

    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Transcription failed: {str(exc)}",
        )

    finally:
        if temp_path:
            Path(temp_path).unlink(
                missing_ok=True
            )


# ==================================================
# FULL CALL PROCESSING
# ==================================================

@app.post("/calls/process")
async def process_call(
    file: UploadFile = File(...)
):
    if not file.filename:
        raise HTTPException(
            status_code=400,
            detail="No filename provided",
        )

    suffix = Path(file.filename).suffix
    temp_path = None

    try:
        with NamedTemporaryFile(
            delete=False,
            suffix=suffix,
        ) as temp_file:

            contents = await file.read()
            temp_file.write(contents)
            temp_path = temp_file.name

        call = call_processor.process(
            audio_path=temp_path,
            filename=file.filename,
        )

        return call

    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Call processing failed: {str(exc)}",
        )

    finally:
        if temp_path:
            Path(temp_path).unlink(
                missing_ok=True
            )


# ==================================================
# ANALYZE TRANSCRIPT
# ==================================================

class AnalyzeRequest(BaseModel):
    transcript: str


@app.post(
    "/analyze",
    response_model=CallAnalysis,
)
async def analyze_transcript(
    request: AnalyzeRequest,
):
    if not request.transcript.strip():
        raise HTTPException(
            status_code=400,
            detail="Transcript cannot be empty",
        )

    try:
        analysis = llm_service.analyze_call(
            request.transcript
        )

        return analysis

    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Analysis failed: {str(exc)}",
        )


# ==================================================
# DASHBOARD SUMMARY
# ==================================================

@app.get("/api/dashboard/summary")
async def dashboard_summary():

    total_calls = calls_collection.count_documents({})

    positive_calls = calls_collection.count_documents({
        "analysis.sentiment.label": "positive"
    })

    negative_calls = calls_collection.count_documents({
        "analysis.sentiment.label": "negative"
    })

    neutral_calls = calls_collection.count_documents({
        "analysis.sentiment.label": "neutral"
    })

    resolved_calls = calls_collection.count_documents({
        "analysis.resolution.resolved": True
    })

    unresolved_calls = calls_collection.count_documents({
        "analysis.resolution.resolved": False
    })

    duration_pipeline = [
        {
            "$match": {
                "duration_seconds": {
                    "$ne": None
                }
            }
        },
        {
            "$group": {
                "_id": None,
                "average_duration": {
                    "$avg": "$duration_seconds"
                }
            }
        },
    ]

    duration_result = list(
        calls_collection.aggregate(
            duration_pipeline
        )
    )

    average_duration = (
        duration_result[0]["average_duration"]
        if duration_result
        else 0
    )

    def percentage(count):
        if total_calls == 0:
            return 0

        return round(
            (count / total_calls) * 100,
            2,
        )

    return {
        "total_calls": total_calls,
        "positive_sentiment": percentage(
            positive_calls
        ),
        "negative_sentiment": percentage(
            negative_calls
        ),
        "neutral_sentiment": percentage(
            neutral_calls
        ),
        "average_call_duration": round(
            average_duration,
            2,
        ),
        "resolved_calls": resolved_calls,
        "unresolved_calls": unresolved_calls,
    }


# ==================================================
# RECENT CALLS
# ==================================================

@app.get("/api/dashboard/recent-calls")
async def recent_calls(limit: int = 10):

    calls = (
        calls_collection
        .find(
            {},
            {
                "_id": 0,
                "call_id": 1,
                "filename": 1,
                "language": 1,
                "duration_seconds": 1,
                "timestamp": 1,
                "analysis.sentiment": 1,
                "analysis.topic": 1,
                "analysis.resolution": 1,
                "analysis.summary": 1,
            },
        )
        .sort(
            "timestamp",
            -1,
        )
        .limit(limit)
    )

    return list(calls)


# ==================================================
# SENTIMENT DISTRIBUTION
# ==================================================

@app.get("/api/dashboard/sentiment")
async def sentiment_distribution():

    pipeline = [
        {
            "$group": {
                "_id": "$analysis.sentiment.label",
                "count": {"$sum": 1},
            }
        }
    ]

    results = list(
        calls_collection.aggregate(
            pipeline
        )
    )

    total_calls = sum(
        result["count"]
        for result in results
    )

    distribution = []

    for result in results:

        count = result["count"]

        percentage = (
            round(
                (count / total_calls) * 100,
                2,
            )
            if total_calls > 0
            else 0
        )

        distribution.append({
            "sentiment": result["_id"],
            "count": count,
            "percentage": percentage,
        })

    return distribution


# ==================================================
# CALLS OVER TIME
# ==================================================

@app.get("/api/dashboard/calls-over-time")
async def calls_over_time():

    pipeline = [
        {
            "$group": {
                "_id": {
                    "$dateToString": {
                        "format": "%Y-%m-%d",
                        "date": "$timestamp",
                    }
                },
                "count": {"$sum": 1},
            }
        },
        {
            "$sort": {
                "_id": 1,
            }
        },
    ]

    results = list(
        calls_collection.aggregate(
            pipeline
        )
    )

    return [
        {
            "date": result["_id"],
            "calls": result["count"],
        }
        for result in results
    ]


# ==================================================
# COMPLAINT CATEGORIES
# ==================================================

@app.get("/api/dashboard/complaints")
async def complaint_categories():

    pipeline = [
        {
            "$match": {
                "analysis.complaint": {
                    "$nin": [None, ""],
                }
            }
        },
        {
            "$group": {
                "_id": "$analysis.complaint",
                "count": {"$sum": 1},
            }
        },
        {
            "$sort": {
                "count": -1,
            }
        },
    ]

    results = list(
        calls_collection.aggregate(
            pipeline
        )
    )

    return [
        {
            "category": result["_id"],
            "count": result["count"],
        }
        for result in results
    ]


# ==================================================
# TOPICS
# ==================================================

@app.get("/api/dashboard/topics")
async def topic_distribution():

    pipeline = [
        {
            "$match": {
                "analysis.topic.category": {
                    "$nin": [None, ""],
                }
            }
        },
        {
            "$group": {
                "_id": "$analysis.topic.category",
                "count": {"$sum": 1},
            }
        },
        {
            "$sort": {
                "count": -1,
            }
        },
    ]

    results = list(
        calls_collection.aggregate(
            pipeline
        )
    )

    return [
        {
            "topic": result["_id"],
            "count": result["count"],
        }
        for result in results
    ]


# ==================================================
# ISSUE TRENDS
# ==================================================

@app.get("/api/dashboard/issue-trends")
async def issue_trends():

    pipeline = [
        {
            "$match": {
                "analysis.topic.category": {
                    "$nin": [None, ""],
                }
            }
        },
        {
            "$group": {
                "_id": {
                    "date": {
                        "$dateToString": {
                            "format": "%Y-%m-%d",
                            "date": "$timestamp",
                        }
                    },
                    "topic": "$analysis.topic.category",
                },
                "count": {"$sum": 1},
            }
        },
        {
            "$sort": {
                "_id.date": 1,
            }
        },
    ]

    results = list(
        calls_collection.aggregate(
            pipeline
        )
    )

    return [
        {
            "date": result["_id"]["date"],
            "topic": result["_id"]["topic"],
            "count": result["count"],
        }
        for result in results
    ]


# ==================================================
# TOP KEYWORDS
# ==================================================

@app.get("/api/dashboard/keywords")
async def top_keywords():

    pipeline = [
        {
            "$unwind": "$analysis.keywords"
        },
        {
            "$group": {
                "_id": "$analysis.keywords",
                "count": {"$sum": 1},
            }
        },
        {
            "$sort": {
                "count": -1,
            }
        },
        {
            "$limit": 20
        },
    ]

    results = list(
        calls_collection.aggregate(
            pipeline
        )
    )

    return [
        {
            "keyword": result["_id"],
            "count": result["count"],
        }
        for result in results
    ]


# ==================================================
# INDIVIDUAL CALL DETAILS
# ==================================================

@app.get("/api/calls/{call_id}")
async def get_call_details(call_id: str):

    call = calls_collection.find_one(
        {
            "call_id": call_id
        },
        {
            "_id": 0
        },
    )

    if not call:
        raise HTTPException(
            status_code=404,
            detail="Call not found",
        )

    return call

@app.get("/api/dashboard")
def get_dashboard():
    pipeline = [
        {
            "$set": {
                "timestamp_date": {
                    "$convert": {
                        "input": "$timestamp",
                        "to": "date",
                        "onError": None,
                        "onNull": None
                    }
                }
            }
        },
        {
            "$facet": {
                # ------------------------------------------
                # SUMMARY
                # ------------------------------------------
                "summary": [
                    {
                        "$group": {
                            "_id": None,
                            "total_calls": {"$sum": 1},

                            "positive_calls": {
                                "$sum": {
                                    "$cond": [
                                        {
                                            "$eq": [
                                                "$analysis.sentiment.label",
                                                "positive"
                                            ]
                                        },
                                        1,
                                        0
                                    ]
                                }
                            },

                            "negative_calls": {
                                "$sum": {
                                    "$cond": [
                                        {
                                            "$eq": [
                                                "$analysis.sentiment.label",
                                                "negative"
                                            ]
                                        },
                                        1,
                                        0
                                    ]
                                }
                            },

                            "neutral_calls": {
                                "$sum": {
                                    "$cond": [
                                        {
                                            "$eq": [
                                                "$analysis.sentiment.label",
                                                "neutral"
                                            ]
                                        },
                                        1,
                                        0
                                    ]
                                }
                            },

                            "resolved_calls": {
                                "$sum": {
                                    "$cond": [
                                        {
                                            "$eq": [
                                                "$analysis.resolution.resolved",
                                                True
                                            ]
                                        },
                                        1,
                                        0
                                    ]
                                }
                            },

                            "unresolved_calls": {
                                "$sum": {
                                    "$cond": [
                                        {
                                            "$eq": [
                                                "$analysis.resolution.resolved",
                                                False
                                            ]
                                        },
                                        1,
                                        0
                                    ]
                                }
                            },

                            "average_call_duration": {
                                "$avg": "$duration_seconds"
                            }
                        }
                    }
                ],

                # ------------------------------------------
                # RECENT CALLS
                # ------------------------------------------
                "recent_calls": [
                    {"$sort": {"timestamp": -1}},
                    {"$limit": 10},
                    {
                        "$project": {
                            "_id": 0,
                            "call_id": 1,
                            "filename": 1,
                            "language": 1,
                            "duration_seconds": 1,
                            "timestamp": 1,
                            "analysis.sentiment": 1,
                            "analysis.topic": 1,
                            "analysis.resolution": 1,
                            "analysis.summary": 1
                        }
                    }
                ],

                # ------------------------------------------
                # SENTIMENT
                # ------------------------------------------
                "sentiment": [
                    {
                        "$group": {
                            "_id": "$analysis.sentiment.label",
                            "count": {"$sum": 1}
                        }
                    },
                    {
                        "$sort": {"count": -1}
                    }
                ],

                # ------------------------------------------
                # CALLS OVER TIME
                # ------------------------------------------
                "calls_over_time": [
                    {
                        "$match": {
                            "timestamp_date": {"$ne": None}
                        }
                    },
                    {
                        "$group": {
                            "_id": {
                                "$dateToString": {
                                    "format": "%Y-%m-%d",
                                    "date": "$timestamp_date"
                                }
                            },
                            "calls": {"$sum": 1}
                        }
                    },
                    {
                        "$sort": {"_id": 1}
                    }
                ],

                # ------------------------------------------
                # COMPLAINT CATEGORIES
                # ------------------------------------------
                "complaints": [
                    {
                        "$group": {
                            "_id": "$analysis.complaint",
                            "count": {"$sum": 1}
                        }
                    },
                    {
                        "$sort": {"count": -1}
                    },
                    {
                        "$limit": 10
                    }
                ],

                # ------------------------------------------
                # TOPICS
                # ------------------------------------------
                "topics": [
                    {
                        "$group": {
                            "_id": "$analysis.topic.category",
                            "count": {"$sum": 1}
                        }
                    },
                    {
                        "$sort": {"count": -1}
                    }
                ],

                # ------------------------------------------
                # ISSUE TRENDS
                # ------------------------------------------
                "issue_trends": [
                    {
                        "$match": {
                            "timestamp_date": {"$ne": None}
                        }
                    },
                    {
                        "$group": {
                            "_id": {
                                "date": {
                                    "$dateToString": {
                                        "format": "%Y-%m-%d",
                                        "date": "$timestamp_date"
                                    }
                                },
                                "topic": "$analysis.topic.category"
                            },
                            "count": {"$sum": 1}
                        }
                    },
                    {
                        "$sort": {"_id.date": 1}
                    }
                ],

                # ------------------------------------------
                # KEYWORDS
                # ------------------------------------------
                "keywords": [
                    {"$unwind": "$analysis.keywords"},
                    {
                        "$group": {
                            "_id": "$analysis.keywords",
                            "count": {"$sum": 1}
                        }
                    },
                    {
                        "$sort": {"count": -1}
                    },
                    {
                        "$limit": 20
                    }
                ]
            }
        }
    ]

    result = list(calls_collection.aggregate(pipeline))[0]

    # ------------------------------------------
    # SUMMARY
    # ------------------------------------------

    summary = result["summary"][0] if result["summary"] else {
        "total_calls": 0,
        "positive_calls": 0,
        "negative_calls": 0,
        "neutral_calls": 0,
        "resolved_calls": 0,
        "unresolved_calls": 0,
        "average_call_duration": 0
    }

    total_calls = summary["total_calls"]

    def percentage(count):
        if total_calls == 0:
            return 0

        return round((count / total_calls) * 100, 1)

    summary_data = {
        "total_calls": total_calls,
        "positive_sentiment": percentage(
            summary["positive_calls"]
        ),
        "negative_sentiment": percentage(
            summary["negative_calls"]
        ),
        "neutral_sentiment": percentage(
            summary["neutral_calls"]
        ),
        "average_call_duration": round(
            summary["average_call_duration"] or 0,
            2
        ),
        "resolved_calls": summary["resolved_calls"],
        "unresolved_calls": summary["unresolved_calls"]
    }

    # ------------------------------------------
    # FORMAT SENTIMENT
    # ------------------------------------------

    sentiment_data = [
        {
            "sentiment": item["_id"],
            "count": item["count"],
            "percentage": percentage(item["count"])
        }
        for item in result["sentiment"]
        if item["_id"]
    ]

    # ------------------------------------------
    # FORMAT CALLS OVER TIME
    # ------------------------------------------

    calls_over_time = [
        {
            "date": item["_id"],
            "calls": item["calls"]
        }
        for item in result["calls_over_time"]
    ]

    # ------------------------------------------
    # FORMAT COMPLAINTS
    # ------------------------------------------

    complaints = [
        {
            "category": item["_id"],
            "count": item["count"]
        }
        for item in result["complaints"]
        if item["_id"]
    ]

    # ------------------------------------------
    # FORMAT TOPICS
    # ------------------------------------------

    topics = [
        {
            "topic": item["_id"],
            "count": item["count"]
        }
        for item in result["topics"]
        if item["_id"]
    ]

    # ------------------------------------------
    # FORMAT ISSUE TRENDS
    # ------------------------------------------

    issue_trends = [
        {
            "date": item["_id"]["date"],
            "topic": item["_id"]["topic"],
            "count": item["count"]
        }
        for item in result["issue_trends"]
        if item["_id"]["topic"]
    ]

    # ------------------------------------------
    # FORMAT KEYWORDS
    # ------------------------------------------

    keywords = [
        {
            "keyword": item["_id"],
            "count": item["count"]
        }
        for item in result["keywords"]
        if item["_id"]
    ]

    return {
        "summary": summary_data,
        "recent_calls": result["recent_calls"],
        "sentiment": sentiment_data,
        "calls_over_time": calls_over_time,
        "complaints": complaints,
        "topics": topics,
        "issue_trends": issue_trends,
        "keywords": keywords
    }
    
class RAGHistoryMessage(BaseModel):
    role: str
    content: str


class RAGQueryRequest(BaseModel):
    question: str
    top_k: int = 8
    history: list[RAGHistoryMessage] = []
    
@app.post("/api/rag/query")
def rag_query(request: RAGQueryRequest):
    if not request.question.strip():
        raise HTTPException(status_code=400, detail="Question cannot be empty.")

    try:
        result = rag_service.answer_question(
            question=request.question,
            top_k=request.top_k,
            history=[
                {
                    "role": message.role,
                    "content": message.content,
                }
                for message in request.history[-8:]
            ],
        )
        return result

    except Exception as e:
        import traceback

        print("\n========== RAG ERROR ==========")
        print(f"Error: {e}")
        traceback.print_exc()
        print("================================\n")

        raise HTTPException(
            status_code=500,
            detail=str(e),
        )