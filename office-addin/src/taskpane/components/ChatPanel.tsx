/**
 * ChatPanel - Painel de chat com histórico e anexo de imagens
 * Interface de conversação com a IA - Suporta texto e imagens
 */

import * as React from 'react';
import { useState, useRef, useEffect } from 'react';
import { DocumentService, ApiService } from '../../services';

interface ContextInfo {
  has_pdf_context: boolean;
  project_name?: string | null;
  pdf_count: number;
  pdf_names: string[];
  total_words: number;
}

interface ChatResponseData {
  message: string;
  suggestions?: string[];
  context_info?: ContextInfo | null;
}

interface ImageAttachment {
  type: 'upload' | 'url';
  data: string; // base64 ou URL
  preview: string; // URL para preview
  caption: string;
  source?: string;
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  hasGeneratedText?: boolean;
  contextInfo?: ContextInfo | null;
  image?: { caption: string; figureNumber?: number };
}

interface SearchResult {
  id: string;
  url: string;
  thumbUrl: string;
  description: string;
  author: string;
}

interface ChatPanelProps {
  onSendMessage: (message: string) => Promise<ChatResponseData>;
  onInsertText?: (text: string) => Promise<void>;
  isLoading?: boolean;
  placeholder?: string;
  welcomeMessage?: string;
  activeProjectName?: string | null;
  activePdfCount?: number;
}

