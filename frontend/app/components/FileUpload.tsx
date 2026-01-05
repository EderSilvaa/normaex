'use client';

import { useState } from 'react';
import axios from 'axios';
import { Upload, FileText, Loader2, ArrowRight, X } from 'lucide-react';
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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
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
      const response = await axios.post('http://localhost:8000/api/documents/upload', formData, {
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

  // Modo upload: centralizado
  return (
    <div className="w-full max-w-md mx-auto">
      <div className="p-8 bg-[#141414] rounded-2xl border border-[#2a2a2a] shadow-xl">
        <div className="flex flex-col items-center justify-center space-y-6">
          {/* Icon */}
          <div className="p-4 bg-[#Eebb4d]/10 rounded-2xl">
            <Upload className="w-10 h-10 text-[#Eebb4d]" />
          </div>

          {/* Title */}
          <div className="text-center">
            <h2 className="text-2xl font-semibold text-white mb-2">Upload do TCC</h2>
            <p className="text-sm text-gray-500">
              Arquivo Word (.docx) ou PDF (.pdf)
            </p>
          </div>

          {/* Drop Zone */}
          <div className="w-full">
            <label className="flex flex-col items-center justify-center w-full h-40 border-2 border-[#2a2a2a] border-dashed rounded-xl cursor-pointer bg-[#0a0a0a] hover:bg-[#1a1a1a] hover:border-[#Eebb4d]/50 transition-all duration-300 group">
              <div className="flex flex-col items-center justify-center py-6">
                <FileText className="w-12 h-12 text-gray-600 mb-3 group-hover:text-[#Eebb4d] transition-colors" />
                <p className="text-sm text-gray-400 group-hover:text-gray-300 transition-colors">
                  <span className="font-medium text-[#Eebb4d]">Clique para enviar</span> ou arraste
                </p>
                <p className="text-xs text-gray-600 mt-1">MAX. 10MB</p>
              </div>
              <input type="file" className="hidden" accept=".docx,.pdf" onChange={handleFileChange} />
            </label>
          </div>

          {/* Selected File */}
          {file && (
            <div className="flex items-center space-x-2 text-sm text-gray-300 bg-[#1a1a1a] px-4 py-3 rounded-xl border border-[#2a2a2a] w-full justify-center">
              <FileText className="w-4 h-4 text-[#Eebb4d]" />
              <span className="truncate max-w-[250px]">{file.name}</span>
            </div>
          )}

          {/* Upload Button */}
          <button
            onClick={handleUpload}
            disabled={!file || status === 'uploading'}
            className={`w-full py-3.5 px-4 rounded-xl font-medium transition-all duration-300 flex items-center justify-center gap-2 ${
              !file || status === 'uploading'
                ? 'bg-[#2a2a2a] text-gray-600 cursor-not-allowed'
                : 'bg-[#Eebb4d] hover:bg-[#d9a63c] text-black shadow-lg shadow-[#Eebb4d]/20 hover:shadow-[#Eebb4d]/40 hover:scale-[1.02]'
            }`}
          >
            {status === 'uploading' ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Analisando...</span>
              </>
            ) : (
              <>
                <span>Analisar Documento</span>
                <ArrowRight className="w-5 h-5" />
              </>
            )}
          </button>

          {/* Error State */}
          {status === 'error' && (
            <div className="flex items-center text-red-400 bg-red-500/10 border border-red-500/30 px-4 py-3 rounded-xl w-full">
              <span className="text-sm">{message}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
