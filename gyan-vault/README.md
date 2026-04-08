# 📚 Gyan Vault — AI-Powered Academic Knowledge System

> **Final Year B.Tech Major Project**  
> An intelligent document management and query system that leverages AI to extract knowledge from uploaded documents and provide context-aware answers.

---

## 🎯 Problem Statement

Students, researchers, and professionals deal with large volumes of PDF reports, research papers, and documents daily. Finding specific information across multiple documents is time-consuming and inefficient. **Gyan Vault** solves this by enabling users to upload documents and ask natural-language questions, receiving accurate, context-aware answers powered by AI.

## ✨ Key Features

| Feature | Description |
|---------|-------------|
| **Document Upload & Processing** | Upload PDF, DOCX, and TXT files. Automatic text extraction, chunking, and vector embedding generation. |
| **AI-Powered Q&A (RAG)** | Ask questions about uploaded documents using Retrieval-Augmented Generation with Hybrid Search (Vector + BM25). |
| **Academic Content Generation** | Generate exam notes, MCQs, viva questions, flashcards, summaries, definitions, and assignment answers from your documents. |
| **AI Summaries & Tags** | Automatic document summarization and keyword extraction on upload. |
| **Chat Sessions** | Persistent conversation history with follow-up context for multi-turn Q&A. |
| **Analytics Dashboard** | Visualize knowledge base growth, query trends, and daily interaction metrics with interactive charts. |
| **PDF Tools** | Merge, split, compress, rotate, add page numbers, watermark, convert PDF to text/Word. |
| **Web Content Import** | Import and process content from any website URL. |
| **User Authentication** | Secure JWT-based auth with signup, login, password change, and profile management. |
| **Dark/Light Theme** | Fully themed UI with smooth transitions. |
| **Keyboard Shortcuts** | Vim-style navigation shortcuts for power users. |

## 🏗️ System Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Frontend (React + Vite)               │
│   Auth │ Dashboard │ Upload │ Library │ Query │ PDF Tools│
│                    │ Analytics │ Profile                  │
└─────────────────────┬───────────────────────────────────┘
                      │ REST API (Axios + JWT)
┌─────────────────────▼───────────────────────────────────┐
│                   Backend (FastAPI + Python)              │
│                                                          │
│  ┌──────────┐  ┌───────────┐  ┌──────────────────────┐  │
│  │ Auth JWT  │  │ Document  │  │   AI Services         │  │
│  │ Routes    │  │ Routes    │  │  ┌─────────────────┐  │  │
│  └──────────┘  └───────────┘  │  │ Query Engine    │  │  │
│                                │  │ (RAG Pipeline)  │  │  │
│  ┌──────────┐  ┌───────────┐  │  ├─────────────────┤  │  │
│  │ Chat     │  │ Analytics │  │  │ Academic Engine  │  │  │
│  │ Routes   │  │ Routes    │  │  │ (8 Gen Modes)   │  │  │
│  └──────────┘  └───────────┘  │  ├─────────────────┤  │  │
│                                │  │ LLM Factory     │  │  │
│  ┌────────────────────────┐   │  │ (Ollama)        │  │  │
│  │ Sentence Transformers  │   │  └─────────────────┘  │  │
│  │ (Embeddings)           │   └──────────────────────┘  │
│  └────────────────────────┘                              │
│  ┌────────────────────────┐   ┌──────────────────────┐  │
│  │ FAISS Vector Store     │   │ SQLite / PostgreSQL   │  │
│  └────────────────────────┘   └──────────────────────┘  │
└──────────────────────────────────────────────────────────┘
```

## 🛠️ Tech Stack

### Frontend
- **React 19** — UI framework
- **Vite** — Build tool & dev server
- **Tailwind CSS 4** — Utility-first styling
- **Framer Motion** — Page transitions & animations
- **React Icons** — Icon library
- **React Markdown** — Markdown rendering in chat
- **Axios** — HTTP client with JWT interceptors

### Backend
- **FastAPI** — High-performance Python web framework
- **SQLAlchemy** — ORM with SQLite/PostgreSQL support
- **FAISS** — Facebook AI Similarity Search (vector store)
- **Sentence Transformers** — `all-MiniLM-L6-v2` for text embeddings
- **BM25 (rank-bm25)** — Keyword-based search for hybrid retrieval
- **Ollama** — Local LLM inference (phi3 / llama3)
- **LangChain** — LLM orchestration framework
- **PyMuPDF** — PDF text extraction & manipulation
- **python-docx** — DOCX file handling
- **JWT (python-jose)** — Token-based authentication

### AI Pipeline
```
Document → Text Extraction → Chunking (500 chars) → Embeddings (MiniLM-L6-v2) → FAISS Vector Store
                                                                                        ↓
