/**
 * StreamingService - Cliente SSE para streaming de texto
 * Gerencia conexões Server-Sent Events com o backend
 */

import { WriteRequest, WriteChunk } from '../types/api.types';
import { DocumentService } from './DocumentService';

const API_BASE_URL = 'http://localhost:8080/api/addin';

export interface StreamingCallbacks {
  onChunk?: (chunk: WriteChunk) => void;
  onComplete?: (fullText: string) => void;
  onError?: (error: Error) => void;
  onProgress?: (progress: number) => void;
}

class StreamingServiceClass {
  private baseUrl: string;
  private abortController: AbortController | null = null;

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl;
  }

  /**
   * Inicia streaming de geração de texto
   * Insere o texto gradualmente no Word conforme recebe
   */
  async streamWrite(
    request: WriteRequest,
    callbacks: StreamingCallbacks = {}
  ): Promise<string> {
    // Cancelar qualquer stream anterior
    this.abort();

    this.abortController = new AbortController();
    let fullText = '';
    let chunkCount = 0;

    try {
      const response = await fetch(`${this.baseUrl}/write-stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'text/event-stream',
        },
        body: JSON.stringify(request),
        signal: this.abortController.signal,
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('Response body is not readable');
      }

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();

        if (done) {
          break;
        }

        buffer += decoder.decode(value, { stream: true });

        // Processar eventos SSE
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);

            if (data === '[DONE]') {
              continue;
            }

            try {
              const chunk: WriteChunk = JSON.parse(data);

              if (chunk.error) {
                throw new Error(chunk.error);
              }

              if (chunk.text) {
                fullText += chunk.text;
                chunkCount++;

                // Callback de chunk
                callbacks.onChunk?.(chunk);

                // Callback de progresso (estimativa)
                callbacks.onProgress?.(Math.min(chunkCount * 5, 95));
              }

              if (chunk.is_final) {
                break;
              }
            } catch (parseError) {
              // Ignorar linhas que não são JSON válido
              console.debug('SSE parse skip:', data);
            }
          }
        }
      }

      // Progresso final
      callbacks.onProgress?.(100);

      // Callback de conclusão
      callbacks.onComplete?.(fullText);

      return fullText;
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('Streaming cancelado');
      }
      callbacks.onError?.(error instanceof Error ? error : new Error(String(error)));
      throw error;
    } finally {
      this.abortController = null;
    }
  }

  /**
   * Streaming com inserção automática no Word
   */
  async streamWriteToDocument(
    request: WriteRequest,
    callbacks: StreamingCallbacks = {}
  ): Promise<string> {
    let insertedText = '';

    return this.streamWrite(request, {
      ...callbacks,
      onChunk: async (chunk) => {
        if (chunk.text) {
          try {
            // Inserir texto no documento
            await DocumentService.insertTextStreaming(chunk.text);
            insertedText += chunk.text;
          } catch (err) {
            console.error('Error inserting chunk:', err);
          }
        }
        callbacks.onChunk?.(chunk);
      },
    });
  }

  /**
   * Cancela o streaming atual
   */
  abort(): void {
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }
  }

  /**
   * Verifica se há um streaming em andamento
   */
  isStreaming(): boolean {
    return this.abortController !== null;
  }
}

// Exportar instância singleton
export const StreamingService = new StreamingServiceClass();

// Exportar classe para testes
export { StreamingServiceClass };
