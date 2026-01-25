# Normaex 2.0 - Estrutura do Projeto

**Assistente de IA para Documentos Acadêmicos com formatação ABNT**

---

## Visão Geral

O Normaex é um Office Add-in para Microsoft Word que auxilia na formatação de documentos acadêmicos conforme normas ABNT. O sistema possui:

- **Backend**: API FastAPI com Python + Gemini AI
- **Frontend**: Office Add-in com React + TypeScript
- **Funcionalidades**: Análise ABNT, Chat com IA, Geração de texto, Contexto de PDFs

---

## Estrutura de Diretórios

```
normaex/
├── backend/                    # API FastAPI (Python)
│   ├── main.py                 # Ponto de entrada da aplicação
│   ├── data/
│   │   └── projects.json       # Persistência de projetos e PDFs
│   ├── uploads/
│   │   └── pdfs/               # PDFs enviados pelos usuários
│   ├── models/
│   │   ├── __init__.py
│   │   ├── addin_models.py     # Models para o Office Add-in
│   │   └── project_models.py   # Models para projetos e PDFs
│   ├── routers/
│   │   ├── addin.py            # Endpoints do Add-in (chat, análise, formatação)
│   │   ├── document.py         # Endpoints de documentos
│   │   └── projects.py         # Endpoints de projetos e PDFs
│   └── services/
│       ├── ai.py               # Integração com Gemini AI
│       ├── ai_structural.py    # Análise estrutural com IA
│       ├── ai_writer.py        # Geração de texto acadêmico
│       ├── abnt.py             # Regras de formatação ABNT
│       ├── pdf_service.py      # Extração de texto de PDFs
│       ├── project_service.py  # CRUD de projetos
│       ├── validator.py        # Validação de documentos
│       ├── document_vision.py  # Análise de imagens
│       └── executor.py         # Execução de tarefas
│
├── office-addin/               # Frontend React/TypeScript
│   ├── package.json
│   ├── tsconfig.json
│   └── src/
│       ├── services/
│       │   ├── index.ts
│       │   ├── ApiService.ts       # Chamadas à API backend
│       │   ├── DocumentService.ts  # Manipulação do documento Word
│       │   └── StreamingService.ts # Streaming de texto
│       ├── types/
│       │   ├── index.ts
│       │   └── api.types.ts        # Tipos TypeScript (espelham models Python)
│       └── taskpane/
│           ├── index.html
│           ├── taskpane.tsx        # Entrada do React
│           ├── styles/
│           │   └── taskpane.css    # Estilos globais
│           └── components/
│               ├── index.ts
│               ├── App.tsx             # Componente principal
│               ├── ChatPanel.tsx       # Chat com IA
│               ├── ProjectSelector.tsx # Seleção de projetos e PDFs
│               ├── ComplianceScore.tsx # Score de conformidade ABNT
│               ├── IssuesList.tsx      # Lista de problemas
│               ├── FormatControls.tsx  # Controles de formatação
│               ├── TabNavigation.tsx   # Navegação entre abas
│               └── WritingAssistant.tsx # Assistente de escrita
│
└── ESTRUTURA.md                # Este arquivo
```

---

## Backend (FastAPI + Python)

### main.py
Ponto de entrada da API. Configura CORS, inclui routers e inicia uvicorn.

```bash
# Executar backend
cd backend
python -m uvicorn main:app --reload --port 8000
```

### Models

#### addin_models.py
Define estruturas de dados para comunicação com o Add-in:

| Model | Descrição |
|-------|-----------|
| `DocumentContent` | Conteúdo do documento Word (parágrafos, margens, etc.) |
| `ParagraphData` | Dados de um parágrafo (texto, fonte, alinhamento) |
| `AnalysisResponse` | Resposta da análise ABNT (score, issues, sugestões) |
| `Issue` | Problema encontrado no documento |
| `ChatRequest` | Requisição de chat (mensagem, contexto, project_id) |
| `ChatResponse` | Resposta do chat (mensagem, sugestões, context_info) |
| `ContextInfo` | Info sobre PDFs usados como contexto |
| `WriteRequest` | Requisição de geração de texto |
| `FormatAction` | Ação de formatação a aplicar |

#### project_models.py
Define estruturas para projetos e PDFs:

| Model | Descrição |
|-------|-----------|
| `Project` | Projeto com nome, descrição e lista de PDFs |
| `PDFDocument` | Documento PDF com texto extraído |
| `PDFStatus` | Status do PDF (pending, processing, ready, error) |

### Routers

#### addin.py - `/api/addin`
Endpoints principais do Office Add-in:

| Endpoint | Método | Descrição |
|----------|--------|-----------|
| `/analyze-content` | POST | Analisa conformidade ABNT |
| `/format-content` | POST | Gera instruções de formatação |
| `/chat` | POST | Chat contextualizado com IA |
| `/write` | POST | Gera texto acadêmico |
| `/write-stream` | POST | Gera texto via streaming (SSE) |
| `/improve` | POST | Melhora texto selecionado |
| `/health` | GET | Health check |

#### projects.py - `/api/projects`
Gerenciamento de projetos e PDFs:

| Endpoint | Método | Descrição |
|----------|--------|-----------|
| `/` | GET | Lista projetos |
| `/` | POST | Cria projeto |
| `/{id}` | GET | Obtém projeto |
| `/{id}` | PUT | Atualiza projeto |
| `/{id}` | DELETE | Deleta projeto |
| `/{id}/pdfs` | POST | Upload de PDF |
| `/{id}/pdfs/{pdf_id}` | DELETE | Remove PDF |
| `/{id}/context` | GET | Obtém contexto combinado dos PDFs |

### Services

