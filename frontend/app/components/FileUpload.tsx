'use client';

import { useState } from 'react';
import axios from 'axios';
import { Upload, FileText, Loader2, ArrowRight, X, File, CheckCircle2 } from 'lucide-react';
import IntegratedViewer from './IntegratedViewer';

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

export default function FileUpload() {
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<'idle' | 'uploading' | 'analyzed' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const [uploadedFilename, setUploadedFilename] = useState('');
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setStatus('idle');
      setMessage('');
      setAnalysis(null);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setFile(e.dataTransfer.files[0]);
      setStatus('idle');
      setMessage('');
      setAnalysis(null);
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    setStatus('uploading');
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await axios.post('http://localhost:8080/api/documents/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      console.log('Upload response:', response.data);
      console.log('Analysis:', response.data.analysis);
      setStatus('analyzed');
      setUploadedFilename(response.data.filename);
      setAnalysis(response.data.analysis);

    } catch (error) {
      console.error(error);
      setStatus('error');
      setMessage('Erro ao analisar o arquivo. Tente novamente.');
    }
  };

  const handleReset = () => {
    setFile(null);
    setStatus('idle');
    setMessage('');
    setUploadedFilename('');
    setAnalysis(null);
  };

  // Modo analisado: visualizador integrado estilo SciSpace
  if (status === 'analyzed' && analysis) {
    return (
      <IntegratedViewer
        filename={uploadedFilename}
        analysis={analysis}
        onClose={handleReset}
      />
    );
  }

  // Modo upload: centralizado estilo Apple
  return (
    <div className="w-full max-w-2xl mx-auto">

      {/* Container Principal Glassmorphic */}
      <div
        className={`relative overflow-hidden rounded-[2.5rem] bg-[#1a1a1a]/40 backdrop-blur-xl border border-white/5 shadow-2xl transition-all duration-500 ${isDragging ? 'scale-105 border-[#Eebb4d]/50 bg-[#1a1a1a]/60' : 'hover:border-white/10'}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >

        {/* Glow de Fundo Condicional */}
        {isDragging && (
          <div className="absolute inset-0 bg-[#Eebb4d]/5 pointer-events-none animate-pulse" />
        )}

        <div className="p-12 md:p-16 flex flex-col items-center justify-center text-center space-y-8">

          {/* Icon Animations */}
          <div className={`relative w-24 h-24 flex items-center justify-center rounded-full transition-all duration-500 ${isDragging ? 'bg-[#Eebb4d]/20 scale-110' : 'bg-white/5'}`}>
            {isDragging ? (
              <Upload className="w-10 h-10 text-[#Eebb4d] animate-bounce" strokeWidth={1.5} />
            ) : file ? (
              <FileText className="w-10 h-10 text-[#Eebb4d]" strokeWidth={1.5} />
            ) : (
              <Upload className="w-10 h-10 text-gray-400" strokeWidth={1.5} />
            )}
          </div>

          {/* Texts */}
          <div className="max-w-md space-y-2">
            {!file ? (
              <>
                <h3 className="text-2xl font-semibold text-white">Upload do Documento</h3>
                <p className="text-gray-400">
                  Arraste e solte seu arquivo Word ou PDF aqui, ou{' '}
                  <label className="text-[#Eebb4d] hover:text-[#f5d485] cursor-pointer font-medium transition-colors">
                    selecione do computador
                    <input type="file" className="hidden" accept=".docx,.pdf" onChange={handleFileChange} />
                  </label>
                </p>
                <p className="text-xs text-gray-600 pt-4 uppercase tracking-wider font-semibold">Suporta .DOCX e .PDF</p>
              </>
            ) : (
              <div className="animate-fade-in-up">
                <h3 className="text-2xl font-semibold text-white mb-1">{file.name}</h3>
                <p className="text-gray-400 text-sm">{(file.size / 1024 / 1024).toFixed(2)} MB • Pronto para análise</p>

                <button
                  onClick={handleReset}
                  className="mt-4 text-xs text-red-400 hover:text-red-300 transition-colors"
                >
                  Remover arquivo
                </button>
              </div>
            )}
          </div>

          {/* Action Button */}
          {file && (
            <button
              onClick={handleUpload}
              disabled={status === 'uploading'}
              className={`group relative w-full max-w-xs py-4 rounded-full font-semibold text-lg transition-all duration-300 flex items-center justify-center gap-3 overflow-hidden ${status === 'uploading'
                ? 'bg-white/10 text-gray-400 cursor-not-allowed'
                : 'bg-[#Eebb4d] hover:bg-[#ffe196] text-black shadow-[0_0_30px_rgba(238,187,77,0.3)] hover:shadow-[0_0_50px_rgba(238,187,77,0.5)] hover:scale-[1.02]'
                }`}
            >
              {status === 'uploading' ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" strokeWidth={2} />
                  <span>Processando...</span>
                </>
              ) : (
                <>
                  <span>Iniciar Análise</span>
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" strokeWidth={2.5} />
                </>
              )}
            </button>
          )}

          {/* Error Message */}
          {status === 'error' && (
            <div className="absolute bottom-8 animate-shake">
              <span className="text-sm text-red-400 bg-red-900/20 px-4 py-2 rounded-full border border-red-500/20">
                {message}
              </span>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