User Query → Embedding → Hybrid Search (Vector + BM25) → RRF Fusion → Top-K Chunks → LLM (Ollama) → Answer
```

## 🚀 Setup & Installation

### Prerequisites
- **Python 3.10+**
- **Node.js 18+**
- **Ollama** — Install from [ollama.ai](https://ollama.ai) and pull a model:
  ```bash
  ollama pull phi3
  ```

### Backend Setup
```bash
cd backend
pip install -r requirements.txt

# The app uses SQLite by default (no database setup needed!)
# For PostgreSQL: set DATABASE_URL in .env

# Start the server:
python main.py
```

### Frontend Setup
```bash
cd gyan-vault
npm install
npm run dev
```

The app will be available at `http://localhost:5173` with the API running at `http://localhost:8000`.

## 📁 Project Structure

```
Major Project/
├── backend/                    # FastAPI backend
│   ├── auth/                   # JWT authentication utilities
│   ├── database/               # SQLAlchemy connection & models
│   ├── models/                 # User, Document, Chat models
│   ├── routes/                 # API endpoints
│   │   ├── auth.py             # Signup, login, profile
│   │   ├── documents.py        # Upload, list, delete documents
│   │   ├── query.py            # RAG-based Q&A
│   │   ├── academic.py         # Academic content generation
│   │   ├── chat.py             # Chat session management
│   │   ├── analytics.py        # Usage stats & activity
│   │   └── pdf_tools.py        # PDF manipulation tools
│   ├── services/               # Business logic
│   │   ├── academic_engine.py  # 8 academic generation modes
│   │   ├── chunking.py         # Text chunking
│   │   ├── embeddings.py       # Vector embedding generation
│   │   ├── file_extractor.py   # PDF/DOCX/TXT text extraction
│   │   ├── llm_factory.py      # LLM provider factory
│   │   ├── query_engine.py     # RAG pipeline
│   │   ├── search.py           # Hybrid search (Vector + BM25 + RRF)
│   │   ├── summarizer.py       # Document summarization
│   │   └── vector_store.py     # FAISS operations
│   ├── config.py               # App configuration
│   ├── main.py                 # FastAPI entry point
│   └── requirements.txt        # Python dependencies
│
└── gyan-vault/                 # React frontend
    ├── src/
    │   ├── components/         # Sidebar, ProtectedRoute, etc.
    │   ├── context/            # Theme context
    │   ├── pages/              # All application pages
    │   │   ├── AuthPage.jsx    # Login / Signup
    │   │   ├── Dashboard.jsx   # Welcome + stats + quick actions
    │   │   ├── UploadPage.jsx  # File upload + web import
    │   │   ├── LibraryPage.jsx # Document library with AI summaries
    │   │   ├── QueryPage.jsx   # AI chat with document selection
    │   │   ├── PdfToolsPage.jsx # 8 PDF tools
    │   │   ├── AnalyticsPage.jsx # Usage analytics
    │   │   └── ProfilePage.jsx # Account settings
    │   ├── api.js              # Axios instance with JWT
    │   └── App.jsx             # Root component with routing
    ├── index.html
    └── package.json
```

## 👥 Team

- **Savita Pathak** — Developer

## 📄 License

This project was developed as part of the B.Tech final year curriculum.
