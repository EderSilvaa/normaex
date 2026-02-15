# Normaex 2.0 - Arquitetura do Projeto

**Assistente de IA para documentos academicos com formatacao ABNT, APA, Vancouver e IEEE**

---

## Visao Geral

O Normaex e um sistema de 3 camadas para auxiliar estudantes universitarios na escrita e formatacao de trabalhos academicos:

```
                          +------------------+
                          |   Microsoft Word |
                          |   (Office.js)    |
                          +--------+---------+
                                   |
                          +--------v---------+
                          |  Office Add-in   |  React + TypeScript
                          |  (localhost:3001) |  WebView2/Edge
                          +--------+---------+
                                   |
                          +--------v---------+
                          |  Backend API     |  FastAPI + Python
                          |  (localhost:8000) |  Gemini AI
                          +--------+---------+
                                   |
                   +---------------+---------------+
                   |               |               |
            +------v------+ +-----v------+ +------v------+
            | Google       | | PDF Files  | | JSON Storage|
            | Gemini 2.5   | | (uploads/) | | (data/)     |
            +--------------+ +------------+ +-------------+
```

---

## Estrutura de Diretorios

```
normaex/
├── backend/                        # API FastAPI (Python)
│   ├── main.py                     # Entrada: CORS, routers, health
│   ├── requirements.txt            # Dependencias Python
│   ├── .env                        # GEMINI_API_KEY (nao versionado)
│   ├── data/
│   │   ├── projects.json           # Persistencia de projetos
│   │   └── projects/               # Dados por projeto
│   ├── uploads/
│   │   └── pdfs/                   # PDFs dos usuarios
│   ├── models/
│   │   ├── addin_models.py         # Models do Add-in (Pydantic)
│   │   ├── project_models.py       # Models de Projetos/PDFs
│   │   └── research_models.py      # Models de Pesquisa
│   ├── routers/
│   │   ├── addin.py                # /api/addin/* (chat, analise, formato)
│   │   ├── projects.py             # /api/projects/* (CRUD projetos)
│   │   ├── research.py             # /api/research/* (busca academica)
│   │   └── document.py             # /api/document/* (processamento)
│   ├── services/
│   │   ├── ai.py                   # Integracao Gemini AI (async + retry)
│   │   ├── ai_writer.py            # Geracao de texto com streaming
│   │   ├── ai_structural.py        # Analise estrutural
│   │   ├── abnt.py                 # Regras de formatacao ABNT
│   │   ├── pdf_service.py          # Extracao de texto de PDFs (PyMuPDF)
│   │   ├── project_service.py      # CRUD projetos (JSON)
│   │   ├── rag.py                  # Retrieval-Augmented Generation
│   │   ├── inline_review.py        # Revisao inline de selecao
│   │   ├── chart_service.py        # Geracao de graficos
│   │   ├── academic_search.py      # Busca academica + referencias
│   │   ├── sanitizer.py            # Sanitizacao de prompts
│   │   ├── validator.py            # Validacao de documentos
│   │   ├── document_vision.py      # Analise visual de documentos
│   │   └── executor.py             # Execucao de tarefas
│   └── tests/
│       └── test_async_backend.py   # Testes async
│
├── office-addin/                   # Office Add-in (React + TypeScript)
│   ├── package.json                # Dependencias npm
│   ├── webpack.config.js           # Build + dev server (HTTPS :3001)
│   ├── tsconfig.json               # TypeScript config
│   ├── manifest.xml                # Manifest PRODUCAO (normaex.com.br)
│   ├── manifest.dev.xml            # Manifest DEV (localhost:3001)
│   ├── sideload.ps1                # Registra manifest no registry
│   ├── clear-word-cache.ps1        # Limpa cache do Office
│   ├── enable-edge-loopback.ps1    # Habilita loopback Edge (Admin)
│   ├── assets/                     # Icones do add-in (16-128px)
│   └── src/
│       ├── config/
│       │   └── norms.config.ts     # Config por norma (ABNT, APA, etc)
│       ├── hooks/
│       │   ├── useChat.ts          # Hook de estado do chat
│       │   └── useChatActions.ts   # Hook de acoes (analisar, formatar)
│       ├── services/
│       │   ├── index.ts            # Re-exports
│       │   ├── ApiService.ts       # Cliente HTTP (auto-detect env)
│       │   ├── DocumentService.ts  # Manipulacao Word via Office.js
│       │   └── StreamingService.ts # Respostas SSE
│       ├── styles/
│       │   ├── theme.ts            # Tema dark (cores, spacing, typo)
│       │   └── taskpane.css        # Estilos globais
│       ├── types/
│       │   ├── index.ts            # Re-exports
│       │   ├── api.types.ts        # Tipos API (espelham Pydantic)
│       │   └── chat.types.ts       # Tipos do chat (Message, etc)
│       └── taskpane/
│           ├── index.html          # Template HTML (Office.js CDN)
│           ├── taskpane.tsx        # Entrada React + Office.onReady
│           └── components/
│               ├── App.tsx                # Raiz: estado, memoria, config
│               ├── ChatPanel.tsx          # Chat principal (imagens, graficos)
│               ├── NormSelector.tsx       # Seletor de norma/area/tipo
│               ├── ProjectSelector.tsx    # CRUD projetos + upload PDF
│               ├── ResearchPanel.tsx      # Pesquisa academica + estrutura
│               ├── ComplianceScore.tsx    # Score animado 0-100
│               ├── IssuesList.tsx         # Lista de problemas
│               ├── InlineReviewPanel.tsx  # Revisao de selecao
│               ├── FormatControls.tsx     # Toolbar de formatacao
│               ├── WritingAssistant.tsx   # Assistente de escrita
│               ├── chat/
│               │   ├── ChatInput.tsx      # Input + botao acoes
│               │   ├── MessageList.tsx    # Scroll de mensagens
│               │   ├── MessageBubble.tsx  # Bolha individual
│               │   └── RubricCard.tsx     # Card de avaliacao rubrica
│               └── ui/
│                   ├── Button.tsx         # Botao reutilizavel
│                   ├── Card.tsx           # Card reutilizavel
│                   └── Input.tsx          # Input reutilizavel
│
├── frontend/                       # Landing Page (Next.js) - normaex.com.br
│   ├── package.json                # Next.js 16, React 19, Tailwind 4
│   ├── next.config.ts
│   └── app/
│       ├── page.tsx                # Home
│       ├── tool/page.tsx           # Pagina da ferramenta
│       └── layout.tsx              # Layout raiz
│
├── scripts/                        # Scripts utilitarios
├── ESTRUTURA.md                    # Este arquivo
├── DEPLOY.md                       # Guia de deploy (Vercel + Railway)
├── OFFICE_ADDIN_DEV_GUIDE.md       # Guia dev + troubleshooting do add-in
└── .gitignore
```

