import numpy as np
from rank_bm25 import BM25Okapi
from services.vector_store import search_all_user_docs, _meta_path
from services.embeddings import generate_single_embedding
import json
import os

class HybridRetriever:
    def __init__(self):
        pass

    def search(self, query: str, doc_ids: list[int], top_k: int = 5) -> list[dict]:
        """
        Perform Hybrid Search: Vector Search + Keyword Search (BM25)
        and combine results using Reciprocal Rank Fusion (RRF).
        """
        # 1. Vector Search
        query_embedding = generate_single_embedding(query)
        vector_results = search_all_user_docs(doc_ids, query_embedding, top_k=top_k * 2) # Get more candidates

        # 2. Keyword Search (BM25)
        keyword_results = self._bm25_search(query, doc_ids, top_k=top_k * 2)

        # 3. RRF Fusion
        fused_results = self._rrf_fusion(vector_results, keyword_results, k=60)
        
        # Return top_k
        return fused_results[:top_k]

    def _bm25_search(self, query: str, doc_ids: list[int], top_k: int = 5) -> list[dict]:
        """
        Run BM25 search on selected documents.
        Note: This loads all text into memory. For production, use a dedicated search engine (Elasticsearch/Solr).
        """
        corpus = []
        metadata_map = [] # To map index back to metadata

        for doc_id in doc_ids:
            path = _meta_path(doc_id)
            if not path.exists():
                continue
                
            try:
                with open(path, "r", encoding="utf-8") as f:
                    chunks = json.load(f)
                    for chunk in chunks:
                        text = chunk["text"]
                        corpus.append(text)
                        metadata_map.append({
                            "doc_id": doc_id,
                            "page_number": chunk["page_number"],
                            "text": text
                        })
            except:
                continue
        
        if not corpus:
            return []

        # Tokenize (simple splitting)
        tokenized_corpus = [doc.lower().split() for doc in corpus]
        bm25 = BM25Okapi(tokenized_corpus)
        
        tokenized_query = query.lower().split()
        scores = bm25.get_scores(tokenized_query)
        
        # Get top indices
        top_n = min(len(scores), top_k)
        top_indices = np.argsort(scores)[::-1][:top_n]
        
        results = []
        for idx in top_indices:
            if scores[idx] > 0: # Only relevant results
                meta = metadata_map[idx]
                results.append({
                    "doc_id": meta["doc_id"],
                    "page_number": meta["page_number"],
                    "text": meta["text"],
                    "score": float(scores[idx]) # BM25 score 
                })
                
        return results

    def _rrf_fusion(self, vector_results: list[dict], keyword_results: list[dict], k: int = 60) -> list[dict]:
        """
        Reciprocal Rank Fusion.
        Score = 1 / (rank + k)
        """
        # Map unique chunk ID (doc_id + page + text_hash) to score
        # Since we don't have unique chunk ID, we use text as key (assuming unique enough)
        
        fusion_scores = {}
        doc_map = {} # Store full object

        # Process Vector Results
        for rank, doc in enumerate(vector_results):
            key = (doc["doc_id"], doc["page_number"], doc["text"][:50]) # heuristic key
            if key not in fusion_scores:
                fusion_scores[key] = 0
                doc_map[key] = doc
            fusion_scores[key] += 1 / (rank + 1 + k)

        # Process Keyword Results
        for rank, doc in enumerate(keyword_results):
            key = (doc["doc_id"], doc["page_number"], doc["text"][:50])
            if key not in fusion_scores:
                fusion_scores[key] = 0
                doc_map[key] = doc
            fusion_scores[key] += 1 / (rank + 1 + k)

        # Sort by fused score
        sorted_keys = sorted(fusion_scores.keys(), key=lambda x: fusion_scores[x], reverse=True)
        
        results = []
        for key in sorted_keys:
            doc = doc_map[key]
            doc["score"] = fusion_scores[key] # Update score to RRF score
            results.append(doc)
            
        return results
