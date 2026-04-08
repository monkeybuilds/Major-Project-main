import os
from pathlib import Path
from dotenv import load_dotenv

# Load .env file
load_dotenv()

# Base directory
BASE_DIR = Path(__file__).resolve().parent

# Environment
ENVIRONMENT = os.getenv("ENVIRONMENT", "development")  # development | production
IS_PRODUCTION = ENVIRONMENT == "production"

# Database (PostgreSQL / SQLite fallback)
DATABASE_URL = os.getenv("DATABASE_URL", f"sqlite:///{BASE_DIR / 'gyan_vault.db'}")

# JWT
SECRET_KEY = os.getenv("SECRET_KEY", "gyan-vault-super-secret-key-change-in-production")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24  # 24 hours

# File uploads
UPLOAD_DIR = BASE_DIR / "uploads"
UPLOAD_DIR.mkdir(exist_ok=True)

# Vector store
VECTOR_STORE_DIR = BASE_DIR / "vector_stores"
VECTOR_STORE_DIR.mkdir(exist_ok=True)

# Embedding model
EMBEDDING_MODEL_NAME = "sentence-transformers/all-MiniLM-L6-v2"

# Chunking
CHUNK_SIZE = 500
CHUNK_OVERLAP = 50

# LLM — Ollama (local)
LLM_MODEL_NAME = os.getenv("LLM_MODEL_NAME", "phi3")

# LLM — Gemini (cloud)
GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY", "")
GEMINI_MODEL_NAME = os.getenv("GEMINI_MODEL_NAME", "gemini-1.5-flash")

# CORS — allowed origins
_default_origins = "http://localhost:5173,http://localhost:3000,http://127.0.0.1:5173"
ALLOWED_ORIGINS = [
    o.strip()
    for o in os.getenv("ALLOWED_ORIGINS", _default_origins).split(",")
    if o.strip()
]
