from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel
from database.connection import get_db
from models.document import Document
from models.user import User
from auth.dependencies import get_current_user
from services.academic_engine import generate_academic_content

router = APIRouter(prefix="/academic", tags=["Academic"])


class AcademicRequest(BaseModel):
    doc_ids: list[int]
    mode: str = "exam_notes"
    style: str = "simple"
    topic: str | None = None
    question: str | None = None
    model_provider: str = "ollama"


class SourceInfo(BaseModel):
    doc_id: int
    page_number: int
    text_preview: str
    relevance_score: float


class AcademicResponse(BaseModel):
    content: str
    sources: list[SourceInfo]
    mode: str


VALID_MODES = {
    "exam_notes", "mcqs", "viva", "flashcards",
    "summary", "definitions", "assignment", "compare", "ask"
}

VALID_STYLES = {"simple", "technical", "bullet", "detailed"}


@router.post("/generate", response_model=AcademicResponse)
def generate(
    payload: AcademicRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Generate academic content from uploaded documents."""
    if payload.mode not in VALID_MODES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid mode. Allowed: {', '.join(sorted(VALID_MODES))}",
        )
    if payload.style not in VALID_STYLES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid style. Allowed: {', '.join(sorted(VALID_STYLES))}",
        )

    # Verify user owns these documents
    docs = db.query(Document).filter(
        Document.id.in_(payload.doc_ids),
        Document.user_id == current_user.id,
        Document.status == "ready",
    ).all()
    doc_ids = [d.id for d in docs]

    if not doc_ids:
        raise HTTPException(
            status_code=404,
            detail="No processed documents found. Please upload a document first.",
        )

    try:
        result = generate_academic_content(
            doc_ids=doc_ids,
            mode=payload.mode,
            style=payload.style,
            topic=payload.topic,
            question=payload.question,
            model_provider=payload.model_provider,
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Generation failed: {str(e)}",
        )

    return AcademicResponse(
        content=result["content"],
        sources=[SourceInfo(**s) for s in result["sources"]],
        mode=result["mode"],
    )
