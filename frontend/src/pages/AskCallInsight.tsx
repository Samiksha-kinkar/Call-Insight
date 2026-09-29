import { useState } from "react";

interface Source {
  call_id: string | null;
  chunk_id: string | null;
  distance: number | null;
  document?: string | null;
}

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  sources?: Source[];
}

interface RAGResponse {
  answer: string;
  sources: Source[];
  documents_retrieved: number;
}

const exampleQuestions = [
  "Are most calls resolved?",
  "What are the most common customer complaints?",
  "Which issues are causing the most unresolved calls?",
  "What are the most common negative sentiment topics?",
];

export default function AskCallInsight() {
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [expandedSources, setExpandedSources] = useState<string | null>(
    null
  );

  const askQuestion = async (questionToAsk: string) => {
    const trimmedQuestion = questionToAsk.trim();

    if (!trimmedQuestion || loading) {
      return;
    }

    /*
     * Save the previous conversation before adding
     * the new user message.
     */
    const previousHistory = messages.map((message) => ({
      role: message.role,
      content: message.content,
    }));

    const userMessage: ChatMessage = {
      id: `${messages.length}-user`,
      role: "user",
      content: trimmedQuestion,
    };

    setMessages((current) => [...current, userMessage]);
    setQuestion("");
    setLoading(true);
    setError("");

    try {
      const response = await fetch(
        "http://127.0.0.1:8000/api/rag/query",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            question: trimmedQuestion,
            top_k: 8,
            history: previousHistory,
          }),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();

        throw new Error(
          `Backend returned ${response.status}: ${errorText}`
        );
      }

      const data: RAGResponse = await response.json();

      const assistantMessage: ChatMessage = {
        id: `${messages.length}-assistant`,
        role: "assistant",
        content: data.answer,
        sources: data.sources || [],
      };

      setMessages((current) => [
        ...current,
        assistantMessage,
      ]);
    } catch (err) {
      console.error("RAG request failed:", err);

      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong while contacting the API."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (
    event: React.FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();
    void askQuestion(question);
  };

  const clearChat = () => {
    if (loading) {
      return;
    }

    setMessages([]);
    setQuestion("");
    setError("");
    setExpandedSources(null);
  };

  const toggleSources = (messageId: string) => {
    setExpandedSources((current) =>
      current === messageId ? null : messageId
    );
  };

  return (
    <main className="ask-page">

      {/* =========================
          CHAT AREA
      ========================== */}

      <div className="ask-chat-container">

        {/* Empty state */}

        {messages.length === 0 && !loading && (
          <div className="ask-welcome">
            <h2>How can I help?</h2>
            <p>
              Ask a question about your calls or try one of the examples below.
            </p>

            <div className="example-questions">
              {exampleQuestions.map((example) => (
                <button
                  key={example}
                  type="button"
                  className="example-question"
                  onClick={() =>
                    void askQuestion(example)
                  }
                >
                  {example}
                </button>
              ))}
            </div>

          </div>
        )}

        {/* Chat header */}

        {messages.length > 0 && (
          <div className="chat-header">

            <button
              type="button"
              className="clear-chat-button"
              onClick={clearChat}
              disabled={loading}
            >
              Clear chat
            </button>

          </div>
        )}

        {/* =========================
            MESSAGES
        ========================== */}

        <div className="chat-messages">

          {messages.map((message) => (
            <div
              key={message.id}
              className={`chat-message ${
                message.role === "user"
                  ? "chat-message-user"
                  : "chat-message-assistant"
              }`}
            >

              <div className="chat-message-label">
                {message.role === "user"
                  ? "You"
                  : "Call'Insight"}
              </div>

              <div className="chat-bubble">
                {message.content}
              </div>

              {/* Sources only for RAG messages */}

              {message.role === "assistant" &&
                message.sources &&
                message.sources.length > 0 && (
                  <div className="message-sources">

                    <button
                      type="button"
                      className="sources-toggle"
                      onClick={() =>
                        toggleSources(message.id)
                      }
                    >
                      <span>
                        {message.sources.length} sources
                      </span>

                      <span>
                        {expandedSources === message.id
                          ? "Hide"
                          : "View"}
                      </span>
                    </button>

                    {expandedSources === message.id && (
                      <div className="sources-list">

                        {message.sources.map(
                          (source, index) => (
                            <div
                              className="source-item"
                              key={`${message.id}-${source.call_id}-${source.chunk_id}-${index}`}
                            >

                              <div className="source-number">
                                {index + 1}
                              </div>

                              <div className="source-info">

                                <strong>
                                  Call{" "}
                                  {source.call_id ||
                                    "Unknown"}
                                </strong>

                                <span>
                                  Transcript chunk:{" "}
                                  {source.chunk_id ||
                                    "Unknown"}
                                </span>

                                {source.document && (
                                  <p className="source-document">
                                    {source.document}
                                  </p>
                                )}

                              </div>

                            </div>
                          )
                        )}

                      </div>
                    )}

                  </div>
                )}

            </div>
          ))}

          {/* =========================
              RAG TYPING INDICATOR
          ========================== */}

          {loading && (
            <div className="chat-message chat-message-assistant">

              <div className="chat-message-label">
                Call&apos;Insight
              </div>

              <div className="chat-bubble chat-thinking">

                <span className="typing-dot" />
                <span className="typing-dot" />
                <span className="typing-dot" />

              </div>

            </div>
          )}

          {error && (
            <div className="rag-error">
              <p>{error}</p>
            </div>
          )}

        </div>

      </div>

      {/* =========================
          MESSAGE INPUT
      ========================== */}

      <form
        className="ask-input-container"
        onSubmit={handleSubmit}
      >

        <input
          type="text"
          value={question}
          onChange={(event) =>
            setQuestion(event.target.value)
          }
          placeholder={
            messages.length > 0
              ? "Ask a follow-up question..."
              : "Ask a question about your calls..."
          }
          disabled={loading}
        />

        <button
          type="submit"
          disabled={!question.trim() || loading}
        >
          {loading ? "Thinking..." : "Ask"}
        </button>

      </form>

    </main>
  );
}