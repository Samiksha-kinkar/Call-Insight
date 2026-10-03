CallInsight is an AI-powered call analysis and knowledge retrieval system designed to transform recorded customer calls into structured, searchable, and actionable insights.

The system combines **speech transcription, LLM-based call analysis, Retrieval-Augmented Generation (RAG), hybrid retrieval, and dashboard visualization** into a single workflow.


## Overview

CallInsight processes recorded call audio and converts it into meaningful information that can be used for analysis and knowledge retrieval.

The overall workflow is:

```text
Audio Call
    │
    ▼
Gemini
    │
    ├──► Transcription
    │
    ▼
Call Analysis
    │
    ├──► Summary
    ├──► Key Points
    ├──► Sentiment
    ├──► Topics
    └──► Other Call Insights
    │
    ▼
MongoDB
    │
    ▼
RAG Pipeline
    │
    ├──► Semantic Retrieval
    ├──► Keyword Retrieval
    └──► Hybrid Retrieval
            │
            ▼
          LLaMA
            │
            ▼
      Context-Aware Response
```

---

## Key Features

###  AI-Powered Transcription

Recorded calls are processed using **Google Gemini** to generate transcripts from audio.

The transcription pipeline eliminates the need for manual transcription and provides the textual foundation for subsequent call analysis and retrieval.

###  Automated Call Analysis

Transcribed calls are analyzed to extract useful information such as:

* Call summaries
* Key points
* Topics
* Sentiment
* Important conversational information
* Structured call metadata

The resulting information can be displayed through the dashboard for easier monitoring and analysis.

###  Retrieval-Augmented Generation

CallInsight includes a RAG pipeline that allows users to retrieve relevant information from the available call knowledge base before generating an answer.

Instead of relying only on the language model's internal knowledge, relevant information is retrieved from the project's stored call data and supplied as context.

###  Hybrid Retrieval

The retrieval system combines two complementary approaches:

**Semantic retrieval**

* Finds information based on meaning and contextual similarity.
* Useful when the user's wording differs from the wording in the original call.

**Keyword retrieval**

* Searches for explicit terms and phrases.
* Useful for names, specific issues, products, keywords, and exact terminology.

These approaches are combined to provide **hybrid retrieval**, improving the ability to find relevant call information.

###  LLaMA-Based Response Generation

After relevant information is retrieved, **LLaMA** is used to generate a response based on the retrieved context.

The separation between retrieval and generation allows the system to:

1. Retrieve relevant information.
2. Provide that information as context.
3. Generate a response grounded in the retrieved data.

###  Dashboard

The web dashboard provides a centralized interface for viewing call-related information.

It includes areas for:

* Call statistics
* Recent calls
* Call analysis
* Visual charts
* Retrieved call information
* RAG-based interaction

The dashboard can work with both **real call data and dummy data**, making it possible to demonstrate the interface even when the database contains limited real-world records.

### MongoDB Integration

MongoDB is used as the application's database for storing call-related information and analysis results.

This allows processed calls to be persisted and subsequently accessed by the dashboard and retrieval pipeline.

---

# System Architecture

```text
                    ┌──────────────────┐
                    │   Audio Call     │
                    └────────┬─────────┘
                             │
                             ▼
                    ┌──────────────────┐
                    │  Google Gemini   │
                    │   Transcription  │
                    └────────┬─────────┘
                             │
                             ▼
                    ┌──────────────────┐
                    │  Call Analysis   │
                    │                  │
                    │ Summary           │
                    │ Key Points       │
                    │ Sentiment        │
                    │ Topics           │
                    └────────┬─────────┘
                             │
                             ▼
                    ┌──────────────────┐
                    │     MongoDB      │
                    │  Call Database   │
                    └────────┬─────────┘
                             │
                             ▼
                 ┌─────────────────────────┐
                 │       RAG Pipeline      │
                 │                         │
                 │  ┌───────────────────┐  │
                 │  │ Semantic Retrieval│  │
                 │  └─────────┬─────────┘  │
                 │            │            │
                 │  ┌─────────▼─────────┐  │
                 │  │ Keyword Retrieval │  │
                 │  └─────────┬─────────┘  │
                 │            │            │
                 │       Hybrid Search     │
                 └────────────┬────────────┘
                              │
                              ▼
                    ┌──────────────────┐
                    │      LLaMA       │
                    │ Response / RAG   │
                    └────────┬─────────┘
                             │
                             ▼
                    ┌──────────────────┐
                    │    Dashboard     │
                    │   / User Query   │
                    └──────────────────┘
```

