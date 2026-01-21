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
  HealthResponse
} from '../types/api.types';

const API_BASE_URL = 'http://localhost:8080/api/addin';

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
}

// Exportar instância singleton
export const ApiService = new ApiServiceClass();

// Exportar classe para testes ou múltiplas instâncias
export { ApiServiceClass };
