/**
 * FormatControls - Botão de formatação ABNT
 */

import * as React from 'react';
import { useState } from 'react';
import { Button } from './ui/Button';
import { theme } from '../../styles/theme';

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
      <Button
        variant="primary"
        fullWidth
        onClick={handleAutoFormat}
        isLoading={isDisabled}
        style={{
          fontWeight: theme.typography.weights.black,
          fontSize: theme.typography.sizes.sm,
          boxShadow: isDisabled ? 'none' : theme.shadows.md,
        }}
      >
        {`Aplicar Formatação ${normName}`}
      </Button>

      {/* Resultado */}
      {result && (
        <div
          style={{
            padding: theme.spacing.sm,
            marginTop: theme.spacing.sm,
            borderRadius: theme.borderRadius.md,
            background: result.success ? `${theme.colors.success}15` : `${theme.colors.error}15`,
            borderLeft: `3px solid ${result.success ? theme.colors.success : theme.colors.error}`,
            fontSize: theme.typography.sizes.sm,
            color: result.success ? theme.colors.success : theme.colors.error,
          }}
        >
          {result.message}
        </div>
      )}
    </div>
  );
};

export default FormatControls;
