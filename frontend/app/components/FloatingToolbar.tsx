'use client';

import { useState, useEffect, useRef } from 'react';
import { Sparkles, Type, ImagePlus, Loader2 } from 'lucide-react';
import axios from 'axios';

interface FloatingToolbarProps {
    selectedText: string;
    position: { x: number; y: number } | null;
    filename: string;
    onImprove: (improvedText: string, paragraphNumber?: number) => void;
    onFormat: () => void;
    onClose: () => void;
}

export default function FloatingToolbar({
    selectedText,
    position,
    filename,
    onImprove,
    onFormat,
    onClose
}: FloatingToolbarProps) {
    const [isImproving, setIsImproving] = useState(false);
    const [isVisible, setIsVisible] = useState(false);
    const toolbarRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (position && selectedText) {
            setTimeout(() => setIsVisible(true), 10);
        } else {
            setIsVisible(false);
        }
    }, [position, selectedText]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (toolbarRef.current && !toolbarRef.current.contains(event.target as Node)) {
                onClose();
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [onClose]);

    if (!position || !selectedText) return null;

    const handleImprove = async () => {
        setIsImproving(true);
        try {
            const response = await axios.post('http://localhost:8000/api/documents/improve-text', {
                filename: filename,
                text: selectedText
            });

            if (response.data.success) {
                onImprove(response.data.improved_text, response.data.paragraph_number);
            } else {
                onImprove(response.data.improved_text);
            }
        } catch (error) {
            console.error('Erro ao melhorar texto:', error);
            alert('Erro ao melhorar texto. Tente novamente.');
        } finally {
            setIsImproving(false);
        }
    };

    const handleFormat = () => {
        onFormat();
    };

    return (
        <div
            ref={toolbarRef}
            className={`fixed z-50 flex items-center gap-1 px-2 py-1.5 rounded-lg shadow-2xl backdrop-blur-xl bg-gray-900/95 border border-gray-700/50 transition-all duration-200 ${
                isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'
            }`}
            style={{
                left: `${position.x - 90}px`,
                top: `${position.y - 50}px`,
            }}
        >
            {/* Melhorar */}
            <button
                onClick={handleImprove}
                disabled={isImproving}
                className="group relative p-2 hover:bg-white/10 rounded-md transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                title="Melhorar escrita"
            >
                {isImproving ? (
                    <Loader2 className="w-4 h-4 text-[#Eebb4d] animate-spin" />
                ) : (
                    <Sparkles className="w-4 h-4 text-[#Eebb4d]" />
                )}
            </button>

            {/* Separator */}
            <div className="w-px h-4 bg-gray-700/50" />

            {/* Formatar ABNT */}
            <button
                onClick={handleFormat}
                className="group relative p-2 hover:bg-white/10 rounded-md transition-all"
                title="Formatar ABNT"
            >
                <Type className="w-4 h-4 text-gray-300" />
            </button>

            {/* Separator */}
            <div className="w-px h-4 bg-gray-700/50" />

            {/* Inserir */}
            <button
                className="group relative p-2 hover:bg-white/10 rounded-md transition-all"
                title="Inserir imagem"
            >
                <ImagePlus className="w-4 h-4 text-gray-300" />
            </button>
        </div>
    );
}
