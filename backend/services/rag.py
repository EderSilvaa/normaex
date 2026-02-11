"""
Serviço de RAG (Retrieval-Augmented Generation) simples em memória.
Usa embeddings do Gemini para buscar trechos relevantes de documentos longos.
"""

import google.generativeai as genai
import numpy as np
import os
from typing import List, Dict, Any

import hashlib

# Configurar API Key (já configurada no main/ai.py, mas garantindo acesso aqui)
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
if GEMINI_API_KEY:
    genai.configure(api_key=GEMINI_API_KEY)


class SimpleRAG:
    def __init__(self):
        self.chunks: List[Dict[str, Any]] = []
        self.model_name = "models/text-embedding-004" # Ou embedding-001
        self.last_hash = ""

    def clear(self):
        self.chunks = []
        self.last_hash = ""

    def chunk_document(self, text: str, chunk_size: int = 1000, overlap: int = 200) -> int:
        """
        Divide o documento em chunks e gera embeddings.
        Retorna o número de chunks gerados. Uses caching based on content hash.
        """
        if not text:
            return 0

        # Calcular hash do conteúdo para cache
        content_hash = hashlib.md5(text.encode('utf-8')).hexdigest()
        
        # Se o conteúdo não mudou, usar cache
        if self.last_hash == content_hash and self.chunks:
            # print(f"[RAG] Usando cache para hash {content_hash[:8]}")
            return len(self.chunks)
            
        self.clear()
        self.last_hash = content_hash
        
        # Dividir em chunks
        start = 0
        text_len = len(text)
        
        chunks_text = []
        while start < text_len:
            end = start + chunk_size
            chunk = text[start:end]
            chunks_text.append(chunk)
            start += chunk_size - overlap
            
        if not chunks_text:
            return 0

        # Gerar embeddings em lote (limite de 100 por vez para evitar erros)
        batch_size = 20
        all_embeddings = []
        
        try:
            for i in range(0, len(chunks_text), batch_size):
                batch = chunks_text[i:i+batch_size]
                # Title é opcional, mas ajuda na qualidade
                result = genai.embed_content(
                    model=self.model_name,
                    content=batch,
                    task_type="retrieval_document",
                    title="Academic Document Segment"
                )
                all_embeddings.extend(result['embedding'])
                
            # Armazenar
            for i, text_chunk in enumerate(chunks_text):
                self.chunks.append({
                    "id": i,
                    "text": text_chunk,
                    "embedding": all_embeddings[i]
                })
                
            print(f"[RAG] Indexados {len(self.chunks)} chunks.")
            return len(self.chunks)
            
        except Exception as e:
            print(f"[RAG] Erro ao gerar embeddings: {e}")
            return 0

    def retrieve(self, query: str, top_k: int = 3) -> List[str]:
        """
        Busca os chunks mais relevantes para a query.
        """
        if not self.chunks:
            return []

        try:
            # Gerar embedding da query
            query_embedding = genai.embed_content(
                model=self.model_name,
                content=query,
                task_type="retrieval_query"
            )['embedding']
            
            # Calcular similaridade (produto escalar)
            # Assumindo vetores normalizados (Gemini geralmente retorna normalizados?)
            # Se não, precisaria de cosine_similarity completo.
            # Para simplificar, produto escalar é suficiente para ranking.
            
            scores = []
            q_vec = np.array(query_embedding)
            
            for chunk in self.chunks:
                c_vec = np.array(chunk['embedding'])
                # Cosine similarity: (A . B) / (||A|| * ||B||)
                dot_product = np.dot(q_vec, c_vec)
                norm_q = np.linalg.norm(q_vec)
                norm_c = np.linalg.norm(c_vec)
                similarity = dot_product / (norm_q * norm_c)
                scores.append((similarity, chunk['text']))
                
            # Ordenar por similaridade decrescente
            scores.sort(key=lambda x: x[0], reverse=True)
            
            # Retornar top_k textos
            return [item[1] for item in scores[:top_k]]
            
        except Exception as e:
            print(f"[RAG] Erro na busca: {e}")
            return []

# Instância global para uso simples
rag_service = SimpleRAG()
