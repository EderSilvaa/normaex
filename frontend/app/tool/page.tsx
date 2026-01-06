import FileUpload from '../components/FileUpload';
import Image from 'next/image';
import { FileCheck, Sparkles, PenTool } from 'lucide-react';

export default function Tool() {
  return (
    <main className="min-h-screen bg-[#0a0a0a] bg-gradient-dark">
      {/* Background decorativo */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[#Eebb4d]/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-[#Eebb4d]/5 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 flex flex-col items-center justify-center p-4 pt-16 pb-20">
        {/* Logo */}
        <div className="mb-8">
          <div className="relative w-48 h-16">
            <Image
              src="/logo.png"
              alt="Normaex Logo"
              fill
              className="object-contain"
              priority
            />
          </div>
        </div>

        {/* Hero */}
        <div className="text-center mb-14 max-w-3xl">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight text-white mb-6">
            Seu TCC nas normas da{' '}
            <span className="text-[#Eebb4d] glow-gold inline-block">ABNT</span>
          </h1>
          <p className="text-lg md:text-xl text-gray-400 max-w-2xl mx-auto leading-relaxed">
            O copilot acadêmico que formata, revisa e ajuda você a escrever seu trabalho.
          </p>
        </div>

        {/* Upload Component */}
        <FileUpload />

        {/* Features */}
        <div className="mt-24 grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl w-full px-4">
          <div className="group p-6 bg-[#141414] rounded-2xl border border-[#2a2a2a] hover:border-[#Eebb4d]/50 transition-all duration-300 hover:shadow-lg hover:shadow-[#Eebb4d]/5">
            <div className="w-12 h-12 bg-[#Eebb4d]/10 rounded-xl flex items-center justify-center mb-4 group-hover:bg-[#Eebb4d]/20 transition-colors">
              <FileCheck className="w-6 h-6 text-[#Eebb4d]" />
            </div>
            <h2 className="text-xl font-semibold text-white mb-2">
              Formatação Automática
            </h2>
            <p className="text-gray-500 text-sm leading-relaxed">
              Margens, fontes e espaçamentos ajustados automaticamente para o padrão ABNT.
            </p>
          </div>

          <div className="group p-6 bg-[#141414] rounded-2xl border border-[#2a2a2a] hover:border-[#Eebb4d]/50 transition-all duration-300 hover:shadow-lg hover:shadow-[#Eebb4d]/5">
            <div className="w-12 h-12 bg-[#Eebb4d]/10 rounded-xl flex items-center justify-center mb-4 group-hover:bg-[#Eebb4d]/20 transition-colors">
              <Sparkles className="w-6 h-6 text-[#Eebb4d]" />
            </div>
            <h2 className="text-xl font-semibold text-white mb-2">
              IA Copilot
            </h2>
            <p className="text-gray-500 text-sm leading-relaxed">
              Assistente inteligente para escrever, reescrever e melhorar seus parágrafos.
            </p>
          </div>

          <div className="group p-6 bg-[#141414] rounded-2xl border border-[#2a2a2a] hover:border-[#Eebb4d]/50 transition-all duration-300 hover:shadow-lg hover:shadow-[#Eebb4d]/5">
            <div className="w-12 h-12 bg-[#Eebb4d]/10 rounded-xl flex items-center justify-center mb-4 group-hover:bg-[#Eebb4d]/20 transition-colors">
              <PenTool className="w-6 h-6 text-[#Eebb4d]" />
            </div>
            <h2 className="text-xl font-semibold text-white mb-2">
              Revisão Inteligente
            </h2>
            <p className="text-gray-500 text-sm leading-relaxed">
              Correção gramatical e de estilo para garantir um texto acadêmico impecável.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-20 text-center text-gray-600 text-sm">
          <p>Powered by AI</p>
        </div>
      </div>
    </main>
  );
}
