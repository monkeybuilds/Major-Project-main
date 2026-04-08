import fitz  # PyMuPDF


def extract_text_from_pdf(file_path: str) -> list[str]:
    """
    Extract text from a PDF file, page by page.
    Returns a list of strings, one per page.
    """
    pages = []
    doc = fitz.open(file_path)
    for page in doc:
        text = page.get_text("text")
        if text.strip():
            pages.append(text.strip())
    doc.close()
    return pages


def get_page_count(file_path: str) -> int:
    """Return the total number of pages in a PDF."""
    doc = fitz.open(file_path)
    count = len(doc)
    doc.close()
    return count