| Service | Descrição |
|---------|-----------|
| `ai.py` | Integração com Google Gemini AI |
| `ai_writer.py` | Geração de texto acadêmico com streaming |
| `ai_structural.py` | Análise estrutural de documentos |
| `pdf_service.py` | Extração de texto de PDFs (PyMuPDF) |
| `project_service.py` | CRUD de projetos, persistência JSON |
| `abnt.py` | Regras e validações ABNT |
| `validator.py` | Validação de documentos |

---

## Frontend (Office Add-in + React)

### Services

#### ApiService.ts
Comunicação com o backend:

```typescript
// Principais métodos
ApiService.checkHealth()           // Verifica status
ApiService.analyzeContent(content) // Análise ABNT
ApiService.chat(request)           // Chat com IA
ApiService.listProjects()          // Lista projetos
ApiService.createProject(data)     // Cria projeto
ApiService.uploadPDF(projectId, file) // Upload PDF
```

#### DocumentService.ts
Manipulação do documento Word via Office.js:

```typescript
// Principais métodos
DocumentService.getDocumentContent()      // Obtém conteúdo
DocumentService.insertText(text)          // Insere texto
DocumentService.applyABNTFormatting()     // Aplica formatação ABNT
DocumentService.formatSelection(options)  // Formata seleção
DocumentService.goToParagraph(index)      // Navega para parágrafo
```

### Components

#### App.tsx
Componente raiz que gerencia:
- Estado da aplicação (análise, projeto selecionado, etc.)
- Tabs: ABNT (análise + formatação) e Chat (conversa + escrita)
- Integração entre componentes

#### ChatPanel.tsx
Chat com a IA:
- Histórico de mensagens
- Indicador de contexto de PDFs
- Detecção de texto gerado
- Botão "Inserir no Documento"

#### ProjectSelector.tsx
Gerenciamento de projetos:
- Criar/deletar projetos
- Upload/remoção de PDFs
- Exibe contagem de páginas e palavras
- Notifica mudanças ao componente pai

#### ComplianceScore.tsx
Exibe score de conformidade ABNT (0-100) com animação.

#### IssuesList.tsx
Lista problemas encontrados com:
- Severidade (error, warning, info)
- Navegação para localização
- Botão de correção automática

#### FormatControls.tsx
Controles de formatação:
- Formatação automática ABNT
- Estilos de título (H1, H2, H3)
- Citação em bloco
- Fonte, tamanho, alinhamento

---

## Fluxo de Dados

### Chat com Contexto de PDFs

```
1. Usuário seleciona projeto no ProjectSelector
   ↓
2. App.tsx atualiza selectedProjectId e selectedProjectInfo
   ↓
3. ChatPanel exibe indicador "📚 X PDFs como contexto"
   ↓
4. Usuário envia mensagem no chat
   ↓
5. handleChat() chama ApiService.chat({ message, context, project_id })
   ↓
6. Backend /api/addin/chat:
   - Carrega contexto dos PDFs via project_service
   - Monta prompt com documentos de referência
   - Chama Gemini AI
   - Retorna resposta + context_info
   ↓
7. ChatPanel exibe resposta e metadados do contexto usado
```

### Análise ABNT

```
1. Usuário clica "Analisar Documento"
   ↓
2. DocumentService.getDocumentContentWithMargins()
   - Extrai parágrafos, fontes, margens via Office.js
   ↓
3. ApiService.analyzeContent(content)
   ↓
4. Backend /api/addin/analyze-content:
   - Verifica fonte, tamanho, alinhamento, espaçamento
   - Verifica margens (3cm sup/esq, 2cm inf/dir)
   - Verifica estrutura (introdução, conclusão, referências)
   - Calcula score 0-100
   ↓
5. App.tsx exibe ComplianceScore e IssuesList
```

---

## Configuração

### Backend
```bash
cd backend
pip install -r requirements.txt

# Variáveis de ambiente (.env)
GOOGLE_API_KEY=your_gemini_api_key
```

### Frontend
```bash
cd office-addin
npm install
npm run dev-server
```

### Executar
```bash
# Terminal 1 - Backend
cd backend && python -m uvicorn main:app --reload --port 8000

# Terminal 2 - Frontend
cd office-addin && npm run dev-server
```

---

## Tecnologias

### Backend
- **Python 3.10+**
- **FastAPI** - Framework web
- **Pydantic** - Validação de dados
- **Google Generative AI** - Gemini API
- **PyMuPDF (fitz)** - Extração de PDF
- **SSE-Starlette** - Server-Sent Events

### Frontend
- **TypeScript**
- **React 18**
- **Office.js** - API do Microsoft Office
- **Webpack** - Build

---

## API Resumo

| Rota | Método | Descrição |
|------|--------|-----------|
| `/api/addin/health` | GET | Health check |
| `/api/addin/analyze-content` | POST | Análise ABNT |
| `/api/addin/format-content` | POST | Instruções de formatação |
| `/api/addin/chat` | POST | Chat com IA |
| `/api/addin/write` | POST | Geração de texto |
| `/api/addin/write-stream` | POST | Streaming de texto |
| `/api/addin/improve` | POST | Melhoria de texto |
| `/api/projects` | GET/POST | Listar/Criar projetos |
| `/api/projects/{id}` | GET/PUT/DELETE | CRUD projeto |
| `/api/projects/{id}/pdfs` | POST | Upload PDF |
| `/api/projects/{id}/pdfs/{pdf_id}` | DELETE | Remover PDF |
| `/api/projects/{id}/context` | GET | Contexto combinado |

---

## Versão

**Normaex 2.0.0**
- Office Add-in com React/TypeScript
- Backend FastAPI com Gemini AI
- Sistema de projetos com PDFs como contexto
- Chat colaborativo com documentos de referência
