/**
 * WritingAssistant - Assistente de escrita com IA
 * Interface para geração de texto com templates e streaming - Responsivo
 */

import * as React from 'react';
import { useState } from 'react';

type SectionType = 'introducao' | 'desenvolvimento' | 'conclusao' | 'resumo' | 'abstract' | 'geral';

interface Template {
  id: string;
  name: string;
  icon: string;
  sectionType: SectionType;
  prompt: string;
}

interface WritingAssistantProps {
  onGenerate: (instruction: string, sectionType: SectionType) => Promise<void>;
  onGenerateStreaming: (instruction: string, sectionType: SectionType) => Promise<void>;
  isLoading?: boolean;
  isStreaming?: boolean;
  streamProgress?: number;
}

const TEMPLATES: Template[] = [
  { id: 'intro', name: 'Intro', icon: '📖', sectionType: 'introducao', prompt: 'Escreva uma introdução acadêmica sobre ' },
  { id: 'dev', name: 'Desenv.', icon: '📝', sectionType: 'desenvolvimento', prompt: 'Desenvolva um parágrafo acadêmico sobre ' },
  { id: 'conclusion', name: 'Conclusão', icon: '🎯', sectionType: 'conclusao', prompt: 'Escreva uma conclusão para um trabalho sobre ' },
  { id: 'abstract', name: 'Abstract', icon: '🌐', sectionType: 'abstract', prompt: 'Write an academic abstract about ' },
  { id: 'resumo', name: 'Resumo', icon: '📋', sectionType: 'resumo', prompt: 'Escreva um resumo acadêmico sobre ' },
];

const WritingAssistant: React.FC<WritingAssistantProps> = ({
  onGenerate,
  onGenerateStreaming,
  isLoading = false,
  isStreaming = false,
  streamProgress = 0,
}) => {
  const [instruction, setInstruction] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [sectionType, setSectionType] = useState<SectionType>('geral');

  const isDisabled = isLoading || isStreaming || !instruction.trim();

  const handleTemplateClick = (template: Template) => {
    if (selectedTemplate?.id === template.id) {
      setSelectedTemplate(null);
      setSectionType('geral');
    } else {
      setSelectedTemplate(template);
      setSectionType(template.sectionType);
      if (!instruction.trim()) {
        setInstruction(template.prompt);
      }
    }
  };

  const handleGenerate = async (streaming: boolean) => {
    if (isDisabled) return;

    try {
      if (streaming) {
        await onGenerateStreaming(instruction, sectionType);
      } else {
        await onGenerate(instruction, sectionType);
      }
      setInstruction('');
      setSelectedTemplate(null);
    } catch (error) {
      console.error('Error generating text:', error);
    }
  };

  return (
    <div>
      {/* Templates - Grid responsivo */}
      <div style={{ marginBottom: '12px' }}>
        <label style={{
          display: 'block',
          fontSize: '10px',
          color: '#666',
          textTransform: 'uppercase',
          marginBottom: '6px',
          letterSpacing: '0.5px',
        }}>
          Templates
        </label>
        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '6px',
        }}>
          {TEMPLATES.map((template) => (
            <button
              key={template.id}
              onClick={() => handleTemplateClick(template)}
              disabled={isLoading || isStreaming}
              style={{
                padding: '6px 10px',
                borderRadius: '6px',
                border: selectedTemplate?.id === template.id ? '1px solid #Eebb4d' : '1px solid #333',
                background: selectedTemplate?.id === template.id ? '#Eebb4d15' : '#1a1a1a',
                color: selectedTemplate?.id === template.id ? '#Eebb4d' : '#888',
                cursor: 'pointer',
                transition: 'all 0.2s',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                fontSize: '11px',
                fontWeight: 500,
              }}
            >
              <span>{template.icon}</span>
              <span>{template.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Textarea */}
      <div style={{ marginBottom: '10px' }}>
        <textarea
          value={instruction}
          onChange={(e) => setInstruction(e.target.value)}
          placeholder="Ex: Escreva uma introdução sobre inteligência artificial na educação..."
          disabled={isLoading || isStreaming}
          style={{
            width: '100%',
            minHeight: '80px',
            padding: '10px',
            borderRadius: '10px',
            border: '1px solid #333',
            background: '#1a1a1a',
            color: '#fff',
            fontSize: '13px',
            resize: 'vertical',
            outline: 'none',
            transition: 'border-color 0.2s',
            lineHeight: 1.4,
          }}
          onFocus={(e) => { e.currentTarget.style.borderColor = '#Eebb4d'; }}
          onBlur={(e) => { e.currentTarget.style.borderColor = '#333'; }}
        />
      </div>

      {/* Tipo de seção - Compacto */}
      <div style={{ marginBottom: '12px' }}>
        <select
          value={sectionType}
          onChange={(e) => setSectionType(e.target.value as SectionType)}
          disabled={isLoading || isStreaming}
          style={{
            width: '100%',
            padding: '8px 10px',
            borderRadius: '8px',
            border: '1px solid #333',
            background: '#1a1a1a',
            color: '#fff',
            fontSize: '12px',
            outline: 'none',
            cursor: 'pointer',
          }}
        >
          <option value="geral">Tipo: Geral</option>
          <option value="introducao">Tipo: Introdução</option>
          <option value="desenvolvimento">Tipo: Desenvolvimento</option>
          <option value="conclusao">Tipo: Conclusão</option>
          <option value="resumo">Tipo: Resumo</option>
          <option value="abstract">Tipo: Abstract</option>
        </select>
      </div>

      {/* Progress bar */}
      {isStreaming && (
        <div style={{ marginBottom: '10px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
            <span style={{ fontSize: '10px', color: '#666' }}>Gerando...</span>
            <span style={{ fontSize: '10px', color: '#Eebb4d' }}>{streamProgress}%</span>
          </div>
          <div style={{
            width: '100%',
            height: '3px',
            background: '#1a1a1a',
            borderRadius: '2px',
            overflow: 'hidden',
          }}>
            <div style={{
              width: `${streamProgress}%`,
              height: '100%',
              background: 'linear-gradient(90deg, #Eebb4d, #f0d078)',
              transition: 'width 0.3s ease',
            }} />
          </div>
        </div>
      )}

      {/* Botões */}
      <div style={{ display: 'flex', gap: '6px' }}>
        <button
          onClick={() => handleGenerate(false)}
          disabled={isDisabled}
          style={{
            flex: 1,
            padding: '10px',
            borderRadius: '8px',
            border: 'none',
            background: isDisabled ? '#333' : '#Eebb4d',
            color: isDisabled ? '#666' : '#0a0a0a',
            fontWeight: 600,
            fontSize: '12px',
            cursor: isDisabled ? 'not-allowed' : 'pointer',
            transition: 'all 0.2s',
          }}
        >
          {isLoading ? '⏳...' : '✨ Gerar'}
        </button>
        <button
          onClick={() => handleGenerate(true)}
          disabled={isDisabled}
          style={{
            flex: 1,
            padding: '10px',
            borderRadius: '8px',
            border: '1px solid #Eebb4d',
            background: isDisabled ? '#1a1a1a' : 'transparent',
            color: isDisabled ? '#666' : '#Eebb4d',
            fontWeight: 600,
            fontSize: '12px',
            cursor: isDisabled ? 'not-allowed' : 'pointer',
            transition: 'all 0.2s',
          }}
        >
          {isStreaming ? '⏳...' : '🚀 Stream'}
        </button>
      </div>
    </div>
  );
};

export default WritingAssistant;
