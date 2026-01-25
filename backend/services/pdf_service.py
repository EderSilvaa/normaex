"""
PDF Service - Extração de texto de PDFs
Utiliza PyMuPDF (fitz) para extração eficiente de texto
"""

import fitz  # PyMuPDF
import os
from typing import Tuple, Optional
import logging

logger = logging.getLogger(__name__)


class PDFService:
    """Serviço para processamento e extração de texto de PDFs"""

    @staticmethod
    def extract_text(file_path: str) -> Tuple[str, int, int]:
        """
        Extrai texto de um arquivo PDF.

        Args:
            file_path: Caminho do arquivo PDF

        Returns:
            Tuple contendo:
                - texto extraído
                - número de páginas
                - contagem de palavras

        Raises:
            FileNotFoundError: Se o arquivo não existir
            Exception: Se houver erro na extração
        """
        if not os.path.exists(file_path):
            raise FileNotFoundError(f"Arquivo não encontrado: {file_path}")

        try:
            doc = fitz.open(file_path)
            text_parts = []
            page_count = len(doc)  # Contar páginas ANTES de iterar

            for page_num, page in enumerate(doc):
                page_text = page.get_text("text")
                if page_text.strip():
                    text_parts.append(f"[Página {page_num + 1}]\n{page_text}")

            doc.close()

            full_text = "\n\n".join(text_parts)
            word_count = len(full_text.split()) if full_text else 0

            logger.info(f"PDF extraído: {page_count} páginas, {word_count} palavras")
            return full_text, page_count, word_count

        except Exception as e:
            logger.error(f"Erro ao extrair texto do PDF: {e}")
            raise

    @staticmethod
    def extract_text_limited(file_path: str, max_chars: int = 50000) -> Tuple[str, int, int]:
        """
        Extrai texto de um PDF com limite de caracteres.

        Args:
            file_path: Caminho do arquivo PDF
            max_chars: Limite máximo de caracteres

        Returns:
            Tuple contendo texto (limitado), páginas e palavras
        """
        full_text, page_count, word_count = PDFService.extract_text(file_path)

        if len(full_text) > max_chars:
            truncated = full_text[:max_chars]
            # Tentar cortar em um espaço para não quebrar palavras
            last_space = truncated.rfind(" ")
            if last_space > max_chars * 0.9:
                truncated = truncated[:last_space]
            truncated += "\n\n[... texto truncado ...]"
            return truncated, page_count, len(truncated.split())

        return full_text, page_count, word_count

    @staticmethod
    def get_pdf_info(file_path: str) -> dict:
        """
        Obtém informações básicas de um PDF sem extrair todo o texto.

        Args:
            file_path: Caminho do arquivo PDF

        Returns:
            Dict com informações do PDF
        """
        if not os.path.exists(file_path):
            raise FileNotFoundError(f"Arquivo não encontrado: {file_path}")

        try:
            doc = fitz.open(file_path)
            info = {
                "page_count": len(doc),
                "metadata": doc.metadata,
                "file_size": os.path.getsize(file_path),
            }
            doc.close()
            return info
        except Exception as e:
            logger.error(f"Erro ao obter info do PDF: {e}")
            raise

    @staticmethod
    def is_valid_pdf(file_path: str) -> bool:
        """
        Verifica se o arquivo é um PDF válido.

        Args:
            file_path: Caminho do arquivo

        Returns:
            True se for um PDF válido, False caso contrário
        """
        try:
            doc = fitz.open(file_path)
            is_valid = len(doc) > 0
            doc.close()
            return is_valid
        except Exception:
            return False


# Instância singleton
pdf_service = PDFService()