---

## Backend (FastAPI + Python)

### main.py
Ponto de entrada. Configura CORS, rate limiting (slowapi), inclui routers.

```bash
cd backend
python -m uvicorn main:app --reload --port 8000
```

### Routers e Endpoints

#### `/api/addin` (addin.py) - Endpoints do Office Add-in
| Endpoint | Metodo | Descricao |
|----------|--------|-----------|
| `/health` | GET | Health check |
| `/analyze-content` | POST | Analise de conformidade (ABNT/APA/etc) |
| `/format-content` | POST | Gera instrucoes de formatacao |
| `/chat` | POST | Chat contextualizado (com RAG de PDFs) |
| `/write` | POST | Geracao de texto academico |
| `/write-stream` | POST | Geracao via streaming (SSE) |
| `/improve` | POST | Melhoria de texto |
| `/inline-review` | POST | Revisao de selecao de texto |
| `/review-selection` | POST | Revisao detalhada com rubrica |
| `/image-proxy` | POST | Proxy de imagens para o add-in |
| `/chart` | POST | Geracao de graficos (matplotlib) |

#### `/api/projects` (projects.py) - Projetos e PDFs
| Endpoint | Metodo | Descricao |
|----------|--------|-----------|
| `/` | GET | Lista projetos |
| `/` | POST | Cria projeto |
| `/{id}` | GET/PUT/DELETE | CRUD de projeto |
| `/{id}/pdfs` | POST | Upload de PDF |
| `/{id}/pdfs/{pdf_id}` | DELETE | Remove PDF |
| `/{id}/context` | GET | Contexto combinado dos PDFs (RAG) |