const ChatPanel: React.FC<ChatPanelProps> = ({
  onSendMessage,
  onInsertText,
  isLoading = false,
  placeholder = 'Pergunte sobre seu documento...',
  welcomeMessage = 'Olá! Posso ajudar com formatação ABNT e sugestões.',
  activeProjectName,
  activePdfCount = 0,
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
  const [showImageSearch, setShowImageSearch] = useState(false);
  const [pendingImage, setPendingImage] = useState<ImageAttachment | null>(null);
  const [imageCaption, setImageCaption] = useState('');
  const [imageSource, setImageSource] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const generateId = () => `msg_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;

  // Extrair texto gerado da resposta
  const extractGeneratedText = (content: string): string | null => {
    const match = content.match(/\*\*Texto gerado.*?\*\*:?\s*\n(?:.*\n)?\n([\s\S]*?)\n\n---/);
    return match ? match[1].trim() : null;
  };

  // Inserir texto no documento
  const handleInsertText = async (messageId: string, content: string) => {
    const text = extractGeneratedText(content);
    if (!text || !onInsertText) return;

    setInserting(messageId);
    try {
      await onInsertText(text);
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

  // Enviar mensagem de texto
  const handleSend = async () => {
    if (!input.trim() || sending || isLoading) return;

    const userMessage: Message = {
      id: generateId(),
      role: 'user',
      content: input.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setSending(true);

    try {
      const response = await onSendMessage(userMessage.content);
      const assistantMessage: Message = {
        id: generateId(),
        role: 'assistant',
        content: response.message,
        timestamp: new Date(),
        contextInfo: response.context_info,
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

  const quickSuggestions = ['Citações ABNT', 'Margens', 'Revisar texto'];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: '200px' }}>
      {/* Context Indicator */}
      {activeProjectName && activePdfCount > 0 && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '6px 10px',
            background: 'linear-gradient(90deg, rgba(238,187,77,0.15) 0%, rgba(238,187,77,0.05) 100%)',
            borderRadius: '8px',
            marginBottom: '8px',
            border: '1px solid rgba(238,187,77,0.3)',
          }}
        >
          <span style={{ fontSize: '14px' }}>📚</span>
          <span style={{ fontSize: '11px', color: '#Eebb4d', fontWeight: 500 }}>
            {activePdfCount} PDF{activePdfCount > 1 ? 's' : ''} como contexto
          </span>
          <span style={{ fontSize: '10px', color: '#888', marginLeft: 'auto' }}>
            {activeProjectName}
          </span>
        </div>
      )}

      {/* Mensagens */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '10px',
          background: '#0a0a0a',
          borderRadius: '10px',
          marginBottom: '10px',
          maxHeight: '250px',
        }}
      >
        {messages.map((message) => {
          const generatedText = message.role === 'assistant' ? extractGeneratedText(message.content) : null;
          const isInsertingThis = inserting === message.id;

          return (
            <div
              key={message.id}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: message.role === 'user' ? 'flex-end' : 'flex-start',
                marginBottom: '10px',
              }}
            >
              <div
                style={{
                  maxWidth: '90%',
                  padding: '8px 12px',
                  borderRadius: message.role === 'user' ? '10px 10px 4px 10px' : '10px 10px 10px 4px',
                  background: message.role === 'user' ? '#Eebb4d' : '#1a1a1a',
                  color: message.role === 'user' ? '#0a0a0a' : '#fff',
                }}
              >
                {/* Indicador de imagem */}
                {message.image && (
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      marginBottom: '4px',
                      fontSize: '11px',
                      opacity: 0.8,
                    }}
                  >
                    🖼️ {message.image.figureNumber ? `Figura ${message.image.figureNumber}` : 'Imagem'}
                  </div>
                )}

                <p style={{ margin: 0, fontSize: '12px', lineHeight: 1.4, whiteSpace: 'pre-wrap' }}>
                  {message.content}
                </p>

                {/* Botão para inserir texto gerado */}
                {generatedText && onInsertText && (
                  <button
                    onClick={() => handleInsertText(message.id, message.content)}
                    disabled={isInsertingThis}
                    style={{
                      marginTop: '8px',
                      padding: '6px 12px',
                      fontSize: '11px',
                      fontWeight: 600,
                      border: 'none',
                      borderRadius: '6px',
                      background: isInsertingThis ? '#555' : '#Eebb4d',
                      color: '#0a0a0a',
                      cursor: isInsertingThis ? 'wait' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                  >
                    {isInsertingThis ? '⏳ Inserindo...' : '📄 Inserir no Documento'}
                  </button>
                )}
              </div>
              <span style={{ fontSize: '9px', color: '#555', marginTop: '2px' }}>
                {formatTime(message.timestamp)}
              </span>
            </div>
          );
        })}

        {sending && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '3px',
              padding: '8px 12px',
              background: '#1a1a1a',
              borderRadius: '10px',
              width: 'fit-content',
            }}
          >
            <span className="typing-dot" style={{ animationDelay: '0ms' }} />
            <span className="typing-dot" style={{ animationDelay: '150ms' }} />
            <span className="typing-dot" style={{ animationDelay: '300ms' }} />
            <style>{`
              .typing-dot {
                width: 5px;
                height: 5px;
                background: #Eebb4d;
                border-radius: 50%;
                animation: typing 1s infinite ease-in-out;
              }
              @keyframes typing {
                0%, 60%, 100% { opacity: 0.3; transform: scale(0.8); }
                30% { opacity: 1; transform: scale(1); }
              }
            `}</style>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Sugestões */}
      {messages.length <= 1 && !pendingImage && (
        <div style={{ display: 'flex', gap: '4px', marginBottom: '8px', flexWrap: 'wrap' }}>
          {quickSuggestions.map((suggestion) => (
            <button
              key={suggestion}
              onClick={() => setInput(suggestion)}
              style={{
                padding: '4px 8px',
                fontSize: '10px',
                border: '1px solid #333',
                borderRadius: '12px',
                background: 'transparent',
                color: '#888',
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = '#Eebb4d';
                e.currentTarget.style.color = '#Eebb4d';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = '#333';
                e.currentTarget.style.color = '#888';
              }}
            >
              {suggestion}
            </button>
          ))}
        </div>
      )}

      {/* Preview de imagem pendente */}
      {pendingImage && (
        <div
          style={{
            padding: '10px',
            background: '#1a1a1a',
            borderRadius: '10px',
            marginBottom: '10px',
            border: '1px solid #333',
          }}
        >
          <div style={{ display: 'flex', gap: '10px', marginBottom: '8px' }}>
            <img
              src={pendingImage.preview}
              alt="Preview"
              style={{
                width: '60px',
                height: '60px',
                objectFit: 'cover',
                borderRadius: '6px',
              }}
            />
            <div style={{ flex: 1 }}>
              <input
                type="text"
                placeholder="Descrição da figura (ex: Gráfico de vendas 2024)"
                value={imageCaption}
                onChange={(e) => setImageCaption(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px',
                  borderRadius: '6px',
                  border: '1px solid #333',
                  background: '#0a0a0a',
                  color: '#fff',
                  fontSize: '11px',
                  marginBottom: '6px',
                  boxSizing: 'border-box',
                }}
              />
              <input
                type="text"
                placeholder="Fonte (ex: Autor, 2024 ou 'própria')"
                value={imageSource}
                onChange={(e) => setImageSource(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px',
                  borderRadius: '6px',
                  border: '1px solid #333',
                  background: '#0a0a0a',
                  color: '#fff',
                  fontSize: '11px',
                  boxSizing: 'border-box',
                }}
              />
            </div>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={handleCancelImage}
              style={{
                flex: 1,
                padding: '8px',
                borderRadius: '6px',
                border: '1px solid #333',
                background: 'transparent',
                color: '#888',
                fontSize: '11px',
                cursor: 'pointer',
              }}
            >
              Cancelar
            </button>
            <button
              onClick={handleInsertImage}
              disabled={!imageCaption.trim() || sending}
              style={{
                flex: 1,
                padding: '8px',
                borderRadius: '6px',
                border: 'none',
                background: imageCaption.trim() && !sending ? '#Eebb4d' : '#333',
                color: imageCaption.trim() && !sending ? '#0a0a0a' : '#666',
                fontSize: '11px',
                fontWeight: 600,
                cursor: imageCaption.trim() && !sending ? 'pointer' : 'not-allowed',
              }}
            >
              {sending ? 'Inserindo...' : 'Inserir no Documento'}
            </button>
          </div>
        </div>
      )}

      {/* Modal de busca de imagens */}
      {showImageSearch && (
        <div
          style={{
            padding: '10px',
            background: '#1a1a1a',
            borderRadius: '10px',
            marginBottom: '10px',
            border: '1px solid #333',
          }}
        >
          <div style={{ display: 'flex', gap: '8px', marginBottom: '10px' }}>
            <input
              type="text"
              placeholder="Buscar imagens..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleImageSearch()}
              style={{
                flex: 1,
                padding: '8px',
                borderRadius: '6px',
                border: '1px solid #333',
                background: '#0a0a0a',
                color: '#fff',
                fontSize: '11px',
              }}
            />
            <button
              onClick={handleImageSearch}
              disabled={searchLoading}
              style={{
                padding: '8px 12px',
                borderRadius: '6px',
                border: 'none',
                background: '#Eebb4d',
                color: '#0a0a0a',
                fontSize: '11px',
                fontWeight: 600,
                cursor: searchLoading ? 'not-allowed' : 'pointer',
              }}
            >
              {searchLoading ? '...' : 'Buscar'}
            </button>
            <button
              onClick={() => {
                setShowImageSearch(false);
                setSearchResults([]);
                setSearchQuery('');
              }}
              style={{
                padding: '8px',
                borderRadius: '6px',
                border: '1px solid #333',
                background: 'transparent',
                color: '#888',
                fontSize: '11px',
                cursor: 'pointer',
              }}
            >
              ✕
            </button>
          </div>

          {searchResults.length > 0 && (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: '6px',
              }}
            >
              {searchResults.map((result) => (
                <div
                  key={result.id}
                  onClick={() => handleSelectSearchImage(result)}
                  style={{
                    aspectRatio: '4/3',
                    borderRadius: '6px',
                    overflow: 'hidden',
                    cursor: 'pointer',
                    border: '2px solid transparent',
                    transition: 'border-color 0.2s',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = '#Eebb4d';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = 'transparent';
                  }}
                >
                  <img
                    src={result.thumbUrl}
                    alt={result.description}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                </div>
              ))}
            </div>
          )}

          <p style={{ fontSize: '9px', color: '#666', marginTop: '8px', textAlign: 'center' }}>
            Imagens via Unsplash (uso gratuito)
          </p>
        </div>
      )}

      {/* Input com botão de anexar */}
      <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
        {/* Botão de anexar imagem */}
        <div style={{ position: 'relative' }}>
          <button
            onClick={() => setShowImageMenu(!showImageMenu)}
            style={{
              padding: '10px',
              borderRadius: '10px',
              border: '1px solid #333',
              background: showImageMenu ? '#Eebb4d' : 'transparent',
              color: showImageMenu ? '#0a0a0a' : '#888',
              fontSize: '14px',
              cursor: 'pointer',
              flexShrink: 0,
            }}
            title="Anexar imagem"
          >
            📎
          </button>

          {/* Menu de opções de imagem */}
          {showImageMenu && (
            <div
              style={{
                position: 'absolute',
                bottom: '100%',
                left: 0,
                marginBottom: '4px',
                background: '#1a1a1a',
                border: '1px solid #333',
                borderRadius: '8px',
                overflow: 'hidden',
                minWidth: '140px',
                zIndex: 10,
              }}
            >
              <button
                onClick={() => {
                  fileInputRef.current?.click();
                  setShowImageMenu(false);
                }}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  border: 'none',
                  background: 'transparent',
                  color: '#fff',
                  fontSize: '11px',
                  textAlign: 'left',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = '#333';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent';
                }}
              >
                💻 Meu Computador
              </button>
              <button
                onClick={() => {
                  setShowImageSearch(true);
                  setShowImageMenu(false);
                }}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  border: 'none',
                  background: 'transparent',
                  color: '#fff',
                  fontSize: '11px',
                  textAlign: 'left',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = '#333';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent';
                }}
              >
                🔍 Banco de Imagens
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
          disabled={sending || isLoading || !!pendingImage}
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
          onClick={handleSend}
          disabled={!input.trim() || sending || isLoading || !!pendingImage}
          style={{
            padding: '10px 14px',
            borderRadius: '10px',
            border: 'none',
            background: input.trim() && !sending && !pendingImage ? '#Eebb4d' : '#333',
            color: input.trim() && !sending && !pendingImage ? '#0a0a0a' : '#666',
            fontWeight: 600,
            fontSize: '14px',
            cursor: input.trim() && !sending && !pendingImage ? 'pointer' : 'not-allowed',
            flexShrink: 0,
          }}
        >
          {sending ? '...' : '→'}
        </button>
      </div>
    </div>
  );
};

export default ChatPanel;
