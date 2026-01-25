"""
Project Service - Gerenciamento de projetos e PDFs
Persiste dados em arquivos JSON para simplicidade
"""

import os
import json
import shutil
from typing import List, Optional
from datetime import datetime
import logging

from models.project_models import (
    Project,
    ProjectSummary,
    PDFDocument,
    PDFSummary,
    PDFStatus,
    CreateProjectRequest,
    UpdateProjectRequest,
)
from services.pdf_service import pdf_service

logger = logging.getLogger(__name__)

# Diretórios de armazenamento
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PROJECTS_DIR = os.path.join(BASE_DIR, "data", "projects")
PROJECTS_FILE = os.path.join(BASE_DIR, "data", "projects.json")
PDF_UPLOADS_DIR = os.path.join(BASE_DIR, "uploads", "pdfs")


class ProjectService:
    """Serviço para gerenciamento de projetos e PDFs"""

    def __init__(self):
        self._ensure_directories()
        self._projects: dict[str, Project] = {}
        self._load_projects()

    def _ensure_directories(self):
        """Garante que os diretórios necessários existam"""
        os.makedirs(PROJECTS_DIR, exist_ok=True)
        os.makedirs(PDF_UPLOADS_DIR, exist_ok=True)
        os.makedirs(os.path.dirname(PROJECTS_FILE), exist_ok=True)

    def _load_projects(self):
        """Carrega projetos do arquivo JSON"""
        if os.path.exists(PROJECTS_FILE):
            try:
                with open(PROJECTS_FILE, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    for proj_data in data.get("projects", []):
                        # Converter strings de data para datetime
                        if isinstance(proj_data.get("created_at"), str):
                            proj_data["created_at"] = datetime.fromisoformat(proj_data["created_at"])
                        if isinstance(proj_data.get("updated_at"), str):
                            proj_data["updated_at"] = datetime.fromisoformat(proj_data["updated_at"])
                        for pdf in proj_data.get("pdfs", []):
                            if isinstance(pdf.get("upload_date"), str):
                                pdf["upload_date"] = datetime.fromisoformat(pdf["upload_date"])
                        project = Project(**proj_data)
                        self._projects[project.id] = project
                logger.info(f"Carregados {len(self._projects)} projetos")
            except Exception as e:
                logger.error(f"Erro ao carregar projetos: {e}")
                self._projects = {}
        else:
            self._projects = {}

    def _save_projects(self):
        """Salva projetos no arquivo JSON"""
        try:
            data = {
                "projects": [proj.model_dump() for proj in self._projects.values()]
            }
            with open(PROJECTS_FILE, "w", encoding="utf-8") as f:
                json.dump(data, f, ensure_ascii=False, indent=2, default=str)
            logger.info(f"Salvos {len(self._projects)} projetos")
        except Exception as e:
            logger.error(f"Erro ao salvar projetos: {e}")
            raise

    # ============================================
    # CRUD de Projetos
    # ============================================

    def create_project(self, request: CreateProjectRequest) -> Project:
        """Cria um novo projeto"""
        project = Project(
            name=request.name,
            description=request.description,
        )
        self._projects[project.id] = project
        self._save_projects()
        logger.info(f"Projeto criado: {project.id} - {project.name}")
        return project

    def get_project(self, project_id: str) -> Optional[Project]:
        """Obtém um projeto pelo ID"""
        return self._projects.get(project_id)

    def list_projects(self, include_inactive: bool = False) -> List[ProjectSummary]:
        """Lista todos os projetos como resumos"""
        summaries = []
        for project in self._projects.values():
            if not include_inactive and not project.is_active:
                continue
            summaries.append(ProjectSummary(
                id=project.id,
                name=project.name,
                description=project.description,
                pdf_count=len(project.pdfs),
                total_words=sum(pdf.word_count for pdf in project.pdfs if pdf.status == PDFStatus.READY),
                created_at=project.created_at,
                is_active=project.is_active,
            ))
        return sorted(summaries, key=lambda x: x.created_at, reverse=True)

    def update_project(self, project_id: str, request: UpdateProjectRequest) -> Optional[Project]:
        """Atualiza um projeto"""
        project = self._projects.get(project_id)
        if not project:
            return None

        if request.name is not None:
            project.name = request.name
        if request.description is not None:
            project.description = request.description
        if request.is_active is not None:
            project.is_active = request.is_active

        project.updated_at = datetime.now()
        self._save_projects()
        logger.info(f"Projeto atualizado: {project_id}")
        return project

    def delete_project(self, project_id: str) -> bool:
        """Deleta um projeto e seus PDFs"""
        project = self._projects.get(project_id)
        if not project:
            return False

        # Deletar arquivos PDF associados
        for pdf in project.pdfs:
            try:
                if os.path.exists(pdf.file_path):
                    os.remove(pdf.file_path)
            except Exception as e:
                logger.warning(f"Erro ao deletar PDF {pdf.id}: {e}")

        del self._projects[project_id]
        self._save_projects()
        logger.info(f"Projeto deletado: {project_id}")
        return True

    # ============================================
    # Gerenciamento de PDFs
    # ============================================

    def add_pdf_to_project(
        self,
        project_id: str,
        filename: str,
        file_content: bytes,
    ) -> Optional[PDFDocument]:
        """Adiciona um PDF a um projeto"""
        project = self._projects.get(project_id)
        if not project:
            return None

        # Gerar caminho único para o arquivo
        pdf_doc = PDFDocument(
            filename=filename,
            file_path="",  # Será preenchido após salvar
            status=PDFStatus.PENDING,
        )

        # Salvar arquivo
        project_pdf_dir = os.path.join(PDF_UPLOADS_DIR, project_id)
        os.makedirs(project_pdf_dir, exist_ok=True)
        file_path = os.path.join(project_pdf_dir, f"{pdf_doc.id}_{filename}")

        try:
            with open(file_path, "wb") as f:
                f.write(file_content)
            pdf_doc.file_path = file_path
        except Exception as e:
            logger.error(f"Erro ao salvar PDF: {e}")
            pdf_doc.status = PDFStatus.ERROR
            pdf_doc.error_message = str(e)
            return pdf_doc

        # Processar PDF (extrair texto)
        try:
            pdf_doc.status = PDFStatus.PROCESSING
            text, pages, words = pdf_service.extract_text_limited(file_path)
            pdf_doc.extracted_text = text
            pdf_doc.page_count = pages
            pdf_doc.word_count = words
            pdf_doc.status = PDFStatus.READY
        except Exception as e:
            logger.error(f"Erro ao processar PDF: {e}")
            pdf_doc.status = PDFStatus.ERROR
            pdf_doc.error_message = str(e)

        # Adicionar ao projeto
        project.pdfs.append(pdf_doc)
        project.updated_at = datetime.now()
        self._save_projects()

        logger.info(f"PDF adicionado ao projeto {project_id}: {filename}")
        return pdf_doc

    def get_pdf(self, project_id: str, pdf_id: str) -> Optional[PDFDocument]:
        """Obtém um PDF específico de um projeto"""
        project = self._projects.get(project_id)
        if not project:
            return None

        for pdf in project.pdfs:
            if pdf.id == pdf_id:
                return pdf
        return None

    def remove_pdf_from_project(self, project_id: str, pdf_id: str) -> bool:
        """Remove um PDF de um projeto"""
        project = self._projects.get(project_id)
        if not project:
            return False

        for i, pdf in enumerate(project.pdfs):
            if pdf.id == pdf_id:
                # Deletar arquivo
                try:
                    if os.path.exists(pdf.file_path):
                        os.remove(pdf.file_path)
                except Exception as e:
                    logger.warning(f"Erro ao deletar arquivo PDF: {e}")

                # Remover da lista
                project.pdfs.pop(i)
                project.updated_at = datetime.now()
                self._save_projects()
                logger.info(f"PDF removido: {pdf_id} do projeto {project_id}")
                return True

        return False

    # ============================================
    # Contexto para Chat
    # ============================================

    def get_project_context(self, project_id: str, max_chars: int = 10000) -> Optional[str]:
        """Obtém o contexto combinado de todos os PDFs de um projeto"""
        project = self._projects.get(project_id)
        if not project:
            return None

        return project.get_combined_context(max_chars)

    def get_project_context_info(self, project_id: str) -> Optional[dict]:
        """Obtém informações sobre o contexto de um projeto"""
        project = self._projects.get(project_id)
        if not project:
            return None

        ready_pdfs = [pdf for pdf in project.pdfs if pdf.status == PDFStatus.READY]
        total_words = sum(pdf.word_count for pdf in ready_pdfs)

        return {
            "project_id": project.id,
            "project_name": project.name,
            "pdf_count": len(ready_pdfs),
            "total_words": total_words,
            "pdf_names": [pdf.filename for pdf in ready_pdfs],
        }


# Instância singleton
project_service = ProjectService()
