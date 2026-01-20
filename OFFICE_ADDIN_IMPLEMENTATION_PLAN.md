# 📋 NORMAEX 2.0 - PLANO DE IMPLEMENTAÇÃO DO OFFICE ADD-IN

**Data:** 2026-01-15
**Versão:** 1.0
**Status:** Planejamento

---

## 🎯 OBJETIVO

Transformar o Normaex em um Office Add-in (Word) que integra com o backend FastAPI existente, permitindo:
- Edição inteligente com IA em tempo real
- Validação automática de normas ABNT/Jurídicas
- Aplicação de templates com identidade visual
- Streaming de conteúdo gerado por IA

---

## 📊 ANÁLISE DO BACKEND ATUAL

### ✅ Endpoints Existentes (20 total)

| Endpoint | Método | Fase | Pode Reutilizar? | Notas |
|----------|--------|------|------------------|-------|
| `/upload` | POST | 1 | ❌ | Requer arquivo físico, Add-in envia conteúdo |
| `/smart-format` | POST | 1-3 | ✅ | **Core!** Formatação inteligente completa |
| `/intelligent-write-stream` | POST | 5 | ✅ | **Core!** Escrita com streaming |
| `/chat` | POST | - | ✅ | Chat com contexto do documento |
| `/write-stream` | POST | 5 | ✅ | Geração de texto acadêmico |
| `/improve-text` | POST | - | ✅ | Melhoria de parágrafos |
| `/validate/{filename}` | GET | 4 | ⚠️ | Precisa adaptar para receber conteúdo |
| `/analyze-structure/{filename}` | GET | 2 | ⚠️ | Precisa adaptar |
| `/structure/{filename}` | GET | 1 | ⚠️ | Precisa adaptar |
| `/html/{filename}` | GET | - | ❌ | Não útil para Add-in |
| `/download/{filename}` | GET | - | ❌ | Não útil para Add-in |
| `/preview/{filename}` | GET | - | ❌ | Não útil para Add-in |
| `/apply` | POST | 3 | ⚠️ | Precisa adaptar |
| `/edit-paragraph` | POST | - | ✅ | Útil para edições específicas |
| `/identify-elements` | POST | - | ✅ | Identificação de elementos |
| `/edit-element` | POST | - | ✅ | Edição de elementos |
| `/smart-edit` | POST | - | ✅ | Edição inteligente |
| `/write` | POST | 5 | ✅ | Geração de texto |
| `/complete-vision/{filename}` | GET | 1 | ⚠️ | Precisa adaptar |
| `/intelligent-write` | POST | 5 | ✅ | Escrita inteligente |

### 🔧 Serviços Backend Disponíveis

```python
# backend/services/
├── abnt.py              # Formatação ABNT
├── ai.py                # Integração Gemini
├── ai_structural.py     # Análise estrutural (Fase 2)
├── ai_writer.py         # Escrita inteligente (Fase 5)
├── document_vision.py   # Extração de estrutura (Fase 1)
├── executor.py          # Aplicação de formatação (Fase 3)
└── validator.py         # Validação de qualidade (Fase 4)
```

**✅ Conclusão:** Backend está 80% pronto! Precisa apenas de:
1. Novos endpoints que recebem conteúdo JSON (não arquivo)
2. WebSocket para validação em tempo real
3. API de Templates

---

## 🏗️ ARQUITETURA PROPOSTA

