/**
 * ApiService - Cliente HTTP para comunicação com o backend Normaex
 */

import {
  DocumentContent,
  AnalysisResponse,
  FormatResponse,
  WriteRequest,
  WriteResponse,
  ChatRequest,
  ChatResponse,
  ImproveRequest,
  ImproveResponse,
  HealthResponse,
  ProjectSummary,
  Project,
  ProjectResponse,
  ProjectListResponse,
  PDFUploadResponse,
  CreateProjectRequest,
  UpdateProjectRequest,
  SearchRequest,
  SearchResponse,
  StructureRequest,
  StructureResponse,
  InlineReviewRequest,
  InlineReviewResponse,
} from '../types/api.types';

// Detectar ambiente automaticamente
const getApiBaseUrl = (): string => {
  // Em produção (add-in hospedado)
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;

    // Desenvolvimento local (HTTPS obrigatório - WebView2 bloqueia mixed content)
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return 'https://localhost:8000/api/addin';
    }

    // Produção - usar API no mesmo domínio base ou subdomínio
    // Ajuste conforme sua configuração de deploy
    // return 'https://api.normaex.com.br/api/addin';
  }

  // Fallback para SSR ou testes
  return 'https://localhost:8000/api/addin';
};

const API_BASE_URL = getApiBaseUrl();

class ApiServiceClass {
  private baseUrl: string;

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl;
  }

  /**
   * Faz uma requisição HTTP genérica
   */
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;

    const defaultHeaders: HeadersInit = {
      'Content-Type': 'application/json',
    };

    const response = await fetch(url, {
      ...options,
      headers: {
        ...defaultHeaders,
        ...options.headers,
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || `HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Verifica se o backend está online
   */
  async checkHealth(): Promise<HealthResponse> {
    return this.request<HealthResponse>('/health');
  }

  /**
   * Analisa o conteúdo do documento e retorna score ABNT
   */
  async analyzeContent(content: DocumentContent): Promise<AnalysisResponse> {
    return this.request<AnalysisResponse>('/analyze-content', {
      method: 'POST',
      body: JSON.stringify(content),
    });
  }

  /**
   * Gera instruções de formatação ABNT
   */
  async formatContent(content: DocumentContent): Promise<FormatResponse> {
    return this.request<FormatResponse>('/format-content', {
      method: 'POST',
      body: JSON.stringify(content),
    });
  }

  /**
   * Gera texto acadêmico com IA (não streaming)
   */
  async writeText(request: WriteRequest): Promise<WriteResponse> {
    return this.request<WriteResponse>('/write', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }

  /**
   * Chat contextualizado com o documento
   */
  async chat(request: ChatRequest): Promise<ChatResponse> {
    return this.request<ChatResponse>('/chat', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }

  /**
   * Melhora o texto selecionado
   */
  async improveText(request: ImproveRequest): Promise<ImproveResponse> {
    return this.request<ImproveResponse>('/improve', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }

  /**
   * Retorna a URL para streaming de texto
   */
  getStreamingUrl(): string {
    return `${this.baseUrl}/write-stream`;
  }

  // ============================================
  // PROJECTS API
  // ============================================

  private get projectsBaseUrl(): string {
    return this.baseUrl.replace('/api/addin', '/api/projects');
  }

  /**
   * Lista todos os projetos
   */
  async listProjects(): Promise<ProjectListResponse> {
    const url = this.projectsBaseUrl;
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    return response.json();
  }

  /**
   * Cria um novo projeto
   */
  async createProject(request: CreateProjectRequest): Promise<ProjectResponse> {
    const url = this.projectsBaseUrl;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    });
    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.detail || `HTTP ${response.status}`);
    }
    return response.json();
  }

  /**
   * Obtém detalhes de um projeto
   */
  async getProject(projectId: string): Promise<ProjectResponse> {
    const url = `${this.projectsBaseUrl}/${projectId}`;
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    return response.json();
  }

  /**
   * Atualiza um projeto
   */
  async updateProject(projectId: string, request: UpdateProjectRequest): Promise<ProjectResponse> {
    const url = `${this.projectsBaseUrl}/${projectId}`;
    const response = await fetch(url, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    });
    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.detail || `HTTP ${response.status}`);
    }
    return response.json();
  }

  /**
   * Deleta um projeto
   */
  async deleteProject(projectId: string): Promise<void> {
    const url = `${this.projectsBaseUrl}/${projectId}`;
    const response = await fetch(url, { method: 'DELETE' });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
  }

  /**
   * Faz upload de um PDF para um projeto
   */
  async uploadPDF(projectId: string, file: File): Promise<PDFUploadResponse> {
    const url = `${this.projectsBaseUrl}/${projectId}/pdfs`;
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(url, {
      method: 'POST',
      body: formData,
    });
    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.detail || `HTTP ${response.status}`);
    }
    return response.json();
  }

  /**
   * Remove um PDF de um projeto
   */
  async removePDF(projectId: string, pdfId: string): Promise<void> {
    const url = `${this.projectsBaseUrl}/${projectId}/pdfs/${pdfId}`;
    const response = await fetch(url, { method: 'DELETE' });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
  }

  /**
   * Proxy para buscar imagens externas (evita CORS)
   */
  async getImageProxy(imageUrl: string): Promise<{ success: boolean; base64?: string; content_type?: string }> {
    const url = `${this.baseUrl}/image-proxy?url=${encodeURIComponent(imageUrl)}`;
    const response = await fetch(url);
    if (!response.ok) {
      return { success: false };
    }
    return response.json();
  }

  // ============================================
  // RESEARCH / SEARCH
  // ============================================

  /**
   * Busca trabalhos acadêmicos
   */
  async searchWorks(request: SearchRequest): Promise<SearchResponse> {
    const url = this.baseUrl.replace('/api/addin', '/api/research/search');
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.detail || `HTTP ${response.status}`);
    }

    return response.json();
  }

  /**
   * Gera sugestão de estrutura (sumário)
   */
  async generateStructure(request: StructureRequest): Promise<StructureResponse> {
    const url = this.baseUrl.replace('/api/addin', '/api/research/structure');
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.detail || `HTTP ${response.status}`);
    }

    return response.json();
  }

  // ============================================
  // CHART GENERATION
  // ============================================

  /**
   * Gera um gráfico e retorna como imagem base64
   */
  async generateChart(request: ChartRequest): Promise<ChartResponse> {
    return this.request<ChartResponse>('/generate-chart', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }

  /**
   * Revisa trecho selecionado (Inline Review)
   */
  async reviewSelection(request: InlineReviewRequest): Promise<InlineReviewResponse> {
    return this.request<InlineReviewResponse>('/review-selection', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }
}

// Tipos para Chart
export type ChartType = 'bar' | 'bar_horizontal' | 'line' | 'pie' | 'area' | 'scatter';

export interface ChartDataSeries {
  name: string;
  values: number[];
}

export interface ChartRequest {
  chart_type: ChartType;
  labels: string[];
  values: number[];
  title?: string;
  x_label?: string;
  y_label?: string;
  colors?: string[];
  series?: ChartDataSeries[];
}

export interface ChartResponse {
  success: boolean;
  base64?: string;
  error?: string;
}

// Exportar instância singleton
export const ApiService = new ApiServiceClass();

// Exportar classe para testes ou múltiplas instâncias
export { ApiServiceClass };
