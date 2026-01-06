import FileUpload from '../components/FileUpload';
import Image from 'next/image';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';

export default function Tool() {
  return (
    <main className="min-h-screen bg-[#000000] text-gray-200 selection:bg-[#Eebb4d] selection:text-black font-sans overflow-hidden relative">

      {/* Dynamic Background */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[800px] h-[800px] bg-[#Eebb4d]/5 rounded-full blur-[150px] animate-pulse-slow" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[600px] h-[600px] bg-indigo-900/10 rounded-full blur-[150px]" />
      </div>

      <div className="relative z-10 flex flex-col items-center justify-center min-h-screen p-6">

        {/* Navigation Back */}
        <div className="absolute top-6 left-6 md:top-10 md:left-10">
          <Link
            href="/"
            className="flex items-center gap-2 text-gray-500 hover:text-white transition-colors text-sm font-medium group"
          >
            <div className="bg-white/5 border border-white/10 p-2 rounded-full group-hover:bg-white/10 transition-colors">
              <ChevronLeft className="w-4 h-4" />
            </div>
            <span>Voltar</span>
          </Link>
        </div>

        {/* Logo Centered */}
        <div className="mb-12 opacity-80 hover:opacity-100 transition-opacity">
          <div className="relative w-32 h-10">
            <Image
              src="/logo.png"
              alt="Normaex Logo"
              fill
              className="object-contain"
              priority
            />
          </div>
        </div>

        {/* Main Interface */}
        <div className="w-full max-w-5xl mx-auto flex flex-col items-center">

          <div className="text-center mb-10 space-y-4">
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-white">
              Studio de Criação
            </h1>
            <p className="text-gray-400 text-lg">
              Arraste seu TCC para começar a mágica.
            </p>
          </div>

          {/* The App Container */}
          <div className="w-full">
            <FileUpload />
          </div>

        </div>

        {/* Footer Info */}
        <div className="absolute bottom-6 text-center w-full">
          <p className="text-xs text-gray-600 font-medium tracking-widest uppercase">
            NormaEx Intelligence Engine v2.0
          </p>
        </div>

      </div>
    </main>
  );
}
