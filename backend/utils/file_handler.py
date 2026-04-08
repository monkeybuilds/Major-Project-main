import uuid
import os
from pathlib import Path
from config import UPLOAD_DIR


def save_upload_file(file_bytes: bytes, original_filename: str) -> tuple[str, str]:
    """
    Save uploaded file to disk with a unique filename.
    Returns (unique_filename, full_path).
    """
    ext = Path(original_filename).suffix
    unique_name = f"{uuid.uuid4().hex}{ext}"
    full_path = os.path.join(str(UPLOAD_DIR), unique_name)

    with open(full_path, "wb") as f:
        f.write(file_bytes)

    return unique_name, full_path


def delete_upload_file(filename: str):
    """Delete an uploaded file from disk."""
    path = os.path.join(str(UPLOAD_DIR), filename)
    if os.path.exists(path):
        os.remove(path)
