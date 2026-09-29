import whisper


class WhisperService:
    def __init__(self, model_name: str = "base"):
        self.model = whisper.load_model(model_name)

    def transcribe(self, audio_path: str) -> dict:
        result = self.model.transcribe(audio_path)

        return {
            "text": result["text"].strip(),
            "language": result.get("language"),
            "duration_seconds": (
                result["segments"][-1]["end"]
                if result.get("segments")
                else None
            ),
        }


whisper_service = WhisperService()