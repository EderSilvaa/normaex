/**
 * ChatPanel - Painel de chat com histórico, anexo de imagens e gráficos
 * Interface de conversação com a IA - Suporta texto, imagens e gráficos
 */

import * as React from 'react';
import { useState, useRef, useEffect } from 'react';
import { marked } from 'marked';
import { DocumentService, ApiService } from '../../services';
import type { ChartType } from '../../services';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { Card } from './ui/Card';

import ProjectSelector from './ProjectSelector';
import ResearchPanel from './ResearchPanel';
import ComplianceScore from './ComplianceScore';
import IssuesList from './IssuesList';
import { theme } from '../../styles/theme';

interface ChartConfig {
  type: ChartType;
  title: string;
  labels: string;
  values: string;
  xLabel: string;
  yLabel: string;
  source: string;
}

interface ContextInfo {
  has_pdf_context: boolean;
  project_name?: string | null;
  pdf_count: number;
  pdf_names: string[];
  total_words: number;
}

interface RubricCriterion {
  name: string;
  score: number;
  feedback: string;
}

interface DetailedReview {
  total_score: number;
  criteria: RubricCriterion[];
  summary: string;
}

interface ChatResponseData {
  message: string;
  suggestions?: string[];
  context_info?: ContextInfo | null;
  generated_content?: string | null;
  was_reviewed?: boolean | null;
  review_score?: number | null;

  detailed_review?: DetailedReview | null;
  proactive_suggestions?: ProactiveSuggestion[];
}

interface ProactiveSuggestion {
  type: string;
  message: string;
  action: string;
  section_type: string;
}

interface ImageAttachment {
  type: 'upload' | 'url';
  data: string; // base64 ou URL
  preview: string; // URL para preview
  caption: string;
  source?: string;
}

interface AnalysisResultData {
  score: number;
  issues: any[];
  summary: string;
}

interface FormatResultData {
  success: boolean;
  actionsApplied: number;
  message: string;
}

interface ReviewResultData {
  originalText: string;
  correctedText: string;
  explanation: string;
  changes: string[];
  applied?: boolean;
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  hasGeneratedText?: boolean;
  generatedContent?: string | null;
  contextInfo?: ContextInfo | null;
  image?: { caption: string; figureNumber?: number };
  wasReviewed?: boolean | null;
  reviewScore?: number | null;
  proactiveSuggestions?: ProactiveSuggestion[];
  analysisResult?: AnalysisResultData;
  formatResult?: FormatResultData;

  reviewResult?: ReviewResultData;
  detailedReview?: DetailedReview | null;
}

interface SearchResult {
  id: string;
  url: string;
  thumbUrl: string;
  description: string;
  author: string;
}

interface ChatPanelProps {
  onSendMessage: (message: string, history: Array<{ role: 'user' | 'assistant'; content: string }>) => Promise<ChatResponseData>;
  onInsertText?: (text: string, isHtml?: boolean) => Promise<void>;
  isLoading?: boolean;
  placeholder?: string;
  welcomeMessage?: string;
  activeProjectName?: string | null;
  activePdfCount?: number;
  selectedProjectId?: string | null;
  onProjectSelect?: (projectId: string | null) => void;
  onProjectInfoChange?: (info: { name: string; pdfCount: number } | null) => void;
  onFeedbackMessage?: (message: string) => void;
  normName?: string;
  workType?: string;
  knowledgeArea?: string;
  onSaveReference?: (ref: any) => void;
  onStructureGenerated?: (structure: string) => void;
  onAnalyzeDocument?: () => Promise<AnalysisResultData | null>;
  onFormatDocument?: () => Promise<FormatResultData | null>;
  onReviewSelection?: (instruction?: string) => Promise<{ originalText: string; correctedText: string; explanation: string; changes: string[] } | null>;
  onIssueClick?: (issue: any) => void;
  onApplyFix?: (issue: any) => void;
  formatType?: string;
}

