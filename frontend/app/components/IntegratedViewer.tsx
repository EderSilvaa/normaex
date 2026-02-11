'use client';

import { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import dynamic from 'next/dynamic';
import { API_URL } from '../lib/config';
import { Send, Bot, User, Sparkles, CheckCircle, Download, Loader2, X, ZoomIn, ZoomOut, FileText, Maximize2, ChevronLeft, ChevronRight } from 'lucide-react';
import FloatingToolbar from './FloatingToolbar';
import 'react-pdf/dist/Page/TextLayer.css';
import 'react-pdf/dist/Page/AnnotationLayer.css';

// Dynamically import react-pdf to avoid SSR issues
const Document = dynamic(() => import('react-pdf').then(mod => mod.Document), { ssr: false });
const Page = dynamic(() => import('react-pdf').then(mod => mod.Page), { ssr: false });

// Configure PDF.js worker on client side only
if (typeof window !== 'undefined') {
    import('react-pdf').then((pdfjs) => {
        // Use jsdelivr CDN with legacy build for better compatibility
        pdfjs.pdfjs.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjs.pdfjs.version}/legacy/build/pdf.worker.min.mjs`;
    });
}

interface Issue {
    id: string;
    category: string;
    description: string;
    severity?: string;
    affected_count?: number;
}

interface Analysis {
    total_issues: number;
    categories: string[];
    issues: Issue[];
}

interface Message {
    role: 'user' | 'ai';
    content: string;
}

interface IntegratedViewerProps {
    filename: string;
    analysis: Analysis;
    onClose: () => void;
}

export default function IntegratedViewer({ filename, analysis, onClose }: IntegratedViewerProps) {
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [zoom, setZoom] = useState(100);
    const [numPages, setNumPages] = useState<number | null>(null);
    const [pageNumber, setPageNumber] = useState(1);
    const [pdfError, setPdfError] = useState<string | null>(null);
    const [pdfKey, setPdfKey] = useState(0); // Para forçar reload do PDF
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Estados para FloatingToolbar
    const [selectedText, setSelectedText] = useState('');
    const [toolbarPosition, setToolbarPosition] = useState<{ x: number; y: number } | null>(null);
    const pdfContainerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        // Mensagem inicial com análise - reseta quando muda de documento
        const analysisMessage = buildAnalysisMessage(analysis);
        setMessages([{
            role: 'ai',
            content: analysisMessage
        }]);
        setPdfKey(0); // Reseta o PDF key também
    }, [analysis, filename]);

    const buildAnalysisMessage = (analysis: Analysis): string => {
        let msg = `Encontrei ${analysis.total_issues} ajustes necessários para adequar às normas ABNT:\n\n`;

        const groupedIssues: { [key: string]: Issue[] } = {};
        analysis.issues.forEach(issue => {
            if (!groupedIssues[issue.category]) {
                groupedIssues[issue.category] = [];
            }
            groupedIssues[issue.category].push(issue);
        });

        Object.entries(groupedIssues).forEach(([category, issues]) => {
            msg += `**${category}:**\n`;
            issues.forEach(issue => {
                msg += `• ${issue.description}\n`;
            });
            msg += '\n';
        });

        return msg;
    };

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    // Detectar seleção de texto no PDF
    useEffect(() => {
        const handleTextSelection = () => {
            const selection = window.getSelection();
            const text = selection?.toString().trim();

            if (text && text.length > 0 && pdfContainerRef.current) {
                const range = selection?.getRangeAt(0);
                const rect = range?.getBoundingClientRect();

                if (rect) {
                    setSelectedText(text);
                    setToolbarPosition({
                        x: rect.left + (rect.width / 2),
                        y: rect.top
                    });
                }
            } else {
                setSelectedText('');
                setToolbarPosition(null);
            }
        };

        document.addEventListener('mouseup', handleTextSelection);
        document.addEventListener('keyup', handleTextSelection);

        return () => {
            document.removeEventListener('mouseup', handleTextSelection);
            document.removeEventListener('keyup', handleTextSelection);
        };
    }, []);

    const handleImproveText = (improvedText: string, paragraphNumber?: number) => {
        // Exibir texto melhorado no chat
        const message = paragraphNumber
            ? `✨ **Texto melhorado e substituído no parágrafo ${paragraphNumber}!**\n\n"${improvedText}"\n\n✅ O documento foi atualizado automaticamente.`
            : `✨ **Texto melhorado:**\n\n"${improvedText}"\n\n💡 *Não foi possível localizar o texto no documento. Copie e cole manualmente.*`;

        setMessages(prev => [...prev, {
            role: 'ai',
            content: message
        }]);

        // Forçar reload do PDF se houve substituição
        if (paragraphNumber) {
            setPdfKey(prev => prev + 1);
            setPdfError(null);
        }

        // Fechar toolbar
        setSelectedText('');
        setToolbarPosition(null);
    };

    const handleFormatText = () => {
        setMessages(prev => [...prev, {
            role: 'ai',
            content: `📏 Para formatar o texto selecionado segundo ABNT:\n\n1. Use o botão "Aplicar Formatação" para formatar todo o documento\n2. Ou digite: "formate o parágrafo X" onde X é o número do parágrafo`
        }]);

        setSelectedText('');
        setToolbarPosition(null);
    };

    const handleCloseToolbar = () => {
        setSelectedText('');
        setToolbarPosition(null);
    };

    const handleSendMessage = async () => {
        if (!input.trim() || isLoading) return;

        const userMessage = input.trim();
        setInput('');
        setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
        setIsLoading(true);

        try {
            // Detectar comandos de edição com vários padrões
            // Padrão 1: "edite o parágrafo X, coloque: [texto]"
            const editParagraphMatch = userMessage.match(/edite?\s+o\s+par[aá]grafo\s+(\d+)[,:]?\s*(?:coloque|mude|altere|substitua|para)[:\s]+(.+)/i);

            // Padrão 2: "edite o título para [texto]" ou "mude o título para [texto]"
            const editTitleMatch = userMessage.match(/(?:edite?|mude?|altere?)\s+o\s+t[ií]tulo(?:\s+do\s+trabalho)?[,:]?\s*(?:para|coloque)[:\s]+["""]?(.+?)["""']?$/i);

            // Padrão 3: Detectar comandos gerais de edição (edite, altere, mude, substitua, reescreva)
            const isEditCommand = /(?:edite?|altere?|mude?|substitua?|reescreva?|corrija?|modifique?)/i.test(userMessage);

            if (editParagraphMatch) {
                const paragraphNumber = parseInt(editParagraphMatch[1]);
                const newText = editParagraphMatch[2].trim();

                // Chamar endpoint de edição
                const response = await axios.post(`${API_URL}/api/documents/edit-paragraph`, {
                    filename: filename,
                    paragraph_number: paragraphNumber,
                    new_text: newText
                });

                setMessages(prev => [...prev, {
                    role: 'ai',
                    content: `✓ ${response.data.message}\n\nO PDF foi atualizado automaticamente. Role para a página com o parágrafo editado para visualizar.`
                }]);

                // Forçar reload do PDF
                setPdfKey(prev => prev + 1);
                setPdfError(null);

            } else if (editTitleMatch) {
                const newTitle = editTitleMatch[1].trim();

                // Usar o novo endpoint que identifica semanticamente qual parágrafo é o título
                const response = await axios.post(`${API_URL}/api/documents/edit-element`, {
                    filename: filename,
                    element_type: 'titulo_principal',
                    new_text: newTitle
                });

                setMessages(prev => [...prev, {
                    role: 'ai',
                    content: `✓ Título atualizado para: "${newTitle}"\n\nO PDF foi atualizado automaticamente.`
                }]);

                // Forçar reload do PDF
                setPdfKey(prev => prev + 1);
                setPdfError(null);

            } else if (isEditCommand) {
                // Comando de edição geral - usar IA para entender e executar
                const response = await axios.post(`${API_URL}/api/documents/smart-edit`, {
                    filename: filename,
                    command: userMessage
                });

                if (response.data.success) {
                    setMessages(prev => [...prev, {
                        role: 'ai',
                        content: `✓ ${response.data.message}\n\nO PDF foi atualizado automaticamente.`
                    }]);

                    // Forçar reload do PDF
                    setPdfKey(prev => prev + 1);
                    setPdfError(null);
                } else {
                    setMessages(prev => [...prev, {
                        role: 'ai',
                        content: response.data.message
                    }]);
                }

            } else {
                // Chat normal (perguntas, análises, etc)
                const response = await axios.post(`${API_URL}/api/documents/chat`, {
                    filename: filename,
                    message: userMessage
                });

                setMessages(prev => [...prev, {
                    role: 'ai',
                    content: response.data.response
                }]);
            }
        } catch (error: any) {
            console.error('Erro ao enviar mensagem:', error);
            setMessages(prev => [...prev, {
                role: 'ai',
                content: error.response?.data?.detail || 'Erro ao processar mensagem. Tente novamente.'
            }]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleApplyFormatting = async () => {
        setMessages(prev => [...prev, { role: 'user', content: 'Aplicar formatação ABNT' }]);
        setIsLoading(true);

        try {
            const response = await axios.post(`${API_URL}/api/documents/apply`, {
                filename: filename
            });

            setMessages(prev => [...prev, {
                role: 'ai',
                content: `✓ Formatação ABNT aplicada com sucesso!\n\n${response.data.changes?.slice(0, 5).join('\n') || 'Documento formatado.'}`
            }]);
        } catch (error) {
            console.error('Erro ao aplicar formatação:', error);
            setMessages(prev => [...prev, {
                role: 'ai',
                content: 'Erro ao aplicar formatação. Tente novamente.'
            }]);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-[#0a0a0a] flex flex-col">
            {/* Header */}
            <div className="h-14 border-b border-[#2a2a2a] bg-[#141414] flex items-center justify-between px-6">
                <div className="flex items-center gap-3">
                    <FileText className="w-5 h-5 text-[#Eebb4d]" />
                    <span className="text-white font-medium">{filename}</span>
                    <span className="text-sm text-gray-500">{analysis.total_issues} issues</span>
                </div>
                <button
                    onClick={onClose}
                    className="p-2 text-gray-400 hover:text-white hover:bg-[#2a2a2a] rounded-lg transition-colors"
                >
                    <X className="w-5 h-5" />
                </button>
            </div>

            {/* Main Content: Split Layout */}
            <div className="flex-1 flex overflow-hidden">
                {/* Left: PDF Viewer */}
                <div className="flex-1 bg-[#1a1a1a] flex flex-col overflow-hidden">
                    {/* PDF Toolbar */}
                    <div className="h-12 border-b border-[#2a2a2a] bg-[#141414] flex items-center justify-between px-4">
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setZoom(z => Math.max(50, z - 10))}
                                className="p-1.5 text-gray-400 hover:text-white hover:bg-[#2a2a2a] rounded transition-colors"
                            >
                                <ZoomOut className="w-4 h-4" />
                            </button>
                            <span className="text-sm text-gray-400 min-w-[60px] text-center">{zoom}%</span>
                            <button
                                onClick={() => setZoom(z => Math.min(200, z + 10))}
                                className="p-1.5 text-gray-400 hover:text-white hover:bg-[#2a2a2a] rounded transition-colors"
                            >
                                <ZoomIn className="w-4 h-4" />
                            </button>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => setPageNumber(p => Math.max(1, p - 1))}
                                    disabled={pageNumber <= 1}
                                    className="p-1.5 text-gray-400 hover:text-white hover:bg-[#2a2a2a] rounded transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                                >
                                    <ChevronLeft className="w-4 h-4" />
                                </button>
                                <span className="text-sm text-gray-400 min-w-[80px] text-center">
                                    {pageNumber} / {numPages || '?'}
                                </span>
                                <button
                                    onClick={() => setPageNumber(p => Math.min(numPages || p, p + 1))}
                                    disabled={pageNumber >= (numPages || 1)}
                                    className="p-1.5 text-gray-400 hover:text-white hover:bg-[#2a2a2a] rounded transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                                >
                                    <ChevronRight className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* PDF Content */}
                    <div ref={pdfContainerRef} className="flex-1 overflow-y-auto p-8 flex justify-center items-start">
                        {pdfError ? (
                            <div className="bg-red-500/10 border border-red-500/30 text-red-400 p-4 rounded-lg">
                                <p className="text-sm">{pdfError}</p>
                            </div>
                        ) : (
                            <div
                                style={{
                                    transform: `scale(${zoom / 100})`,
                                    transformOrigin: 'top center',
                                    transition: 'transform 0.2s'
                                }}
                            >
                                <Document
                                    key={pdfKey}
                                    file={`${API_URL}/api/documents/preview/${encodeURIComponent(filename)}?t=${pdfKey}`}
                                    onLoadSuccess={({ numPages }) => {
                                        setNumPages(numPages);
                                        setPdfError(null);
                                    }}
                                    onLoadError={(error) => {
                                        console.error('Error loading PDF:', error);
                                        setPdfError('Erro ao carregar PDF. Tente novamente.');
                                    }}
                                    loading={
                                        <div className="flex items-center justify-center p-8">
                                            <Loader2 className="w-8 h-8 animate-spin text-[#Eebb4d]" />
                                        </div>
                                    }
                                    className="shadow-2xl"
                                >
                                    <Page
                                        pageNumber={pageNumber}
                                        renderTextLayer={true}
                                        renderAnnotationLayer={true}
                                        className="border border-gray-300"
                                    />
                                </Document>
                            </div>
                        )}
                    </div>
                </div>

                {/* Right: Chat Interface */}
                <div className="w-[450px] border-l border-[#2a2a2a] bg-[#141414] flex flex-col">
                    {/* Chat Header */}
                    <div className="p-4 border-b border-[#2a2a2a]">
                        <div className="flex items-center gap-2 mb-3">
                            <Bot className="w-5 h-5 text-[#Eebb4d]" />
                            <h2 className="text-white font-semibold">Chat</h2>
                        </div>
                        <button
                            onClick={handleApplyFormatting}
                            disabled={isLoading}
                            className="w-full py-2.5 bg-[#Eebb4d] hover:bg-[#d9a63c] text-black font-medium rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isLoading ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    <span>Aplicando...</span>
                                </>
                            ) : (
                                <>
                                    <CheckCircle className="w-4 h-4" />
                                    <span>Aplicar Formatação</span>
                                </>
                            )}
                        </button>
                    </div>

                    {/* Messages */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-4">
                        {messages.map((message, idx) => (
                            <div
                                key={idx}
                                className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                            >
                                {message.role === 'ai' && (
                                    <div className="w-8 h-8 rounded-full bg-[#Eebb4d]/10 flex items-center justify-center flex-shrink-0">
                                        <Bot className="w-4 h-4 text-[#Eebb4d]" />
                                    </div>
                                )}
                                <div
                                    className={`max-w-[85%] rounded-xl px-4 py-3 ${message.role === 'user'
                                        ? 'bg-[#Eebb4d] text-black'
                                        : 'bg-[#1a1a1a] text-gray-200'
                                        }`}
                                >
                                    <div className="text-sm whitespace-pre-wrap leading-relaxed"
                                        dangerouslySetInnerHTML={{
                                            __html: message.content
                                                .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                                                .replace(/\n/g, '<br/>')
                                        }}
                                    />
                                </div>
                                {message.role === 'user' && (
                                    <div className="w-8 h-8 rounded-full bg-[#2a2a2a] flex items-center justify-center flex-shrink-0">
                                        <User className="w-4 h-4 text-white" />
                                    </div>
                                )}
                            </div>
                        ))}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Input */}
                    <div className="p-4 border-t border-[#2a2a2a]">
                        <div className="flex gap-2">
                            <input
                                type="text"
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                                placeholder="Pergunte sobre o documento..."
                                disabled={isLoading}
                                className="flex-1 bg-[#1a1a1a] text-white rounded-lg px-4 py-3 text-sm border border-[#2a2a2a] focus:border-[#Eebb4d] focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
                            />
                            <button
                                onClick={handleSendMessage}
                                disabled={!input.trim() || isLoading}
                                className="p-3 bg-[#Eebb4d] hover:bg-[#d9a63c] text-black rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                            >
                                {isLoading ? (
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                ) : (
                                    <Send className="w-5 h-5" />
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Floating Toolbar para seleção de texto */}
            <FloatingToolbar
                selectedText={selectedText}
                position={toolbarPosition}
                filename={filename}
                onImprove={handleImproveText}
                onFormat={handleFormatText}
                onClose={handleCloseToolbar}
            />
        </div>
    );
}