```
┌─────────────────────────────────────────────────────────┐
│  Microsoft Word Desktop                                  │
│  ┌───────────────────────────────────────┐              │
│  │  Normaex Add-in                       │              │
│  │  ┌─────────────────────────────────┐  │              │
│  │  │  Task Pane (React)              │  │              │
│  │  │  • Sidebar principal            │  │              │
│  │  │  • Chat com IA                  │  │              │
│  │  │  • Controles de formatação      │  │              │
│  │  │  • Score de conformidade        │  │              │
│  │  └─────────────────────────────────┘  │              │
│  │                                        │              │
│  │  ┌─────────────────────────────────┐  │              │
│  │  │  Content Scripts (Office.js)    │  │              │
│  │  │  • Manipulação do documento     │  │              │
│  │  │  • Inserção de conteúdo IA      │  │              │
│  │  │  • Aplicação de estilos         │  │              │
│  │  │  • Leitura de seleções          │  │              │
│  │  └─────────────────────────────────┘  │              │
│  └───────────────────────────────────────┘              │
└──────────────────────┬──────────────────────────────────┘
                       │
                       │ HTTPS / WebSocket
                       │
                       ▼
┌─────────────────────────────────────────────────────────┐
│  Backend FastAPI (Porta 8080)                           │
│  ┌──────────────────────────────────────────┐           │
│  │  NOVOS Endpoints para Add-in             │           │
│  │  • POST /addin/analyze-content           │           │
│  │  • POST /addin/format-content            │           │
│  │  • POST /addin/write-stream              │           │
│  │  • WS   /addin/validate-realtime         │           │
│  │  • GET  /addin/templates                 │           │
│  │  • POST /addin/apply-template            │           │
│  └──────────────────────────────────────────┘           │
│                                                          │
│  ┌──────────────────────────────────────────┐           │
│  │  Endpoints Existentes (Reutilizar)       │           │
│  │  • /intelligent-write-stream             │           │
│  │  • /smart-format                         │           │
│  │  • /chat                                 │           │
│  │  • /improve-text                         │           │
│  └──────────────────────────────────────────┘           │
│                                                          │
│  ┌──────────────────────────────────────────┐           │
│  │  Serviços (5 Fases)                      │           │
│  │  • document_vision.py                    │           │
│  │  • ai_structural.py                      │           │
│  │  • executor.py                           │           │
│  │  • validator.py                          │           │
│  │  • ai_writer.py                          │           │
│  └──────────────────────────────────────────┘           │
└─────────────────────────────────────────────────────────┘
                       │
                       ▼
              Google Gemini API
```

---

## 📁 ESTRUTURA DE PASTAS PROPOSTA

```
normaex/
├── backend/                    # ✅ Já existe
│   ├── main.py
│   ├── routers/
│   │   ├── document.py         # ✅ Existente
│   │   ├── addin.py            # 🆕 CRIAR - Endpoints específicos para Add-in
│   │   └── templates.py        # 🆕 CRIAR - Gestão de templates
│   ├── services/               # ✅ Já existem
│   │   ├── abnt.py
│   │   ├── ai.py
│   │   ├── ai_structural.py
│   │   ├── ai_writer.py
│   │   ├── document_vision.py
│   │   ├── executor.py
│   │   ├── validator.py
│   │   └── template_service.py # 🆕 CRIAR - Lógica de templates
│   ├── models/                 # 🆕 CRIAR
│   │   ├── addin_models.py     # 🆕 Pydantic models para Add-in
│   │   └── template_models.py  # 🆕 Models de templates
│   ├── websockets/             # 🆕 CRIAR
│   │   └── realtime_validator.py # 🆕 WebSocket para validação
│   └── requirements.txt        # ⚠️ ATUALIZAR
│
├── office-addin/               # 🆕 CRIAR TODO - Office Add-in completo
│   ├── manifest.xml            # 🆕 Manifest do Add-in
│   ├── package.json            # 🆕 Dependências Node
│   ├── webpack.config.js       # 🆕 Build config
│   ├── tsconfig.json           # 🆕 TypeScript config
│   │
│   ├── src/
│   │   ├── taskpane/           # 🆕 UI do painel lateral
│   │   │   ├── index.html
│   │   │   ├── taskpane.ts
│   │   │   ├── taskpane.css
│   │   │   │
│   │   │   ├── components/     # 🆕 Componentes React
│   │   │   │   ├── App.tsx
│   │   │   │   ├── ChatPanel.tsx
│   │   │   │   ├── TemplateSelector.tsx
│   │   │   │   ├── ComplianceScore.tsx
│   │   │   │   ├── FormatControls.tsx
│   │   │   │   └── WritingAssistant.tsx
│   │   │   │
│   │   │   └── styles/         # 🆕 Estilos
│   │   │       └── components.css
│   │   │
│   │   ├── services/           # 🆕 Lógica de negócio
│   │   │   ├── ApiService.ts          # Comunicação com backend
│   │   │   ├── DocumentService.ts     # Manipulação do Word via Office.js
│   │   │   ├── StreamingService.ts    # SSE streaming
│   │   │   ├── WebSocketService.ts    # WebSocket para validação
│   │   │   ├── TemplateService.ts     # Gestão de templates
│   │   │   └── FormatService.ts       # Aplicação de formatação
│   │   │
│   │   ├── types/              # 🆕 TypeScript types
│   │   │   ├── office.d.ts
│   │   │   ├── api.types.ts
│   │   │   └── template.types.ts
│   │   │
│   │   └── utils/              # 🆕 Utilidades
│   │       ├── logger.ts
│   │       └── helpers.ts
│   │
│   └── assets/                 # 🆕 Assets
│       ├── icon-16.png
│       ├── icon-32.png
│       ├── icon-64.png
│       └── logo.png
│
├── frontend/                   # ✅ Já existe (App web atual)
│   └── ...                     # Manter como está
│
└── templates/                  # 🆕 CRIAR - Templates de documentos
    ├── abnt/
    │   ├── tcc_completo.json
    │   ├── artigo.json
    │   └── monografia.json
    ├── juridico/
    │   ├── peticao_inicial.json
    │   ├── contestacao.json
    │   └── recurso.json
    └── profissional/
        ├── relatorio.json
        └── proposta.json
```