const ChatPanel: React.FC<ChatPanelProps> = ({
  onSendMessage,
  onInsertText,
  isLoading = false,
  placeholder = 'Pergunte sobre seu documento...',
  welcomeMessage = 'Olá! Posso ajudar com formatação ABNT e sugestões.',
  activeProjectName,
  activePdfCount = 0,
  selectedProjectId,
  onProjectSelect,
  onProjectInfoChange,
  onFeedbackMessage,
  normName,
  workType,
  knowledgeArea,
  onSaveReference,
  onStructureGenerated,
  onAnalyzeDocument,
  onFormatDocument,
  onReviewSelection,
  onIssueClick,
  onApplyFix,
  formatType,
}) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: welcomeMessage,
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [inserting, setInserting] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Estados para imagens
  const [showImageMenu, setShowImageMenu] = useState(false);
  const [showProjectSelector, setShowProjectSelector] = useState(false);
  const [showResearchModal, setShowResearchModal] = useState(false);
  const [showImageSearch, setShowImageSearch] = useState(false);
  const [pendingImage, setPendingImage] = useState<ImageAttachment | null>(null);
  const [imageCaption, setImageCaption] = useState('');
  const [imageSource, setImageSource] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);

  // Estados para gráficos
  const [showChartBuilder, setShowChartBuilder] = useState(false);
  const [chartConfig, setChartConfig] = useState<ChartConfig>({
    type: 'bar',
    title: '',
    labels: '',
    values: '',
    xLabel: '',
    yLabel: '',
    source: '',
  });
  const [chartPreview, setChartPreview] = useState<string | null>(null);
  const [chartLoading, setChartLoading] = useState(false);
  const [chartError, setChartError] = useState<string | null>(null);

  // Estado para ações rápidas (analisar, formatar, revisar)
  const [actionLoading, setActionLoading] = useState(false);

  // === ACTION HANDLERS (Quick Actions) ===

  const handleAnalyze = async () => {
    if (!onAnalyzeDocument || actionLoading) return;
    const userMsg: Message = {
      id: generateId(), role: 'user', content: 'Analisar documento', timestamp: new Date(),
    };
    setMessages(prev => [...prev, userMsg]);
    setActionLoading(true);
    try {
      const result = await onAnalyzeDocument();
      if (result) {
        const assistantMsg: Message = {
          id: generateId(), role: 'assistant', content: result.summary || `Score: ${result.score}/100 - ${result.issues.length} problemas encontrados.`,
          timestamp: new Date(), analysisResult: result,
        };
        setMessages(prev => [...prev, assistantMsg]);
      }
    } catch (error) {
      const errorMsg: Message = {
        id: generateId(), role: 'assistant',
        content: `Erro ao analisar: ${error instanceof Error ? error.message : 'Erro desconhecido'}`,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setActionLoading(false);
    }
  };

  const handleFormat = async () => {
    if (!onFormatDocument || actionLoading) return;
    const userMsg: Message = {
      id: generateId(), role: 'user', content: 'Formatar documento', timestamp: new Date(),
    };
    setMessages(prev => [...prev, userMsg]);
    setActionLoading(true);
    try {
      const result = await onFormatDocument();
      if (result) {
        const assistantMsg: Message = {
          id: generateId(), role: 'assistant', content: result.message,
          timestamp: new Date(), formatResult: result,
        };
        setMessages(prev => [...prev, assistantMsg]);
      }
    } catch (error) {
      const errorMsg: Message = {
        id: generateId(), role: 'assistant',
        content: `Erro ao formatar: ${error instanceof Error ? error.message : 'Erro desconhecido'}`,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setActionLoading(false);
    }
  };

  const handleReview = async () => {
    if (!onReviewSelection || actionLoading) return;
    const userMsg: Message = {
      id: generateId(), role: 'user', content: 'Revisar seleção', timestamp: new Date(),
    };
    setMessages(prev => [...prev, userMsg]);
    setActionLoading(true);
    try {
      const result = await onReviewSelection();
      if (result) {
        const assistantMsg: Message = {
          id: generateId(), role: 'assistant', content: result.explanation,
          timestamp: new Date(),
          reviewResult: {
            originalText: result.originalText,
            correctedText: result.correctedText,
            explanation: result.explanation,
            changes: result.changes,
          },
        };
        setMessages(prev => [...prev, assistantMsg]);
      }
    } catch (error) {
      const errorMsg: Message = {
        id: generateId(), role: 'assistant',
        content: `Erro ao revisar: ${error instanceof Error ? error.message : 'Erro desconhecido'}`,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setActionLoading(false);
    }
  };

  const handleApplyReview = async (messageId: string, correctedText: string) => {
    try {
      await Word.run(async (context) => {
        const selection = context.document.getSelection();
        selection.insertText(correctedText, Word.InsertLocation.replace);
        await context.sync();
      });
      setMessages(prev => prev.map(m =>
        m.id === messageId && m.reviewResult
          ? { ...m, reviewResult: { ...m.reviewResult, applied: true } }
          : m
      ));
      setMessages(prev => [...prev, {
        id: generateId(), role: 'assistant', content: 'Correção aplicada com sucesso!', timestamp: new Date(),
      }]);
    } catch (error) {
      setMessages(prev => [...prev, {
        id: generateId(), role: 'assistant',
        content: `Erro ao aplicar: ${error instanceof Error ? error.message : 'Selecione o texto novamente e tente de novo.'}`,
        timestamp: new Date(),
      }]);
    }
  };

  const handleRejectReview = (messageId: string) => {
    setMessages(prev => prev.map(m =>
      m.id === messageId && m.reviewResult
        ? { ...m, reviewResult: { ...m.reviewResult, applied: true } }
        : m
    ));
    setMessages(prev => [...prev, {
      id: generateId(), role: 'assistant', content: 'Sugestão rejeitada. Texto original mantido.', timestamp: new Date(),
    }]);
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const generateId = () => `msg_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;

  // Extrair texto gerado da resposta
  const extractGeneratedText = (content: string): string | null => {
    // Encontrar o início (após o cabeçalho "**Texto gerado...")
    const headerIdx = content.indexOf('**Texto gerado');
    if (headerIdx === -1) return content; // Fallback: retorna texto completo

    // Encontrar o separador "---"
    const separatorIdx = content.indexOf('\n---', headerIdx);
    if (separatorIdx === -1) return content; // Fallback: retorna texto completo

    // Pegar tudo entre o fim da linha do cabeçalho e o separador
    const afterHeader = content.indexOf('\n', headerIdx);
    if (afterHeader === -1) return content; // Fallback: retorna conteúdo completo

    let textBlock = content.substring(afterHeader, separatorIdx).trim();

    // Remover nota de docs (linha com 📚) se existir
    if (textBlock.startsWith('📚')) {
      const nextLine = textBlock.indexOf('\n');
      if (nextLine !== -1) {
        textBlock = textBlock.substring(nextLine).trim();
      }
    }

    return textBlock || content; // Fallback se bloco vazio
  };

  // Inserir texto no documento
  const handleInsertText = async (messageId: string, content: string, preGeneratedText?: string | null) => {
    const text = preGeneratedText || extractGeneratedText(content);
    console.log('[DEBUG] Content length:', content.length);
    console.log('[DEBUG] Text to insert length:', text?.length);
    if (!text || !onInsertText) return;

    setInserting(messageId);
    try {
      // Converter Markdown para HTML
      const html = await Promise.resolve(marked.parse(text)) as string;
      console.log('[DEBUG] HTML to insert:', html.substring(0, 100));

      await onInsertText(html, true); // true = isHtml
    } catch (err) {
      console.error('Erro ao converter ou inserir:', err);
    } finally {
      setInserting(null);
    }
  };

  // === FUNÇÕES DE IMAGEM ===

  // Converter arquivo para base64
  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        resolve(result);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  // Handle file select
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      return;
    }

    const dataUrl = await fileToBase64(file);
    const base64 = dataUrl.split(',')[1];

    setPendingImage({
      type: 'upload',
      data: base64,
      preview: dataUrl,
      caption: '',
    });
    setShowImageMenu(false);
    setImageCaption('');
    setImageSource('');

    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Buscar imagens
  const handleImageSearch = async () => {
    if (!searchQuery.trim()) return;

    setSearchLoading(true);
    setSearchResults([]);

    try {
      // Usar Unsplash Source (fallback sem API key)
      const results: SearchResult[] = [
        {
          id: '1',
          url: `https://source.unsplash.com/800x600/?${encodeURIComponent(searchQuery)}`,
          thumbUrl: `https://source.unsplash.com/200x150/?${encodeURIComponent(searchQuery)}`,
          description: searchQuery,
          author: 'Unsplash',
        },
        {
          id: '2',
          url: `https://source.unsplash.com/800x600/?${encodeURIComponent(searchQuery)},nature`,
          thumbUrl: `https://source.unsplash.com/200x150/?${encodeURIComponent(searchQuery)},nature`,
          description: searchQuery,
          author: 'Unsplash',
        },
        {
          id: '3',
          url: `https://source.unsplash.com/800x600/?${encodeURIComponent(searchQuery)},technology`,
          thumbUrl: `https://source.unsplash.com/200x150/?${encodeURIComponent(searchQuery)},technology`,
          description: searchQuery,
          author: 'Unsplash',
        },
      ];
      setSearchResults(results);
    } catch (error) {
      console.error('Erro na busca:', error);
    } finally {
      setSearchLoading(false);
    }
  };

  // Selecionar imagem da busca
  const handleSelectSearchImage = (result: SearchResult) => {
    setPendingImage({
      type: 'url',
      data: result.url,
      preview: result.thumbUrl,
      caption: '',
      source: `${result.author} via Unsplash`,
    });
    setShowImageSearch(false);
    setSearchResults([]);
    setSearchQuery('');
    setImageCaption('');
    setImageSource(result.author ? `${result.author} via Unsplash` : '');
  };

  // Inserir imagem no documento
  const handleInsertImage = async () => {
    if (!pendingImage || !imageCaption.trim()) return;

    setSending(true);

    try {
      let result;

      if (pendingImage.type === 'upload') {
        // Upload local - já está em base64
        result = await DocumentService.insertImageWithCaption(
          pendingImage.data,
          imageCaption,
          imageSource || undefined
        );
      } else {
        // URL externa - usar proxy do backend para evitar CORS
        const proxyResponse = await ApiService.getImageProxy(pendingImage.data);
        if (proxyResponse.success && proxyResponse.base64) {
          result = await DocumentService.insertImageWithCaption(
            proxyResponse.base64,
            imageCaption,
            imageSource || pendingImage.source
          );
        } else {
          throw new Error('Falha ao carregar imagem');
        }
      }

      if (result.success) {
        // Adicionar mensagem de confirmação
        const userMsg: Message = {
          id: generateId(),
          role: 'user',
          content: `Inserir imagem: "${imageCaption}"`,
          timestamp: new Date(),
          image: { caption: imageCaption },
        };

        const assistantMsg: Message = {
          id: generateId(),
          role: 'assistant',
          content: `Figura ${result.figureNumber} inserida no documento com formatação ABNT.`,
          timestamp: new Date(),
          image: { caption: imageCaption, figureNumber: result.figureNumber },
        };

        setMessages((prev) => [...prev, userMsg, assistantMsg]);
      }
    } catch (error) {
      const errorMsg: Message = {
        id: generateId(),
        role: 'assistant',
        content: `Erro ao inserir imagem: ${error instanceof Error ? error.message : 'Erro desconhecido'}`,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setSending(false);
      setPendingImage(null);
      setImageCaption('');
      setImageSource('');
    }
  };

  // Cancelar imagem pendente
  const handleCancelImage = () => {
    setPendingImage(null);
    setImageCaption('');
    setImageSource('');
  };

  // === FUNÇÕES DE GRÁFICO ===

  // Gerar preview do gráfico
  const handleGenerateChartPreview = async () => {
    setChartError(null);

    const labels = chartConfig.labels.split(',').map(l => l.trim()).filter(Boolean);
    const values = chartConfig.values.split(',').map(v => parseFloat(v.trim())).filter(v => !isNaN(v));

    if (labels.length < 2 || values.length < 2) {
      setChartError('Insira pelo menos 2 rótulos e 2 valores separados por vírgula.');
      return;
    }

    if (labels.length !== values.length) {
      setChartError(`Quantidade diferente: ${labels.length} rótulos e ${values.length} valores.`);
      return;
    }

    setChartLoading(true);
    try {
      const response = await ApiService.generateChart({
        chart_type: chartConfig.type,
        labels,
        values,
        title: chartConfig.title || undefined,
        x_label: chartConfig.xLabel || undefined,
        y_label: chartConfig.yLabel || undefined,
      });

      if (response.success && response.base64) {
        setChartPreview(response.base64);
        setChartError(null);
      } else {
        setChartError(response.error || 'Erro desconhecido ao gerar gráfico.');
      }
    } catch (error) {
      console.error('Erro ao gerar preview:', error);
      setChartError(error instanceof Error ? error.message : 'Erro de conexão com o servidor.');
    } finally {
      setChartLoading(false);
    }
  };

  // Inserir gráfico no documento
  const handleInsertChart = async () => {
    if (!chartPreview || !chartConfig.title.trim()) return;

    setSending(true);
    try {
      const result = await DocumentService.insertImageWithCaption(
        chartPreview,
        chartConfig.title,
        chartConfig.source || 'Elaboração própria'
      );

      if (result.success) {
        const userMsg: Message = {
          id: generateId(),
          role: 'user',
          content: `Inserir gráfico: "${chartConfig.title}"`,
          timestamp: new Date(),
          image: { caption: chartConfig.title },
        };

        const assistantMsg: Message = {
          id: generateId(),
          role: 'assistant',
          content: `Figura ${result.figureNumber} (${chartConfig.type === 'pie' ? 'Gráfico de pizza' : chartConfig.type === 'bar' ? 'Gráfico de barras' : chartConfig.type === 'line' ? 'Gráfico de linhas' : 'Gráfico'}) inserida no documento com formatação ABNT.`,
          timestamp: new Date(),
          image: { caption: chartConfig.title, figureNumber: result.figureNumber },
        };

        setMessages((prev) => [...prev, userMsg, assistantMsg]);
        handleCancelChart();
      }
    } catch (error) {
      const errorMsg: Message = {
        id: generateId(),
        role: 'assistant',
        content: `Erro ao inserir gráfico: ${error instanceof Error ? error.message : 'Erro desconhecido'}`,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setSending(false);
    }
  };

  // Cancelar criação de gráfico
  const handleCancelChart = () => {
    setShowChartBuilder(false);
    setChartPreview(null);
    setChartError(null);
    setChartConfig({
      type: 'bar',
      title: '',
      labels: '',
      values: '',
      xLabel: '',
      yLabel: '',
      source: '',
    });
  };

  // Enviar mensagem de texto
  // Enviar mensagem de texto
  const handleSend = async (messageOverride?: string) => {
    const isOverride = typeof messageOverride === 'string';
    const textToSend = isOverride ? messageOverride : input;

    if (!textToSend?.trim() || sending || isLoading) return;

    const userMessage: Message = {
      id: generateId(),
      role: 'user',
      content: textToSend.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    if (!isOverride) setInput('');
    setSending(true);

    try {
      // Preparar histórico (últimas 10 mensagens)
      const historyPayload = messages.slice(-10).map(m => ({
        role: m.role,
        content: m.content
      }));

      const response = await onSendMessage(userMessage.content, historyPayload);
      const assistantMessage: Message = {
        id: generateId(),
        role: 'assistant',
        content: response.message,
        timestamp: new Date(),
        contextInfo: response.context_info,
        generatedContent: response.generated_content,
        wasReviewed: response.was_reviewed,
        reviewScore: response.review_score,

        detailedReview: response.detailed_review,
        proactiveSuggestions: response.proactive_suggestions,
      };
      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      const errorMessage: Message = {
        id: generateId(),
        role: 'assistant',
        content: `Erro: ${error instanceof Error ? error.message : 'Erro desconhecido'}`,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  };

  // Estado de mensagens inseridas com sucesso e conteúdo expandido
  const [insertedMessages, setInsertedMessages] = useState<Set<string>>(new Set());
  const [contentExpanded, setContentExpanded] = useState<Set<string>>(new Set());

  // Renderizar markdown para exibição no chat
  const renderMarkdown = (text: string): string => {
    try {
      const html = marked.parse(text) as string;
      return typeof html === 'string' ? html : text;
    } catch {
      return text;
    }
  };

  // Sugestões dinâmicas baseadas na norma
  const quickSuggestions = [
    `Citações ${normName || 'ABNT'}`,
    'Escreva uma introdução',
    'Como estruturar meu TCC?',
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: theme.spacing.sm }}>
      {/* Context Indicator */}
      {activeProjectName && activePdfCount > 0 && (
        <Card noPadding style={{ background: theme.colors.primaryAlpha, border: `1px solid ${theme.colors.primary}`, padding: theme.spacing.sm }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: theme.spacing.sm }}>
            <span style={{ fontSize: '14px' }}>📚</span>
            <span style={{ fontSize: theme.typography.sizes.xs, color: theme.colors.primary, fontWeight: 600 }}>
              {activePdfCount} PDF{activePdfCount > 1 ? 's' : ''} como contexto
            </span>
            <span style={{ fontSize: theme.typography.sizes.xs, color: theme.colors.text.secondary, marginLeft: 'auto' }}>
              {activeProjectName}
            </span>
          </div>
        </Card>
      )}

      {/* Mensagens */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: theme.spacing.md,
          background: theme.colors.background,
          borderRadius: theme.borderRadius.md,
          border: `1px solid ${theme.colors.border}`,
          display: 'flex',
          flexDirection: 'column',
          gap: theme.spacing.md
        }}
      >
        {messages.map((message) => {
          const generatedText = message.generatedContent || null;
          const isInsertingThis = inserting === message.id;
          const isInserted = insertedMessages.has(message.id);
          const isExpanded = contentExpanded.has(message.id);

          return (
            <div
              key={message.id}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: message.role === 'user' ? 'flex-end' : 'flex-start',
                gap: '6px',
              }}
            >
              {/* Bolha de chat */}
              <div
                style={{
                  maxWidth: '85%',
                  padding: theme.spacing.sm,
                  borderRadius: message.role === 'user' ? '12px 12px 2px 12px' : '12px 12px 12px 2px',
                  background: message.role === 'user' ? theme.colors.primary : theme.colors.surfaceHighlight,
                  color: message.role === 'user' ? theme.colors.text.inverse : theme.colors.text.primary,
                  boxShadow: theme.shadows.sm
                }}
              >
                {/* Indicador de imagem */}
                {message.image && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '4px', fontSize: '11px', opacity: 0.8 }}>
                    🖼️ {message.image.figureNumber ? `Figura ${message.image.figureNumber}` : 'Imagem'}
                  </div>
                )}

                {/* Renderizar markdown para mensagens do assistente */}
                {message.role === 'assistant' ? (
                  <div
                    style={{ margin: 0, fontSize: theme.typography.sizes.sm, lineHeight: 1.5 }}
                    className="chat-markdown"
                    dangerouslySetInnerHTML={{ __html: renderMarkdown(message.content) }}
                  />
                ) : (
                  <p style={{ margin: 0, fontSize: theme.typography.sizes.sm, lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>
                    {message.content}
                  </p>
                )}
              </div>

              {/* Sugestões Proativas */}
              {
                message.proactiveSuggestions && message.proactiveSuggestions.length > 0 && (
                  <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px',
                    marginTop: '4px',
                    width: '85%'
                  }}>
                    {message.proactiveSuggestions.map((suggestion, idx) => (
                      <div
                        key={idx}
                        style={{
                          background: 'rgba(59, 130, 246, 0.1)',
                          border: '1px solid rgba(59, 130, 246, 0.2)',
                          borderRadius: '8px',
                          padding: '10px 12px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          fontSize: '12px'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontSize: '14px' }}>💡</span>
                          <span style={{ color: '#e2e8f0' }}>{suggestion.message}</span>
                        </div>
                        <button
                          onClick={() => {
                            const actionMsg = `Gostaria de proceder com a sugestão: ${suggestion.action} para a seção ${suggestion.section_type}`;
                            handleSend(actionMsg); // Changed from handleSendMessage to handleSend
                          }}
                          style={{
                            background: '#2563eb',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            padding: '4px 10px',
                            cursor: 'pointer',
                            fontSize: '11px',
                            fontWeight: 500
                          }}
                        >
                          {suggestion.action}
                        </button>
                      </div>
                    ))}
                  </div>
                )
              }

              {/* Card de conteúdo gerado (separado da bolha) */}
              {
                generatedText && onInsertText && (
                  <div
                    style={{
                      maxWidth: '92%',
                      background: '#111',
                      border: `1px solid ${theme.colors.border}`,
                      borderRadius: '10px',
                      overflow: 'hidden',
                    }}
                  >
                    {/* Header do card */}
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '10px 14px',
                        background: '#1a1a1a',
                        borderBottom: `1px solid ${theme.colors.border}`,
                        cursor: 'pointer',
                      }}
                      onClick={() => {
                        setContentExpanded(prev => {
                          const next = new Set(prev);
                          if (next.has(message.id)) next.delete(message.id);
                          else next.add(message.id);
                          return next;
                        });
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ fontSize: '13px' }}>📝</span>
                        <span style={{ fontSize: '11px', color: theme.colors.text.secondary, fontWeight: 500 }}>
                          Texto gerado
                        </span>
                        <span style={{ fontSize: '10px', color: theme.colors.text.tertiary, background: '#222', padding: '1px 6px', borderRadius: '8px' }}>
                          {generatedText.split(/\s+/).length} palavras
                        </span>
                        <span style={{ fontSize: '10px', color: theme.colors.text.tertiary, background: '#222', padding: '1px 6px', borderRadius: '8px' }}>
                          {(generatedText.match(/\n\n/g) || []).length + 1} parágrafos
                        </span>
                        {message.wasReviewed && (
                          <span style={{ fontSize: '10px', color: '#4ade80', background: 'rgba(74,222,128,0.12)', padding: '1px 6px', borderRadius: '8px', fontWeight: 600 }}>
                            ✓ Revisado {message.reviewScore ? `${message.reviewScore}/10` : ''}
                          </span>
                        )}
                      </div>
                      <span style={{ fontSize: '10px', color: theme.colors.text.tertiary, transition: 'transform 0.2s', transform: isExpanded ? 'rotate(180deg)' : 'none' }}>▼</span>
                    </div>

                    {/* Preview colapsável do conteúdo */}
                    {isExpanded && (
                      <div style={{ position: 'relative' }}>
                        <div
                          style={{
                            padding: '14px 16px',
                            maxHeight: '350px',
                            overflowY: 'auto',
                            fontSize: '12px',
                            lineHeight: 1.7,
                            color: '#ccc',
                          }}
                          className="content-card-body"
                          dangerouslySetInnerHTML={{ __html: renderMarkdown(generatedText) }}
                        />
                      </div>
                    )}

                    {/* Botão de inserção */}
                    <div style={{ padding: '8px 12px', borderTop: isExpanded ? `1px solid ${theme.colors.border}` : 'none' }}>
                      <button
                        onClick={async () => {
                          await handleInsertText(message.id, message.content, generatedText);
                          setInsertedMessages(prev => new Set(prev).add(message.id));
                          setTimeout(() => {
                            setInsertedMessages(prev => {
                              const next = new Set(prev);
                              next.delete(message.id);
                              return next;
                            });
                          }, 3000);
                        }}
                        disabled={isInsertingThis}
                        style={{
                          width: '100%',
                          padding: '8px 12px',
                          borderRadius: '6px',
                          border: 'none',
                          background: isInserted ? '#22c55e' : theme.colors.primary,
                          color: '#fff',
                          fontSize: '12px',
                          fontWeight: 600,
                          cursor: isInsertingThis ? 'wait' : 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '6px',
                          opacity: isInsertingThis ? 0.7 : 1,
                          transition: 'all 0.3s ease',
                        }}
                      >
                        {isInsertingThis ? (
                          <>
                            <span style={{ animation: 'spin 1s linear infinite', display: 'inline-block' }}>⏳</span>
                            Inserindo...
                          </>
                        ) : isInserted ? (
                          <>
                            ✅ Inserido com sucesso!
                          </>
                        ) : (
                          <>
                            📄 Inserir no Word
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                )
              }

              {/* Rubrica Detalhada */}
              {message.detailedReview && (
                <div style={{
                  maxWidth: '92%',
                  background: '#111',
                  border: `1px solid ${theme.colors.border}`,
                  borderRadius: '10px',
                  marginTop: '8px',
                  overflow: 'hidden'
                }}>
                  <div style={{
                    padding: '10px 14px',
                    background: '#1a1a1a',
                    borderBottom: `1px solid ${theme.colors.border}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between'
                  }}>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <span>📊</span>
                      <span style={{ fontSize: '12px', fontWeight: 600, color: '#e2e8f0' }}>Avaliação de Qualidade</span>
                    </div>
                    <span style={{
                      fontSize: '12px',
                      fontWeight: 700,
                      color: message.detailedReview.total_score >= 7 ? '#4ade80' : '#facc15'
                    }}>
                      Nota {message.detailedReview.total_score.toFixed(1)}
                    </span>
                  </div>

                  <div style={{ padding: '12px' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '12px' }}>
                      {message.detailedReview.criteria.map((c, i) => (
                        <div key={i} style={{ background: '#222', padding: '8px', borderRadius: '6px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                            <span style={{ fontSize: '11px', color: '#94a3b8' }}>{c.name}</span>
                            <span style={{ fontSize: '11px', fontWeight: 600, color: c.score >= 7 ? '#4ade80' : '#f87171' }}>
                              {c.score}
                            </span>
                          </div>
                          <div style={{ width: '100%', height: '4px', background: '#333', borderRadius: '2px' }}>
                            <div style={{
                              width: `${c.score * 10}%`,
                              height: '100%',
                              background: c.score >= 7 ? '#4ade80' : '#f87171',
                              borderRadius: '2px'
                            }} />
                          </div>
                        </div>
                      ))}
                    </div>
                    <p style={{ fontSize: '11px', color: '#cbd5e1', lineHeight: '1.5', fontStyle: 'italic', margin: 0 }}>
                      "{message.detailedReview.summary}"
                    </p>
                  </div>
                </div>
              )}

              {/* Card de Análise */}
              {message.analysisResult && (
                <div style={{
                  maxWidth: '92%',
                  background: '#111',
                  border: `1px solid ${theme.colors.border}`,
                  borderRadius: '10px',
                  overflow: 'hidden',
                  padding: '12px',
                }}>
                  <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '12px' }}>
                    <ComplianceScore
                      score={message.analysisResult.score}
                      issueCount={message.analysisResult.issues.length}
                      size="small"
                      animate={true}
                    />
                  </div>
                  {message.analysisResult.issues.length > 0 && (
                    <IssuesList
                      issues={message.analysisResult.issues}
                      maxVisible={3}
                      onIssueClick={onIssueClick}
                      onApplyFix={onApplyFix}
                    />
                  )}
                </div>
              )}

              {/* Card de Formatação */}
              {message.formatResult && (
                <div style={{
                  maxWidth: '92%',
                  padding: '10px 14px',
                  borderRadius: '10px',
                  background: message.formatResult.success
                    ? 'rgba(16, 185, 129, 0.1)'
                    : 'rgba(239, 68, 68, 0.1)',
                  border: `1px solid ${message.formatResult.success
                    ? 'rgba(16, 185, 129, 0.3)'
                    : 'rgba(239, 68, 68, 0.3)'}`,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '16px' }}>
                      {message.formatResult.success ? '✅' : '❌'}
                    </span>
                    <span style={{ fontSize: '12px', color: theme.colors.text.primary }}>
                      {message.formatResult.message}
                    </span>
                  </div>
                  {message.formatResult.actionsApplied > 0 && (
                    <span style={{ fontSize: '11px', color: theme.colors.text.secondary, marginTop: '4px', display: 'block' }}>
                      {message.formatResult.actionsApplied} formatações aplicadas
                    </span>
                  )}
                </div>
              )}

              {/* Card de Revisão */}
              {message.reviewResult && !message.reviewResult.applied && (
                <div style={{
                  maxWidth: '92%',
                  background: '#111',
                  border: `1px solid ${theme.colors.primary}`,
                  borderRadius: '10px',
                  overflow: 'hidden',
                }}>
                  <div style={{
                    padding: '10px 14px',
                    background: '#1a1a1a',
                    borderBottom: `1px solid ${theme.colors.border}`,
                    display: 'flex', alignItems: 'center', gap: '6px',
                  }}>
                    <span>✨</span>
                    <span style={{ fontSize: '11px', color: theme.colors.text.secondary, fontWeight: 500 }}>
                      Sugestão de Melhoria
                    </span>
                  </div>
                  <div style={{ padding: '12px 14px' }}>
                    <div style={{ marginBottom: '8px' }}>
                      <span style={{ fontSize: '10px', color: theme.colors.text.tertiary }}>Original:</span>
                      <div style={{
                        fontSize: '12px', color: theme.colors.text.secondary,
                        textDecoration: 'line-through', opacity: 0.6,
                        padding: '6px', background: theme.colors.surface,
                        borderRadius: '4px', marginTop: '4px',
                        maxHeight: '80px', overflowY: 'auto',
                      }}>
                        {message.reviewResult.originalText}
                      </div>
                    </div>
                    <div style={{ marginBottom: '8px' }}>
                      <span style={{ fontSize: '10px', color: theme.colors.primary }}>Sugerido:</span>
                      <div style={{
                        fontSize: '12px', color: theme.colors.text.primary,
                        padding: '6px', background: theme.colors.surfaceHighlight,
                        borderRadius: '4px', borderLeft: `2px solid ${theme.colors.primary}`,
                        marginTop: '4px', maxHeight: '120px', overflowY: 'auto',
                      }}>
                        {message.reviewResult.correctedText}
                      </div>
                    </div>
                    {message.reviewResult.changes.length > 0 && (
                      <div style={{ marginBottom: '8px' }}>
                        <span style={{ fontSize: '10px', color: theme.colors.text.tertiary }}>Alterações:</span>
                        <ul style={{ margin: '4px 0 0', paddingLeft: '16px' }}>
                          {message.reviewResult.changes.map((change, i) => (
                            <li key={i} style={{ fontSize: '11px', color: theme.colors.text.secondary, marginBottom: '2px' }}>{change}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                  <div style={{
                    display: 'flex', gap: '8px', padding: '8px 12px',
                    borderTop: `1px solid ${theme.colors.border}`,
                  }}>
                    <button
                      onClick={() => handleApplyReview(message.id, message.reviewResult!.correctedText)}
                      style={{
                        flex: 1, padding: '8px', borderRadius: '6px', border: 'none',
                        background: '#16a34a', color: 'white', fontSize: '12px',
                        fontWeight: 600, cursor: 'pointer',
                      }}
                    >
                      Aceitar
                    </button>
                    <button
                      onClick={() => handleRejectReview(message.id)}
                      style={{
                        flex: 1, padding: '8px', borderRadius: '6px', border: 'none',
                        background: '#dc2626', color: 'white', fontSize: '12px',
                        fontWeight: 600, cursor: 'pointer',
                      }}
                    >
                      Rejeitar
                    </button>
                  </div>
                </div>
              )}

              <span style={{ fontSize: '10px', color: theme.colors.text.tertiary }}>
                {formatTime(message.timestamp)}
              </span>
            </div>
          );
        })}

        {(sending || actionLoading) && (
          <div style={{ padding: '8px', background: theme.colors.surfaceHighlight, borderRadius: '12px', width: 'fit-content' }}>
            <span style={{ fontSize: '12px', color: theme.colors.text.secondary }}>
              {actionLoading ? 'Processando...' : 'Digitando...'}
            </span>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Sugestões */}
      {
        messages.length <= 1 && !pendingImage && (
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {quickSuggestions.map((suggestion) => (
              <Button
                key={suggestion}
                size="sm"
                variant="outline"
                onClick={() => setInput(suggestion)}
              >
                {suggestion}
              </Button>
            ))}
          </div>
        )
      }

      {/* Modal de Imagem Pendente */}
      {
        pendingImage && (
          <div
            style={{
              position: 'absolute',
              top: 0, left: 0, right: 0, bottom: 0,
              background: 'rgba(0,0,0,0.8)',
              zIndex: 100,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center',
              padding: '20px',
            }}
            onClick={(e) => { if (e.target === e.currentTarget) handleCancelImage(); }}
          >
            <div style={{
              background: '#0d0d0d',
              borderRadius: '12px',
              border: '1px solid #333',
              width: '100%',
              maxWidth: '400px',
              display: 'flex',
              flexDirection: 'column',
            }}>
              <div style={{
                padding: '12px 16px',
                borderBottom: '1px solid #333',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                background: '#1a1a1a',
                borderRadius: '12px 12px 0 0',
              }}>
                <span style={{ fontWeight: 600, color: '#fff', fontSize: '13px' }}>Inserir Imagem</span>
                <button
                  onClick={handleCancelImage}
                  style={{ background: 'transparent', border: 'none', color: '#888', cursor: 'pointer', fontSize: '14px' }}
                >
                  ✕
                </button>
              </div>
              <div style={{ padding: '16px' }}>
                <div style={{ display: 'flex', gap: '10px', marginBottom: '12px' }}>
                  <img
                    src={pendingImage.preview}
                    alt="Preview"
                    style={{ width: '80px', height: '80px', objectFit: 'cover', borderRadius: '8px', border: '1px solid #333' }}
                  />
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <input
                      type="text"
                      placeholder="Descrição da figura *"
                      value={imageCaption}
                      onChange={(e) => setImageCaption(e.target.value)}
                      style={{
                        width: '100%', padding: '8px', borderRadius: '6px',
                        border: '1px solid #333', background: '#0a0a0a',
                        color: '#fff', fontSize: '11px', boxSizing: 'border-box',
                      }}
                    />
                    <input
                      type="text"
                      placeholder="Fonte (ex: Autor, 2024)"
                      value={imageSource}
                      onChange={(e) => setImageSource(e.target.value)}
                      style={{
                        width: '100%', padding: '8px', borderRadius: '6px',
                        border: '1px solid #333', background: '#0a0a0a',
                        color: '#fff', fontSize: '11px', boxSizing: 'border-box',
                      }}
                    />
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    onClick={handleCancelImage}
                    style={{
                      flex: 1, padding: '10px', borderRadius: '6px',
                      border: '1px solid #333', background: 'transparent',
                      color: '#888', fontSize: '12px', cursor: 'pointer',
                    }}
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleInsertImage}
                    disabled={!imageCaption.trim() || sending}
                    style={{
                      flex: 1, padding: '10px', borderRadius: '6px', border: 'none',
                      background: imageCaption.trim() && !sending ? '#Eebb4d' : '#333',
                      color: imageCaption.trim() && !sending ? '#0a0a0a' : '#666',
                      fontSize: '12px', fontWeight: 600,
                      cursor: imageCaption.trim() && !sending ? 'pointer' : 'not-allowed',
                    }}
                  >
                    {sending ? 'Inserindo...' : 'Inserir no Documento'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )
      }

      {/* Modal de Busca de Imagens */}
      {
        showImageSearch && (
          <div
            style={{
              position: 'absolute',
              top: 0, left: 0, right: 0, bottom: 0,
              background: 'rgba(0,0,0,0.8)',
              zIndex: 100,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center',
              padding: '20px',
            }}
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                setShowImageSearch(false);
                setSearchResults([]);
                setSearchQuery('');
              }
            }}
          >
            <div style={{
              background: '#0d0d0d',
              borderRadius: '12px',
              border: '1px solid #333',
              width: '100%',
              maxWidth: '400px',
              maxHeight: '80vh',
              display: 'flex',
              flexDirection: 'column',
            }}>
              <div style={{
                padding: '12px 16px',
                borderBottom: '1px solid #333',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                background: '#1a1a1a',
                borderRadius: '12px 12px 0 0',
              }}>
                <span style={{ fontWeight: 600, color: '#fff', fontSize: '13px' }}>Banco de Imagens</span>
                <button
                  onClick={() => { setShowImageSearch(false); setSearchResults([]); setSearchQuery(''); }}
                  style={{ background: 'transparent', border: 'none', color: '#888', cursor: 'pointer', fontSize: '14px' }}
                >
                  ✕
                </button>
              </div>
              <div style={{ padding: '16px', overflowY: 'auto' }}>
                <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
                  <input
                    type="text"
                    placeholder="Buscar imagens..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleImageSearch()}
                    style={{
                      flex: 1, padding: '8px', borderRadius: '6px',
                      border: '1px solid #333', background: '#0a0a0a',
                      color: '#fff', fontSize: '11px',
                    }}
                  />
                  <button
                    onClick={handleImageSearch}
                    disabled={searchLoading}
                    style={{
                      padding: '8px 14px', borderRadius: '6px', border: 'none',
                      background: '#Eebb4d', color: '#0a0a0a', fontSize: '11px',
                      fontWeight: 600, cursor: searchLoading ? 'not-allowed' : 'pointer',
                    }}
                  >
                    {searchLoading ? '...' : 'Buscar'}
                  </button>
                </div>

                {searchResults.length > 0 && (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px' }}>
                    {searchResults.map((result) => (
                      <div
                        key={result.id}
                        onClick={() => handleSelectSearchImage(result)}
                        style={{
                          aspectRatio: '4/3', borderRadius: '6px', overflow: 'hidden',
                          cursor: 'pointer', border: '2px solid transparent', transition: 'border-color 0.2s',
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#Eebb4d'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'transparent'; }}
                      >
                        <img src={result.thumbUrl} alt={result.description} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      </div>
                    ))}
                  </div>
                )}

                <p style={{ fontSize: '9px', color: '#666', marginTop: '10px', textAlign: 'center' }}>
                  Imagens via Unsplash (uso gratuito)
                </p>
              </div>
            </div>
          </div>
        )
      }

      {/* Modal de Criar Gráfico */}
      {
        showChartBuilder && (
          <div
            style={{
              position: 'absolute',
              top: 0, left: 0, right: 0, bottom: 0,
              background: 'rgba(0,0,0,0.8)',
              zIndex: 100,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center',
              padding: '20px',
            }}
            onClick={(e) => { if (e.target === e.currentTarget) handleCancelChart(); }}
          >
            <div style={{
              background: '#0d0d0d',
              borderRadius: '12px',
              border: '1px solid #333',
              width: '100%',
              maxWidth: '400px',
              maxHeight: '85vh',
              display: 'flex',
              flexDirection: 'column',
            }}>
              <div style={{
                padding: '12px 16px',
                borderBottom: '1px solid #333',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                background: '#1a1a1a',
                borderRadius: '12px 12px 0 0',
                flexShrink: 0,
              }}>
                <span style={{ fontWeight: 600, color: '#fff', fontSize: '13px' }}>Criar Gráfico</span>
                <button
                  onClick={handleCancelChart}
                  style={{ background: 'transparent', border: 'none', color: '#888', cursor: 'pointer', fontSize: '14px' }}
                >
                  ✕
                </button>
              </div>
              <div style={{ padding: '16px', overflowY: 'auto', flex: 1 }}>
                {/* Tipo */}
                <div style={{ marginBottom: '10px' }}>
                  <label style={{ fontSize: '10px', color: '#888', display: 'block', marginBottom: '4px' }}>Tipo</label>
                  <select
                    value={chartConfig.type}
                    onChange={(e) => { setChartConfig({ ...chartConfig, type: e.target.value as ChartType }); setChartPreview(null); }}
                    style={{
                      width: '100%', padding: '8px', borderRadius: '6px',
                      border: '1px solid #333', background: '#0a0a0a',
                      color: '#fff', fontSize: '11px',
                    }}
                  >
                    <option value="bar">Barras Verticais</option>
                    <option value="bar_horizontal">Barras Horizontais</option>
                    <option value="line">Linhas</option>
                    <option value="pie">Pizza</option>
                    <option value="area">Área</option>
                  </select>
                </div>

                {/* Título */}
                <div style={{ marginBottom: '10px' }}>
                  <label style={{ fontSize: '10px', color: '#888', display: 'block', marginBottom: '4px' }}>Título da Figura *</label>
                  <input
                    type="text"
                    placeholder="Ex: Evolução das vendas em 2024"
                    value={chartConfig.title}
                    onChange={(e) => setChartConfig({ ...chartConfig, title: e.target.value })}
                    style={{
                      width: '100%', padding: '8px', borderRadius: '6px',
                      border: '1px solid #333', background: '#0a0a0a',
                      color: '#fff', fontSize: '11px', boxSizing: 'border-box',
                    }}
                  />
                </div>

                {/* Labels e Values */}
                <div style={{ display: 'flex', gap: '8px', marginBottom: '10px' }}>
                  <div style={{ flex: 1 }}>
                    <label style={{ fontSize: '10px', color: '#888', display: 'block', marginBottom: '4px' }}>Categorias</label>
                    <input
                      type="text"
                      placeholder="Jan, Fev, Mar"
                      value={chartConfig.labels}
                      onChange={(e) => { setChartConfig({ ...chartConfig, labels: e.target.value }); setChartPreview(null); }}
                      style={{
                        width: '100%', padding: '8px', borderRadius: '6px',
                        border: '1px solid #333', background: '#0a0a0a',
                        color: '#fff', fontSize: '11px', boxSizing: 'border-box',
                      }}
                    />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={{ fontSize: '10px', color: '#888', display: 'block', marginBottom: '4px' }}>Valores</label>
                    <input
                      type="text"
                      placeholder="100, 150, 200"
                      value={chartConfig.values}
                      onChange={(e) => { setChartConfig({ ...chartConfig, values: e.target.value }); setChartPreview(null); }}
                      style={{
                        width: '100%', padding: '8px', borderRadius: '6px',
                        border: '1px solid #333', background: '#0a0a0a',
                        color: '#fff', fontSize: '11px', boxSizing: 'border-box',
                      }}
                    />
                  </div>
                </div>

                {/* Eixos */}
                {chartConfig.type !== 'pie' && (
                  <div style={{ display: 'flex', gap: '8px', marginBottom: '10px' }}>
                    <div style={{ flex: 1 }}>
                      <label style={{ fontSize: '10px', color: '#888', display: 'block', marginBottom: '4px' }}>Eixo X</label>
                      <input
                        type="text"
                        placeholder="Meses"
                        value={chartConfig.xLabel}
                        onChange={(e) => setChartConfig({ ...chartConfig, xLabel: e.target.value })}
                        style={{
                          width: '100%', padding: '8px', borderRadius: '6px',
                          border: '1px solid #333', background: '#0a0a0a',
                          color: '#fff', fontSize: '11px', boxSizing: 'border-box',
                        }}
                      />
                    </div>
                    <div style={{ flex: 1 }}>
                      <label style={{ fontSize: '10px', color: '#888', display: 'block', marginBottom: '4px' }}>Eixo Y</label>
                      <input
                        type="text"
                        placeholder="Vendas (R$)"
                        value={chartConfig.yLabel}
                        onChange={(e) => setChartConfig({ ...chartConfig, yLabel: e.target.value })}
                        style={{
                          width: '100%', padding: '8px', borderRadius: '6px',
                          border: '1px solid #333', background: '#0a0a0a',
                          color: '#fff', fontSize: '11px', boxSizing: 'border-box',
                        }}
                      />
                    </div>
                  </div>
                )}

                {/* Fonte */}
                <div style={{ marginBottom: '12px' }}>
                  <label style={{ fontSize: '10px', color: '#888', display: 'block', marginBottom: '4px' }}>Fonte</label>
                  <input
                    type="text"
                    placeholder="Elaboração própria"
                    value={chartConfig.source}
                    onChange={(e) => setChartConfig({ ...chartConfig, source: e.target.value })}
                    style={{
                      width: '100%', padding: '8px', borderRadius: '6px',
                      border: '1px solid #333', background: '#0a0a0a',
                      color: '#fff', fontSize: '11px', boxSizing: 'border-box',
                    }}
                  />
                </div>

                {/* Erro */}
                {chartError && (
                  <div style={{
                    marginBottom: '10px', padding: '8px 12px', borderRadius: '6px',
                    background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)',
                    color: '#ef4444', fontSize: '11px',
                  }}>
                    {chartError}
                  </div>
                )}

                {/* Preview */}
                {chartPreview && (
                  <div style={{ marginBottom: '12px', textAlign: 'center' }}>
                    <img
                      src={`data:image/png;base64,${chartPreview}`}
                      alt="Preview do gráfico"
                      style={{ maxWidth: '100%', maxHeight: '160px', borderRadius: '6px', border: '1px solid #333' }}
                    />
                  </div>
                )}

                {/* Botões */}
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    onClick={handleGenerateChartPreview}
                    disabled={chartLoading || !chartConfig.labels.trim() || !chartConfig.values.trim()}
                    style={{
                      flex: 1, padding: '10px', borderRadius: '6px',
                      border: '1px solid #333', background: 'transparent',
                      color: chartConfig.labels.trim() && chartConfig.values.trim() ? '#fff' : '#666',
                      fontSize: '12px',
                      cursor: chartConfig.labels.trim() && chartConfig.values.trim() ? 'pointer' : 'not-allowed',
                    }}
                  >
                    {chartLoading ? 'Gerando...' : 'Visualizar'}
                  </button>
                  <button
                    onClick={handleInsertChart}
                    disabled={!chartPreview || !chartConfig.title.trim() || sending}
                    style={{
                      flex: 1, padding: '10px', borderRadius: '6px', border: 'none',
                      background: chartPreview && chartConfig.title.trim() && !sending ? '#Eebb4d' : '#333',
                      color: chartPreview && chartConfig.title.trim() && !sending ? '#0a0a0a' : '#666',
                      fontSize: '12px', fontWeight: 600,
                      cursor: chartPreview && chartConfig.title.trim() && !sending ? 'pointer' : 'not-allowed',
                    }}
                  >
                    {sending ? 'Inserindo...' : 'Inserir no Documento'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )
      }

      {/* Input com botão + */}
      <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
        {/* Botão + unificado */}
        <div style={{ position: 'relative' }}>
          <button
            onClick={() => setShowImageMenu(!showImageMenu)}
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '50%',
              border: `1px solid ${showImageMenu ? theme.colors.primary : '#333'}`,
              background: showImageMenu ? theme.colors.primary : 'transparent',
              color: showImageMenu ? '#0a0a0a' : '#888',
              fontSize: '18px',
              cursor: 'pointer',
              flexShrink: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.2s',
              transform: showImageMenu ? 'rotate(45deg)' : 'none',
            }}
            title="Ações"
          >
            +
          </button>

          {/* Menu unificado */}
          {showImageMenu && (
            <div
              style={{
                position: 'absolute',
                bottom: '100%',
                left: 0,
                marginBottom: '6px',
                background: '#1a1a1a',
                border: '1px solid #333',
                borderRadius: '10px',
                overflow: 'hidden',
                minWidth: '180px',
                zIndex: 10,
                boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
              }}
            >
              {/* Seção: Ferramentas */}
              <div style={{ padding: '6px 12px 2px', fontSize: '9px', color: '#666', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Ferramentas
              </div>
              {onAnalyzeDocument && (
                <button
                  onClick={() => { handleAnalyze(); setShowImageMenu(false); }}
                  disabled={actionLoading || sending}
                  style={{
                    width: '100%', padding: '9px 12px', border: 'none',
                    background: 'transparent', color: actionLoading ? '#555' : '#fff',
                    fontSize: '12px', textAlign: 'left', cursor: actionLoading ? 'not-allowed' : 'pointer',
                    display: 'flex', alignItems: 'center', gap: '10px',
                  }}
                  onMouseEnter={(e) => { if (!actionLoading) e.currentTarget.style.background = '#2a2a2a'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                >
                  <span style={{ fontSize: '14px' }}>📊</span> Analisar Documento
                </button>
              )}
              {onFormatDocument && (
                <button
                  onClick={() => { handleFormat(); setShowImageMenu(false); }}
                  disabled={actionLoading || sending}
                  style={{
                    width: '100%', padding: '9px 12px', border: 'none',
                    background: 'transparent', color: actionLoading ? '#555' : '#fff',
                    fontSize: '12px', textAlign: 'left', cursor: actionLoading ? 'not-allowed' : 'pointer',
                    display: 'flex', alignItems: 'center', gap: '10px',
                  }}
                  onMouseEnter={(e) => { if (!actionLoading) e.currentTarget.style.background = '#2a2a2a'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                >
                  <span style={{ fontSize: '14px' }}>🎨</span> Formatar Documento
                </button>
              )}
              {onReviewSelection && (
                <button
                  onClick={() => { handleReview(); setShowImageMenu(false); }}
                  disabled={actionLoading || sending}
                  style={{
                    width: '100%', padding: '9px 12px', border: 'none',
                    background: 'transparent', color: actionLoading ? '#555' : '#fff',
                    fontSize: '12px', textAlign: 'left', cursor: actionLoading ? 'not-allowed' : 'pointer',
                    display: 'flex', alignItems: 'center', gap: '10px',
                  }}
                  onMouseEnter={(e) => { if (!actionLoading) e.currentTarget.style.background = '#2a2a2a'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                >
                  <span style={{ fontSize: '14px' }}>✏️</span> Revisar Seleção
                </button>
              )}

              {/* Separador */}
              <div style={{ borderTop: '1px solid #333', margin: '4px 0' }} />

              {/* Seção: Inserir */}
              <div style={{ padding: '6px 12px 2px', fontSize: '9px', color: '#666', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Inserir
              </div>
              <button
                onClick={() => { fileInputRef.current?.click(); setShowImageMenu(false); }}
                style={{
                  width: '100%', padding: '9px 12px', border: 'none',
                  background: 'transparent', color: '#fff', fontSize: '12px',
                  textAlign: 'left', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = '#2a2a2a'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
              >
                <span style={{ fontSize: '14px' }}>🖼️</span> Imagem do Computador
              </button>
              <button
                onClick={() => { setShowImageSearch(true); setShowImageMenu(false); }}
                style={{
                  width: '100%', padding: '9px 12px', border: 'none',
                  background: 'transparent', color: '#fff', fontSize: '12px',
                  textAlign: 'left', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = '#2a2a2a'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
              >
                <span style={{ fontSize: '14px' }}>🔍</span> Banco de Imagens
              </button>
              <button
                onClick={() => { setShowChartBuilder(true); setShowImageMenu(false); }}
                style={{
                  width: '100%', padding: '9px 12px', border: 'none',
                  background: 'transparent', color: '#fff', fontSize: '12px',
                  textAlign: 'left', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = '#2a2a2a'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
              >
                <span style={{ fontSize: '14px' }}>📊</span> Criar Gráfico
              </button>

              {/* Separador */}
              <div style={{ borderTop: '1px solid #333', margin: '4px 0' }} />

              {/* Seção: Pesquisa */}
              <button
                onClick={() => { setShowResearchModal(true); setShowImageMenu(false); }}
                style={{
                  width: '100%', padding: '9px 12px', border: 'none',
                  background: 'transparent', color: '#fff', fontSize: '12px',
                  textAlign: 'left', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = '#2a2a2a'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
              >
                <span style={{ fontSize: '14px' }}>📚</span> Pesquisa Acadêmica
              </button>
              <button
                onClick={() => { setShowProjectSelector(true); setShowImageMenu(false); }}
                style={{
                  width: '100%', padding: '9px 12px', border: 'none',
                  background: 'transparent', color: '#fff', fontSize: '12px',
                  textAlign: 'left', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px',
                  borderRadius: '0 0 10px 10px',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = '#2a2a2a'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
              >
                <span style={{ fontSize: '14px' }}>📁</span> Gerenciar Projetos
              </button>
            </div>
          )}
        </div>

        {/* Input de arquivo oculto */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileSelect}
          style={{ display: 'none' }}
        />

        {/* Input de texto */}
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          placeholder={placeholder}
          disabled={sending || isLoading || !!pendingImage || showChartBuilder}
          style={{
            flex: 1,
            padding: '10px 12px',
            borderRadius: '10px',
            border: '1px solid #333',
            background: '#1a1a1a',
            color: '#fff',
            fontSize: '12px',
            outline: 'none',
            minWidth: 0,
          }}
          onFocus={(e) => {
            e.currentTarget.style.borderColor = '#Eebb4d';
          }}
          onBlur={(e) => {
            e.currentTarget.style.borderColor = '#333';
          }}
        />

        {/* Botão de enviar */}
        <button
          onClick={() => handleSend()}
          disabled={!input.trim() || sending || isLoading || !!pendingImage || showChartBuilder}
          style={{
            padding: '10px 14px',
            borderRadius: '10px',
            border: 'none',
            background: input.trim() && !sending && !pendingImage && !showChartBuilder ? '#Eebb4d' : '#333',
            color: input.trim() && !sending && !pendingImage && !showChartBuilder ? '#0a0a0a' : '#666',
            fontWeight: 600,
            fontSize: '14px',
            cursor: input.trim() && !sending && !pendingImage && !showChartBuilder ? 'pointer' : 'not-allowed',
            flexShrink: 0,
          }}
        >
          {sending ? '...' : '→'}
        </button>
      </div>


      {/* Modal de Projetos */}
      {
        showProjectSelector && (
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(0,0,0,0.8)',
              zIndex: 100,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center',
              padding: '20px',
            }}
            onClick={(e) => {
              if (e.target === e.currentTarget) setShowProjectSelector(false);
            }}
          >
            <div
              style={{
                background: '#0d0d0d',
                borderRadius: '12px',
                border: '1px solid #333',
                width: '100%',
                maxWidth: '400px',
                maxHeight: '80vh',
                overflowY: 'auto',
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              <div style={{
                padding: '12px 16px',
                borderBottom: '1px solid #333',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                background: '#1a1a1a',
                position: 'sticky',
                top: 0
              }}>
                <span style={{ fontWeight: 600, color: '#fff' }}>Gerenciar Projetos</span>
                <button
                  onClick={() => setShowProjectSelector(false)}
                  style={{ background: 'transparent', border: 'none', color: '#888', cursor: 'pointer', fontSize: '14px' }}
                >
                  ✕
                </button>
              </div>
              <div style={{ padding: '16px' }}>
                <ProjectSelector
                  selectedProjectId={selectedProjectId || null}
                  onProjectSelect={(id) => {
                    onProjectSelect?.(id);
                    // Opcional: fechar modal ao selecionar, ou manter aberto para gerenciar
                  }}
                  onProjectInfoChange={onProjectInfoChange}
                  onMessage={(msg) => onFeedbackMessage?.(msg)}
                  mode="modal"
                />
              </div>
            </div>
          </div>
        )
      }

      {/* Modal de Pesquisa */}
      {
        showResearchModal && (
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(0,0,0,0.8)',
              zIndex: 100,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center',
              padding: '20px',
            }}
            onClick={(e) => {
              if (e.target === e.currentTarget) setShowResearchModal(false);
            }}
          >
            <div
              style={{
                background: '#0d0d0d',
                borderRadius: '12px',
                border: '1px solid #333',
                width: '100%',
                maxWidth: '400px',
                maxHeight: '90vh',
                overflowY: 'auto',
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              <div style={{
                padding: '12px 16px',
                borderBottom: '1px solid #333',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                background: '#1a1a1a',
                position: 'sticky',
                top: 0,
                zIndex: 10
              }}>
                <span style={{ fontWeight: 600, color: '#fff' }}>Pesquisa Acadêmica</span>
                <button
                  onClick={() => setShowResearchModal(false)}
                  style={{ background: 'transparent', border: 'none', color: '#888', cursor: 'pointer', fontSize: '14px' }}
                >
                  ✕
                </button>
              </div>
              <div style={{ flex: 1, overflow: 'hidden' }}>
                <ResearchPanel
                  normName={normName || 'ABNT'}
                  workType={workType}
                  knowledgeArea={knowledgeArea}
                  onInsertReference={(text) => {
                    onInsertText?.(text);
                    setShowResearchModal(false); // Opcional: fechar após inserir
                  }}
                  onStructureGenerated={(structure) => {
                    setShowResearchModal(false);
                    onStructureGenerated?.(structure);
                    const newMessage: Message = {
                      id: Date.now().toString(),
                      role: 'assistant',
                      content: `💡 **Sugestão de Estrutura:**\n\n${structure}`,
                      timestamp: new Date(),
                    };
                    setMessages((prev) => [...prev, newMessage]);
                  }}
                  onSaveReference={onSaveReference}
                  mode="modal"
                />
              </div>
            </div>
          </div>
        )
      }
    </div >
  );
};

export default ChatPanel;
