'use client';

import { useState, useRef, useEffect } from 'react';
import {
    MessageSquare,
    FileText,
    BookOpen,
    X,
    Minus,
    Send,
    Bot,
    User,
    Sparkles,
    ChevronLeft,
    Settings,
    MoreHorizontal
} from 'lucide-react';
import axios from 'axios';
import { API_URL } from '../../lib/config';

interface ChatPanelProps {
    filename: string;
    editor: any; // Tiptap editor instance
    onClose?: () => void;
    analysis?: any;
}

type Tab = 'chat' | 'review' | 'abnt';

export default function ChatPanel({ filename, editor, onClose, analysis }: ChatPanelProps) {
    const [activeTab, setActiveTab] = useState<Tab>('chat');
    const [input, setInput] = useState('');
    const [messages, setMessages] = useState<Array<{ role: 'user' | 'ai', content: string }>>([
        { role: 'ai', content: 'Olá! Sou a IA do NormaEx. Como posso ajudar com seu documento hoje?' }
    ]);
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const handleSend = async () => {
        if (!input.trim() || isLoading) return;

        const userMessage = input;
        setInput('');
        setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
        setIsLoading(true);

        try {
            const response = await axios.post(`${API_URL}/api/documents/chat`, {
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

    return (
        <div className="flex flex-col h-full bg-[#111] border-l border-white/10 w-[400px] shadow-2xl flex-shrink-0">
            {/* Minimal Header */}
            <div className="flex items-center justify-between p-4 border-b border-white/10 bg-[#141414]">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-[#Eebb4d]/10 rounded-lg flex items-center justify-center">
                        <Sparkles className="w-4 h-4 text-[#Eebb4d]" />
                    </div>
                    <div>
                        <h2 className="text-sm font-semibold text-white leading-none">NormaEx AI</h2>
                        <span className="text-[10px] text-gray-500 font-medium uppercase tracking-wider">Assistant</span>
                    </div>
                </div>
                <div className="flex items-center gap-1">
                    <button className="p-1.5 text-gray-500 hover:text-white hover:bg-white/5 rounded-md transition-colors">
                        <Settings className="w-4 h-4" />
                    </button>
                    {onClose && (
                        <button onClick={onClose} className="p-1.5 text-gray-500 hover:text-white hover:bg-white/5 rounded-md transition-colors">
                            <X className="w-4 h-4" />
                        </button>
                    )}
                </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-hidden relative">
                {/* Tab: Chat */}
                <div className={`absolute inset-0 flex flex-col transition-opacity duration-300 ${activeTab === 'chat' ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'}`}>
                    <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin scrollbar-thumb-gray-800 scrollbar-track-transparent">
                        {messages.map((msg, idx) => (
                            <div key={idx} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${msg.role === 'ai' ? 'bg-[#2a2a2a]' : 'bg-[#Eebb4d]/20'}`}>
                                    {msg.role === 'ai' ? <Bot className="w-4 h-4 text-gray-400" /> : <User className="w-4 h-4 text-[#Eebb4d]" />}
                                </div>
                                <div className={`max-w-[85%] p-3 rounded-2xl text-sm ${msg.role === 'user'
                                    ? 'bg-[#Eebb4d] text-black rounded-tr-sm'
                                    : 'bg-[#1a1a1a] border border-white/5 text-gray-300 rounded-tl-sm'
                                    }`}>
                                    <p className="whitespace-pre-wrap">{msg.content}</p>
                                </div>
                            </div>
                        ))}
                        {isLoading && (
                            <div className="flex gap-3">
                                <div className="w-8 h-8 rounded-lg bg-[#2a2a2a] flex items-center justify-center flex-shrink-0">
                                    <Bot className="w-4 h-4 text-gray-400" />
                                </div>
                                <div className="bg-[#1a1a1a] border border-white/5 p-3 rounded-2xl rounded-tl-sm flex gap-1">
                                    <span className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                                    <span className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                                    <span className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                                </div>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Input Area */}
                    <div className="p-4 border-t border-white/10 bg-[#141414]">
                        <div className="relative">
                            <input
                                type="text"
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                                placeholder="Digite sua mensagem..."
                                className="w-full bg-[#0a0a0a] border border-white/10 rounded-xl pl-4 pr-10 py-3 text-sm text-white focus:outline-none focus:border-[#Eebb4d]/50 transition-colors placeholder:text-gray-600"
                            />
                            <button
                                onClick={handleSend}
                                disabled={!input.trim() || isLoading}
                                className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 bg-[#Eebb4d] text-black rounded-lg hover:bg-[#ffe196] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                                <Send className="w-3.5 h-3.5" />
                            </button>
                        </div>
                    </div>
                </div>

                {/* Tab: Review */}
                <div className={`absolute inset-0 flex flex-col p-6 transition-opacity duration-300 ${activeTab === 'review' ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'}`}>
                    {analysis && analysis.issues && analysis.issues.length > 0 ? (
                        <div className="flex-1 overflow-y-auto space-y-4 pr-2 scrollbar-thin scrollbar-thumb-gray-800">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-lg font-medium text-white">Issues Encontrados</h3>
                                <span className="bg-[#Eebb4d]/10 text-[#Eebb4d] text-xs font-bold px-2 py-1 rounded-full">{analysis.total_issues}</span>
                            </div>

                            {analysis.issues.map((issue: any, idx: number) => (
                                <div key={idx} className="bg-[#1a1a1a] border border-white/5 rounded-xl p-4 hover:border-[#Eebb4d]/30 transition-colors">
                                    <div className="flex items-start gap-3">
                                        <div className="w-2 h-2 rounded-full bg-red-400 mt-1.5 flex-shrink-0" />
                                        <div>
                                            <h4 className="text-sm font-medium text-gray-200 mb-1">{issue.category}</h4>
                                            <p className="text-xs text-gray-400 leading-relaxed">{issue.description}</p>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center mt-10">
                            <div className="w-16 h-16 bg-[#2a2a2a] rounded-full flex items-center justify-center mx-auto mb-4">
                                <FileText className="w-8 h-8 text-gray-500" />
                            </div>
                            <h3 className="text-lg font-medium text-white mb-2">Revisão de Texto</h3>
                            <p className="text-sm text-gray-500">
                                {analysis ? 'Nenhum problema encontrado! 🎉' : 'Nenhuma análise disponível.'}
                            </p>
                        </div>
                    )}
                </div>

                {/* Tab: ABNT */}
                <div className={`absolute inset-0 flex flex-col p-6 transition-opacity duration-300 ${activeTab === 'abnt' ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'}`}>
                    <div className="text-center mt-10">
                        <div className="w-16 h-16 bg-[#2a2a2a] rounded-full flex items-center justify-center mx-auto mb-4">
                            <BookOpen className="w-8 h-8 text-gray-500" />
                        </div>
                        <h3 className="text-lg font-medium text-white mb-2">Normas ABNT</h3>
                        <p className="text-sm text-gray-500">
                            Ferramentas rápidas de formatação.
                        </p>

                        <div className="mt-8 space-y-3">
                            <button className="w-full py-3 px-4 bg-[#1a1a1a] hover:bg-[#2a2a2a] border border-white/5 rounded-xl flex items-center gap-3 transition-colors group">
                                <span className="w-6 h-6 rounded-full bg-[#Eebb4d]/10 text-[#Eebb4d] flex items-center justify-center text-xs font-bold group-hover:bg-[#Eebb4d] group-hover:text-black transition-colors">1</span>
                                <span className="text-sm text-gray-300 group-hover:text-white">Aplicar Margens</span>
                            </button>
                            <button className="w-full py-3 px-4 bg-[#1a1a1a] hover:bg-[#2a2a2a] border border-white/5 rounded-xl flex items-center gap-3 transition-colors group">
                                <span className="w-6 h-6 rounded-full bg-[#Eebb4d]/10 text-[#Eebb4d] flex items-center justify-center text-xs font-bold group-hover:bg-[#Eebb4d] group-hover:text-black transition-colors">2</span>
                                <span className="text-sm text-gray-300 group-hover:text-white">Corrigir Citações</span>
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Floating Navigation Tabs (Bottom) */}
            <div className="p-4 bg-[#141414] border-t border-white/10">
                <div className="flex bg-[#0a0a0a] p-1 rounded-xl border border-white/5">
                    <button
                        onClick={() => setActiveTab('chat')}
                        className={`flex-1 flex flex-col items-center justify-center py-2 rounded-lg transition-all ${activeTab === 'chat' ? 'bg-[#1a1a1a] text-[#Eebb4d] shadow-sm' : 'text-gray-500 hover:text-gray-300'
                            }`}
                    >
                        <MessageSquare className="w-5 h-5 mb-1" />
                        <span className="text-[10px] font-medium">Chat</span>
                    </button>
                    <button
                        onClick={() => setActiveTab('review')}
                        className={`flex-1 flex flex-col items-center justify-center py-2 rounded-lg transition-all ${activeTab === 'review' ? 'bg-[#1a1a1a] text-[#Eebb4d] shadow-sm' : 'text-gray-500 hover:text-gray-300'
                            }`}
                    >
                        <FileText className="w-5 h-5 mb-1" />
                        <span className="text-[10px] font-medium">Revisão</span>
                    </button>
                    <button
                        onClick={() => setActiveTab('abnt')}
                        className={`flex-1 flex flex-col items-center justify-center py-2 rounded-lg transition-all ${activeTab === 'abnt' ? 'bg-[#1a1a1a] text-[#Eebb4d] shadow-sm' : 'text-gray-500 hover:text-gray-300'
                            }`}
                    >
                        <BookOpen className="w-5 h-5 mb-1" />
                        <span className="text-[10px] font-medium">ABNT</span>
                    </button>
                </div>
            </div>
        </div>
    );
}
