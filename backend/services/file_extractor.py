import fitz  # PyMuPDF
from pathlib import Path


def extract_text(file_path: str) -> list[str]:
    """
    Extract text from a file based on its extension.
    Supports: PDF, DOCX, TXT
    Returns a list of strings (one per page/section).
    """
    ext = Path(file_path).suffix.lower()

    if ext == ".pdf":
        return _extract_from_pdf(file_path)
    elif ext == ".docx":
        return _extract_from_docx(file_path)
    elif ext == ".txt":
        return _extract_from_txt(file_path)
    else:
        raise ValueError(f"Unsupported file type: {ext}")


def get_page_count(file_path: str) -> int:
    """Return page count (for PDFs) or 1 for other formats."""
    ext = Path(file_path).suffix.lower()
    if ext == ".pdf":
        doc = fitz.open(file_path)
        count = len(doc)
        doc.close()
        return count
    return 1


def _extract_from_pdf(file_path: str) -> list[str]:
    """Extract text from PDF, page by page."""
    pages = []
    doc = fitz.open(file_path)
    for page in doc:
        text = page.get_text("text")
        if text.strip():
            pages.append(text.strip())
    doc.close()
    return pages


def _extract_from_docx(file_path: str) -> list[str]:
    """Extract text from DOCX file."""
    from docx import Document
    doc = Document(file_path)
    full_text = []
    current_section = []

    for para in doc.paragraphs:
        text = para.text.strip()
        if text:
            current_section.append(text)
        # Break into sections of ~20 paragraphs
        if len(current_section) >= 20:
            full_text.append("\n".join(current_section))
            current_section = []

    if current_section:
        full_text.append("\n".join(current_section))

    return full_text if full_text else [""]


def _extract_from_txt(file_path: str) -> list[str]:
    """Extract text from TXT file."""
    with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
        content = f.read()

    # Split into sections of ~2000 chars
    sections = []
    while content:
        sections.append(content[:2000].strip())
        content = content[2000:]

    return sections if sections else [""]
