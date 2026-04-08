import json
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from pydantic import BaseModel
from database.connection import get_db
from models.document import Document
from models.chat import ChatSession, ChatMessage
from models.user import User
from auth.dependencies import get_current_user
from services.query_engine import ask_question, ask_question_stream

router = APIRouter(prefix="/query", tags=["Query"])


# ---------- Schemas ----------

class QueryRequest(BaseModel):
    question: str
    doc_ids: list[int]
    session_id: int | None = None
    model_provider: str = "ollama"


class SourceInfo(BaseModel):
    doc_id: int
    page_number: int
    text_preview: str
    relevance_score: float


class QueryResponse(BaseModel):
    answer: str
    sources: list[SourceInfo]
    session_id: int
    followups: list[str] = []


# ---------- Helpers ----------

def _resolve_session(db: Session, current_user, payload: QueryRequest) -> ChatSession:
    """Get or create a chat session."""
    if payload.session_id:
        session = db.query(ChatSession).filter(
            ChatSession.id == payload.session_id,
            ChatSession.user_id == current_user.id,
        ).first()
        if not session:
            raise HTTPException(status_code=404, detail="Chat session not found")
        return session

    title = payload.question[:80] + "..." if len(payload.question) > 80 else payload.question
    session = ChatSession(user_id=current_user.id, title=title)
    db.add(session)
    db.commit()
    db.refresh(session)
    return session


def _get_chat_history(db: Session, session: ChatSession, has_session_id: bool) -> list[dict]:
    """Fetch previous messages for follow-up context."""
    if not has_session_id:
        return []
    prev_messages = db.query(ChatMessage).filter(
        ChatMessage.session_id == session.id
    ).order_by(ChatMessage.created_at.asc()).limit(10).all()
    return [{"role": msg.role, "content": msg.content} for msg in prev_messages]


def _resolve_doc_ids(db: Session, current_user, payload_doc_ids: list[int]) -> list[int]:
    """Resolve and validate document IDs."""
    if payload_doc_ids:
        docs = db.query(Document).filter(
            Document.id.in_(payload_doc_ids),
            Document.user_id == current_user.id,
            Document.status == "ready",
        ).all()
    else:
        docs = db.query(Document).filter(
            Document.user_id == current_user.id,
            Document.status == "ready",
        ).all()

    doc_ids = [d.id for d in docs]
    if not doc_ids:
        raise HTTPException(
            status_code=404,
            detail="No processed documents found. Please upload a document first.",
        )
    return doc_ids


def _save_messages(db: Session, session_id: int, question: str, answer: str, sources: list):
    """Persist user and AI messages to the database."""
    db.add(ChatMessage(session_id=session_id, role="user", content=question))
    db.add(ChatMessage(
        session_id=session_id,
        role="ai",
        content=answer,
        sources_json=json.dumps(sources),
    ))
    db.commit()


# ---------- Routes ----------

@router.post("/ask", response_model=QueryResponse)
def ask(
    payload: QueryRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Ask a question with optional chat history context for follow-ups."""
    if not payload.question.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Question cannot be empty",
        )

    session = _resolve_session(db, current_user, payload)
    chat_history = _get_chat_history(db, session, bool(payload.session_id))
    doc_ids = _resolve_doc_ids(db, current_user, payload.doc_ids)

    # Run RAG pipeline
    try:
        result = ask_question(
            payload.question,
            doc_ids,
            chat_history=chat_history,
            model_provider=payload.model_provider,
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"AI query failed: {str(e)}",
        )

    _save_messages(db, session.id, payload.question, result["answer"], result["sources"])

    return QueryResponse(
        answer=result["answer"],
        sources=[SourceInfo(**s) for s in result["sources"]],
        session_id=session.id,
        followups=result.get("followups", []),
    )


@router.post("/ask-stream")
def ask_stream(
    payload: QueryRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Streaming version — returns Server-Sent Events as the LLM generates tokens."""
    if not payload.question.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Question cannot be empty",
        )

    session = _resolve_session(db, current_user, payload)
    chat_history = _get_chat_history(db, session, bool(payload.session_id))
    doc_ids = _resolve_doc_ids(db, current_user, payload.doc_ids)

    def event_generator():
        # Emit session_id so the frontend can track follow-ups
        yield f"data: {json.dumps({'type': 'session_id', 'content': session.id})}\n\n"

        full_answer = ""
        sources = []

        try:
            for event in ask_question_stream(
                payload.question,
                doc_ids,
                chat_history=chat_history,
                model_provider=payload.model_provider,
            ):
                event_type = event["type"]

                if event_type == "sources":
                    sources = event["content"]
                    yield f"data: {json.dumps({'type': 'sources', 'content': sources})}\n\n"

                elif event_type == "token":
                    yield f"data: {json.dumps({'type': 'token', 'content': event['content']})}\n\n"

                elif event_type == "followups":
                    yield f"data: {json.dumps({'type': 'followups', 'content': event['content']})}\n\n"

                elif event_type == "done":
                    full_answer = event["content"]
                    yield f"data: {json.dumps({'type': 'done'})}\n\n"

                elif event_type == "error":
                    yield f"data: {json.dumps({'type': 'error', 'content': event['content']})}\n\n"
                    return

        except Exception as e:
            yield f"data: {json.dumps({'type': 'error', 'content': str(e)})}\n\n"
            return

        # Persist messages after streaming completes
        try:
            _save_messages(db, session.id, payload.question, full_answer, sources)
        except Exception:
            pass  # Don't fail the stream if save fails

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )
