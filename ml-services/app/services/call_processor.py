from datetime import datetime
from uuid import uuid4

from app.models.schemas import CallRecord
from app.services.whisper_service import whisper_service
from app.services.llm_service import llm_service
from app.database.mongodb import insert_call

from app.rag.chunking_service import chunking_service
from app.rag.vector_store import vector_store


class CallProcessor:

    def process(
        self,
        audio_path: str,
        filename: str,
    ) -> CallRecord:

        # 1. Transcribe audio using Whisper
        transcription = whisper_service.transcribe(
            audio_path
        )

        transcript = transcription["text"]
        language = transcription.get("language")
        duration_seconds = transcription.get(
            "duration_seconds"
        )

        # 2. Analyze transcript using Gemini
        analysis = llm_service.analyze_call(
            transcript
        )

        # 3. Create the complete call record
        call = CallRecord(
            call_id=str(uuid4()),
            filename=filename,
            transcript=transcript,
            analysis=analysis,
            duration_seconds=duration_seconds,
            language=language,
            timestamp=datetime.utcnow(),
        )

        # 4. Save call to MongoDB
        call_data = call.model_dump(
            mode="json"
        )

        insert_call(call_data)

        print("Call saved to MongoDB.")

        # 5. Add transcript to the RAG vector database
        chunks = chunking_service.split_text(
            transcript
        )

        print(
            f"Created {len(chunks)} transcript chunks "
            f"for RAG."
        )

        vector_store.add_chunks(
            chunks=chunks,
            call_id=call.call_id,
        )

        print(
            f"Added {len(chunks)} transcript chunks "
            f"to the RAG vector store."
        )

        # 6. Return the completed call
        return call
    
call_processor = CallProcessor()