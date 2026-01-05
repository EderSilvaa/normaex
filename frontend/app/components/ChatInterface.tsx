'use client';

import { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import { Send, Bot, User, Sparkles, CheckCircle, Download, Loader2, PenTool, FileText, Eye, EyeOff } from 'lucide-react';
import DocumentPreview from './DocumentPreview';

interface Issue {
    id: string;
    category: string;
    description: string;
    current: string;
    expected: string;
}

interface Analysis {
    total_issues: number;
    categories: string[];
    issues: Issue[];
}

interface Message {
    role: 'user' | 'ai' | 'system';
    content: string;
    type?: 'text' | 'analysis' | 'success' | 'write';
    generatedText?: string;
    downloadUrl?: string;
}

interface ChatInterfaceProps {
    filename: string;
    analysis: Analysis;
}

const SECTION_OPTIONS = [
    { value: 'introducao', label: 'Introdução' },
    { value: 'referencial', label: 'Referencial Teórico' },
    { value: 'metodologia', label: 'Metodologia' },
    { value: 'resultados', label: 'Resultados' },
    { value: 'conclusao', label: 'Conclusão' },
    { value: 'geral', label: 'Texto Geral' },
];

export default function ChatInterface({ filename, analysis }: ChatInterfaceProps) {
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isApplying, setIsApplying] = useState(false);
    const [isWriting, setIsWriting] = useState(false);
    const [isFormatted, setIsFormatted] = useState(false);
    const [downloadUrl, setDownloadUrl] = useState('');
    const [showWritePanel, setShowWritePanel] = useState(false);
    const [writeInstruction, setWriteInstruction] = useState('');
    const [selectedSection, setSelectedSection] = useState('geral');
    const [selectedPosition, setSelectedPosition] = useState('fim');
    const [showPreview, setShowPreview] = useState(true);
    const [streamingText, setStreamingText] = useState('');
    const [isStreaming, setIsStreaming] = useState(false);
    const [previewKey, setPreviewKey] = useState(0);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (analysis && analysis.issues) {
            const analysisMessage = buildAnalysisMessage(analysis);
            setMessages([
                {
                    role: 'ai',
                    content: analysisMessage,
                    type: 'analysis'
                }
            ]);
        } else {
            setMessages([
                {
                    role: 'ai',
                    content: 'Documento carregado! Como posso ajudar com seu TCC?',
                    type: 'text'
                }
            ]);
        }
    }, [analysis]);

    const buildAnalysisMessage = (analysis: Analysis): string => {
        let msg = `**Análise do seu documento**\n\nEncontrei **${analysis.total_issues} ajustes** necessários para adequar às normas ABNT:\n\n`;

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

        msg += `\nClique em **"Aplicar Formatação"** para corrigir automaticamente, ou use **"Escrever"** para adicionar conteúdo ao documento.`;

        return msg;
    };

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const handleApplyFormatting = async () => {
        setIsApplying(true);
        setIsStreaming(true);
        setMessages(prev => [...prev, { role: 'user', content: 'Aplicar formatação ABNT' }]);

        // Mensagem inicial
        setMessages(prev => [...prev, {
            role: 'ai',
            content: '**Aplicando formatação ABNT...**\n\nAguarde enquanto ajusto seu documento.',
            type: 'text'
        }]);

        try {
            const response = await axios.post('http://localhost:8000/api/documents/apply', {
                filename: filename
            });

            // Simular progresso visual para o usuário ver as mudanças
            const changes = response.data.changes || [];
            let progressMsg = '**Alterações aplicadas:**\n\n';

            // Atualizar preview após aplicar
            setPreviewKey(prev => prev + 1);

            // Mostrar cada mudança com delay para efeito visual
            for (let i = 0; i < changes.length; i++) {
                await new Promise(resolve => setTimeout(resolve, 300));
                progressMsg += `✓ ${changes[i]}\n`;

                setMessages(prev => {
                    const newMessages = [...prev];
                    newMessages[newMessages.length - 1] = {
                        role: 'ai',
                        content: progressMsg,
                        type: 'success'
                    };
                    return newMessages;
                });
            }

            // Mensagem final de sucesso
            await new Promise(resolve => setTimeout(resolve, 500));
            setIsFormatted(true);
            setDownloadUrl(`http://localhost:8000/api/documents/download/formatted_${filename}`);

            // Atualizar preview novamente para garantir
            setPreviewKey(prev => prev + 1);

            const finalMsg = progressMsg + `\n**✓ Formatação concluída!**\n\nO preview foi atualizado. Você pode baixar o documento formatado.`;

            setMessages(prev => {
                const newMessages = [...prev];
                newMessages[newMessages.length - 1] = {
                    role: 'ai',
                    content: finalMsg,
                    type: 'success'
                };
                return newMessages;
            });

        } catch (error) {
            console.error(error);
            setMessages(prev => [...prev, {
                role: 'ai',
                content: 'Erro ao aplicar formatação. Por favor, tente novamente.'
            }]);
        } finally {
            setIsApplying(false);
            setIsStreaming(false);
        }
    };

    const handleWriteStream = async () => {
        if (!writeInstruction.trim()) return;

        setIsWriting(true);
        setIsStreaming(true);
        setStreamingText('');
        setShowWritePanel(false);

        const userMsg = `Escrever: "${writeInstruction}" (Seção: ${selectedSection}, Posição: ${selectedPosition})`;
        setMessages(prev => [...prev, { role: 'user', content: userMsg }]);

        try {
            const response = await fetch('http://localhost:8000/api/documents/write-stream', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    filename: filename,
                    instruction: writeInstruction,
                    section_type: selectedSection,
                    position: selectedPosition
                })
            });

            const reader = response.body?.getReader();
            const decoder = new TextDecoder();
            let fullText = '';

            if (reader) {
                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;

                    const chunk = decoder.decode(value);
                    const lines = chunk.split('\n');

                    for (const line of lines) {
                        if (line.startsWith('data: ')) {
                            try {
                                const data = JSON.parse(line.slice(6));
                                if (data.text) {
                                    fullText = data.full_text || (fullText + data.text);
                                    setStreamingText(fullText);
                                }
                            } catch (e) {
                                // Skip invalid JSON
                            }
                        } else if (line.includes('"event":"complete"') || line.includes('"success":true')) {
                            try {
                                const match = line.match(/data:\s*(\{.*\})/);
                                if (match) {
                                    const data = JSON.parse(match[1]);
                                    if (data.download_url) {
                                        setPreviewKey(prev => prev + 1);
                                        const successMsg = `**Texto gerado e inserido com sucesso!**\n\n**Texto adicionado:**\n\n${data.generated_text}\n\nClique no botão abaixo para baixar o documento atualizado.`;
                                        setMessages(prev => [...prev, {
                                            role: 'ai',
                                            content: successMsg,
                                            type: 'write',
                                            generatedText: data.generated_text,
                                            downloadUrl: `http://localhost:8000${data.download_url}`
                                        }]);
                                    }
                                }
                            } catch (e) {
                                // Skip
                            }
                        }
                    }
                }
            }

            setWriteInstruction('');

        } catch (error) {
            console.error(error);
            setMessages(prev => [...prev, {
                role: 'ai',
                content: 'Erro ao gerar texto. Por favor, tente novamente.'
            }]);
        } finally {
            setIsWriting(false);
            setIsStreaming(false);
            setStreamingText('');
        }
    };

    const handleSend = async () => {
        if (!input.trim() || isLoading) return;

        const userMessage = input;
        setInput('');
        setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
        setIsLoading(true);

        try {
            const response = await axios.post('http://localhost:8000/api/documents/chat', {
                filename: filename,
                message: userMessage
            });

            setMessages(prev => [...prev, { role: 'ai', content: response.data.response }]);
        } catch (error) {
            console.error(error);
            setMessages(prev => [...prev, { role: 'ai', content: 'Desculpe, tive um erro ao processar sua mensagem.' }]);
        } finally {
            setIsLoading(false);
        }
    };

    const formatMessageContent = (content: string) => {
        return content.split('\n').map((line, i) => {
            line = line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
            return <p key={i} className="mb-1" dangerouslySetInnerHTML={{ __html: line }} />;
        });
    };

    return (
        <div className="flex flex-col lg:flex-row gap-4 h-auto lg:h-[calc(100vh-180px)] max-h-[900px]">
            {/* Chat Panel */}
            <div className={`flex flex-col bg-[#141414] rounded-2xl border border-[#2a2a2a] overflow-hidden transition-all duration-300 ${showPreview ? 'w-full lg:w-1/2' : 'w-full'} ${showPreview ? 'h-[500px] lg:h-full' : 'h-[600px] lg:h-full'}`}>
                {/* Header */}
                <div className="p-4 border-b border-[#2a2a2a] bg-[#1a1a1a] flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-[#Eebb4d]/10 rounded-lg">
                            <Sparkles className="w-5 h-5 text-[#Eebb4d]" />
                        </div>
                        <div>
                            <h3 className="font-semibold text-white">Normaex AI</h3>
                            <p className="text-xs text-gray-500">Assistente de formatação ABNT</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setShowPreview(!showPreview)}
                            className={`p-2 rounded-lg transition-colors ${showPreview ? 'bg-[#Eebb4d]/20 text-[#Eebb4d]' : 'bg-[#2a2a2a] text-gray-400 hover:text-white'}`}
                            title={showPreview ? 'Ocultar preview' : 'Mostrar preview'}
                        >
                            {showPreview ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                        </button>
                        <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                            isFormatted ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'
                        }`}>
                            {isFormatted ? 'Formatado' : 'Pendente'}
                        </div>
                    </div>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {messages.map((msg, index) => (
                        <div key={index} className={`flex items-start gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                            <div className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center ${
                                msg.role === 'user' ? 'bg-[#Eebb4d]/20'
                                    : msg.type === 'success' ? 'bg-emerald-500/20'
                                    : msg.type === 'write' ? 'bg-blue-500/20'
                                    : 'bg-[#2a2a2a]'
                            }`}>
                                {msg.role === 'user' ? <User className="w-4 h-4 text-[#Eebb4d]" />
                                    : msg.type === 'success' ? <CheckCircle className="w-4 h-4 text-emerald-400" />
                                    : msg.type === 'write' ? <PenTool className="w-4 h-4 text-blue-400" />
                                    : <Bot className="w-4 h-4 text-gray-400" />}
                            </div>
                            <div className={`max-w-[85%] p-3 rounded-2xl text-sm leading-relaxed ${
                                msg.role === 'user' ? 'bg-[#Eebb4d] text-black rounded-tr-sm'
                                    : msg.type === 'success' ? 'bg-emerald-500/10 border border-emerald-500/30 text-gray-300 rounded-tl-sm'
                                    : msg.type === 'write' ? 'bg-blue-500/10 border border-blue-500/30 text-gray-300 rounded-tl-sm'
                                    : msg.type === 'analysis' ? 'bg-[#1a1a1a] border border-amber-500/30 text-gray-300 rounded-tl-sm'
                                    : 'bg-[#1a1a1a] border border-[#2a2a2a] text-gray-300 rounded-tl-sm'
                            }`}>
                                {formatMessageContent(msg.content)}
                                {msg.downloadUrl && (
                                    <a href={msg.downloadUrl} download
                                        className="mt-3 flex items-center gap-2 px-3 py-2 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 rounded-lg text-xs font-medium transition-colors">
                                        <Download className="w-4 h-4" />
                                        Baixar Documento Atualizado
                                    </a>
                                )}
                            </div>
                        </div>
                    ))}

                    {/* Streaming Message */}
                    {isStreaming && streamingText && (
                        <div className="flex items-start gap-3">
                            <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center">
                                <PenTool className="w-4 h-4 text-blue-400" />
                            </div>
                            <div className="max-w-[85%] p-3 rounded-2xl text-sm leading-relaxed bg-blue-500/10 border border-blue-500/30 text-gray-300 rounded-tl-sm">
                                <div className="flex items-center gap-2 text-blue-400 text-xs mb-2">
                                    <span className="w-2 h-2 bg-blue-400 rounded-full animate-pulse" />
                                    Gerando texto...
                                </div>
                                <p className="whitespace-pre-wrap">{streamingText}</p>
                            </div>
                        </div>
                    )}

                    {(isLoading || isApplying || (isWriting && !streamingText)) && (
                        <div className="flex items-start gap-3">
                            <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-[#2a2a2a] flex items-center justify-center">
                                <Bot className="w-4 h-4 text-gray-400" />
                            </div>
                            <div className="bg-[#1a1a1a] border border-[#2a2a2a] p-3 rounded-2xl rounded-tl-sm">
                                <div className="flex items-center gap-2 text-gray-400 text-sm">
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    <span>{isWriting ? 'Iniciando geração...' : isApplying ? 'Aplicando formatação...' : 'Pensando...'}</span>
                                </div>
                            </div>
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>

                {/* Write Panel */}
                {showWritePanel && (
                    <div className="p-4 border-t border-[#2a2a2a] bg-[#1a1a1a] space-y-3">
                        <div className="flex items-center gap-2 text-white text-sm font-medium">
                            <PenTool className="w-4 h-4 text-[#Eebb4d]" />
                            <span>Escrever no Documento</span>
                        </div>
                        <textarea
                            value={writeInstruction}
                            onChange={(e) => setWriteInstruction(e.target.value)}
                            placeholder="Ex: Escreva uma introdução sobre inteligência artificial na educação..."
                            className="w-full p-3 bg-[#0a0a0a] border border-[#2a2a2a] rounded-xl text-white placeholder-gray-600 focus:outline-none focus:border-[#Eebb4d]/50 resize-none h-20"
                        />
                        <div className="flex gap-3">
                            <select
                                value={selectedSection}
                                onChange={(e) => setSelectedSection(e.target.value)}
                                className="flex-1 p-2 bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg text-white text-sm"
                            >
                                {SECTION_OPTIONS.map(opt => (
                                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                                ))}
                            </select>
                            <select
                                value={selectedPosition}
                                onChange={(e) => setSelectedPosition(e.target.value)}
                                className="flex-1 p-2 bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg text-white text-sm"
                            >
                                <option value="fim">No final do documento</option>
                                <option value="introducao">Após Introdução</option>
                                <option value="metodologia">Após Metodologia</option>
                                <option value="resultados">Após Resultados</option>
                            </select>
                        </div>
                        <div className="flex gap-2">
                            <button onClick={() => setShowWritePanel(false)}
                                className="flex-1 py-2 px-4 bg-[#2a2a2a] hover:bg-[#3a3a3a] text-white rounded-lg text-sm transition-colors">
                                Cancelar
                            </button>
                            <button onClick={handleWriteStream} disabled={!writeInstruction.trim() || isWriting}
                                className="flex-1 py-2 px-4 bg-[#Eebb4d] hover:bg-[#d9a63c] text-black rounded-lg text-sm font-medium transition-colors disabled:opacity-50">
                                Gerar e Inserir
                            </button>
                        </div>
                    </div>
                )}

                {/* Action Buttons */}
                {!showWritePanel && (
                    <div className="p-3 border-t border-[#2a2a2a] bg-[#1a1a1a] flex gap-2">
                        {!isFormatted && (
                            <button onClick={handleApplyFormatting} disabled={isApplying}
                                className="flex-1 py-2.5 px-4 bg-[#Eebb4d] hover:bg-[#d9a63c] text-black rounded-xl font-medium transition-all flex items-center justify-center gap-2 disabled:opacity-50 text-sm">
                                {isApplying ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                                <span>{isApplying ? 'Aplicando...' : 'Aplicar Formatação'}</span>
                            </button>
                        )}
                        {isFormatted && downloadUrl && (
                            <a href={downloadUrl} download
                                className="flex-1 py-2.5 px-4 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-medium transition-all flex items-center justify-center gap-2 text-sm">
                                <Download className="w-4 h-4" />
                                <span>Baixar Formatado</span>
                            </a>
                        )}
                        <button onClick={() => setShowWritePanel(true)}
                            className="py-2.5 px-4 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 rounded-xl font-medium transition-all flex items-center justify-center gap-2 border border-blue-500/30 text-sm">
                            <PenTool className="w-4 h-4" />
                            <span>Escrever</span>
                        </button>
                    </div>
                )}

                {/* Chat Input */}
                <div className="p-3 border-t border-[#2a2a2a] bg-[#0a0a0a]">
                    <div className="flex items-center gap-2">
                        <input type="text" value={input} onChange={(e) => setInput(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                            placeholder="Pergunte sobre seu documento..."
                            className="flex-1 p-2.5 bg-[#141414] border border-[#2a2a2a] rounded-xl text-white placeholder-gray-600 focus:outline-none focus:border-[#Eebb4d]/50 transition-colors text-sm"
                            disabled={isLoading || isApplying || isWriting}
                        />
                        <button onClick={handleSend} disabled={isLoading || isApplying || isWriting || !input.trim()}
                            className="p-2.5 bg-[#2a2a2a] text-white rounded-xl hover:bg-[#3a3a3a] disabled:opacity-30 disabled:cursor-not-allowed transition-all">
                            <Send className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </div>

            {/* Preview Panel */}
            {showPreview && (
                <div className="w-full lg:w-1/2 h-[500px] lg:h-full">
                    <DocumentPreview
                        key={previewKey}
                        filename={filename}
                        streamingText={streamingText}
                        isStreaming={isStreaming}
                        isApplying={isApplying}
                        onRefresh={() => setPreviewKey(prev => prev + 1)}
                    />
                </div>
            )}
        </div>
    );
}
