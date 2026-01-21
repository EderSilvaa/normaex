import {
    Bold,
    Italic,
    Underline,
    AlignLeft,
    AlignCenter,
    AlignRight,
    AlignJustify,
    List,
    ListOrdered,
    Heading1,
    Heading2,
    Quote,
    Undo,
    Redo,
    Sparkles
} from 'lucide-react';
import { Editor } from '@tiptap/react';

interface ToolbarProps {
    editor: Editor | null;
}

export default function Toolbar({ editor }: ToolbarProps) {
    if (!editor) {
        return null;
    }

    const ToolbarButton = ({
        onClick,
        isActive = false,
        disabled = false,
        children,
        title
    }: {
        onClick: () => void,
        isActive?: boolean,
        disabled?: boolean,
        children: React.ReactNode,
        title?: string
    }) => (
        <button
            onClick={onClick}
            disabled={disabled}
            title={title}
            className={`p-2 rounded hover:bg-white/10 transition-colors ${isActive ? 'bg-white/20 text-[#Eebb4d]' : 'text-gray-300'
                } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
            {children}
        </button>
    );

    return (
        <div className="flex items-center gap-1 p-2 bg-[#1a1a1a] border-b border-white/10 sticky top-0 z-50 overflow-x-auto rounded-t-lg">
            <div className="flex items-center gap-1 pr-4 border-r border-white/10">
                <ToolbarButton
                    onClick={() => editor.chain().focus().toggleBold().run()}
                    disabled={!editor.can().chain().focus().toggleBold().run()}
                    isActive={editor.isActive('bold')}
                    title="Negrito (Ctrl+B)"
                >
                    <Bold size={18} />
                </ToolbarButton>
                <ToolbarButton
                    onClick={() => editor.chain().focus().toggleItalic().run()}
                    disabled={!editor.can().chain().focus().toggleItalic().run()}
                    isActive={editor.isActive('italic')}
                    title="Itálico (Ctrl+I)"
                >
                    <Italic size={18} />
                </ToolbarButton>
                <ToolbarButton
                    onClick={() => editor.chain().focus().toggleUnderline().run()}
                    disabled={!editor.can().chain().focus().toggleUnderline().run()}
                    isActive={editor.isActive('underline')}
                    title="Sublinhado (Ctrl+U)"
                >
                    <Underline size={18} />
                </ToolbarButton>
            </div>

            <div className="flex items-center gap-1 px-4 border-r border-white/10">
                <ToolbarButton
                    onClick={() => editor.chain().focus().setTextAlign('left').run()}
                    isActive={editor.isActive({ textAlign: 'left' })}
                    title="Alinhar à Esquerda"
                >
                    <AlignLeft size={18} />
                </ToolbarButton>
                <ToolbarButton
                    onClick={() => editor.chain().focus().setTextAlign('center').run()}
                    isActive={editor.isActive({ textAlign: 'center' })}
                    title="Centralizar"
                >
                    <AlignCenter size={18} />
                </ToolbarButton>
                <ToolbarButton
                    onClick={() => editor.chain().focus().setTextAlign('right').run()}
                    isActive={editor.isActive({ textAlign: 'right' })}
                    title="Alinhar à Direita"
                >
                    <AlignRight size={18} />
                </ToolbarButton>
                <ToolbarButton
                    onClick={() => editor.chain().focus().setTextAlign('justify').run()}
                    isActive={editor.isActive({ textAlign: 'justify' })}
                    title="Justificar"
                >
                    <AlignJustify size={18} />
                </ToolbarButton>
            </div>

            <div className="flex items-center gap-1 px-4 border-r border-white/10">
                <ToolbarButton
                    onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
                    isActive={editor.isActive('heading', { level: 1 })}
                    title="Título 1"
                >
                    <Heading1 size={18} />
                </ToolbarButton>
                <ToolbarButton
                    onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
                    isActive={editor.isActive('heading', { level: 2 })}
                    title="Título 2"
                >
                    <Heading2 size={18} />
                </ToolbarButton>
                <ToolbarButton
                    onClick={() => editor.chain().focus().toggleBulletList().run()}
                    isActive={editor.isActive('bulletList')}
                    title="Lista com Marcadores"
                >
                    <List size={18} />
                </ToolbarButton>
                <ToolbarButton
                    onClick={() => editor.chain().focus().toggleOrderedList().run()}
                    isActive={editor.isActive('orderedList')}
                    title="Lista Numerada"
                >
                    <ListOrdered size={18} />
                </ToolbarButton>
            </div>

            <div className="flex items-center gap-1 px-4 border-r border-white/10">
                <ToolbarButton
                    onClick={() => editor.chain().focus().toggleBlockquote().run()}
                    isActive={editor.isActive('blockquote')}
                    title="Citação"
                >
                    <Quote size={18} />
                </ToolbarButton>
            </div>

            <div className="flex items-center gap-1 px-4 border-r border-white/10">
                <ToolbarButton
                    onClick={() => editor.chain().focus().undo().run()}
                    disabled={!editor.can().chain().focus().undo().run()}
                    title="Desfazer"
                >
                    <Undo size={18} />
                </ToolbarButton>
                <ToolbarButton
                    onClick={() => editor.chain().focus().redo().run()}
                    disabled={!editor.can().chain().focus().redo().run()}
                    title="Refazer"
                >
                    <Redo size={18} />
                </ToolbarButton>
            </div>

            <div className="flex items-center gap-1 pl-4 ml-auto">
                <button
                    className="flex items-center gap-2 px-3 py-1.5 bg-[#Eebb4d] text-black rounded-md hover:bg-[#ffe196] transition-colors font-medium text-sm"
                    onClick={() => {
                        // Placeholder for AI action
                        editor.commands.focus();
                        // In a real implementation this might open a modal or side panel
                        alert("Assistente IA ativado! (Em breve)");
                    }}
                >
                    <Sparkles size={16} />
                    <span>Normaex IA</span>
                </button>
            </div>
        </div>
    );
}
