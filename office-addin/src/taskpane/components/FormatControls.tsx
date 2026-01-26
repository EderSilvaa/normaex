/**
 * FormatControls - Botão de formatação ABNT
 */

import * as React from 'react';
import { useState } from 'react';

interface FormatControlsProps {
  onAutoFormat: () => Promise<void>;
  isLoading?: boolean;
  normName?: string;
}

interface FormatResult {
  success: boolean;
  message: string;
}

const FormatControls: React.FC<FormatControlsProps> = ({
  onAutoFormat,
  isLoading = false,
  normName = 'ABNT',
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
        message: `Formatação ${normName} aplicada!`,
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
        {processing ? 'Formatando...' : `Aplicar Formatação ${normName}`}
      </button>

      {/* Resultado */}
      {result && (
        <div
          style={{
            padding: '10px 12px',
            marginTop: '10px',
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
    </div>
  );
};

export default FormatControls;
