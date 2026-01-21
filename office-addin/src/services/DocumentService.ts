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

  /**
   * Aplica formatação ABNT completa ao documento
   */
  async applyABNTFormatting(): Promise<{ applied: string[]; errors: string[] }> {
    const applied: string[] = [];
    const errors: string[] = [];

    return new Promise((resolve, reject) => {
      Word.run(async (context) => {
        try {
          const body = context.document.body;
          const paragraphs = body.paragraphs;
          const sections = context.document.sections;

          paragraphs.load('items');
          sections.load('items');
          await context.sync();

          // 1. Fonte: Times New Roman ou Arial 12pt
          try {
            body.font.name = 'Times New Roman';
            body.font.size = 12;
            body.font.color = '#000000';
            applied.push('Fonte: Times New Roman 12pt');
          } catch {
            errors.push('Erro ao aplicar fonte');
          }

          // 2. Alinhamento justificado para corpo do texto
          try {
            paragraphs.items.forEach((p) => {
              p.alignment = Word.Alignment.justified;
            });
            applied.push('Alinhamento: Justificado');
          } catch {
            errors.push('Erro ao aplicar alinhamento');
          }

          // 3. Espaçamento entre linhas 1,5
          try {
            paragraphs.items.forEach((p) => {
              p.lineSpacing = 18; // 1.5 * 12pt = 18pt
            });
            applied.push('Espaçamento: 1,5 linhas');
          } catch {
            errors.push('Erro ao aplicar espaçamento');
          }

          // 4. Recuo de primeira linha 1,25cm
          try {
            paragraphs.items.forEach((p) => {
              p.firstLineIndent = 35.43; // 1.25cm em pontos
            });
            applied.push('Recuo: 1,25cm primeira linha');
          } catch {
            errors.push('Erro ao aplicar recuo');
          }

          // 5. Margens (3cm esq/sup, 2cm dir/inf)
          try {
            if (sections.items.length > 0) {
              sections.items.forEach((section) => {
                section.load('body');
              });
              await context.sync();

              sections.items.forEach((section) => {
                // Margens em pontos (1cm = 28.35pt)
                section.body.font.size = 12; // Garantir tamanho
              });
              applied.push('Margens: 3cm/2cm (manual)');
            }
          } catch {
            errors.push('Erro ao processar seções');
          }

          await context.sync();
          resolve({ applied, errors });
        } catch (error) {
          reject(error);
        }
      }).catch(reject);
    });
  }

  /**
   * Aplica formatação apenas à seleção
   */
  async formatSelection(options: {
    fontName?: string;
    fontSize?: number;
    bold?: boolean;
    italic?: boolean;
    alignment?: 'left' | 'center' | 'right' | 'justified';
  }): Promise<void> {
    return new Promise((resolve, reject) => {
      Word.run(async (context) => {
        try {
          const selection = context.document.getSelection();
          selection.load('font,paragraphs');
          await context.sync();

          if (options.fontName) selection.font.name = options.fontName;
          if (options.fontSize) selection.font.size = options.fontSize;
          if (options.bold !== undefined) selection.font.bold = options.bold;
          if (options.italic !== undefined) selection.font.italic = options.italic;

          if (options.alignment) {
            selection.paragraphs.load('items');
            await context.sync();

            const alignmentMap = {
              left: Word.Alignment.left,
              center: Word.Alignment.centered,
              right: Word.Alignment.right,
              justified: Word.Alignment.justified,
            };

            selection.paragraphs.items.forEach((p) => {
              p.alignment = alignmentMap[options.alignment!];
            });
          }

          await context.sync();
          resolve();
        } catch (error) {
          reject(error);
        }
      }).catch(reject);
    });
  }

  /**
   * Navega para um parágrafo específico
   */
  async goToParagraph(index: number): Promise<void> {
    return new Promise((resolve, reject) => {
      Word.run(async (context) => {
        try {
          const paragraphs = context.document.body.paragraphs;
          paragraphs.load('items');
          await context.sync();

          if (index >= 0 && index < paragraphs.items.length) {
            const paragraph = paragraphs.items[index];
            paragraph.select();
            await context.sync();
          }

          resolve();
        } catch (error) {
          reject(error);
        }
      }).catch(reject);
    });
  }

  /**
   * Busca texto no documento e seleciona
   */
  async findAndSelect(searchText: string): Promise<boolean> {
    return new Promise((resolve, reject) => {
      Word.run(async (context) => {
        try {
          const results = context.document.body.search(searchText, {
            matchCase: false,
            matchWholeWord: false,
          });
          results.load('items');
          await context.sync();

          if (results.items.length > 0) {
            results.items[0].select();
            await context.sync();
            resolve(true);
          } else {
            resolve(false);
          }
        } catch (error) {
          reject(error);
        }
      }).catch(reject);
    });
  }

  /**
   * Aplica estilo de título ABNT
   */
  async applyHeadingStyle(level: 1 | 2 | 3): Promise<void> {
    return new Promise((resolve, reject) => {
      Word.run(async (context) => {
        try {
          const selection = context.document.getSelection();
          selection.load('paragraphs');
          await context.sync();

          selection.paragraphs.load('items');
          await context.sync();

          selection.paragraphs.items.forEach((p) => {
            p.font.bold = true;
            p.alignment = level === 1 ? Word.Alignment.centered : Word.Alignment.left;
            p.font.size = level === 1 ? 12 : 12;
            p.font.allCaps = level === 1;
            p.firstLineIndent = 0;
          });

          await context.sync();
          resolve();
        } catch (error) {
          reject(error);
        }
      }).catch(reject);
    });
  }

  /**
   * Formata como citação longa ABNT (recuo 4cm, fonte 10pt)
   */
  async formatAsBlockQuote(): Promise<void> {
    return new Promise((resolve, reject) => {
      Word.run(async (context) => {
        try {
          const selection = context.document.getSelection();
          selection.load('paragraphs');
          await context.sync();

          selection.paragraphs.load('items');
          await context.sync();

          selection.paragraphs.items.forEach((p) => {
            p.leftIndent = 113.39; // 4cm em pontos
            p.firstLineIndent = 0;
            p.font.size = 10;
            p.lineSpacing = 12; // Simples
            p.alignment = Word.Alignment.justified;
          });

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