---

# Technology Stack

| Component         | Technology                          |
| ----------------- | ----------------------------------- |
| Frontend          | React + TypeScript                  |
| Backend           | Python                              |
| Database          | MongoDB                             |
| Transcription     | Google Gemini                       |
| LLM / Generation  | LLaMA                               |
| Retrieval         | Hybrid Semantic + Keyword Retrieval |
| Embeddings        | Sentence Transformers               |
| API Communication | REST APIs                           |
| Styling           | CSS                                 |
| Development       | Vite / Python virtual environment   |

---

# How the System Works

## 1. Call Upload

A recorded call is uploaded through the application.

The audio is passed to the AI processing pipeline.

## 2. Transcription

Gemini processes the audio and produces a text transcript.

```text
Audio
  ↓
Gemini
  ↓
Transcript
```

The transcript becomes the primary textual input for the analysis stage.

## 3. Call Analysis

The transcript is analyzed to extract structured information.

```text
Transcript
    ↓
Call Analysis
    ↓
Summary
Key Points
Sentiment
Topics
Metadata
```

The resulting information is stored for later access.

## 4. Data Storage

Processed call information is stored in MongoDB.

This provides persistent storage for:

* Call records
* Transcripts
* Analysis results
* Metadata
* Information required by the dashboard and RAG system

## 5. RAG Ingestion

Relevant call information is prepared for retrieval.

The data is converted into searchable representations using embeddings and is also made available for keyword-based retrieval.

## 6. User Query

When a user asks a question, the RAG system searches the available call knowledge.

For example:

```text
"What problems were customers reporting about the payment process?"
```

The system searches for relevant information instead of simply generating an answer from the LLM's general knowledge.

## 7. Hybrid Retrieval

The query is processed through both retrieval approaches:

```text
                 User Query
                     │
          ┌──────────┴──────────┐
          ▼                     ▼
   Semantic Search        Keyword Search
          │                     │
          └──────────┬──────────┘
                     ▼
              Hybrid Results
                     │
                     ▼
               Relevant Context
```

This allows the system to handle both semantic similarity and explicit keyword matching.

## 8. LLaMA Response Generation

The retrieved context is passed to LLaMA.

```text
User Query
    +
Retrieved Context
    │
    ▼
  LLaMA
    │
    ▼
Context-Aware Answer
```

The generated answer is therefore grounded in the information retrieved from the call knowledge base.

---

# Dashboard

The dashboard provides a visual overview of the processed calls.

It is designed to make large amounts of call information easier to understand through:

* Statistical cards
* Charts
* Call history
* Recent calls
* Call-level analysis
* Search and retrieval functionality

The dashboard also supports a combination of real database information and demonstration data where required.

---

# RAG Architecture

The RAG implementation follows the general pipeline:

```text
                 Documents / Call Data
                         │
                         ▼
                    Preprocessing
                         │
                         ▼
                    Chunking
                         │
             ┌───────────┴───────────┐
             ▼                       ▼
        Embeddings             Keyword Index
             │                       │
             ▼                       ▼
      Semantic Search          Keyword Search
             │                       │
             └───────────┬───────────┘
                         ▼
                  Hybrid Retrieval
                         │
                         ▼
                  Relevant Context
                         │
                         ▼
                       LLaMA
                         │
                         ▼
                     Response
```

This architecture allows the system to use both meaning-based and exact-term retrieval rather than depending on a single search strategy.