#### `/api/research` (research.py) - Pesquisa Academica
| Endpoint | Metodo | Descricao |
|----------|--------|-----------|
| `/structure` | POST | Gera estrutura de TCC/monografia |
| `/search` | POST | Busca obras academicas + formata referencias |

### Services

| Service | Funcao |
|---------|--------|
| `ai.py` | Gemini 2.5 Flash: geracao, analise, chat. Retry com backoff exponencial |
| `ai_writer.py` | Geracao de texto longo com streaming SSE |
| `ai_structural.py` | Classificacao de secoes e analise estrutural |
| `abnt.py` | Regras ABNT: fonte, margem, espacamento, recuo, estrutura |
| `rag.py` | RAG: combina contexto de PDFs para enriquecer prompts |
| `pdf_service.py` | Extracao de texto via PyMuPDF (fitz) |
| `project_service.py` | Persistencia em JSON, CRUD projetos |
| `inline_review.py` | Correcao inline com diff de mudancas |
| `chart_service.py` | Graficos via matplotlib (barra, pizza, linha, area) |
| `academic_search.py` | Busca e formatacao de referencias (ABNT, APA, etc) |

### Models (Pydantic)

| Model | Descricao |
|-------|-----------|
| `DocumentContent` | Conteudo do documento Word (paragrafos, margens) |
| `ParagraphData` | Dados de um paragrafo (texto, fonte, alinhamento) |
| `AnalysisResponse` | Resposta da analise (score, issues, sugestoes) |
| `Issue` | Problema encontrado (code, severity, location, auto_fix) |
| `ChatRequest` | Requisicao de chat (message, context, project_id, memory) |
| `ChatResponse` | Resposta do chat (message, suggestions, context_info, review) |
| `FormatAction` | Acao de formatacao a aplicar no documento |
| `Project` | Projeto com nome, descricao e lista de PDFs |
| `InlineReviewRequest` | Texto selecionado para revisao |

---

## Office Add-in (React + TypeScript)

### Arquitetura de UI (Chat-First)

A interface e centrada em um chat unico que integra todas as funcionalidades:

```
+------------------------------------------+
|  Normaex          [ABNT NBR]  (*)        |  <- Header slim
+------------------------------------------+
|                                          |
|  [Mensagens do chat]                     |  <- MessageList
|  - Welcome                               |
|  - Analise: Score 85/100                 |
|  - Formatacao aplicada                   |
|  - Revisao com diff                      |
|                                          |
+------------------------------------------+
|  [Sugestoes rapidas]                     |  <- Chips clicaveis
+------------------------------------------+
|  [+] [Digite sua mensagem...]      [->]  |  <- ChatInput
+------------------------------------------+
```

O botao `[+]` abre um menu de acoes:
- Analisar Documento
- Formatar Documento
- Revisar Selecao
- Inserir Imagem (PC / Banco)
- Criar Grafico
- Pesquisa Academica
- Gerenciar Projetos

### Componentes Principais

**App.tsx** - Componente raiz
- Estado: Office init, backend status, projeto selecionado, config norma
- Memoria do projeto (localStorage): estrutura + referencias salvas
- Callbacks para chat, analise, formatacao, revisao, insercao

**ChatPanel.tsx** - Interface do chat
- Integra `useChat` + `useChatActions` hooks
- Suporta texto, imagens, graficos
- Modais: Projeto, Pesquisa, Busca Imagem, Criador Grafico
- Indicador de contexto PDF ativo

**NormSelector.tsx** - Configuracao
- Norma: ABNT / APA / Vancouver / IEEE
- Area do conhecimento
- Tipo de trabalho (TCC, monografia, artigo, etc)

### Services

**ApiService.ts** - Cliente HTTP
- Auto-detecta ambiente (localhost vs producao)
- Dev: `http://localhost:8000/api/addin`
- Prod: `https://api.normaex.com.br/api/addin`