---

## 🆕 NOVOS COMPONENTES A CRIAR

### 1. Backend - Novos Endpoints

#### **A) `/backend/routers/addin.py`** (Novo)
```python
@router.post("/addin/analyze-content")
@router.post("/addin/format-content")
@router.post("/addin/write-stream")
@router.get("/addin/templates")
@router.post("/addin/apply-template")
```

#### **B) `/backend/routers/templates.py`** (Novo)
```python
@router.get("/templates")
@router.get("/templates/{template_id}")
@router.post("/templates")
@router.put("/templates/{template_id}")
@router.delete("/templates/{template_id}")
```

#### **C) `/backend/websockets/realtime_validator.py`** (Novo)
```python
@app.websocket("/ws/validate")
async def websocket_validate(websocket: WebSocket)
```

### 2. Office Add-in - Componentes Principais

#### **React Components (TSX)**
1. `App.tsx` - Container principal
2. `ChatPanel.tsx` - Chat com IA
3. `TemplateSelector.tsx` - Seleção de templates
4. `ComplianceScore.tsx` - Score visual de conformidade
5. `FormatControls.tsx` - Botões de formatação
6. `WritingAssistant.tsx` - Assistente de escrita

#### **Services (TypeScript)**
1. `ApiService.ts` - Cliente HTTP para backend
2. `DocumentService.ts` - Wrapper do Office.js
3. `StreamingService.ts` - Cliente SSE
4. `WebSocketService.ts` - Cliente WebSocket
5. `TemplateService.ts` - Lógica de templates
6. `FormatService.ts` - Formatação Word

---

## 🔄 ENDPOINTS QUE PRECISAM ADAPTAÇÃO

### Problema Atual
Muitos endpoints existentes esperam `filename` de arquivo no filesystem:
```python
@router.post("/smart-format")
async def smart_format(request: ApplyRequest):
    file_location = f"{UPLOAD_DIR}/{request.filename}"  # ❌ Precisa de arquivo
```

### Solução
Criar versões que aceitam **conteúdo JSON diretamente**:

#### **Antes (Atual)**
```python
# Recebe filename, lê arquivo do disco
file_path = f"{UPLOAD_DIR}/{filename}"
doc = Document(file_path)
```

#### **Depois (Adaptado para Add-in)**
```python
# Recebe conteúdo serializado
class DocumentContent(BaseModel):
    paragraphs: List[ParagraphData]
    sections: List[SectionData]
    metadata: dict

@router.post("/addin/analyze-content")
async def analyze_content(content: DocumentContent):
    # Processa diretamente sem salvar arquivo
    analysis = analyze_document_structure(content.dict())
    return analysis
```

---

## 📋 MODELOS DE DADOS

### 1. Add-in Request/Response Models

```python
# backend/models/addin_models.py

class ParagraphData(BaseModel):
    text: str
    style: str
    font_name: str
    font_size: float
    alignment: str
    line_spacing: float
    first_line_indent: float

class DocumentContent(BaseModel):
    paragraphs: List[ParagraphData]
    metadata: dict
    format_type: str  # 'abnt', 'juridico', 'profissional'

class AnalysisResponse(BaseModel):
    score: int  # 0-100
    issues: List[Issue]
    suggestions: List[str]
    compliance_details: dict

class WriteRequest(BaseModel):
    instruction: str
    section_type: str
    context: str
    format_type: str
    template_id: Optional[str]

class StreamChunk(BaseModel):
    text: str
    formatting: Optional[FormatConfig]
    position: int
```