---

# Installation

## Prerequisites

Make sure the following are installed:

* Python 3.x
* Node.js and npm
* MongoDB
* Git
* A Google Gemini API key
* A locally available/configured LLaMA model

---

## 1. Clone the Repository

```bash
git clone <repository-url>
cd CallInsight
```

---

## 2. Backend Setup

Navigate to the backend / ML services directory:

```bash
cd ml-services
```

Create and activate a Python virtual environment:

### Windows

```powershell
python -m venv venv
venv\Scripts\activate
```

### Linux / macOS

```bash
python3 -m venv venv
source venv/bin/activate
```

Install the required dependencies:

```bash
pip install -r requirements.txt
```

---

## 3. Environment Variables

Create an environment configuration file containing the required credentials and configuration values.

At minimum, configure the Gemini API key and MongoDB connection details required by the application.

Example:

```env
GEMINI_API_KEY=your_gemini_api_key
MONGODB_URI=your_mongodb_connection_string
```

---

## 4. Frontend Setup

Navigate to the frontend:

```bash
cd frontend
```

Install dependencies:

```bash
npm install
```

---

# Running the Application

The application consists of the frontend and backend services.

## Start the Backend

From the backend environment:

```bash
python main.py
```

or use the project's configured API startup command.

## Start the Frontend

From the frontend directory:

```bash
npm run dev
```

The frontend will provide the development URL in the terminal.

Make sure the backend API is running before using features that require server-side processing.

---

# RAG Ingestion

Before retrieving information from newly added knowledge, the relevant data needs to be processed by the RAG ingestion pipeline.

The project includes an ingestion module under:

```text
ml-services/app/rag/
```

The ingestion process prepares the available information for retrieval by generating the required searchable representations.

---

# Data Flow

The complete application flow can be summarized as:

```text
                 ┌───────────────┐
                 │  Call Audio   │
                 └───────┬───────┘
                         │
                         ▼
                 ┌───────────────┐
                 │    Gemini     │
                 │ Transcription │
                 └───────┬───────┘
                         │
                         ▼
                 ┌───────────────┐
                 │ Call Analysis │
                 └───────┬───────┘
                         │
                         ▼
                 ┌───────────────┐
                 │    MongoDB    │
                 └───────┬───────┘
                         │
              ┌──────────┴──────────┐
              │                     │
              ▼                     ▼
        Dashboard              RAG Pipeline
                                    │
                         ┌──────────┴──────────┐
                         ▼                     ▼
                    Semantic              Keyword
                    Retrieval             Retrieval
                         │                     │
                         └──────────┬──────────┘
                                    ▼
                              Hybrid Results
                                    │
                                    ▼
                                  LLaMA
                                    │
                                    ▼
                                Response
```

---

# Design Principles

CallInsight is built around several core principles:

### Separation of Responsibilities

Different components handle different stages of the pipeline:

* Gemini handles transcription.
* The analysis pipeline extracts structured call information.
* MongoDB provides persistent storage.
* Retrieval identifies relevant information.
* LLaMA generates context-aware responses.
* The frontend provides visualization and interaction.

### Context-Grounded Generation

The RAG pipeline retrieves relevant information before generating an answer, reducing reliance on unsupported responses from the language model.

### Hybrid Retrieval

Combining semantic and keyword retrieval provides flexibility across different types of queries.

### Modular Architecture

The transcription, analysis, database, retrieval, LLM, and frontend components are separated so that individual components can be improved without redesigning the entire system.

---

# Project Status

CallInsight currently provides an integrated workflow for:

* Audio call transcription
* AI-based call analysis
* Persistent call storage
* Dashboard visualization
* RAG-based retrieval
* Hybrid semantic and keyword search
* LLaMA-based contextual response generation

The project is structured as a modular system so that additional analysis, retrieval, and visualization capabilities can be added over time.

---

## License

This project is currently intended for academic/project development purposes.

Add the appropriate license here if the project is later released under an open-source or proprietary license.
