from typing import Any

from app.rag.vector_store import VectorStore
from app.services.llm_service import llm_service
from app.database.mongodb import calls_collection


class RAGService:

    def __init__(self):
        self.vector_store = VectorStore()

    # =========================================================
    # QUESTION ROUTING
    # =========================================================

    def _question_type(self, question: str) -> str:
        """
        Route the question before retrieving anything.

        structured -> MongoDB only
        semantic   -> ChromaDB only
        hybrid     -> MongoDB + ChromaDB
        """

        q = question.lower().strip()

        structured_terms = (
            "how many",
            "how much",
            "what percentage",
            "percentage",
            "percent",
            "count",
            "number of",
            "total",
            "most common",
            "common complaints",
            "common topics",
            "resolved",
            "unresolved",
            "resolution",
            "sentiment",
            "neutral",
            "positive",
            "negative",
            "complaints",
            "topics",
            "calls",
        )

        semantic_terms = (
            "why",
            "reason",
            "reasons",
            "what did",
            "said",
            "tell me about",
            "explain",
            "describe",
            "how did",
            "customer feel",
            "customer was frustrated",
            "frustrated",
            "angry",
            "cancel",
            "cancellation",
        )

        has_structured = any(term in q for term in structured_terms)
        has_semantic = any(term in q for term in semantic_terms)

        if has_structured and has_semantic:
            return "hybrid"

        if has_structured:
            return "structured"

        return "semantic"

    # =========================================================
    # MONGODB RETRIEVAL
    # =========================================================

    def _get_mongodb_context(self) -> tuple[str, dict[str, Any]]:
        """
        Retrieve only compact, aggregated facts from MongoDB.

        We deliberately do NOT send complete call documents to Ollama.
        """

        total_calls = calls_collection.count_documents({})

        resolved_calls = calls_collection.count_documents({
            "analysis.resolution.resolved": True
        })

        unresolved_calls = calls_collection.count_documents({
            "analysis.resolution.resolved": False
        })

        sentiment_pipeline = [
            {
                "$match": {
                    "analysis.sentiment.label": {
                        "$in": ["positive", "neutral", "negative"]
                    }
                }
            },
            {
                "$group": {
                    "_id": "$analysis.sentiment.label",
                    "count": {"$sum": 1},
                }
            },
            {"$sort": {"count": -1}},
        ]

        sentiment_results = list(
            calls_collection.aggregate(sentiment_pipeline)
        )

        complaint_pipeline = [
            {
                "$match": {
                    "analysis.complaint": {
                        "$nin": [None, ""]
                    }
                }
            },
            {
                "$group": {
                    "_id": "$analysis.complaint",
                    "count": {"$sum": 1},
                }
            },
            {"$sort": {"count": -1}},
            {"$limit": 10},
        ]

        complaint_results = list(
            calls_collection.aggregate(complaint_pipeline)
        )

        topic_pipeline = [
            {
                "$match": {
                    "analysis.topic.category": {
                        "$nin": [None, ""]
                    }
                }
            },
            {
                "$group": {
                    "_id": "$analysis.topic.category",
                    "count": {"$sum": 1},
                }
            },
            {"$sort": {"count": -1}},
            {"$limit": 10},
        ]

        topic_results = list(
            calls_collection.aggregate(topic_pipeline)
        )

        structured_data = {
            "total_calls": total_calls,
            "resolved_calls": resolved_calls,
            "unresolved_calls": unresolved_calls,
            "sentiment": {
                item["_id"]: item["count"]
                for item in sentiment_results
            },
            "top_complaints": [
                {
                    "complaint": item["_id"],
                    "count": item["count"],
                }
                for item in complaint_results
            ],
            "top_topics": [
                {
                    "topic": item["_id"],
                    "count": item["count"],
                }
                for item in topic_results
            ],
        }

        context = (
            f"Total calls: {total_calls}\n"
            f"Resolved calls: {resolved_calls}\n"
            f"Unresolved calls: {unresolved_calls}\n"
            f"Sentiment counts: {structured_data['sentiment']}\n"
            f"Top complaints: {structured_data['top_complaints']}\n"
            f"Top topics: {structured_data['top_topics']}"
        )

        return context, structured_data

    # =========================================================
    # CHROMA RETRIEVAL
    # =========================================================

    def _get_transcript_context(
        self,
        question: str,
        top_k: int,
    ) -> tuple[str, list[dict[str, Any]]]:

        results = self.vector_store.search(
            query=question,
            n_results=top_k,
        )

        documents = results.get("documents", [[]])[0]
        metadatas = results.get("metadatas", [[]])[0]
        distances = results.get("distances", [[]])[0]

        if not documents:
            return "", []

        context_parts = []
        sources = []

        for index, document in enumerate(documents):
            context_parts.append(
                f"Transcript source {index + 1}:\n{document}"
            )

            metadata = (
                metadatas[index]
                if index < len(metadatas)
                else {}
            )

            sources.append(
            {
                "call_id": metadata.get("call_id"),
                "chunk_id": metadata.get("chunk_id"),
                "distance": (
                    distances[index]
                    if index < len(distances)
                    else None
                ),
                "document": document,
            }
        )

        return "\n\n".join(context_parts), sources

    # =========================================================
    # DIRECT STRUCTURED ANSWERS
    # =========================================================

    def _direct_structured_answer(
        self,
        question: str,
        data: dict[str, Any],
    ) -> str | None:
        """
        Answer common aggregate questions without invoking Ollama.

        This makes simple dashboard-style questions effectively
        instantaneous and prevents unnecessary LLM work.
        """

        q = question.lower()

        total = data["total_calls"]
        resolved = data["resolved_calls"]
        unresolved = data["unresolved_calls"]

        if "are most calls resolved" in q or "most calls resolved" in q:
            if total == 0:
                return "There are no analyzed calls available yet."

            if resolved > total / 2:
                return (
                    f"Yes. {resolved} out of {total} calls were resolved, "
                    f"so resolved calls make up the majority."
                )

            return (
                f"No. {resolved} out of {total} calls were resolved, "
                f"while {unresolved} remained unresolved."
            )

        if "are most calls unresolved" in q or "most calls unresolved" in q:
            if total == 0:
                return "There are no analyzed calls available yet."

            if unresolved > total / 2:
                return (
                    f"Yes. {unresolved} out of {total} calls were unresolved, "
                    f"so unresolved calls make up the majority."
                )

            return (
                f"No. {unresolved} out of {total} calls were unresolved, "
                f"while {resolved} were resolved."
            )

        if "how many calls" in q and "resolved" in q:
            return f"{resolved} out of {total} analyzed calls were resolved."

        if "how many calls" in q and "unresolved" in q:
            return f"{unresolved} out of {total} analyzed calls were unresolved."

        if "how many" in q and "total calls" in q:
            return f"There are {total} analyzed calls."

        if "most common complaints" in q or "common complaints" in q:
            complaints = data["top_complaints"]

            if not complaints:
                return "No complaint data is available in the analyzed calls."

            items = [
                f"{item['complaint']} ({item['count']})"
                for item in complaints[:5]
            ]

            return "The most common complaints are: " + ", ".join(items) + "."

        if "most common topics" in q or "common topics" in q:
            topics = data["top_topics"]

            if not topics:
                return "No topic data is available in the analyzed calls."

            items = [
                f"{item['topic']} ({item['count']})"
                for item in topics[:5]
            ]

            return "The most common topics are: " + ", ".join(items) + "."

        return None

    # =========================================================
    # MAIN RAG PIPELINE
    # =========================================================

    def answer_question(
        self,
        question: str,
        top_k: int = 5,
        history: list[dict[str, str]] | None = None,
    ) -> dict[str, Any]:

        question_type = self._question_type(question)

        mongodb_context = ""
        structured_data = None
        transcript_context = ""
        sources: list[dict[str, Any]] = []

        # ---------------------------------------------------------
        # STRUCTURED: MongoDB only
        # ---------------------------------------------------------

        if question_type in ("structured", "hybrid"):
            mongodb_context, structured_data = self._get_mongodb_context()

        # ---------------------------------------------------------
        # Fast path: answer common aggregate questions directly.
        # No Ollama and no Chroma required.
        # ---------------------------------------------------------

        if question_type == "structured" and structured_data is not None:
            direct_answer = self._direct_structured_answer(
                question,
                structured_data,
            )

            if direct_answer:
                return {
                    "answer": direct_answer,
                    "sources": [],
                    "documents_retrieved": 0,
                    "retrieval_type": "mongodb",
                    "llm_available": True,
                }

        # ---------------------------------------------------------
        # SEMANTIC / HYBRID: retrieve transcript chunks.
        # Keep the context small for local Ollama.
        # ---------------------------------------------------------

        if question_type in ("semantic", "hybrid"):
            transcript_context, sources = self._get_transcript_context(
                question=question,
                top_k=min(top_k, 4),
            )

        # ---------------------------------------------------------
        # Nothing found
        # ---------------------------------------------------------

        if not mongodb_context and not transcript_context:
            return {
                "answer": (
                    "I couldn't find enough relevant information "
                    "in the available call data."
                ),
                "sources": [],
                "documents_retrieved": 0,
                "retrieval_type": question_type,
                "llm_available": False,
            }

        # ---------------------------------------------------------
        # Build only the context needed for this question.
        # ---------------------------------------------------------

        context_parts = []

        # Include a small amount of conversation history so follow-up
        # questions can retain context without sending the entire chat
        # history to the local LLM.
        if history:
            recent_history = history[-6:]
            history_lines = []

            for message in recent_history:
                role = message.get("role", "").lower()
                content = message.get("content", "").strip()

                if role in {"user", "assistant"} and content:
                    history_lines.append(
                        f"{role.capitalize()}: {content}"
                    )

            if history_lines:
                context_parts.append(
                    "Recent conversation context:\n"
                    + "\n".join(history_lines)
                )

        if mongodb_context:
            context_parts.append(
                "Structured call data from MongoDB:\n"
                + mongodb_context
            )

        if transcript_context:
            context_parts.append(
                "Relevant transcript excerpts:\n"
                + transcript_context
            )

        context = "\n\n".join(context_parts)

        try:
            answer = llm_service.answer_question(
                question=question,
                context=context,
            )

        except Exception as e:
            print(f"Hybrid RAG generation failed: {e}")

            return {
                "answer": (
                    "I found relevant call data, but the AI answer "
                    "service is temporarily unavailable. Please try again shortly."
                ),
                "sources": sources,
                "documents_retrieved": len(sources),
                "retrieval_type": question_type,
                "llm_available": False,
            }

        return {
            "answer": answer,
            "sources": sources,
            "documents_retrieved": len(sources),
            "retrieval_type": question_type,
            "llm_available": True,
        }


rag_service = RAGService()
