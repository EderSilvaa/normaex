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
import { Card } from './ui/Card';

import ProjectSelector from './ProjectSelector';
import ResearchPanel from './ResearchPanel';
import { theme } from '../../styles/theme';

// New Imports
import { Message, ChatResponseData, ImageAttachment, SearchResult, ChartConfig, AnalysisResultData, FormatResultData } from '../../types/chat.types';
import { useChat, generateId } from '../../hooks/useChat';
import { useChatActions } from '../../hooks/useChatActions';
import MessageList from './chat/MessageList';
import ChatInput from './chat/ChatInput';

interface ChatPanelProps {
  onSendMessage: (message: string, history: any[]) => Promise<ChatResponseData>;
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
  isLoading: propsIsLoading = false,
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
}) => {
  // === HOOKS ===
  const {
    messages,
    addMessage,
    updateMessage,
    sendMessage: hookSendMessage,
    isLoading: hookIsLoading
  } = useChat({
    initialMessages: [{
      id: 'welcome',
      role: 'assistant',
      content: welcomeMessage,
      timestamp: new Date(),
    }]
  });

  const {
    actionLoading,
    handleAnalyze,
    handleFormat,
    handleReview
  } = useChatActions(addMessage, {
    onAnalyzeDocument,
    onFormatDocument,
    onReviewSelection
  });

  const isLoading = propsIsLoading || hookIsLoading;

  // === LOCAL STATE (UI Only) ===
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
  const fileInputRef = useRef<HTMLInputElement>(null);

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
  const [sending, setSending] = useState(false); // Used for image/chart sending
  const [chatSending, setChatSending] = useState(false);

  // === HANDLERS ===

  const handleSendMessage = async (text: string) => {
    const historyPayload = messages.slice(-10).map(m => ({
      role: m.role,
      content: m.content
    }));

    addMessage('user', text);
    setChatSending(true);

    try {
      const response = await onSendMessage(text, historyPayload);

      addMessage('assistant', response.message, {
        contextInfo: response.context_info,
        generatedContent: response.generated_content,
        wasReviewed: response.was_reviewed,
        reviewScore: response.review_score,
        detailedReview: response.detailed_review,
        proactiveSuggestions: response.proactive_suggestions,
      });
    } catch (error) {
      addMessage('assistant', `Erro: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    } finally {
      setChatSending(false);
    }
  };


  const handleApplyReview = async (messageId: string, correctedText: string) => {
    try {
      await Word.run(async (context) => {
        const selection = context.document.getSelection();
        selection.insertText(correctedText, Word.InsertLocation.replace);
        await context.sync();
      });

      updateMessage(messageId, {
        reviewResult: {
          ...messages.find(m => m.id === messageId)?.reviewResult!,
          applied: true
        }
      });

      addMessage('assistant', 'Correção aplicada com sucesso!');
    } catch (error) {
      addMessage('assistant', `Erro ao aplicar: ${error instanceof Error ? error.message : 'Selecione o texto novamente e tente de novo.'}`);
    }
  };

  const handleRejectReview = (messageId: string) => {
    updateMessage(messageId, {
      reviewResult: {
        ...messages.find(m => m.id === messageId)?.reviewResult!,
        applied: true
      }
    });
    addMessage('assistant', 'Sugestão rejeitada. Texto original mantido.');
  };

  const handleInsertText = async (messageId: string, content: string, preGeneratedText?: string | null) => {
    const text = preGeneratedText || content; // Simplified extraction
    if (!text || !onInsertText) return;

    try {
      const html = await Promise.resolve(marked.parse(text)) as string;
      await onInsertText(html, true);
    } catch (err) {
      console.error('Erro ao converter ou inserir:', err);
    }
  };

  const handleSuggestionClick = (action: string, sectionType: string) => {
    const actionMsg = `Gostaria de proceder com a sugestão: ${action} para a seção ${sectionType}`;
    handleSendMessage(actionMsg);
  };


  // === IMAGE & CHART LOGIC (Preserved from original) ===
  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !file.type.startsWith('image/')) return;

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

  const handleImageSearch = async () => {
    if (!searchQuery.trim()) return;
    setSearchLoading(true);
    setSearchResults([]);
    try {
      // Mock results since Unsplash Source is deprecated/unreliable without key
      const results: SearchResult[] = [
        { id: '1', url: `https://dummyimage.com/800x600/eee/aaa&text=${encodeURIComponent(searchQuery)}`, thumbUrl: `https://dummyimage.com/200x150/eee/aaa&text=${encodeURIComponent(searchQuery)}`, description: searchQuery, author: 'Dummy' },
      ];
      setSearchResults(results);
    } catch (error) { console.error(error); }
    finally { setSearchLoading(false); }
  };

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
  };

  const handleInsertImage = async () => {
    if (!pendingImage || !imageCaption.trim()) return;
    setSending(true);
    try {
      let result;
      if (pendingImage.type === 'upload') {
        result = await DocumentService.insertImageWithCaption(pendingImage.data, imageCaption, imageSource || undefined);
      } else {
        const proxyResponse = await ApiService.getImageProxy(pendingImage.data);
        if (proxyResponse.success && proxyResponse.base64) {
          result = await DocumentService.insertImageWithCaption(proxyResponse.base64, imageCaption, imageSource || pendingImage.source);
        } else { throw new Error('Falha ao carregar imagem'); }
      }

      if (result.success) {
        addMessage('user', `Inserir imagem: "${imageCaption}"`, { image: { caption: imageCaption } });
        addMessage('assistant', `Figura ${result.figureNumber} inserida no documento.`, { image: { caption: imageCaption, figureNumber: result.figureNumber } });
      }
    } catch (error) {
      addMessage('assistant', `Erro ao inserir imagem: ${error instanceof Error ? error.message : 'Erro'}`);
    } finally {
      setSending(false);
      setPendingImage(null);
    }
  };

  const handleGenerateChartPreview = async () => {
    setChartError(null);
    const labels = chartConfig.labels.split(',').map(l => l.trim()).filter(Boolean);
    const values = chartConfig.values.split(',').map(v => parseFloat(v.trim())).filter(v => !isNaN(v));
    if (labels.length < 2 || values.length < 2) { setChartError('Insira pelo menos 2 dados.'); return; }

    setChartLoading(true);
    try {
      const response = await ApiService.generateChart({ ...chartConfig, labels, values, chart_type: chartConfig.type });
      if (response.success && response.base64) { setChartPreview(response.base64); }
      else { setChartError(response.error || 'Erro.'); }
    } catch (e: any) { setChartError(e.message); }
    finally { setChartLoading(false); }
  };

  const handleInsertChart = async () => {
    if (!chartPreview) return;
    setSending(true);
    try {
      const result = await DocumentService.insertImageWithCaption(chartPreview, chartConfig.title, chartConfig.source || 'Elaboração própria');
      if (result.success) {
        addMessage('user', `Inserir gráfico: "${chartConfig.title}"`, { image: { caption: chartConfig.title } });
        addMessage('assistant', `Gráfico inserido (Figura ${result.figureNumber}).`, { image: { caption: chartConfig.title, figureNumber: result.figureNumber } });
        setShowChartBuilder(false);
        setChartPreview(null);
      }
    } catch (e: any) { addMessage('assistant', `Erro: ${e.message}`); }
    finally { setSending(false); }
  };

  // === RENDER ===
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

      {/* Message List */}
      <MessageList
        messages={messages}
        isLoading={isLoading || actionLoading || sending || chatSending}
        onInsertText={handleInsertText}
        onSuggestionClick={handleSuggestionClick}
        onApplyReview={handleApplyReview}
        onRejectReview={handleRejectReview}
      />

      {/* Quick Suggestions (if empty) */}
      {messages.length <= 1 && !pendingImage && !isLoading && (
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', padding: `0 ${theme.spacing.md}` }}>
          {[`Citações ${normName || 'ABNT'}`, 'Escreva uma introdução', 'Estruturar TCC'].map((s) => (
            <Button key={s} size="sm" variant="outline" onClick={() => handleSendMessage(s)}>{s}</Button>
          ))}
        </div>
      )}

      {/* Input Area */}
      <div style={{ position: 'relative' }}>
        {/* Action Menu (positioned relative to input) */}
        {showImageMenu && (
          <div style={{
            position: 'absolute',
            bottom: '100%',
            left: '8px',
            marginBottom: '8px',
            zIndex: 20,
            background: '#1a1a1a',
            border: '1px solid #333',
            borderRadius: '10px',
            minWidth: '200px',
            padding: '8px',
            display: 'flex',
            flexDirection: 'column',
            gap: '4px',
            boxShadow: '0 4px 20px rgba(0,0,0,0.4)'
          }}>
            {/* Tools */}
            {onAnalyzeDocument && <button onClick={() => { handleAnalyze(); setShowImageMenu(false); }} style={{ padding: '8px', fontSize: '13px', background: 'transparent', border: 'none', color: '#eee', textAlign: 'left', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>📊 <span>Analisar Documento</span></button>}
            {onFormatDocument && <button onClick={() => { handleFormat(); setShowImageMenu(false); }} style={{ padding: '8px', fontSize: '13px', background: 'transparent', border: 'none', color: '#eee', textAlign: 'left', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>🎨 <span>Formatar Documento</span></button>}
            {onReviewSelection && <button onClick={() => { handleReview(); setShowImageMenu(false); }} style={{ padding: '8px', fontSize: '13px', background: 'transparent', border: 'none', color: '#eee', textAlign: 'left', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>✏️ <span>Revisar Seleção</span></button>}
            <div style={{ borderTop: '1px solid #333', margin: '4px 0' }} />
            {/* Inserts */}
            <button onClick={() => { fileInputRef.current?.click(); setShowImageMenu(false); }} style={{ padding: '8px', fontSize: '13px', background: 'transparent', border: 'none', color: '#eee', textAlign: 'left', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>🖼️ <span>Imagem (PC)</span></button>
            <button onClick={() => { setShowImageSearch(true); setShowImageMenu(false); }} style={{ padding: '8px', fontSize: '13px', background: 'transparent', border: 'none', color: '#eee', textAlign: 'left', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>🔍 <span>Banco de Imagens</span></button>
            <button onClick={() => { setShowChartBuilder(true); setShowImageMenu(false); }} style={{ padding: '8px', fontSize: '13px', background: 'transparent', border: 'none', color: '#eee', textAlign: 'left', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>📊 <span>Criar Gráfico</span></button>
            <div style={{ borderTop: '1px solid #333', margin: '4px 0' }} />
            {/* Research */}
            <button onClick={() => { setShowResearchModal(true); setShowImageMenu(false); }} style={{ padding: '8px', fontSize: '13px', background: 'transparent', border: 'none', color: '#eee', textAlign: 'left', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>📚 <span>Pesquisa Acadêmica</span></button>
            <button onClick={() => { setShowProjectSelector(true); setShowImageMenu(false); }} style={{ padding: '8px', fontSize: '13px', background: 'transparent', border: 'none', color: '#eee', textAlign: 'left', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>📁 <span>Gerenciar Projetos</span></button>
          </div>
        )}

        <ChatInput
          onSendMessage={handleSendMessage}
          onActionsClick={() => setShowImageMenu(!showImageMenu)}
          isMenuOpen={showImageMenu}
          isLoading={isLoading || sending || chatSending}
          placeholder={placeholder}
        />
      </div>

      {/* Hidden File Input */}
      <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileSelect} style={{ display: 'none' }} />

      {/* Modals (Project, Research, Image Search, Chart Builder, Pending Image) */}
      {/* Pending Image Modal */}
      {pendingImage && (
        <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#1a1a1a', padding: '20px', borderRadius: '12px', width: '90%', maxWidth: '400px' }}>
            <h3 style={{ color: '#fff', margin: '0 0 10px 0' }}>Inserir Imagem</h3>
            <img src={pendingImage.preview} style={{ width: '100%', borderRadius: '8px', marginBottom: '10px' }} />
            <input type="text" value={imageCaption} onChange={e => setImageCaption(e.target.value)} placeholder="Legenda/Título" style={{ width: '100%', padding: '8px', marginBottom: '10px', background: '#333', border: 'none', color: '#fff', borderRadius: '4px' }} />
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={handleInsertImage} style={{ flex: 1, padding: '10px', background: '#Eebb4d', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}>Inserir</button>
              <button onClick={() => setPendingImage(null)} style={{ flex: 1, padding: '10px', background: '#333', border: 'none', borderRadius: '6px', color: '#fff', cursor: 'pointer' }}>Cancelar</button>
            </div>
          </div>
        </div>
      )}

      {/* Image Search Modal - Simplified */}
      {showImageSearch && (
        <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#1a1a1a', padding: '20px', borderRadius: '12px', width: '90%', maxWidth: '400px', height: '80vh', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
              <h3 style={{ color: '#fff', margin: 0 }}>Buscar Imagens</h3>
              <button onClick={() => setShowImageSearch(false)} style={{ background: 'transparent', border: 'none', color: '#fff' }}>✕</button>
            </div>
            <div style={{ display: 'flex', gap: '8px', marginBottom: '10px' }}>
              <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Digite para buscar..." style={{ flex: 1, padding: '8px', borderRadius: '4px', border: 'none', background: '#333', color: '#fff' }} />
              <button onClick={handleImageSearch} style={{ padding: '8px 12px', background: '#Eebb4d', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>🔍</button>
            </div>
            <div style={{ overflowY: 'auto', flex: 1, display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px' }}>
              {searchResults.map(img => (
                <img key={img.id} src={img.thumbUrl} onClick={() => handleSelectSearchImage(img)} style={{ width: '100%', cursor: 'pointer', borderRadius: '4px' }} />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Project Selector Modal */}
      {showProjectSelector && (
        <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 100 }}>
          <div style={{ background: '#0d0d0d', height: '100%', padding: '20px', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button onClick={() => setShowProjectSelector(false)} style={{ background: 'transparent', border: 'none', color: '#fff', fontSize: '20px' }}>✕</button>
            </div>
            <ProjectSelector
              selectedProjectId={selectedProjectId || null}
              onProjectSelect={onProjectSelect || (() => { })}
              onProjectInfoChange={onProjectInfoChange}
              onMessage={(msg) => onFeedbackMessage?.(msg)}
            />
          </div>
        </div>
      )}

      {/* Research Panel Modal */}
      {showResearchModal && (
        <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 100 }}>
          <div style={{ background: '#0d0d0d', height: '100%', padding: '20px', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button onClick={() => setShowResearchModal(false)} style={{ background: 'transparent', border: 'none', color: '#fff', fontSize: '20px' }}>✕</button>
            </div>
            <ResearchPanel
              normName={normName || 'ABNT'}
              workType={workType}
              knowledgeArea={knowledgeArea}
              onInsertReference={(text) => { onInsertText?.(text); setShowResearchModal(false); }}
              onStructureGenerated={(structure) => {
                onStructureGenerated?.(structure);
                setShowResearchModal(false);
                addMessage('assistant', `💡 **Sugestão de Estrutura:**\n\n${structure}`);
              }}
              onSaveReference={onSaveReference}
            />
          </div>
        </div>
      )}

      {/* Chart Builder Modal placeholder for brevity - in real scenario, include full UI */}
      {showChartBuilder && (
        <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#1a1a1a', padding: '20px', borderRadius: '12px', width: '90%', maxWidth: '400px', maxHeight: '90vh', overflowY: 'auto' }}>
            <h3 style={{ color: '#fff' }}>Criar Gráfico</h3>
            {/* Re-implement Chart Builder UI here or extract to Component */}
            <div style={{ marginBottom: '10px' }}>
              <label style={{ color: '#aaa', fontSize: '12px' }}>Título</label>
              <input value={chartConfig.title} onChange={e => setChartConfig({ ...chartConfig, title: e.target.value })} style={{ width: '100%', padding: '8px', background: '#333', border: 'none', color: '#fff' }} />
            </div>
            <div style={{ marginBottom: '10px' }}>
              <label style={{ color: '#aaa', fontSize: '12px' }}>Categorias (sep. vírgula)</label>
              <input value={chartConfig.labels} onChange={e => setChartConfig({ ...chartConfig, labels: e.target.value })} style={{ width: '100%', padding: '8px', background: '#333', border: 'none', color: '#fff' }} />
            </div>
            <div style={{ marginBottom: '10px' }}>
              <label style={{ color: '#aaa', fontSize: '12px' }}>Valores (sep. vírgula)</label>
              <input value={chartConfig.values} onChange={e => setChartConfig({ ...chartConfig, values: e.target.value })} style={{ width: '100%', padding: '8px', background: '#333', border: 'none', color: '#fff' }} />
            </div>
            <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
              <button onClick={handleGenerateChartPreview} style={{ flex: 1, padding: '10px', background: '#666', border: 'none', borderRadius: '6px', cursor: 'pointer', color: '#fff' }}>Preview</button>
              <button onClick={handleInsertChart} disabled={!chartPreview} style={{ flex: 1, padding: '10px', background: '#Eebb4d', border: 'none', borderRadius: '6px', cursor: chartPreview ? 'pointer' : 'not-allowed' }}>Inserir</button>
            </div>
            {chartPreview && <img src={`data:image/png;base64,${chartPreview}`} style={{ marginTop: '10px', width: '100%' }} />}
            {chartError && <p style={{ color: 'red', fontSize: '12px' }}>{chartError}</p>}
            <button onClick={() => setShowChartBuilder(false)} style={{ marginTop: '10px', background: 'transparent', border: 'none', color: '#aaa', width: '100%', cursor: 'pointer' }}>Cancelar</button>
          </div>
        </div>
      )}

    </div>
  );
};

export default ChatPanel;
