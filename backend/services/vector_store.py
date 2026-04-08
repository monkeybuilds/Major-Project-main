import json
import faiss
import numpy as np
from pathlib import Path
from config import VECTOR_STORE_DIR


def _index_path(doc_id: int) -> Path:
    return Path(VECTOR_STORE_DIR) / f"doc_{doc_id}.index"


def _meta_path(doc_id: int) -> Path:
    return Path(VECTOR_STORE_DIR) / f"doc_{doc_id}_meta.json"


def store_vectors(doc_id: int, embeddings: np.ndarray, chunks: list[dict]):
    """
    Store embeddings in a FAISS index and save chunk metadata.
    Each document gets its own index for easy deletion.
    """
    dimension = embeddings.shape[1]
    index = faiss.IndexFlatL2(dimension)
    index.add(embeddings.astype(np.float32))

    faiss.write_index(index, str(_index_path(doc_id)))

    # Save metadata (text + page number for each chunk)
    meta = []
    for chunk in chunks:
        meta.append({
            "text": chunk["text"],
            "page_number": chunk["page_number"],
            "chunk_index": chunk["chunk_index"],
        })
    with open(_meta_path(doc_id), "w", encoding="utf-8") as f:
        json.dump(meta, f, ensure_ascii=False)


def search_vectors(doc_id: int, query_embedding: np.ndarray, top_k: int = 5) -> list[dict]:
    """
    Search for the top-k most similar chunks in a document's vector store.
    Returns a list of dicts with 'text', 'page_number', 'score'.
    """
    idx_path = _index_path(doc_id)
    met_path = _meta_path(doc_id)

    if not idx_path.exists() or not met_path.exists():
        return []

    index = faiss.read_index(str(idx_path))
    with open(met_path, "r", encoding="utf-8") as f:
        meta = json.load(f)

    query_vec = query_embedding.reshape(1, -1).astype(np.float32)
    distances, indices = index.search(query_vec, min(top_k, index.ntotal))

    results = []
    for dist, idx in zip(distances[0], indices[0]):
        if idx < len(meta) and idx >= 0:
            results.append({
                "text": meta[idx]["text"],
                "page_number": meta[idx]["page_number"],
                "score": float(dist),
            })

    return results


def search_all_user_docs(doc_ids: list[int], query_embedding: np.ndarray, top_k: int = 5) -> list[dict]:
    """Search across multiple documents and return the best results."""
    all_results = []
    for doc_id in doc_ids:
        results = search_vectors(doc_id, query_embedding, top_k=top_k)
        for r in results:
            r["doc_id"] = doc_id
        all_results.extend(results)

    # Sort by score (lower L2 distance = better) and return top_k
    all_results.sort(key=lambda x: x["score"])
    return all_results[:top_k]


def delete_vectors(doc_id: int):
    """Delete the FAISS index and metadata for a document."""
    idx_path = _index_path(doc_id)
    met_path = _meta_path(doc_id)
    if idx_path.exists():
        idx_path.unlink()
    if met_path.exists():
        met_path.unlink()
