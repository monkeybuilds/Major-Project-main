import json
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel
from database.connection import get_db
from models.chat import ChatSession, ChatMessage
from models.user import User
from auth.dependencies import get_current_user

router = APIRouter(prefix="/chat", tags=["Chat History"])


# ---------- Schemas ----------

class SessionResponse(BaseModel):
    id: int
    title: str
    created_at: str
    updated_at: str
    message_count: int


class MessageResponse(BaseModel):
    id: int
    role: str
    content: str
    sources: list
    created_at: str


class SessionListResponse(BaseModel):
    sessions: list[SessionResponse]


class SessionDetailResponse(BaseModel):
    id: int
    title: str
    messages: list[MessageResponse]


# ---------- Routes ----------

@router.get("/sessions", response_model=SessionListResponse)
def list_sessions(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List all chat sessions for the current user."""
    sessions = db.query(ChatSession).filter(
        ChatSession.user_id == current_user.id
    ).order_by(ChatSession.updated_at.desc()).all()

    result = []
    for s in sessions:
        msg_count = db.query(ChatMessage).filter(
            ChatMessage.session_id == s.id
        ).count()
        result.append(SessionResponse(
            id=s.id,
            title=s.title,
            created_at=str(s.created_at),
            updated_at=str(s.updated_at),
            message_count=msg_count,
        ))

    return SessionListResponse(sessions=result)


@router.get("/sessions/{session_id}", response_model=SessionDetailResponse)
def get_session(
    session_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get all messages in a chat session."""
    session = db.query(ChatSession).filter(
        ChatSession.id == session_id,
        ChatSession.user_id == current_user.id,
    ).first()

    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    messages = db.query(ChatMessage).filter(
        ChatMessage.session_id == session_id
    ).order_by(ChatMessage.created_at.asc()).all()

    return SessionDetailResponse(
        id=session.id,
        title=session.title,
        messages=[
            MessageResponse(
                id=m.id,
                role=m.role,
                content=m.content,
                sources=json.loads(m.sources_json) if m.sources_json else [],
                created_at=str(m.created_at),
            )
            for m in messages
        ],
    )


@router.delete("/sessions/{session_id}", status_code=200)
def delete_session(
    session_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Delete a chat session and all its messages."""
    session = db.query(ChatSession).filter(
        ChatSession.id == session_id,
        ChatSession.user_id == current_user.id,
    ).first()

    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    db.query(ChatMessage).filter(ChatMessage.session_id == session_id).delete()
    db.delete(session)
    db.commit()

    return {"message": "Session deleted"}