**DocumentService.ts** - Manipulacao do Word
- `getDocumentContent()` - Extrai paragrafos, fontes, estilos
- `getDocumentContentWithMargins()` - Inclui margens da pagina
- `insertText()` / `insertHtml()` - Insere conteudo
- `applyFormatting(actions)` - Aplica acoes de formatacao
- `goToParagraph(index)` - Navega para paragrafo
- `insertImageWithCaption()` - Imagem com legenda ABNT

### Fluxo de Dados

```
Mensagem do usuario
       |
       v
ChatPanel.handleSendMessage()
       |
       v
App.handleChat() -- envia context, project_id, memory, history
       |
       v
ApiService.chat(request)
       |
       v
Backend /api/addin/chat
       |
       +-- project_service.get_context() -- RAG dos PDFs
       +-- ai.py -- Gemini com prompt enriquecido
       |
       v
ChatResponse { message, suggestions, context_info, generated_content,
               was_reviewed, review_score, detailed_review }
       |
       v
ChatPanel.addMessage('assistant', ...) -- renderiza no chat
```

---

## Landing Page (Next.js)

- **URL:** normaex.com.br
- **Stack:** Next.js 16, React 19, Tailwind CSS 4
- **Funcao:** Pagina de marketing/demonstracao
- **Deploy:** Vercel (free tier)

---

## Tecnologias

### Backend
| Tecnologia | Uso |
|------------|-----|
| Python 3.10+ | Linguagem |
| FastAPI | Framework web async |
| Uvicorn | Servidor ASGI |
| Pydantic | Validacao de dados |
| google-generativeai | SDK Gemini AI |
| PyMuPDF (fitz) | Extracao de PDF |
| matplotlib | Geracao de graficos |
| slowapi | Rate limiting |
| sse-starlette | Server-Sent Events |

### Office Add-in
| Tecnologia | Uso |
|------------|-----|
| TypeScript 5.3 | Linguagem |
| React 18 | UI framework |
| Office.js | API Word (leitura/escrita) |
| Webpack 5 | Bundler + dev server HTTPS |
| Axios | HTTP client |
| Marked.js | Markdown para HTML |

### Landing Page
| Tecnologia | Uso |
|------------|-----|
| Next.js 16 | Framework React SSR |
| Tailwind CSS 4 | Estilos |
| Tiptap | Editor rich text |

---

## Deploy

```
Usuarios -> AppSource -> Word -> Add-in Frontend (Vercel)
                                       |
                                 API Backend (Railway/Render)
                                       |
                                 Google Gemini API
```

| Componente | Plataforma | Dominio |
|------------|-----------|---------|
| Landing Page | Vercel | normaex.com.br |
| Office Add-in | Vercel | app.normaex.com.br |
| Backend API | Railway/Render | api.normaex.com.br |

---

## Variaveis de Ambiente

### Backend (.env)
```
GEMINI_API_KEY=<chave_api>
PORT=8000
ENVIRONMENT=development
ALLOWED_ORIGINS=https://localhost:3001,https://normaex.com.br
```

---

## Normas Suportadas

| Norma | Chave | Fonte | Tamanho | Espacamento | Margens (cm) |
|-------|-------|-------|---------|-------------|--------------|
| ABNT NBR | `abnt` | Times New Roman | 12pt | 1.5 | 3/2/3/2 |
| APA 7 | `apa` | Times New Roman | 12pt | 2.0 | 2.54 todos |
| Vancouver | `vancouver` | Arial | 12pt | 2.0 | 2.54 todos |
| IEEE | `ieee` | Times New Roman | 10pt | 1.0 | 1.78 todos |

Config completa em `office-addin/src/config/norms.config.ts`

---

## Portas (Desenvolvimento)

| Servico | Porta | Protocolo |
|---------|-------|-----------|
| Office Add-in | 3001 | HTTPS |
| Backend API | 8000 | HTTP |
| Frontend Next.js | 3000 | HTTP |

Ver [OFFICE_ADDIN_DEV_GUIDE.md](OFFICE_ADDIN_DEV_GUIDE.md) para troubleshooting do ambiente de desenvolvimento.
