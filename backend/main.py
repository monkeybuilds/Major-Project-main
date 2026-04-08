from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from database.connection import init_db
from config import ALLOWED_ORIGINS
from routes.auth import router as auth_router
from routes.documents import router as documents_router
from routes.query import router as query_router
from routes.chat import router as chat_router
from routes.analytics import router as analytics_router
from routes.academic import router as academic_router
from routes.pdf_tools import router as pdf_tools_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initialise database tables on startup."""
    init_db()
    yield


app = FastAPI(
    title="Gyan Vault API",
    description="AI-powered academic intelligence system with document management, multi-mode content generation, and PDF tools",
    version="3.0.0",
    lifespan=lifespan,
)

# CORS — allow configured origins
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth_router)
app.include_router(documents_router)
app.include_router(query_router)
app.include_router(chat_router)
app.include_router(analytics_router)
app.include_router(academic_router)
app.include_router(pdf_tools_router)


@app.get("/", tags=["Health"])
def root():
    return {
        "name": "Gyan Vault API",
        "version": "3.0.0",
        "status": "running",
        "docs": "/docs",
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
