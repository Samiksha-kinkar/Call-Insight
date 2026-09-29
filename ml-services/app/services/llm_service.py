import time

import requests

from google import genai
from google.genai import types
from google.genai import errors

from app.core.config import GEMINI_API_KEY, GEMINI_MODEL
from app.models.schemas import CallAnalysis


class LLMService:

    def __init__(self):
        self.client = genai.Client(
            api_key=GEMINI_API_KEY
        )

    def analyze_call(
        self,
        transcript: str,
    ) -> CallAnalysis:

        prompt = f"""
You are analyzing a customer support call for
CallInsight AI.

Analyze ONLY information supported by the transcript.

Do not invent:
- customer information
- agent information
- events
- resolutions
- products
- complaints

If something cannot be determined from the transcript,
use null, false, or an empty list where appropriate.

Sentiment must be one of:
positive, neutral, negative

Urgency must be one of:
low, medium, high, critical

Analyze:

1. Overall sentiment
2. Main topic
3. Sub-topic
4. Customer intent
5. Urgency
6. Main complaint
7. Customer request
8. Resolution status
9. Resolution outcome
10. Whether escalation is required
11. Products or services mentioned
12. Important keywords
13. Important key points
14. Concise summary

Keywords should be short, meaningful terms that represent
the main subjects, issues, products, or requests discussed
in the call.

Customer support transcript:

{transcript}
"""

        max_retries = 4

        for attempt in range(max_retries):

            try:

                print(
                    f"Sending transcript to Gemini "
                    f"(attempt {attempt + 1}/{max_retries})..."
                )

                response = self.client.models.generate_content(
                    model=GEMINI_MODEL,
                    contents=prompt,
                    config=types.GenerateContentConfig(
                        response_mime_type="application/json",
                        response_schema=CallAnalysis,
                        thinking_config=types.ThinkingConfig(
                            thinking_level="low"
                        ),
                    ),
                )

                if not response.parsed:
                    raise RuntimeError(
                        "Gemini returned no structured analysis."
                    )

                print("Gemini analysis successful.")

                return response.parsed

            except errors.ServerError as e:

                if attempt == max_retries - 1:

                    raise RuntimeError(
                        "Gemini remained unavailable after "
                        f"{max_retries} attempts."
                    ) from e

                wait_time = 2 ** attempt

                print(
                    f"Gemini temporarily unavailable (503). "
                    f"Retrying in {wait_time} seconds..."
                )

                time.sleep(wait_time)

        raise RuntimeError(
            "Unable to analyze call with Gemini."
        )

    def answer_question(
        self,
        question: str,
        context: str,
        history: list[dict[str, str]] | None = None,
    ) -> str:

        history = history or []

        history_text = "\n".join(
            f"{message.get('role', 'user').capitalize()}: {message.get('content', '')}"
            for message in history[-8:]
            if message.get('content')
        )

        prompt = f"""
You are CallInsight, an AI assistant for analyzing
customer support calls.

Answer the user's question using ONLY the provided
CallInsight data. The data may contain both structured
MongoDB analysis and transcript evidence from ChromaDB.

Rules:

- Do not invent information.
- Treat structured statistics as authoritative for counts,
  percentages, sentiment, complaints, topics, and
  resolution status.
- Use transcript evidence to explain reasons, customer
  statements, and details that are not represented by
  structured statistics.
- If the available data does not support an answer, say so
  clearly instead of guessing.
- Use the conversation history to understand follow-up
  questions, but do not treat previous assistant answers
  as new factual evidence.
- Give a concise, natural-language answer.
- Do not mention retrieval, MongoDB, ChromaDB, Ollama,
  prompts, context windows, or internal processing unless
  the user explicitly asks about the system.
- Do not reproduce transcript chunks unless the user
  specifically asks for a quote.
- Return ONLY the final answer.
- Do not include reasoning or thinking process.

Conversation history:
{history_text or 'No previous conversation.'}

CallInsight data:
{context}

Current user question:
{question}
"""

        try:
            response = requests.post(
                "http://localhost:11434/api/generate",
                json={
                    "model": "qwen3.5:4b",
                    "prompt": prompt,
                    "stream": False,
                    "think": False,
                },
                timeout=120,
            )

            response.raise_for_status()

            data = response.json()
            answer = data.get("response", "").strip()

            if not answer:
                raise RuntimeError("Ollama returned an empty answer.")

            return answer

        except requests.RequestException as e:
            print(f"Ollama request failed: {e}")
            raise RuntimeError("Ollama is currently unavailable.") from e

        except Exception as e:
            print(f"Ollama RAG generation failed: {e}")
            raise RuntimeError("Unable to generate an answer with Ollama.") from e


llm_service = LLMService()