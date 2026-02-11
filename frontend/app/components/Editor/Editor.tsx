'use client';

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import Image from '@tiptap/extension-image';
import TextAlign from '@tiptap/extension-text-align';
import Placeholder from '@tiptap/extension-placeholder';
import Toolbar from './Toolbar';
import { useEffect, useState } from 'react';
import axios from 'axios';
import { Loader2 } from 'lucide-react';
import { API_URL } from '../../lib/config';

interface EditorProps {
    filename: string;
    initialContent?: string;
    onClose: () => void;
}

export default function Editor({ filename }: EditorProps) {
    const [loading, setLoading] = useState(true);
    const [content, setContent] = useState('');

    useEffect(() => {
        // Fetch HTML content from backend
        const fetchContent = async () => {
            try {
                setLoading(true);
                // Using the new endpoint we just created
                const response = await axios.get(`${API_URL}/api/documents/html/${filename}`);
                setContent(response.data.html);
            } catch (error) {
                console.error('Error fetching document content:', error);
                setContent('<p>Erro ao carregar documento. Tente novamente.</p>');
            } finally {
                setLoading(false);
            }
        };

        if (filename) {
            fetchContent();
        }
    }, [filename]);

    const editor = useEditor({
        extensions: [
            StarterKit,
            Underline,
            Image,
            TextAlign.configure({
                types: ['heading', 'paragraph'],
            }),
            Placeholder.configure({
                placeholder: 'Comece a escrever...',
            }),
        ],
        content: content,
        immediatelyRender: false,
        editorProps: {
            attributes: {
                class: 'prose prose-sm sm:prose-base lg:prose-lg xl:prose-2xl m-5 focus:outline-none min-h-[1000px] w-full max-w-none prose-headings:text-black prose-p:text-black text-black',
            },
        },
        onCreate: ({ editor }) => {
            // If content is loaded later, we can set it here or via useEffect dependency
            if (content) {
                editor.commands.setContent(content);
            }
        },
    });

    // Update editor content when content state changes (from API)
    useEffect(() => {
        if (editor && content) {
            editor.commands.setContent(content);
        }
    }, [content, editor]);

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[600px] text-white">
                <Loader2 className="w-10 h-10 animate-spin text-[#Eebb4d] mb-4" />
                <p>Convertendo e preparando documento...</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-screen bg-[#111] text-white overflow-hidden">
            {/* Header / Top Bar */}
            <div className="flex items-center justify-between px-6 py-3 bg-[#1a1a1a] border-b border-white/10">
                <div className="flex items-center gap-4">
                    {/* Back button logic could go here or in parent */}
                    <h1 className="text-sm font-medium text-gray-300">
                        Editando: <span className="text-white">{filename}</span>
                    </h1>
                </div>
                <div className="flex items-center gap-3">
                    <span className="text-xs text-green-400 bg-green-900/20 px-2 py-1 rounded">Modo Edição Beta</span>
                </div>
            </div>

            {/* Toolbar */}
            <div className="flex justify-center bg-[#1a1a1a]">
                <div className="w-full max-w-[210mm]">
                    <Toolbar editor={editor} />
                </div>
            </div>

            {/* Editor Area (A4 Simulation) */}
            <div className="flex-1 overflow-y-auto bg-[#0a0a0a] p-8 scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-transparent">
                <div className="flex justify-center min-h-full pb-20">
                    <div
                        className="bg-white text-black shadow-2xl min-h-[297mm] w-[210mm] p-[1.5cm] origin-top transition-transform duration-200 cursor-text"
                        onClick={() => editor?.chain().focus().run()}
                        style={{
                            // Styles to make it look like a page
                            boxShadow: '0 0 50px rgba(0,0,0,0.5)',
                        }}
                    >
                        <EditorContent editor={editor} />
                    </div>
                </div>
            </div>
        </div>
    );
}
