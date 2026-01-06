import Link from 'next/link';
import Image from 'next/image';
import {
  ArrowRight,
  Sparkles,
  FileText,
  Zap,
  ShieldCheck,
  ChevronRight,
  PenTool,
  CheckCircle2
} from 'lucide-react';

export default function Home() {
  return (
    <div className="min-h-screen bg-[#000000] text-gray-200 selection:bg-[#Eebb4d] selection:text-black font-sans">

      {/* Navigation */}
      <nav className="fixed w-full z-50 bg-[#000000]/70 backdrop-blur-xl border-b border-[#1a1a1a]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="relative w-32 h-10">
              <Image
                src="/logo.png"
                alt="NormaEx"
                fill
                className="object-contain"
                priority
              />
            </div>
            <div className="hidden md:flex items-center space-x-8">
              <a href="#features" className="text-sm font-medium hover:text-[#Eebb4d] transition-colors">Funcionalidades</a>
              <a href="#how-it-works" className="text-sm font-medium hover:text-[#Eebb4d] transition-colors">Como Funciona</a>
              <a href="#testimonials" className="text-sm font-medium hover:text-[#Eebb4d] transition-colors">Depoimentos</a>
              <Link
                href="/tool"
                className="px-5 py-2 rounded-full border border-[#Eebb4d] text-[#Eebb4d] hover:bg-[#Eebb4d] hover:text-[#0a0a0a] transition-all duration-300 font-medium text-sm"
              >
                Acessar Ferramenta
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 md:pt-48 md:pb-32 overflow-hidden">
        {/* Background Glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full z-0 pointer-events-none">
          <div className="absolute top-[10%] left-[20%] w-[600px] h-[600px] bg-[#Eebb4d]/5 rounded-full blur-[140px] animate-pulse-slow" />
          <div className="absolute bottom-[0%] right-[20%] w-[500px] h-[500px] bg-indigo-900/10 rounded-full blur-[120px]" />
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 border border-white/10 backdrop-blur-md text-[#Eebb4d] text-xs font-semibold mb-8 animate-fade-in-up hover:bg-white/10 transition-colors cursor-default">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Nova Versão 2.0 Disponível</span>
          </div>

          <h1 className="text-5xl md:text-8xl font-bold tracking-tight text-white mb-8 leading-tight">
            TCC perfeito.<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#Eebb4d] via-[#f5d485] to-[#Eebb4d] bg-300% animate-gradient">
              Simples assim.
            </span>
          </h1>

          <p className="text-xl md:text-2xl text-gray-400 max-w-3xl mx-auto leading-relaxed mb-12 font-light">
            A primeira IA treinada para acadêmicos. Formatação ABNT instantânea, revisão de estilo e muito mais.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/tool"
              className="group inline-flex items-center gap-2 px-8 py-4 bg-[#Eebb4d] text-[#0a0a0a] font-bold rounded-full text-lg hover:bg-[#f5d485] transition-all duration-300 transform hover:scale-105 shadow-[0_0_40px_rgba(238,187,77,0.2)]"
            >
              Começar Agora
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>

          <div className="mt-24 border-t border-white/5 pt-12">
            <p className="text-sm font-medium text-gray-500 mb-8 uppercase tracking-widest">Confiança das melhores universidades</p>
            <div className="flex flex-wrap justify-center gap-12 md:gap-20 opacity-40 grayscale hover:grayscale-0 transition-grayscale duration-700">
              {/* Placeholders for University Logos */}
              <span className="text-2xl font-bold text-gray-300">USP</span>
              <span className="text-2xl font-bold text-gray-300">UNICAMP</span>
              <span className="text-2xl font-bold text-gray-300">UFRJ</span>
              <span className="text-2xl font-bold text-gray-300">UNESP</span>
              <span className="text-2xl font-bold text-gray-300">FGV</span>
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid (Bento Style) */}
      <section id="features" className="py-32 bg-[#050505]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-20">
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">Poderosa. Inteligente. ABNT.</h2>
            <p className="text-gray-400 max-w-2xl mx-auto text-lg">
              Redescubra o prazer de pesquisar e escrever, deixando a burocracia para a NormaEx.
            </p>
          </div>

          {/* Bento Grid Layout */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

            {/* Feature 1: Large Card */}
            <div className="md:col-span-2 group relative overflow-hidden rounded-[2.5rem] bg-[#1a1a1a]/40 border border-white/5 p-10 hover:bg-[#1a1a1a]/60 transition-all duration-500">
              <div className="absolute inset-0 bg-gradient-to-br from-[#Eebb4d]/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center gap-8 h-full">
                <div className="flex-1">
                  <div className="w-14 h-14 rounded-2xl bg-[#Eebb4d] flex items-center justify-center mb-6 shadow-[0_0_20px_rgba(238,187,77,0.3)]">
                    <FileText className="w-7 h-7 text-black" />
                  </div>
                  <h3 className="text-3xl font-bold text-white mb-4">Formatação Automática</h3>
                  <p className="text-gray-400 text-lg leading-relaxed">
                    Margens, fontes e espaçamentos ajustados automaticamente para o padrão ABNT. Esqueça as regras complexas e foque no seu conteúdo.
                  </p>
                </div>
                {/* Decorative UI Element simulation */}
                <div className="w-full md:w-1/3 h-48 md:h-full bg-gradient-to-t from-[#0a0a0a] to-[#2a2a2a] rounded-xl border border-white/10 opacity-50 group-hover:opacity-80 transition-opacity flex items-center justify-center overflow-hidden">
                  <div className="w-3/4 h-3/4 bg-white/5 rounded-lg border border-white/5 flex flex-col p-3 gap-2">
                    <div className="h-2 w-1/2 bg-[#Eebb4d]/20 rounded-full" />
                    <div className="h-2 w-full bg-white/10 rounded-full" />
                    <div className="h-2 w-full bg-white/10 rounded-full" />
                    <div className="h-2 w-3/4 bg-white/10 rounded-full" />
                  </div>
                </div>
              </div>
            </div>

            {/* Feature 2: Tall Card */}
            <div className="md:col-span-1 group relative overflow-hidden rounded-[2.5rem] bg-[#1a1a1a]/40 border border-white/5 p-10 hover:bg-[#1a1a1a]/60 transition-all duration-500">
              <div className="absolute inset-0 bg-gradient-to-bl from-purple-500/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <div className="relative z-10">
                <div className="w-14 h-14 rounded-2xl bg-indigo-500 flex items-center justify-center mb-6 shadow-[0_0_20px_rgba(99,102,241,0.3)]">
                  <Sparkles className="w-7 h-7 text-white" />
                </div>
                <h3 className="text-2xl font-bold text-white mb-4">IA Copilot</h3>
                <p className="text-gray-400 leading-relaxed mb-8">
                  Assistente inteligente para escrever, reescrever e melhorar seus parágrafos.
                </p>
                <div className="w-full h-32 bg-indigo-500/10 rounded-xl border border-indigo-500/20 flex items-center justify-center">
                  <span className="text-indigo-300 text-sm font-mono">Reescrevendo...</span>
                </div>
              </div>
            </div>

            {/* Feature 3: Tall Card */}
            <div className="md:col-span-1 group relative overflow-hidden rounded-[2.5rem] bg-[#1a1a1a]/40 border border-white/5 p-10 hover:bg-[#1a1a1a]/60 transition-all duration-500">
              <div className="absolute inset-0 bg-gradient-to-tr from-green-500/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <div className="relative z-10">
                <div className="w-14 h-14 rounded-2xl bg-emerald-500 flex items-center justify-center mb-6 shadow-[0_0_20px_rgba(16,185,129,0.3)]">
                  <PenTool className="w-7 h-7 text-white" />
                </div>
                <h3 className="text-2xl font-bold text-white mb-4">Revisão Inteligente</h3>
                <p className="text-gray-400 leading-relaxed">
                  Correção gramatical e de estilo para garantir um texto acadêmico impecável.
                </p>
              </div>
            </div>

            {/* Feature 4: Wide Card */}
            <div className="md:col-span-2 group relative overflow-hidden rounded-[2.5rem] bg-[#1a1a1a]/40 border border-white/5 p-10 hover:bg-[#1a1a1a]/60 transition-all duration-500">
              <div className="absolute inset-0 bg-gradient-to-tl from-[#Eebb4d]/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <div className="relative z-10 flex flex-col md:flex-row-reverse items-center gap-8">
                <div className="flex-1">
                  <div className="w-14 h-14 rounded-2xl bg-white/10 flex items-center justify-center mb-6 border border-white/20">
                    <CheckCircle2 className="w-7 h-7 text-white" />
                  </div>
                  <h3 className="text-3xl font-bold text-white mb-4">Pronto para entrega</h3>
                  <p className="text-gray-400 text-lg leading-relaxed">
                    Exporte em PDF ou Word com um clique. Garantia de que nenhuma regra passou despercebida.
                  </p>
                </div>
                <div className="w-full md:w-1/2 p-4">
                  <div className="flex gap-4 opacity-50">
                    <div className="flex-1 h-32 rounded-xl bg-[#0a0a0a] border border-white/10 flex items-center justify-center text-gray-500">DOCX</div>
                    <div className="flex-1 h-32 rounded-xl bg-[#0a0a0a] border border-white/10 flex items-center justify-center text-gray-500">PDF</div>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* How it Works - Minimalist Timeline */}
      <section id="how-it-works" className="py-24 relative overflow-hidden bg-[#0a0a0a]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-20">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">Fluxo de Trabalho Simplificado</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-12 relative">
            <div className="hidden md:block absolute top-[2.25rem] left-[16%] right-[16%] h-0.5 bg-gradient-to-r from-transparent via-[#333] to-transparent z-0" />

            <StepCardImproved
              number="1"
              title="Upload"
              description="Solte seu arquivo Word ou PDF."
            />
            <StepCardImproved
              number="2"
              title="Processamento"
              description="Nossa IA aplica as normas ABNT."
            />
            <StepCardImproved
              number="3"
              title="Download"
              description="Receba seu TCC pronto e formatado."
            />
          </div>
        </div>
      </section>

      {/* Stats Section with Glass Effect */}
      <section className="py-20 bg-gradient-to-r from-[#Eebb4d] to-[#f5d485] text-[#0a0a0a] relative overflow-hidden">
        <div className="absolute inset-0 bg-white/10 backdrop-blur-sm" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center divide-x divide-black/10">
            <StatItem number="10k+" label="Documentos" />
            <StatItem number="50k+" label="Horas Salvas" />
            <StatItem number="98%" label="Aprovação" />
            <StatItem number="24/7" label="Online" />
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-32 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-[#0a0a0a] to-[#111]" />
        <div className="relative z-10 max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-5xl md:text-6xl font-bold text-white mb-8 tracking-tight">
            Seu futuro acadêmico começa aqui.
          </h2>
          <p className="text-xl text-gray-400 mb-12">
            Não perca mais tempo com formatação. Use a NormaEx hoje mesmo.
          </p>
          <Link
            href="/tool"
            className="inline-flex items-center gap-3 px-12 py-6 bg-white text-black font-bold rounded-full text-xl hover:bg-gray-100 transition-all duration-300 hover:scale-105 shadow-2xl"
          >
            Começar Gratuitamente
            <ChevronRight className="w-6 h-6" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[#050505] border-t border-[#1a1a1a] pt-16 pb-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
            <div className="col-span-1 md:col-span-2">
              <div className="relative w-32 h-10 mb-6">
                <Image src="/logo.png" alt="NormaEx" fill className="object-contain" />
              </div>
              <p className="text-gray-500 max-w-sm">
                A plataforma definitiva para estudantes brasileiros. Simplificamos a ABNT para que você possa focar no que realmente importa: o conhecimento.
              </p>
            </div>
            <div>
              <h3 className="text-white font-bold mb-4">Produto</h3>
              <ul className="space-y-3 text-gray-500 text-sm">
                <li><a href="#" className="hover:text-white transition-colors">Funcionalidades</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Preços</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Para Universidades</a></li>
              </ul>
            </div>
            <div>
              <h3 className="text-white font-bold mb-4">Legal</h3>
              <ul className="space-y-3 text-gray-500 text-sm">
                <li><a href="#" className="hover:text-white transition-colors">Termos de Uso</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Privacidade</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Contato</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-[#1a1a1a] pt-8 text-center text-gray-600 text-sm">
            <p>&copy; {new Date().getFullYear()} NormaEx. Feito com tecnologia de ponta.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

// Modern Components
function StepCardImproved({ number, title, description }: { number: string, title: string, description: string }) {
  return (
    <div className="relative z-10 flex flex-col items-center text-center group">
      <div className="w-16 h-16 rounded-full bg-[#1a1a1a] border border-[#333] flex items-center justify-center mb-6 shadow-xl group-hover:border-[#Eebb4d] group-hover:scale-110 transition-all duration-300 relative">
        <div className="absolute inset-0 bg-[#Eebb4d]/20 rounded-full blur-lg opacity-0 group-hover:opacity-100 transition-opacity" />
        <span className="text-xl font-bold text-gray-200 group-hover:text-[#Eebb4d] relative z-10">{number}</span>
      </div>
      <h3 className="text-xl font-bold text-white mb-3">{title}</h3>
      <p className="text-gray-400 max-w-xs">{description}</p>
    </div>
  );
}

function StatItem({ number, label }: { number: string, label: string }) {
  return (
    <div className="py-2">
      <div className="text-4xl md:text-5xl font-bold mb-2 tracking-tight">{number}</div>
      <div className="text-xs md:text-sm font-semibold opacity-70 uppercase tracking-widest">{label}</div>
    </div>
  );
}
