# Relatório de Prontidão - Normaex

**Data**: 28 de Janeiro de 2026
**Versão**: 2.0.0
**Status**: 🟡 Pronto para Beta Fechado

---

## Resumo

O **Normaex** é um assistente de IA para formatação ABNT e escrita acadêmica (Office Add-in + Backend FastAPI).

| Área | Status | Nota |
|------|--------|------|
| Funcionalidades | ✅ Completo | Core features funcionando |
| Arquitetura | ✅ Sólida | Bem organizada |
| Segurança | ⚠️ Pendente | CORS e rate limit |
| Deploy | ⚠️ Pendente | Falta Docker e domínio |
| Testes | ❌ Ausente | Nenhum teste automatizado |

---

## Stack

**Frontend**: React 18 + TypeScript + Office.js
**Backend**: FastAPI + Google Gemini 2.5-flash
**Persistência**: JSON (adequado para MVP)

---

## O Que Funciona

- ✅ Análise de conformidade ABNT (score 0-100)
- ✅ Formatação automática (fonte, espaçamento, margens)
- ✅ Chat com IA contextualizado
- ✅ Geração de texto acadêmico (streaming SSE)
- ✅ Sistema de projetos com PDFs de referência
- ✅ Suporte a múltiplas normas (ABNT, APA, Vancouver, IEEE)
- ✅ Geração de gráficos (matplotlib)

---

## Pendências para Lançamento

### 🔴 Bloqueadores (Fazer Antes de Lançar)

#### 1. Segurança

**CORS aberto** - `backend/main.py`
```python
# Atual: allow_origins=["*"]
# Corrigir para:
allow_origins=["https://localhost:3001", "https://normaex.com.br"]
```

**Rate limiting** - Adicionar para evitar abuso da API Gemini
```bash
pip install slowapi
```

**Limite de upload** - Máximo 10MB por arquivo PDF

#### 2. Deploy

- [ ] Criar `backend/Dockerfile`
- [ ] Criar `office-addin/Dockerfile`
- [ ] Criar `docker-compose.yml`
- [ ] Registrar domínio
- [ ] Configurar SSL (Let's Encrypt)
- [ ] Deploy em servidor (DigitalOcean/AWS)

#### 3. Configuração

- [ ] Validar `GEMINI_API_KEY` no startup (falhar rápido se ausente)
- [ ] Configurar variável `ALLOWED_ORIGINS` para produção
- [ ] Atualizar URLs no `manifest.xml`

---

### 🟡 Importantes (Fazer Logo Após Lançar)

- [ ] Testes nos fluxos críticos (analyze, format, chat)
- [ ] Sentry para error tracking
- [ ] Logging estruturado (substituir console.log)
- [ ] Documentação da API (Swagger já existe em /docs)

---

### 🟢 Podem Esperar

- Migração JSON → PostgreSQL (só quando necessário)
- Cache Redis
- Autenticação de usuários
- CI/CD automatizado
- Monitoramento avançado

---

## Arquitetura

```
┌─────────────────────────────────────────┐
│           Microsoft Word                │
│         (Office.js Runtime)             │
└───────────────┬─────────────────────────┘
                │ HTTPS
                ▼
┌─────────────────────────────────────────┐
│      Office Add-in (React + TS)         │
│  App.tsx │ ChatPanel │ ResearchPanel    │
│  ApiService │ DocumentService           │
└───────────────┬─────────────────────────┘
                │ REST + SSE
                ▼
┌─────────────────────────────────────────┐
│        Backend (FastAPI)                │
│  /addin │ /projects │ /research         │
│  AI Service (Gemini) │ Chart Service    │
└───────────────┬─────────────────────────┘
                │
        ┌───────┴───────┐
        ▼               ▼
┌──────────────┐ ┌──────────────┐
│ Google Gemini│ │  File System │
│   2.5-flash  │ │  (JSON/PDFs) │
└──────────────┘ └──────────────┘
```

---

## Estrutura de Arquivos

```
normaex/
├── backend/
│   ├── main.py              # Entry point, CORS
│   ├── routers/
│   │   ├── addin.py         # Endpoints principais
│   │   ├── projects.py      # CRUD projetos
│   │   └── research.py      # Pesquisa acadêmica
│   ├── services/
│   │   ├── ai.py            # Integração Gemini
│   │   └── chart_service.py # Geração de gráficos
│   └── data/
│       └── projects.json    # Persistência
│
└── office-addin/
    ├── src/
    │   ├── taskpane/components/
    │   │   ├── App.tsx
    │   │   ├── ChatPanel.tsx
    │   │   └── ResearchPanel.tsx
    │   ├── services/
    │   │   ├── ApiService.ts
    │   │   └── DocumentService.ts
    │   └── config/
    │       └── norms.config.ts
    ├── manifest.xml         # Produção
    └── manifest.dev.xml     # Desenvolvimento
```

---

## Custos Estimados (Mensal)

| Item | Custo |
|------|-------|
| Servidor (DigitalOcean 2GB) | $12 |
| Domínio (.com.br) | ~$3 |
| SSL (Let's Encrypt) | $0 |
| Gemini API (free tier) | $0-20 |
| **Total MVP** | **~$15-35** |

---

## Plano de Ação

### Fase 1: Beta Fechado (3-5 dias)

1. **Dia 1-2**: Correções de segurança
   - Restringir CORS
   - Adicionar rate limiting
   - Validar API key no startup

2. **Dia 3-4**: Setup de deploy
   - Criar Dockerfiles
   - Configurar docker-compose
   - Deploy em servidor

3. **Dia 5**: Testes e lançamento
   - Testar fluxos principais
   - Liberar para beta testers (10-20 pessoas)

### Fase 2: Pós-Beta (2-4 semanas)

- Coletar feedback
- Corrigir bugs encontrados
- Adicionar testes automatizados
- Configurar Sentry

### Fase 3: Produção Estável (quando necessário)

- Migrar para PostgreSQL se JSON não escalar
- Adicionar autenticação se precisar de multi-usuário
- Cache se tiver problemas de performance

---

## Próximo Passo

Executar as correções de segurança e criar setup Docker.

---

*Última atualização: 28/01/2026*
