'use client';

import { useState, useEffect, useRef } from 'react';
import { FileText, Loader2, RefreshCw, Maximize2, Minimize2, ZoomIn, ZoomOut } from 'lucide-react';

interface DocumentPreviewProps {
  filename: string;
  streamingText?: string;
  isStreaming?: boolean;
  isApplying?: boolean;
  onRefresh?: () => void;
}

export default function DocumentPreview({
  filename,
  streamingText = '',
  isStreaming = false,
  isApplying = false,
  onRefresh
}: DocumentPreviewProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [zoom, setZoom] = useState(0.75);
  const containerRef = useRef<HTMLDivElement>(null);
  const [docxPreview, setDocxPreview] = useState<any>(null);

  // Load docx-preview dynamically (client-side only)
  useEffect(() => {
    import('docx-preview').then((module) => {
      setDocxPreview(module);
    });
  }, []);

  const fetchAndRenderPreview = async () => {
    if (!docxPreview || !containerRef.current) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`http://localhost:8080/api/documents/preview/${encodeURIComponent(filename)}`);

      if (!response.ok) {
        throw new Error('Documento não encontrado');
      }

      // Get as ArrayBuffer and create Blob with correct MIME type
      const arrayBuffer = await response.arrayBuffer();
      const blob = new Blob([arrayBuffer], {
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      });

      // Clear previous content
      containerRef.current.innerHTML = '';

      // Render the DOCX using docx-preview
      await docxPreview.renderAsync(blob, containerRef.current, undefined, {
        className: 'docx-preview-container',
        inWrapper: true,
        ignoreWidth: false,
        ignoreHeight: false,
        ignoreFonts: false,
        breakPages: true,
        ignoreLastRenderedPageBreak: false,
        experimental: true,
        trimXmlDeclaration: true,
        useBase64URL: true,
        renderHeaders: true,
        renderFooters: true,
        renderFootnotes: true,
        renderEndnotes: true,
      });

      setLoading(false);
    } catch (err) {
      setError('Erro ao carregar preview do documento');
      console.error(err);
      setLoading(false);
    }
  };

  useEffect(() => {
    if (filename && docxPreview) {
      fetchAndRenderPreview();
    }
  }, [filename, docxPreview]);

  const handleRefresh = () => {
    fetchAndRenderPreview();
    onRefresh?.();
  };

  return (
    <div className={`flex flex-col bg-[#0a0a0a] rounded-2xl border border-[#2a2a2a] overflow-hidden transition-all duration-300 shadow-xl ${isExpanded ? 'fixed inset-4 z-50' : 'h-full'}`}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3.5 bg-[#141414] border-b border-[#2a2a2a]">
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-[#Eebb4d]" />
          <span className="text-sm text-gray-300 font-medium">Preview do Documento</span>
          {isStreaming && (
            <span className="flex items-center gap-1 text-xs text-green-400 bg-green-500/10 px-2 py-0.5 rounded-full">
              <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
              Escrevendo...
            </span>
          )}
          {isApplying && (
            <span className="flex items-center gap-1 text-xs text-[#Eebb4d] bg-[#Eebb4d]/10 px-2 py-0.5 rounded-full">
              <Loader2 className="w-3 h-3 animate-spin" />
              Aplicando formatação...
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setZoom(prev => Math.max(0.5, prev - 0.1))}
            className="p-1.5 text-gray-400 hover:text-white hover:bg-[#2a2a2a] rounded-lg transition-colors"
            title="Diminuir zoom"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <span className="text-xs text-gray-500 min-w-[45px] text-center">
            {Math.round(zoom * 100)}%
          </span>
          <button
            onClick={() => setZoom(prev => Math.min(1.5, prev + 0.1))}
            className="p-1.5 text-gray-400 hover:text-white hover:bg-[#2a2a2a] rounded-lg transition-colors"
            title="Aumentar zoom"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <div className="h-4 w-px bg-[#2a2a2a] mx-1"></div>
          <button
            onClick={handleRefresh}
            className="p-1.5 text-gray-400 hover:text-white hover:bg-[#2a2a2a] rounded-lg transition-colors"
            title="Atualizar preview"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1.5 text-gray-400 hover:text-white hover:bg-[#2a2a2a] rounded-lg transition-colors"
            title={isExpanded ? 'Minimizar' : 'Expandir'}
          >
            {isExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Document Content */}
      <div className="flex-1 overflow-auto bg-gray-200 p-6 relative">
        {/* Overlay de aplicação */}
        {isApplying && !loading && (
          <div className="absolute inset-0 bg-[#0a0a0a]/80 backdrop-blur-sm z-10 flex items-center justify-center">
            <div className="text-center bg-[#141414] border border-[#Eebb4d]/30 rounded-xl p-6 shadow-2xl">
              <Loader2 className="w-10 h-10 text-[#Eebb4d] animate-spin mx-auto mb-4" />
              <p className="text-white text-lg font-semibold mb-2">Aplicando formatação ABNT</p>
              <p className="text-gray-400 text-sm">O preview será atualizado automaticamente</p>
            </div>
          </div>
        )}

        {loading && (
          <div className="h-full flex items-center justify-center">
            <div className="text-center">
              <Loader2 className="w-8 h-8 text-[#Eebb4d] animate-spin mx-auto mb-3" />
              <p className="text-gray-600 text-sm">Carregando documento...</p>
            </div>
          </div>
        )}

        {error && !loading && (
          <div className="h-full flex items-center justify-center">
            <div className="text-center text-red-500">
              <FileText className="w-8 h-8 mx-auto mb-3 opacity-50" />
              <p className="text-sm">{error}</p>
              <button
                onClick={handleRefresh}
                className="mt-3 text-[#Eebb4d] text-sm hover:underline"
              >
                Tentar novamente
              </button>
            </div>
          </div>
        )}

        {/* DOCX Preview Container */}
        <div
          ref={containerRef}
          className="docx-wrapper mx-auto shadow-xl"
          style={{
            display: loading || error ? 'none' : 'block',
            background: 'white',
            minHeight: '100%',
          }}
        />

        {/* Streaming Text Overlay */}
        {isStreaming && streamingText && (
          <div
            className="mt-4 bg-white rounded-lg shadow-xl mx-auto p-8 border-2 border-[#Eebb4d] relative"
            style={{ maxWidth: '21cm' }}
          >
            <div className="absolute -top-3 left-4 bg-[#Eebb4d] text-black text-xs font-bold px-2 py-1 rounded">
              NOVO TEXTO
            </div>
            <div
              className="prose prose-sm max-w-none"
              style={{
                fontFamily: 'Arial, sans-serif',
                fontSize: '12pt',
                lineHeight: '1.5',
                textAlign: 'justify',
                color: '#1a1a1a'
              }}
            >
              {streamingText.split('\n').map((paragraph, i) => (
                <p key={i} className="mb-4 first:mt-0">
                  {paragraph}
                  {i === streamingText.split('\n').length - 1 && isStreaming && (
                    <span className="inline-block w-2 h-4 bg-[#Eebb4d] ml-1 animate-pulse" />
                  )}
                </p>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Expanded Overlay Background */}
      {isExpanded && (
        <div
          className="fixed inset-0 bg-black/80 -z-10"
          onClick={() => setIsExpanded(false)}
        />
      )}

      <style jsx global>{`
        .docx-wrapper {
          background: white;
          transform: scale(${zoom});
          transform-origin: top center;
          width: ${100 / zoom}%;
          margin-left: ${-(100 / zoom - 100) / 2}%;
          transition: transform 0.2s ease;
        }
        .docx-wrapper > section.docx {
          background: white !important;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1) !important;
          margin: 0 auto 20px auto !important;
          padding: 0 !important;
          max-width: 21cm;
        }
        .docx-wrapper article {
          padding: 2.5cm 3cm 2cm 3cm !important;
        }
        .docx-wrapper p {
          margin: 0 0 0.5em 0 !important;
          font-size: 12pt !important;
          line-height: 1.5 !important;
        }
        .docx-wrapper h1, .docx-wrapper h2, .docx-wrapper h3 {
          font-size: 12pt !important;
          font-weight: bold !important;
          margin: 1em 0 0.5em 0 !important;
        }
      `}</style>
    </div>
  );
}
