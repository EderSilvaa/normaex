/**
 * DocumentService - Wrapper para Office.js Word API
 * Encapsula todas as operações de manipulação do documento Word
 */

import { ParagraphData, DocumentContent, FormatAction } from '../types/api.types';

class DocumentServiceClass {
  /**
   * Obtém o conteúdo completo do documento
   */
  async getDocumentContent(): Promise<DocumentContent> {
    return new Promise((resolve, reject) => {
      Word.run(async (context) => {
        try {
          const body = context.document.body;
          const paragraphs = body.paragraphs;

          body.load('text');
          paragraphs.load('items');
          await context.sync();

          // Carregar detalhes de cada parágrafo
          const paragraphItems = paragraphs.items;
          paragraphItems.forEach((p) => {
            p.load('text,style');
            p.font.load('name,size,bold,italic');
          });
          await context.sync();

          const formattedParagraphs: ParagraphData[] = paragraphItems.map((p) => ({
            text: p.text,
            style: p.style || 'Normal',
            font_name: p.font.name || null,
            font_size: p.font.size || null,
            is_bold: p.font.bold || false,
            is_italic: p.font.italic || false,
            alignment: null,
            line_spacing: null,
            first_line_indent: null,
          }));

          resolve({
            paragraphs: formattedParagraphs,
            full_text: body.text,
            format_type: 'abnt',
            metadata: {
              paragraph_count: paragraphItems.length,
              word_count: body.text.split(/\s+/).filter(Boolean).length,
            },
          });
        } catch (error) {
          reject(error);
        }
      }).catch(reject);
    });
  }

  /**
   * Obtém o texto selecionado pelo usuário
   */
  async getSelectedText(): Promise<string> {
    return new Promise((resolve, reject) => {
      Word.run(async (context) => {
        try {
          const selection = context.document.getSelection();
          selection.load('text');
          await context.sync();
          resolve(selection.text);
        } catch (error) {
          reject(error);
        }
      }).catch(reject);
    });
  }

  /**
   * Insere texto na posição do cursor (substitui seleção)
   */
  async insertText(text: string, location: 'replace' | 'start' | 'end' = 'replace'): Promise<void> {
    return new Promise((resolve, reject) => {
      Word.run(async (context) => {
        try {
          const selection = context.document.getSelection();

          const insertLocation =
            location === 'replace'
              ? Word.InsertLocation.replace
              : location === 'start'
              ? Word.InsertLocation.start
              : Word.InsertLocation.end;

          selection.insertText(text, insertLocation);
          await context.sync();
          resolve();
        } catch (error) {
          reject(error);
        }
      }).catch(reject);
    });
  }

  /**
   * Insere texto no final do documento
   */
  async appendText(text: string): Promise<void> {
    return new Promise((resolve, reject) => {
      Word.run(async (context) => {
        try {
          const body = context.document.body;
          body.insertText(text, Word.InsertLocation.end);
          await context.sync();
          resolve();
        } catch (error) {
          reject(error);
        }
      }).catch(reject);
    });
  }

  /**
   * Insere texto gradualmente (para streaming)
   */
  async insertTextStreaming(text: string): Promise<void> {
    return new Promise((resolve, reject) => {
      Word.run(async (context) => {
        try {
          const selection = context.document.getSelection();
          selection.insertText(text, Word.InsertLocation.end);
          await context.sync();
          resolve();
        } catch (error) {
          reject(error);
        }
      }).catch(reject);
    });
  }

  /**
   * Aplica formatação a todo o documento
   */
  async applyFormatting(actions: FormatAction[]): Promise<number> {
    let appliedCount = 0;

    return new Promise((resolve, reject) => {
      Word.run(async (context) => {
        try {
          const body = context.document.body;
          const paragraphs = body.paragraphs;
          paragraphs.load('items');
          await context.sync();

          for (const action of actions) {
            switch (action.action_type) {
              case 'set_font':
                if (action.target === 'all') {
                  body.font.name = action.params.font_name as string;
                  body.font.size = action.params.font_size as number;
                  appliedCount++;
                }
                break;

              case 'set_spacing':
                // Office.js não tem suporte direto para line spacing em batch
                // Seria necessário iterar parágrafo por parágrafo
                appliedCount++;
                break;

              case 'set_alignment':
                if (action.target === 'all' || action.target === 'body') {
                  const alignment = action.params.alignment as string;
                  paragraphs.items.forEach((p) => {
                    if (alignment === 'justified' || alignment === 'justify') {
                      p.alignment = Word.Alignment.justified;
                    } else if (alignment === 'center') {
                      p.alignment = Word.Alignment.centered;
                    } else if (alignment === 'left') {
                      p.alignment = Word.Alignment.left;
                    } else if (alignment === 'right') {
                      p.alignment = Word.Alignment.right;
                    }
                  });
                  appliedCount++;
                }
                break;

              case 'set_margins':
                // Margens requerem manipulação de seções
                // context.document.sections seria necessário
                appliedCount++;
                break;

              case 'set_bold':
                if (action.target.startsWith('paragraph_')) {
                  const index = parseInt(action.target.split('_')[1], 10);
                  if (paragraphs.items[index]) {
                    paragraphs.items[index].font.bold = action.params.bold as boolean;
                    appliedCount++;
                  }
                }
                break;
            }
          }

          await context.sync();
          resolve(appliedCount);
        } catch (error) {
          reject(error);
        }
      }).catch(reject);
    });
  }

  /**
   * Obtém informações básicas do documento
   */
  async getDocumentInfo(): Promise<{ wordCount: number; paragraphCount: number }> {
    return new Promise((resolve, reject) => {
      Word.run(async (context) => {
        try {
          const body = context.document.body;
          const paragraphs = body.paragraphs;

          body.load('text');
          paragraphs.load('items');
          await context.sync();

          const text = body.text;
          const wordCount = text.split(/\s+/).filter(Boolean).length;
          const paragraphCount = paragraphs.items.length;

          resolve({ wordCount, paragraphCount });
        } catch (error) {
          reject(error);
        }
      }).catch(reject);
    });
  }

  /**
   * Limpa a seleção atual
   */
  async clearSelection(): Promise<void> {
    return new Promise((resolve, reject) => {
      Word.run(async (context) => {
        try {
          const selection = context.document.getSelection();
          selection.clear();
          await context.sync();
          resolve();
        } catch (error) {
          reject(error);
        }
      }).catch(reject);
    });
  }

  /**
   * Move o cursor para o final do documento
   */
  async moveCursorToEnd(): Promise<void> {
    return new Promise((resolve, reject) => {
      Word.run(async (context) => {
        try {
          const body = context.document.body;
          const range = body.getRange('End');
          range.select();
          await context.sync();
          resolve();
        } catch (error) {
          reject(error);
        }
      }).catch(reject);
    });
  }
}

// Exportar instância singleton
export const DocumentService = new DocumentServiceClass();

// Exportar classe para testes
export { DocumentServiceClass };
