from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status
from sqlalchemy.orm import Session
from pydantic import BaseModel
from database.connection import get_db
from models.document import Document
from models.user import User
from auth.dependencies import get_current_user
from utils.file_handler import save_upload_file, delete_upload_file
from services.file_extractor import extract_text, get_page_count
from services.chunking import chunk_text
from services.embeddings import generate_embeddings
from services.vector_store import store_vectors, delete_vectors
from services.summarizer import generate_summary
from services.crawler import scrape_url, is_valid_url
import uuid

router = APIRouter(prefix="/documents", tags=["Documents"])

ALLOWED_EXTENSIONS = {".pdf", ".docx", ".txt"}


# ---------- Schemas ----------

class DocumentResponse(BaseModel):
    id: int
    filename: str
    original_name: str
    upload_date: str
    page_count: int
    chunk_count: int
    status: str
    summary: str
    tags: list[str]


class DocumentListResponse(BaseModel):
    documents: list[DocumentResponse]
    total: int


class CrawlRequest(BaseModel):
    url: str


def _doc_to_response(doc: Document) -> DocumentResponse:
    return DocumentResponse(
        id=doc.id,
        filename=doc.filename,
        original_name=doc.original_name,
        upload_date=str(doc.upload_date),
        page_count=doc.page_count,
        chunk_count=doc.chunk_count,
        status=doc.status,
        summary=doc.summary or "",
        tags=[t.strip() for t in (doc.tags or "").split(",") if t.strip()],
    )


# ---------- Routes ----------

@router.post("/upload", response_model=DocumentResponse, status_code=status.HTTP_201_CREATED)
async def upload_document(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Upload a document (PDF, DOCX, TXT), process it, and generate summary."""
    # Validate file type
    import os
    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported file type. Allowed: {', '.join(ALLOWED_EXTENSIONS)}",
        )

    # Save file
    file_bytes = await file.read()
    unique_name, full_path = save_upload_file(file_bytes, file.filename)

    # Create document record
    doc = Document(
        user_id=current_user.id,
        filename=unique_name,
        original_name=file.filename,
        status="processing",
    )
    db.add(doc)
    db.commit()
    db.refresh(doc)

    try:
        # Extract text (supports PDF, DOCX, TXT)
        pages = extract_text(full_path)
        page_count = get_page_count(full_path)

        # Chunk text
        chunks = chunk_text(pages)

        # Generate embeddings
        texts = [c["text"] for c in chunks]
        embeddings = generate_embeddings(texts)

        # Store vectors
        store_vectors(doc.id, embeddings, chunks)

        # Generate summary and tags
        try:
            summary_data = generate_summary(pages)
            doc.summary = summary_data["summary"]
            doc.tags = ", ".join(summary_data["tags"])
        except Exception:
            doc.summary = "Summary generation failed."
            doc.tags = "document"

        # Update document record
        doc.page_count = page_count
        doc.chunk_count = len(chunks)
        doc.status = "ready"
        db.commit()
        db.refresh(doc)

    except Exception as e:
        doc.status = "error"
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error processing document: {str(e)}",
        )

    return _doc_to_response(doc)


@router.post("/crawl", response_model=DocumentResponse, status_code=status.HTTP_201_CREATED)
def crawl_website(
    payload: CrawlRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Scrape a website and add it as a document."""
    if not is_valid_url(payload.url):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid URL format",
        )

    try:
        # Scrape
        data = scrape_url(payload.url)
        content = data["text"]
        title = data["title"]
        
        # Save as text file
        file_name = f"web_{uuid.uuid4().hex}.txt"
        file_bytes = content.encode("utf-8")
        unique_name, full_path = save_upload_file(file_bytes, file_name)
        
        # Create doc record
        doc = Document(
            user_id=current_user.id,
            filename=unique_name,
            original_name=payload.url,
            status="processing",
            tags="website",
        )
        db.add(doc)
        db.commit()
        db.refresh(doc)
        
        # Process (Chunk → Embed → Store)
        pages = [{"text": content, "page_number": 1}]
        chunks = chunk_text(pages)
        
        texts = [c["text"] for c in chunks]
        embeddings = generate_embeddings(texts)
        store_vectors(doc.id, embeddings, chunks)
        
        # Summary
        try:
            summary_data = generate_summary(pages)
            doc.summary = summary_data["summary"]
            doc.tags = "website, " + ", ".join(summary_data["tags"])
        except Exception:
            doc.summary = f"Content from {title}"
            
        doc.page_count = 1
        doc.chunk_count = len(chunks)
        doc.status = "ready"
        db.commit()
        db.refresh(doc)
        
        return _doc_to_response(doc)

    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Crawling failed: {str(e)}")


@router.get("/", response_model=DocumentListResponse)
def list_documents(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List all documents for the current user."""
    docs = db.query(Document).filter(
        Document.user_id == current_user.id
    ).order_by(Document.upload_date.desc()).all()

    return DocumentListResponse(
        documents=[_doc_to_response(d) for d in docs],
        total=len(docs),
    )


@router.delete("/{doc_id}", status_code=200)
def delete_document(
    doc_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Delete a document and its associated vectors."""
    doc = db.query(Document).filter(
        Document.id == doc_id,
        Document.user_id == current_user.id,
    ).first()

    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    delete_vectors(doc.id)
    delete_upload_file(doc.filename)
    db.delete(doc)
    db.commit()

    return {"message": "Document deleted successfully"}


@router.get("/export")
def export_data(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Export all user documents and metadata as JSON."""
    docs = db.query(Document).filter(Document.user_id == current_user.id).all()
    
    export_data = []
    for doc in docs:
        export_data.append({
            "id": doc.id,
            "filename": doc.filename,
            "original_name": doc.original_name,
            "upload_date": str(doc.upload_date),
            "summary": doc.summary,
            "tags": doc.tags,
            "type": "web" if doc.original_name.startswith("http") else "file"
        })
        
    return {
        "version": "1.0",
        "user_id": current_user.id,
        "document_count": len(docs),
        "data": export_data
    }