### 2. Template Models

```python
# backend/models/template_models.py

class TemplateSection(BaseModel):
    id: str
    name: str
    required: bool
    ai_prompt: str
    style: dict

class Template(BaseModel):
    id: str
    name: str
    type: str  # 'abnt_tcc', 'juridico_peticao', etc.
    branding: dict
    sections: List[TemplateSection]
    rules: dict
    fields: List[dict]
    ai_config: dict
```

---

## 🎯 ORDEM DE IMPLEMENTAÇÃO

### **FASE 1: Setup Básico** (2-3 dias)
- [ ] 1.1 Criar estrutura do Office Add-in (`office-addin/`)
- [ ] 1.2 Setup manifest.xml
- [ ] 1.3 Configurar webpack + TypeScript
- [ ] 1.4 Criar Task Pane básico (HTML + CSS)
- [ ] 1.5 "Hello World" funcionando no Word

**Entrega:** Add-in vazio que abre no Word

---

### **FASE 2: Backend - Endpoints para Add-in** (3-4 dias)

#### 2.1 Criar Models
- [ ] `backend/models/addin_models.py`
- [ ] `backend/models/template_models.py`

#### 2.2 Criar Router de Add-in
- [ ] `backend/routers/addin.py`
- [ ] Endpoint: `POST /addin/analyze-content`
- [ ] Endpoint: `POST /addin/format-content`
- [ ] Endpoint: `POST /addin/write-stream`

#### 2.3 Adaptar Serviços
- [ ] Modificar `ai_structural.py` para aceitar JSON
- [ ] Modificar `executor.py` para gerar instruções (não aplicar)
- [ ] Modificar `validator.py` para validar conteúdo JSON

#### 2.4 WebSocket
- [ ] `backend/websockets/realtime_validator.py`
- [ ] Endpoint: `WS /ws/validate`

#### 2.5 Templates
- [ ] `backend/routers/templates.py`
- [ ] `backend/services/template_service.py`
- [ ] Criar templates JSON de exemplo

**Entrega:** Backend com 5+ novos endpoints funcionando

---

### **FASE 3: Office Add-in - Services** (4-5 dias)

#### 3.1 API Service
- [ ] `ApiService.ts` - Cliente HTTP
- [ ] Integrar com endpoints do backend
- [ ] Tratamento de erros

#### 3.2 Document Service
- [ ] `DocumentService.ts` - Wrapper Office.js
- [ ] Ler conteúdo do documento
- [ ] Inserir texto no cursor
- [ ] Aplicar formatação
- [ ] Manipular estilos

#### 3.3 Streaming Service
- [ ] `StreamingService.ts` - Cliente SSE
- [ ] Conectar com `/addin/write-stream`
- [ ] Buffer de chunks
- [ ] Inserção gradual no Word

#### 3.4 WebSocket Service
- [ ] `WebSocketService.ts`
- [ ] Conectar com `/ws/validate`
- [ ] Envio de conteúdo em tempo real
- [ ] Recebimento de validações

**Entrega:** Serviços funcionando, integração Word ↔ Backend

---

### **FASE 4: Office Add-in - UI Components** (5-6 dias)

#### 4.1 Components Básicos
- [ ] `App.tsx` - Container
- [ ] `ComplianceScore.tsx` - Score visual
- [ ] `FormatControls.tsx` - Botões de formatação

#### 4.2 Writing Assistant
- [ ] `WritingAssistant.tsx`
- [ ] Interface para instrução
- [ ] Seleção de seção
- [ ] Botão "Gerar"
- [ ] Exibição de streaming

#### 4.3 Chat Panel
- [ ] `ChatPanel.tsx`
- [ ] Lista de mensagens
- [ ] Input de chat
- [ ] Integração com `/chat`

#### 4.4 Template Selector
- [ ] `TemplateSelector.tsx`
- [ ] Lista de templates
- [ ] Preview de template
- [ ] Aplicação de template

**Entrega:** UI completa e funcional

---

### **FASE 5: Integração e Testes** (3-4 dias)

#### 5.1 Fluxo Completo
- [ ] Upload → Análise → Exibição de score
- [ ] Instrução → Streaming → Inserção no Word
- [ ] Edição → Validação em tempo real
- [ ] Template → Aplicação → Formatação

