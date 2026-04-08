from sentence_transformers import SentenceTransformer
from config import EMBEDDING_MODEL_NAME
import numpy as np

# Lazy-loaded model singleton
_model: SentenceTransformer | None = None


def _get_model() -> SentenceTransformer:
    """Get or initialise the embedding model (singleton)."""
    global _model
    if _model is None:
        _model = SentenceTransformer(EMBEDDING_MODEL_NAME)
    return _model


def generate_embeddings(texts: list[str]) -> np.ndarray:
    """
    Generate embeddings for a list of text strings.
    Returns a numpy array of shape (n_texts, embedding_dim).
    """
    model = _get_model()
    embeddings = model.encode(texts, show_progress_bar=False, convert_to_numpy=True)
    return embeddings


def generate_single_embedding(text: str) -> np.ndarray:
    """Generate an embedding for a single text string."""
    model = _get_model()
    embedding = model.encode([text], show_progress_bar=False, convert_to_numpy=True)
    return embedding[0]
