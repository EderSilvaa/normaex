/**
 * FormatControls - Controles de formatação rápida
 * Botões para aplicar formatação ABNT e estilos
 */

import * as React from 'react';
import { useState } from 'react';

interface FormatControlsProps {
  onAutoFormat: () => Promise<void>;
  onFormatSelection: (options: {
    fontName?: string;
    fontSize?: number;
    bold?: boolean;
    italic?: boolean;
    alignment?: 'left' | 'center' | 'right' | 'justified';
  }) => Promise<void>;
  onApplyHeading: (level: 1 | 2 | 3) => Promise<void>;
  onApplyBlockQuote: () => Promise<void>;
  isLoading?: boolean;
}

interface FormatResult {
  success: boolean;
  message: string;
  details?: string[];
}

const FormatControls: React.FC<FormatControlsProps> = ({
  onAutoFormat,
  onFormatSelection,
  onApplyHeading,
  onApplyBlockQuote,
  isLoading = false,
}) => {
  const [result, setResult] = useState<FormatResult | null>(null);
  const [processing, setProcessing] = useState(false);

  const handleAutoFormat = async () => {
    setProcessing(true);
    setResult(null);

    try {
      await onAutoFormat();
      setResult({
        success: true,
        message: 'Formatação ABNT aplicada!',
      });
    } catch (error) {
      setResult({
        success: false,
        message: error instanceof Error ? error.message : 'Erro ao formatar',
      });
    } finally {
      setProcessing(false);
      setTimeout(() => setResult(null), 3000);
    }
  };

  const handleQuickFormat = async (type: string) => {
    setProcessing(true);
    try {
      switch (type) {
        case 'bold':
          await onFormatSelection({ bold: true });
          break;
        case 'italic':
          await onFormatSelection({ italic: true });
          break;
        case 'justify':
          await onFormatSelection({ alignment: 'justified' });
          break;
        case 'center':
          await onFormatSelection({ alignment: 'center' });
          break;
        case 'h1':
          await onApplyHeading(1);
          break;
        case 'h2':
          await onApplyHeading(2);
          break;
        case 'h3':
          await onApplyHeading(3);
          break;
        case 'quote':
          await onApplyBlockQuote();
          break;
      }
    } catch (error) {
      console.error('Format error:', error);
    } finally {
      setProcessing(false);
    }
  };

  const isDisabled = isLoading || processing;

  return (
    <div>
      {/* Botão principal de Auto-Format */}
      <button
        onClick={handleAutoFormat}
        disabled={isDisabled}
        style={{
          width: '100%',
          padding: '12px',
          marginBottom: '12px',
          borderRadius: '10px',
          border: 'none',
          background: isDisabled ? '#333' : 'linear-gradient(135deg, #Eebb4d 0%, #f5d485 100%)',
          color: isDisabled ? '#666' : '#0a0a0a',
          fontWeight: 700,
          fontSize: '13px',
          cursor: isDisabled ? 'not-allowed' : 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px',
          boxShadow: isDisabled ? 'none' : '0 4px 16px rgba(238, 187, 77, 0.3)',
          transition: 'all 0.2s',
        }}
      >
        {processing ? '⏳ Formatando...' : '✨ Aplicar Formatação ABNT'}
      </button>

      {/* Resultado */}
      {result && (
        <div
          style={{
            padding: '10px 12px',
            marginBottom: '12px',
            borderRadius: '8px',
            background: result.success ? '#10b98115' : '#ef444415',
            borderLeft: `3px solid ${result.success ? '#10b981' : '#ef4444'}`,
            fontSize: '12px',
            color: result.success ? '#10b981' : '#ef4444',
          }}
        >
          {result.message}
        </div>
      )}

      {/* Formatação Rápida */}
      <div style={{ marginBottom: '12px' }}>
        <label style={{
          display: 'block',
          fontSize: '10px',
          color: '#666',
          textTransform: 'uppercase',
          marginBottom: '6px',
          letterSpacing: '0.5px',
        }}>
          Formatação Rápida
        </label>
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          <button
            onClick={() => handleQuickFormat('bold')}
            disabled={isDisabled}
            title="Negrito"
            style={quickButtonStyle(isDisabled)}
          >
            <strong>B</strong>
          </button>
          <button
            onClick={() => handleQuickFormat('italic')}
            disabled={isDisabled}
            title="Itálico"
            style={quickButtonStyle(isDisabled)}
          >
            <em>I</em>
          </button>
          <button
            onClick={() => handleQuickFormat('justify')}
            disabled={isDisabled}
            title="Justificar"
            style={quickButtonStyle(isDisabled)}
          >
            ≡
          </button>
          <button
            onClick={() => handleQuickFormat('center')}
            disabled={isDisabled}
            title="Centralizar"
            style={quickButtonStyle(isDisabled)}
          >
            ⊞
          </button>
        </div>
      </div>

      {/* Estilos ABNT */}
      <div style={{ marginBottom: '12px' }}>
        <label style={{
          display: 'block',
          fontSize: '10px',
          color: '#666',
          textTransform: 'uppercase',
          marginBottom: '6px',
          letterSpacing: '0.5px',
        }}>
          Estilos ABNT
        </label>
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          <button
            onClick={() => handleQuickFormat('h1')}
            disabled={isDisabled}
            style={styleButtonStyle(isDisabled)}
          >
            Título 1
          </button>
          <button
            onClick={() => handleQuickFormat('h2')}
            disabled={isDisabled}
            style={styleButtonStyle(isDisabled)}
          >
            Título 2
          </button>
          <button
            onClick={() => handleQuickFormat('h3')}
            disabled={isDisabled}
            style={styleButtonStyle(isDisabled)}
          >
            Título 3
          </button>
          <button
            onClick={() => handleQuickFormat('quote')}
            disabled={isDisabled}
            style={styleButtonStyle(isDisabled)}
          >
            Citação
          </button>
        </div>
      </div>

      {/* Info ABNT */}
      <div style={{
        padding: '10px',
        background: '#1a1a1a',
        borderRadius: '8px',
        fontSize: '10px',
        color: '#666',
        lineHeight: 1.5,
      }}>
        <strong style={{ color: '#888' }}>Padrão ABNT:</strong>
        <ul style={{ margin: '4px 0 0', paddingLeft: '14px' }}>
          <li>Fonte: Times New Roman 12pt</li>
          <li>Espaçamento: 1,5 linhas</li>
          <li>Margens: 3cm (esq/sup), 2cm (dir/inf)</li>
          <li>Recuo: 1,25cm primeira linha</li>
        </ul>
      </div>
    </div>
  );
};

// Estilos dos botões
const quickButtonStyle = (disabled: boolean): React.CSSProperties => ({
  width: '36px',
  height: '36px',
  borderRadius: '8px',
  border: '1px solid #333',
  background: disabled ? '#1a1a1a' : '#1a1a1a',
  color: disabled ? '#444' : '#888',
  fontSize: '14px',
  cursor: disabled ? 'not-allowed' : 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  transition: 'all 0.2s',
});

const styleButtonStyle = (disabled: boolean): React.CSSProperties => ({
  padding: '6px 10px',
  borderRadius: '6px',
  border: '1px solid #333',
  background: disabled ? '#1a1a1a' : '#1a1a1a',
  color: disabled ? '#444' : '#888',
  fontSize: '11px',
  fontWeight: 500,
  cursor: disabled ? 'not-allowed' : 'pointer',
  transition: 'all 0.2s',
});

export default FormatControls;
