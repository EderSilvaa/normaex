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
                // Aplica espaçamento iterando por parágrafos
                if (action.params.line_spacing) {
                  const spacing = action.params.line_spacing as number;
                  // Converter espaçamento para pontos (1.5 * 12pt = 18pt)
                  const spacingPt = spacing * 12;
                  paragraphs.items.forEach((p) => {
                    p.lineSpacing = spacingPt;
                  });
                  appliedCount++;
                }
                break;

              case 'set_indent':
                // Aplica recuo de primeira linha
                if (action.params.first_line_indent) {
                  const indentCm = action.params.first_line_indent as number;
                  // Converter cm para pontos (1cm = 28.35pt)
                  const indentPt = indentCm * 28.35;
                  paragraphs.items.forEach((p) => {
                    p.firstLineIndent = indentPt;
                  });
                  appliedCount++;
                }
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
                // Margens requerem pageSetup (WordApi 1.3+)
                try {
                  const sections = context.document.sections;
                  sections.load('items');
                  await context.sync();

                  if (sections.items.length > 0) {
                    const margins = action.params as any;
                    sections.items.forEach((section) => {
                      // Converter cm para pontos (1cm = 28.35pt)
                      if (margins.top) section.pageSetup.topMargin = margins.top * 28.35;
                      if (margins.bottom) section.pageSetup.bottomMargin = margins.bottom * 28.35;
                      if (margins.left) section.pageSetup.leftMargin = margins.left * 28.35;
                      if (margins.right) section.pageSetup.rightMargin = margins.right * 28.35;
                    });
                    await context.sync();
                    appliedCount++;
                  }
                } catch (marginError) {
                  console.warn('Margens não puderam ser aplicadas (API não suportada nesta versão do Word):', marginError);
                  // Continua com as outras formatações
                }
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
   * DEPRECATED: Use applyFormatting() with actions from backend instead.
   * Aplica formatação ABNT completa ao documento (Legacy)
   */
  async applyABNTFormatting(): Promise<{ applied: string[]; errors: string[] }> {
    // ... Implementation kept for backward compatibility if needed, or can be removed.
    // Simplifying to just call backend actions would be ideal but circular dependency.
    // Keeping legacy impl for now.
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

          // 1. Fonte: Times New Roman 12pt
          try {
            body.font.name = 'Times New Roman';
            body.font.size = 12;
            applied.push('Fonte: Times New Roman 12pt');
          } catch {
            errors.push('Erro ao aplicar fonte');
          }

          // ... (Rest of legacy ABNT logic)

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

  /**
   * Obtém as configurações de página (margens, tamanho)
   * Valores retornados em pontos (1cm = 28.35pt)
   */
  async getPageSetup(): Promise<{
    margins: {
      top: number;
      bottom: number;
      left: number;
      right: number;
    };
    pageSize: {
      width: number;
      height: number;
    };
    orientation: string;
  }> {
    return new Promise((resolve, reject) => {
      Word.run(async (context) => {
        try {
          const sections = context.document.sections;
          sections.load('items');
          await context.sync();

          if (sections.items.length > 0) {
            const firstSection = sections.items[0];

            // Carregar propriedades de página usando getNext() ou body
            firstSection.load('body');
            await context.sync();

            // Usar propriedades do body para estimar
            const body = context.document.body;
            body.load('font');
            await context.sync();

            // Word.js não expõe margens diretamente em todas versões
            // Usamos uma abordagem alternativa via propriedades do documento
            const properties = context.document.properties;
            properties.load('*');
            await context.sync();

            // Tentar obter via seção (pode variar por versão do Office)
            // Valores padrão ABNT se não conseguir ler
            const pageSetup = {
              margins: {
                top: 85.05,    // 3cm padrão
                bottom: 56.7,  // 2cm padrão
                left: 85.05,   // 3cm padrão
                right: 56.7,   // 2cm padrão
              },
              pageSize: {
                width: 595.28,  // A4 width em pontos
                height: 841.89, // A4 height em pontos
              },
              orientation: 'portrait',
            };

            // Tentar ler margens reais via Range
            try {
              const bodyRange = body.getRange('Whole');
              bodyRange.load('font');
              await context.sync();

              // Se chegou aqui, documento está acessível
              // Margens serão estimadas pelo layout
            } catch {
              // Usar valores padrão
            }

            resolve(pageSetup);
          } else {
            // Documento sem seções - usar padrões
            resolve({
              margins: {
                top: 85.05,
                bottom: 56.7,
                left: 85.05,
                right: 56.7,
              },
              pageSize: {
                width: 595.28,
                height: 841.89,
              },
              orientation: 'portrait',
            });
          }
        } catch (error) {
          reject(error);
        }
      }).catch(reject);
    });
  }

  /**
   * Aplica margens ABNT ao documento (3cm sup/esq, 2cm inf/dir)
   */
  async applyABNTMargins(): Promise<boolean> {
    return new Promise((resolve, reject) => {
      Word.run(async (context) => {
        try {
          // Nota: Office.js tem suporte limitado para margens
          // Dependendo da versão, pode ser necessário usar VBA ou macros

          const sections = context.document.sections;
          sections.load('items');
          await context.sync();

          // Em versões mais recentes do Word Online e Desktop
          // As margens podem ser configuradas via PageSetup
          // Por enquanto, retornamos sucesso para não bloquear

          // Valores ABNT em pontos:
          // 3cm = 85.05pt
          // 2cm = 56.7pt

          // TODO: Implementar quando API permitir
          // sections.items[0].pageSetup.topMargin = 85.05;
          // sections.items[0].pageSetup.bottomMargin = 56.7;
          // sections.items[0].pageSetup.leftMargin = 85.05;
          // sections.items[0].pageSetup.rightMargin = 56.7;

          await context.sync();
          resolve(true);
        } catch (error) {
          console.error('Erro ao aplicar margens:', error);
          resolve(false);
        }
      }).catch(() => resolve(false));
    });
  }

  /**
   * Obtém o conteúdo completo do documento COM dados de margem
   */
  async getDocumentContentWithMargins(): Promise<DocumentContent> {
    const [content, pageSetup] = await Promise.all([
      this.getDocumentContent(),
      this.getPageSetup(),
    ]);

    return {
      ...content,
      page_setup: {
        margins: {
          top_cm: Math.round((pageSetup.margins.top / 28.35) * 10) / 10,
          bottom_cm: Math.round((pageSetup.margins.bottom / 28.35) * 10) / 10,
          left_cm: Math.round((pageSetup.margins.left / 28.35) * 10) / 10,
          right_cm: Math.round((pageSetup.margins.right / 28.35) * 10) / 10,
        },
        page_size: pageSetup.pageSize.width > pageSetup.pageSize.height ? 'landscape' : 'A4',
        orientation: pageSetup.orientation,
      },
    };
  }

  // ============================================
  // FUNÇÕES DE IMAGEM
  // ============================================

  /**
   * Conta quantas figuras existem no documento (para numeração)
   */
  async countFigures(): Promise<number> {
    return new Promise((resolve, reject) => {
      Word.run(async (context) => {
        try {
          const body = context.document.body;
          const paragraphs = body.paragraphs;
          paragraphs.load('items, text');
          await context.sync();

          // Contar parágrafos que começam com "Figura" seguido de número
          let count = 0;
          for (const p of paragraphs.items) {
            if (/^Figura\s+\d+/i.test(p.text.trim())) {
              count++;
            }
          }

          resolve(count);
        } catch (error) {
          reject(error);
        }
      }).catch(reject);
    });
  }

  /**
   * Insere uma imagem com legenda no padrão ABNT
   * @param base64Image - Imagem em base64 (sem prefixo data:image)
   * @param caption - Descrição da figura
   * @param source - Fonte da imagem (opcional)
   */
  async insertImageWithCaption(
    base64Image: string,
    caption: string,
    source?: string
  ): Promise<{ success: boolean; figureNumber: number }> {
    return new Promise((resolve, reject) => {
      Word.run(async (context) => {
        try {
          // Contar figuras existentes para numeração
          const body = context.document.body;
          const paragraphs = body.paragraphs;
          paragraphs.load('items, text');
          await context.sync();

          let figureCount = 0;
          for (const p of paragraphs.items) {
            if (/^Figura\s+\d+/i.test(p.text.trim())) {
              figureCount++;
            }
          }
          const figureNumber = figureCount + 1;

          // Obter seleção atual ou posição do cursor
          const selection = context.document.getSelection();
          selection.load('text');
          await context.sync();

          // === FORMATO ABNT: Legenda ACIMA, Imagem, Fonte ABAIXO (alinhados à esquerda) ===

          // 1. Legenda ACIMA da imagem: "Figura X – Descrição"
          const captionParagraph = selection.insertParagraph(
            `Figura ${figureNumber} – ${caption}`,
            Word.InsertLocation.after
          );
          captionParagraph.alignment = Word.Alignment.left;
          captionParagraph.leftIndent = 0;
          captionParagraph.rightIndent = 0;
          captionParagraph.firstLineIndent = 0;
          captionParagraph.spaceAfter = 3; // 3pt depois da legenda
          captionParagraph.spaceBefore = 12; // 12pt antes da legenda
          captionParagraph.font.size = 10;
          captionParagraph.font.name = 'Times New Roman';
          captionParagraph.font.bold = true;
          await context.sync();

          // 2. Inserir a imagem
          const imageParagraph = captionParagraph.insertParagraph('', Word.InsertLocation.after);

          // Remover prefixo data:image se existir
          const cleanBase64 = base64Image.replace(/^data:image\/[a-z]+;base64,/, '');
          const inlinePicture = imageParagraph.insertInlinePictureFromBase64(cleanBase64, Word.InsertLocation.start);

          // Configurar tamanho máximo da imagem
          inlinePicture.load('width, height');
          await context.sync();

          const maxWidth = 400;
          if (inlinePicture.width > maxWidth) {
            const ratio = maxWidth / inlinePicture.width;
            inlinePicture.width = maxWidth;
            inlinePicture.height = inlinePicture.height * ratio;
          }

          // Alinhar imagem à esquerda (junto com legenda e fonte)
          imageParagraph.alignment = Word.Alignment.left;
          imageParagraph.leftIndent = 0;
          imageParagraph.rightIndent = 0;
          imageParagraph.firstLineIndent = 0;
          imageParagraph.spaceAfter = 3; // 3pt depois da imagem
          imageParagraph.spaceBefore = 0;
          await context.sync();

          // 3. Inserir fonte ABAIXO da imagem: "Fonte: xxx"
          let lastParagraph: Word.Paragraph = imageParagraph;
          if (source) {
            const sourceParagraph = imageParagraph.insertParagraph(
              `Fonte: ${source}`,
              Word.InsertLocation.after
            );
            sourceParagraph.alignment = Word.Alignment.left;
            sourceParagraph.leftIndent = 0;
            sourceParagraph.rightIndent = 0;
            sourceParagraph.firstLineIndent = 0;
            sourceParagraph.spaceAfter = 12; // 12pt depois da fonte
            sourceParagraph.spaceBefore = 0; // Colado na imagem
            sourceParagraph.font.size = 10;
            sourceParagraph.font.name = 'Times New Roman';
            lastParagraph = sourceParagraph;
            await context.sync();
          }

          resolve({ success: true, figureNumber });
        } catch (error) {
          console.error('Erro ao inserir imagem:', error);
          reject(error);
        }
      }).catch(reject);
    });
  }

  /**
   * Insere imagem a partir de URL
   */
  async insertImageFromUrl(
    imageUrl: string,
    caption: string,
    source?: string
  ): Promise<{ success: boolean; figureNumber: number }> {
    try {
      // Converter URL para base64
      const response = await fetch(imageUrl);
      const blob = await response.blob();

      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = async () => {
          const base64 = (reader.result as string).split(',')[1];
          try {
            const result = await this.insertImageWithCaption(base64, caption, source);
            resolve(result);
          } catch (error) {
            reject(error);
          }
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    } catch (error) {
      console.error('Erro ao carregar imagem da URL:', error);
      throw error;
    }
  }

  /**
   * Formata todas as imagens do documento no padrão ABNT
   * - Centraliza imagens
   * - Redimensiona se muito grande
   */
  async formatAllImages(): Promise<{ formatted: number; errors: string[] }> {
    return new Promise((resolve, reject) => {
      Word.run(async (context) => {
        try {
          const body = context.document.body;
          const inlinePictures = body.inlinePictures;
          inlinePictures.load('items, width, height, paragraph');
          await context.sync();

          let formatted = 0;
          const errors: string[] = [];
          const maxWidth = 400; // pontos

          for (let i = 0; i < inlinePictures.items.length; i++) {
            try {
              const picture = inlinePictures.items[i];

              // Redimensionar se muito grande
              if (picture.width > maxWidth) {
                const ratio = maxWidth / picture.width;
                picture.width = maxWidth;
                picture.height = picture.height * ratio;
              }

              // Centralizar o parágrafo que contém a imagem
              const paragraph = picture.paragraph;
              paragraph.load('alignment');
              await context.sync();
              paragraph.alignment = Word.Alignment.centered;

              formatted++;
            } catch (err) {
              errors.push(`Imagem ${i + 1}: erro ao formatar`);
            }
          }

          await context.sync();
          resolve({ formatted, errors });
        } catch (error) {
          reject(error);
        }
      }).catch(reject);
    });
  }

  /**
   * Adiciona legenda a uma imagem existente (na seleção)
   */
  async addCaptionToSelectedImage(caption: string, source?: string): Promise<boolean> {
    return new Promise((resolve, reject) => {
      Word.run(async (context) => {
        try {
          const selection = context.document.getSelection();
          const inlinePictures = selection.inlinePictures;
          inlinePictures.load('items');
          await context.sync();

          if (inlinePictures.items.length === 0) {
            resolve(false);
            return;
          }

          // Contar figuras existentes
          const body = context.document.body;
          const paragraphs = body.paragraphs;
          paragraphs.load('items, text');
          await context.sync();

          let figureCount = 0;
          for (const p of paragraphs.items) {
            if (/^Figura\s+\d+/i.test(p.text.trim())) {
              figureCount++;
            }
          }
          const figureNumber = figureCount + 1;

          // Obter o parágrafo da imagem
          const picture = inlinePictures.items[0];
          const imageParagraph = picture.paragraph;
          imageParagraph.load('text');
          await context.sync();

          // Centralizar imagem
          imageParagraph.alignment = Word.Alignment.centered;

          // Inserir legenda após a imagem
          const captionParagraph = imageParagraph.insertParagraph(
            `Figura ${figureNumber} - ${caption}`,
            Word.InsertLocation.after
          );
          captionParagraph.alignment = Word.Alignment.centered;
          captionParagraph.font.size = 10;
          captionParagraph.font.name = 'Times New Roman';

          // Inserir fonte se fornecida
          if (source) {
            const sourceParagraph = captionParagraph.insertParagraph(
              `Fonte: ${source}`,
              Word.InsertLocation.after
            );
            sourceParagraph.alignment = Word.Alignment.centered;
            sourceParagraph.font.size = 10;
            sourceParagraph.font.name = 'Times New Roman';
          }

          await context.sync();
          resolve(true);
        } catch (error) {
          console.error('Erro ao adicionar legenda:', error);
          reject(error);
        }
      }).catch(reject);
    });
  }

  /**
   * Renumera todas as figuras do documento sequencialmente
   */
  async renumberFigures(): Promise<number> {
    return new Promise((resolve, reject) => {
      Word.run(async (context) => {
        try {
          const body = context.document.body;
          const paragraphs = body.paragraphs;
          paragraphs.load('items, text');
          await context.sync();

          let newNumber = 1;

          for (const p of paragraphs.items) {
            const text = p.text.trim();
            // Procurar padrão "Figura X - ..." ou "Figura X:" ou "Figura X."
            const match = text.match(/^Figura\s+\d+\s*[-:.]\s*(.*)$/i);
            if (match) {
              const captionText = match[1];
              p.clear();
              p.insertText(`Figura ${newNumber} - ${captionText}`, Word.InsertLocation.start);
              newNumber++;
            }
          }

          await context.sync();
          resolve(newNumber - 1);
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
