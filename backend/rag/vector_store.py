import re
import math
from typing import List, Dict, Any
from ..database import get_document_contents

class BM25Retriever:
    def __init__(self, k1: float = 1.5, b: float = 0.75):
        self.k1 = k1
        self.b = b

    def _tokenize(self, text: str) -> List[str]:
        # Lowercase, remove non-alphanumeric except spaces, split
        text = text.lower()
        text = re.sub(r'[^a-z0-9\s]', ' ', text)
        return [word for word in text.split() if len(word) > 1]

    def _chunk_text(self, text: str, file_name: str, chunk_size: int = 150, overlap: int = 30) -> List[Dict[str, Any]]:
        words = text.split()
        chunks = []
        i = 0
        while i < len(words):
            chunk_words = words[i:i + chunk_size]
            chunk_text = " ".join(chunk_words)
            chunks.append({
                "file_name": file_name,
                "content": chunk_text,
                "tokens": self._tokenize(chunk_text)
            })
            i += (chunk_size - overlap)
        return chunks

    def retrieve(self, project_id: int, query: str, top_k: int = 4) -> List[Dict[str, Any]]:
        # Fetch documents from database
        docs = get_document_contents(project_id)
        if not docs:
            return []

        # 1. Create chunks from all documents
        all_chunks = []
        for doc in docs:
            chunks = self._chunk_text(doc["content"], doc["file_name"])
            all_chunks.extend(chunks)

        if not all_chunks:
            return []

        # 2. Build frequency stats
        num_chunks = len(all_chunks)
        avg_chunk_len = sum(len(c["tokens"]) for c in all_chunks) / num_chunks if num_chunks > 0 else 0
        
        # Doc frequencies (how many chunks contain a token)
        doc_freqs = {}
        for chunk in all_chunks:
            unique_tokens = set(chunk["tokens"])
            for token in unique_tokens:
                doc_freqs[token] = doc_freqs.get(token, 0) + 1

        # Tokenize query
        query_tokens = self._tokenize(query)
        if not query_tokens:
            # Fallback if no valid search terms
            return all_chunks[:top_k]

        # 3. Calculate BM25 scores for each chunk
        scored_chunks = []
        for idx, chunk in enumerate(all_chunks):
            score = 0.0
            tokens = chunk["tokens"]
            chunk_len = len(tokens)
            
            # Count terms in chunk
            term_counts = {}
            for token in tokens:
                term_counts[token] = term_counts.get(token, 0) + 1

            for q_token in query_tokens:
                if q_token not in doc_freqs:
                    continue
                
                # IDF
                df = doc_freqs[q_token]
                idf = math.log(1.0 + (num_chunks - df + 0.5) / (df + 0.5))
                
                # TF in current chunk
                tf = term_counts.get(q_token, 0)
                
                # Score component
                numerator = tf * (self.k1 + 1)
                denominator = tf + self.k1 * (1.0 - self.b + self.b * (chunk_len / (avg_chunk_len or 1.0)))
                score += idf * (numerator / denominator)
            
            if score > 0:
                scored_chunks.append((score, chunk))

        # Sort by score descending
        scored_chunks.sort(key=lambda x: x[0], reverse=True)
        
        # Format results
        results = []
        for score, chunk in scored_chunks[:top_k]:
            results.append({
                "file_name": chunk["file_name"],
                "content": chunk["content"],
                "score": round(score, 4)
            })
            
        # If score matches are empty but we have documents, return first few chunks as fallback
        if not results:
            for chunk in all_chunks[:top_k]:
                results.append({
                    "file_name": chunk["file_name"],
                    "content": chunk["content"][:200] + "...",
                    "score": 0.0
                })

        return results

# Singleton instance
retriever = BM25Retriever()
