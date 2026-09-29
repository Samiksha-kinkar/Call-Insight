import { useState } from 'react'
import type { ChangeEvent } from 'react'
import { processCall } from '../services/api'

type CallResult = {
  call_id: string
  filename: string
  transcript: string
  duration_seconds?: number
  language?: string
  analysis?: {
    sentiment?: {
      label: string
      score: number
    }
    topic?: {
      category: string
      sub_topic?: string
      confidence: number
    }
    intent?: string
    urgency?: string
    complaint?: string
    customer_request?: string
    resolution?: {
      resolved: boolean
      confidence: number
      outcome?: string
    }
    escalation_required?: boolean
    products_or_services?: string[]
    keywords?: string[]
    key_points?: string[]
    summary: string
  }
}

const STORAGE_KEY = 'callinsight_latest_analysis'

function UploadCall() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null)

  const [isProcessing, setIsProcessing] = useState(false)

  const [error, setError] = useState<string | null>(null)

  const [result, setResult] = useState<CallResult | null>(() => {
    const savedResult = localStorage.getItem(STORAGE_KEY)

    if (!savedResult) {
      return null
    }

    try {
      return JSON.parse(savedResult) as CallResult
    } catch {
      localStorage.removeItem(STORAGE_KEY)
      return null
    }
  })

  const handleFileChange = (
    event: ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0]

    if (file) {
      setSelectedFile(file)
      setError(null)
    }
  }

  const handleAnalyze = async () => {
    if (!selectedFile) {
      return
    }

    setIsProcessing(true)
    setError(null)

    try {
      const data = await processCall(selectedFile)

      setResult(data)

      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(data)
      )
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Something went wrong while processing the call.'
      )
    } finally {
      setIsProcessing(false)
    }
  }

  const handleNewAnalysis = () => {
    setResult(null)
    setSelectedFile(null)
    setError(null)

    localStorage.removeItem(STORAGE_KEY)
  }

  return (
    <div className="page">
      {/* =========================================
          UPLOAD SCREEN
          ========================================= */}

      {!result && (
        <>
          <div className="upload-card">

            <div className="upload-icon">
              🎙️
            </div>

            <h2>
              {isProcessing
                ? 'Analyzing your call...'
                : 'Upload your call'}
            </h2>

            <p>
              {isProcessing
                ? 'Transcribing the conversation. This may take a few moments.'
                : 'Choose an audio recording to transcribe and analyze.'}
            </p>

            {!isProcessing && (
              <label className="file-select-button">
                Choose Audio File

                <input
                  type="file"
                  accept="audio/*"
                  onChange={handleFileChange}
                  hidden
                />
              </label>
            )}

            {selectedFile && !isProcessing && (
              <div className="selected-file">

                <div className="file-info">
                  <span className="file-icon">
                    🎵
                  </span>

                  <div>
                    <strong>
                      {selectedFile.name}
                    </strong>

                    <span>
                      {(
                        selectedFile.size /
                        (1024 * 1024)
                      ).toFixed(2)} MB
                    </span>
                  </div>
                </div>

                <button
                  className="remove-file"
                  onClick={() => setSelectedFile(null)}
                  type="button"
                >
                  ×
                </button>

              </div>
            )}

            {isProcessing && (
              <div className="processing-indicator">

                <div className="spinner"></div>

                <span>
                  Processing call...
                </span>

              </div>
            )}

            {!isProcessing && (
              <button
                className="analyze-button"
                disabled={!selectedFile}
                onClick={handleAnalyze}
                type="button"
              >
                Analyze Call
              </button>
            )}

          </div>

          {/* ERROR */}

          {error && (
            <div className="error-message">
              <strong>
                Processing failed
              </strong>

              <p>
                {error}
              </p>
            </div>
          )}

          {/* INFORMATION */}

          <div className="upload-info">

            <div>
              <strong>
                What happens next?
              </strong>

              <p>
                CallInsight will transcribe the conversation
                using Whisper and analyze it using AI.
              </p>
            </div>

            <div>
              <strong>
                Supported files
              </strong>

              <p>
                MP3, WAV, M4A and other common audio formats.
              </p>
            </div>

          </div>
        </>
      )}

      {/* =========================================
          ANALYSIS RESULTS
          ========================================= */}

      {result && (
        <div className="analysis-results">

          {/* RESULTS HEADER */}

          <div className="results-header">

            <div>
              <span className="results-label">
                ANALYSIS COMPLETE
              </span>

              <h2>
                Call Analysis
              </h2>

              <p>
                {result.filename}
              </p>
            </div>

            <button
              className="new-analysis-button"
              onClick={handleNewAnalysis}
              type="button"
            >
              Analyze Another Call
            </button>

          </div>

          {/* AI ANALYSIS */}

          {result.analysis && (
            <>

              {/* =================================
                  OVERVIEW CARDS
                  ================================= */}

              <div className="analysis-grid">

                <div className="analysis-card">
                  <span>
                    Sentiment
                  </span>

                  <strong>
                    {result.analysis.sentiment?.label || 'N/A'}
                  </strong>
                </div>

                <div className="analysis-card">
                  <span>
                    Topic
                  </span>

                  <strong>
                    {result.analysis.topic?.category || 'N/A'}
                  </strong>
                </div>

                <div className="analysis-card">
                  <span>
                    Urgency
                  </span>

                  <strong>
                    {result.analysis.urgency || 'N/A'}
                  </strong>
                </div>

                <div className="analysis-card">
                  <span>
                    Resolution
                  </span>

                  <strong>
                    {result.analysis.resolution?.resolved
                      ? 'Resolved'
                      : 'Unresolved'}
                  </strong>
                </div>

              </div>

              {/* =================================
                  AI SUMMARY
                  ================================= */}

              <div className="result-section">

                <h3>
                  AI Summary
                </h3>

                <p>
                  {result.analysis.summary}
                </p>

              </div>

              {/* =================================
                  CUSTOMER REQUEST
                  ================================= */}

              {result.analysis.customer_request && (
                <div className="result-section">

                  <h3>
                    Customer Request
                  </h3>

                  <p>
                    {result.analysis.customer_request}
                  </p>

                </div>
              )}

              {/* =================================
                  KEY POINTS
                  ================================= */}

              {result.analysis.key_points &&
                result.analysis.key_points.length > 0 && (
                  <div className="result-section">

                    <h3>
                      Key Points
                    </h3>

                    <ul>
                      {result.analysis.key_points
                        .slice(0, 5)
                        .map((point, index) => (
                          <li key={index}>
                            {point}
                          </li>
                        ))}
                    </ul>

                  </div>
                )}

              {/* =================================
                  ATTENTION / ESCALATION
                  ================================= */}

              {result.analysis.escalation_required && (
                <div className="result-section attention-section">

                  <h3>
                    Attention Required
                  </h3>

                  <p>
                    This call has been flagged as requiring
                    escalation.
                  </p>

                </div>
              )}

              {/* =================================
                  COMPLAINT
                  ================================= */}

              {result.analysis.complaint && (
                <div className="result-section">

                  <h3>
                    Complaint
                  </h3>

                  <p>
                    {result.analysis.complaint}
                  </p>

                </div>
              )}

              {/* =================================
                  RESOLUTION OUTCOME
                  ================================= */}

              {result.analysis.resolution?.outcome && (
                <div className="result-section">

                  <h3>
                    Resolution Outcome
                  </h3>

                  <p>
                    {result.analysis.resolution.outcome}
                  </p>

                </div>
              )}

            </>
          )}

          {/* =========================================
              TRANSCRIPT
              ========================================= */}

          <details className="transcript-details">

            <summary>
              View Full Transcript
            </summary>

            <div className="transcript">
              {result.transcript}
            </div>

          </details>

        </div>
      )}

    </div>
  )
}

export default UploadCall