#### 5.2 Tratamento de Erros
- [ ] Retry logic
- [ ] Mensagens de erro user-friendly
- [ ] Fallbacks

#### 5.3 Performance
- [ ] Debounce para validação em tempo real
- [ ] Cache de templates
- [ ] Otimização de requisições

#### 5.4 Testes
- [ ] Testes unitários (TypeScript)
- [ ] Testes de integração (Backend)
- [ ] Testes manuais (Word Desktop)

**Entrega:** Add-in funcional completo

---

### **FASE 6: Templates e Polimento** (2-3 dias)

#### 6.1 Templates
- [ ] 3 templates ABNT (TCC, Artigo, Monografia)
- [ ] 3 templates Jurídicos (Petição, Contestação, Recurso)
- [ ] 2 templates Profissionais (Relatório, Proposta)

#### 6.2 Branding
- [ ] Sistema de logos
- [ ] Headers/Footers
- [ ] Timbres

#### 6.3 Documentação
- [ ] README do Add-in
- [ ] Guia de instalação
- [ ] Manual do usuário

**Entrega:** Produto completo pronto para uso

---

## 📊 ESTIMATIVA TOTAL

| Fase | Duração | Complexidade |
|------|---------|--------------|
| 1. Setup Básico | 2-3 dias | Baixa |
| 2. Backend Endpoints | 3-4 dias | Média |
| 3. Add-in Services | 4-5 dias | Alta |
| 4. Add-in UI | 5-6 dias | Alta |
| 5. Integração/Testes | 3-4 dias | Média |
| 6. Templates/Polimento | 2-3 dias | Baixa |
| **TOTAL** | **19-25 dias** | - |

**Estimativa realista:** 3-4 semanas de trabalho focado

---

## 🔧 DEPENDÊNCIAS E BLOQUEADORES

### Dependências Externas
- [x] Backend FastAPI já implementado
- [x] Serviços (5 fases) já implementados
- [x] Gemini API configurada
- [ ] Office.js SDK (instalar)
- [ ] React para Task Pane (instalar)
- [ ] WebSocket support no FastAPI (adicionar)

### Possíveis Bloqueadores
1. **Office.js API Limits**: Algumas operações podem ser lentas
2. **CORS**: Precisa configurar corretamente para Add-in
3. **Sideloading**: Processo de testar Add-in pode ser trabalhoso
4. **Streaming SSE**: Pode ter limitações no Office.js

### Mitigações
- Usar polling como fallback para WebSocket
- Cache agressivo de operações repetidas
- Documentação detalhada do processo de sideload

---

## 🎯 CRITÉRIOS DE SUCESSO

### Funcionalidades Mínimas (MVP)
- [ ] Add-in abre no Word
- [ ] Análise de conformidade ABNT funciona
- [ ] Score é exibido
- [ ] Geração de texto com IA funciona
- [ ] Texto é inserido no Word corretamente
- [ ] Formatação ABNT é aplicada

### Funcionalidades Completas (V1.0)
- [ ] Validação em tempo real
- [ ] Chat com documento
- [ ] Templates funcionando
- [ ] Branding (logos/timbres)
- [ ] 8+ templates disponíveis
- [ ] Performance aceitável (<3s para análise)

---

## 🚀 PRÓXIMOS PASSOS IMEDIATOS

1. **Aprovar este plano** com o usuário
2. **Criar branch**: `feature/office-addin`
3. **Iniciar FASE 1**: Setup básico do Add-in
4. **Setup ambiente de desenvolvimento**:
   - Instalar Yeoman Office Generator
   - Configurar certificado SSL para desenvolvimento
   - Setup VS Code para debugging

---

## 📚 RECURSOS E REFERÊNCIAS

### Documentação Oficial
- [Office Add-ins Documentation](https://learn.microsoft.com/en-us/office/dev/add-ins/)
- [Word JavaScript API](https://learn.microsoft.com/en-us/javascript/api/word)
- [Office.js API Reference](https://learn.microsoft.com/en-us/javascript/api/office)

### Ferramentas
- [Yeoman Office Generator](https://github.com/OfficeDev/generator-office)
- [Office-Addin-Debugging](https://learn.microsoft.com/en-us/office/dev/add-ins/testing/debug-add-ins-overview)

---

**Fim do Plano de Implementação**
