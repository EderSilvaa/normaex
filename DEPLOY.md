# Normaex - Guia de Deploy e Publicação

## Visão Geral da Arquitetura de Produção

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         USUÁRIO FINAL                                    │
│                                                                          │
│  1. Acessa normaex.com.br (landing page)                                │
│  2. Clica "Instalar no Word"                                            │
│  3. É direcionado ao AppSource da Microsoft                             │
│  4. Clica "Adicionar" - instalação automática                           │
│  5. Abre Word → botão "Normaex" aparece na aba Início                   │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                    INFRAESTRUTURA                                        │
│                                                                          │
│  ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐      │
│  │  Landing Page   │    │   Office Add-in │    │   Backend API   │      │
│  │  (Next.js)      │    │   (React)       │    │   (FastAPI)     │      │
│  │                 │    │                 │    │                 │      │
│  │  Vercel/Netlify │    │  Vercel/Netlify │    │  Railway/Render │      │
│  │  normaex.com.br │    │  app.normaex... │    │  api.normaex... │      │
│  └─────────────────┘    └─────────────────┘    └─────────────────┘      │
│                                                          │               │
│                                                          ▼               │
│                                              ┌─────────────────┐         │
│                                              │   Gemini API    │         │
│                                              │   (Google)      │         │
│                                              └─────────────────┘         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Passo 1: Preparar o Domínio

### Opção A: Domínio .com.br (Recomendado para Brasil)
1. Comprar domínio em: registro.br (~R$40/ano)
2. Sugestões: `normaex.com.br`, `normaex.app`, `usenormaex.com`

### Opção B: Domínio internacional
1. Comprar em: Namecheap, GoDaddy, Cloudflare (~$10/ano)

### Configuração DNS (depois de escolher hosting):
```
Tipo    Nome              Valor
A       @                 IP do servidor (ou CNAME para Vercel)
CNAME   www              normaex.com.br
CNAME   app              cname.vercel-dns.com (ou similar)
CNAME   api              seu-app.railway.app (ou similar)
```

---

## Passo 2: Deploy do Backend (API)

### Opção A: Railway (Recomendado - simples)

1. Criar conta: https://railway.app
2. Conectar repositório GitHub
3. Criar novo projeto → Deploy from GitHub
4. Selecionar pasta `backend`
5. Configurar variáveis de ambiente:

```env
GOOGLE_API_KEY=sua_chave_gemini
PORT=8000
ENVIRONMENT=production
```

6. Railway gera URL automática: `seu-projeto.up.railway.app`
7. Configurar domínio customizado: `api.normaex.com.br`

**Custo:** ~$5-20/mês dependendo do uso

### Opção B: Render

1. Criar conta: https://render.com
2. New → Web Service → Connect GitHub
3. Configurar:
   - Build Command: `pip install -r requirements.txt`
   - Start Command: `uvicorn main:app --host 0.0.0.0 --port $PORT`

### Opção C: DigitalOcean App Platform

1. Criar conta: https://digitalocean.com
2. Create → App → GitHub
3. Detecta Python automaticamente

---

## Passo 3: Deploy do Frontend (Office Add-in)

### Build de Produção

```bash
cd office-addin

# Instalar dependências
npm install

# Build de produção
npm run build
```

Isso gera a pasta `dist/` com os arquivos estáticos.

### Deploy no Vercel (Recomendado)

1. Criar conta: https://vercel.com
2. Import Project → GitHub
3. Configurar:
   - Framework Preset: Other
   - Root Directory: `office-addin`
   - Build Command: `npm run build`
   - Output Directory: `dist`

4. Vercel gera URL: `seu-projeto.vercel.app`
5. Configurar domínio: `app.normaex.com.br`

**Custo:** Grátis para projetos pequenos

### Alternativa: Netlify

1. https://netlify.com
2. Arrastar pasta `dist/` ou conectar GitHub
3. Mesmo processo

---

## Passo 4: Atualizar URLs no Código

### 4.1 ApiService.ts - URL dinâmica

Editar `office-addin/src/services/ApiService.ts`:

```typescript
// Detectar ambiente automaticamente
const API_BASE_URL = window.location.hostname === 'localhost'
  ? 'http://localhost:8000'
  : 'https://api.normaex.com.br';
```

### 4.2 manifest.xml - URLs de Produção

Já atualizado! Verificar se as URLs estão corretas:
- `https://normaex.com.br/taskpane.html`
- `https://normaex.com.br/assets/icon-*.png`
- `https://api.normaex.com.br`

---

## Passo 5: Criar Assets Necessários

### Ícones (obrigatórios)

Criar na pasta `office-addin/src/assets/`:
- `icon-16.png` (16x16 pixels)
- `icon-32.png` (32x32 pixels)
- `icon-64.png` (64x64 pixels)
- `icon-80.png` (80x80 pixels)
- `icon-128.png` (128x128 pixels)

**Dica:** Use Figma ou Canva para criar o ícone base, depois redimensione.

### Screenshots para AppSource

Necessários para publicar na loja:
- 1280x720 ou 1366x768 pixels
- Mínimo 1, máximo 5 screenshots
- Mostrar o add-in funcionando dentro do Word

---

## Passo 6: Publicar no Microsoft AppSource

### 6.1 Criar conta de desenvolvedor

1. Acesse: https://partner.microsoft.com/dashboard
2. Criar conta Microsoft Partner (gratuito)
3. Verificar identidade (pode levar 1-2 dias)

### 6.2 Preparar submissão

**Informações necessárias:**

| Campo | Valor |
|-------|-------|
| Nome | Normaex - Formatação ABNT com IA |
| Descrição curta | Assistente de IA para formatação ABNT e escrita acadêmica |
| Descrição longa | (ver manifest.xml) |
| Categoria | Productivity |
| Palavras-chave | ABNT, TCC, formatação, acadêmico, universidade, monografia |
| Idiomas | Português (Brasil) |
| Preço | Gratuito (ou configurar planos) |

**Documentos necessários:**

1. **Política de Privacidade** - URL pública (ex: normaex.com.br/privacidade)
2. **Termos de Uso** - URL pública (ex: normaex.com.br/termos)
3. **URL de Suporte** - Para usuários pedirem ajuda

### 6.3 Processo de submissão

1. Partner Center → Office Add-ins → New
2. Upload do `manifest.xml`
3. Preencher informações da loja
4. Upload de screenshots
5. Submeter para revisão

**Tempo de aprovação:** 1-4 semanas

### 6.4 Checklist de validação

A Microsoft verifica:
- [ ] Manifest válido (sem erros XML)
- [ ] Todas URLs funcionando (HTTPS obrigatório)
- [ ] Ícones carregando corretamente
- [ ] Add-in funcionando no Word
- [ ] Política de privacidade válida
- [ ] Sem conteúdo impróprio

---

## Passo 7: Landing Page

### Usar a landing page existente (frontend/)

1. A pasta `frontend/` contém uma landing page Next.js pronta
2. Deploy no Vercel:

```bash
cd frontend
npm install
npm run build
```

3. Atualizar links para apontar ao AppSource:

```jsx
// Trocar /tool por link do AppSource
<Link href="https://appsource.microsoft.com/product/office/WA123456789">
  Instalar no Word
</Link>
```

### Ou criar landing simples

Se preferir algo mais simples, posso criar uma landing page estática.

---

## Resumo: Ordem de Execução

```
1. [ ] Comprar domínio (registro.br ou similar)
2. [ ] Deploy backend no Railway/Render
3. [ ] Deploy add-in no Vercel
4. [ ] Configurar DNS do domínio
5. [ ] Criar ícones (16, 32, 64, 80, 128 px)
6. [ ] Criar páginas: /privacidade, /termos, /suporte
7. [ ] Testar tudo funcionando
8. [ ] Criar conta Microsoft Partner
9. [ ] Submeter ao AppSource
10. [ ] Aguardar aprovação
11. [ ] Deploy landing page
12. [ ] Divulgar! 🚀
```

---

## Custos Estimados (Mensal)

| Item | Custo |
|------|-------|
| Domínio .com.br | ~R$3/mês (R$40/ano) |
| Backend (Railway) | $5-20/mês |
| Frontend (Vercel) | Grátis |
| Gemini API | Grátis até limite, depois ~$0.001/request |
| **Total inicial** | **~R$30-100/mês** |

---

## Comandos Úteis

```bash
# Desenvolvimento local
cd backend && python -m uvicorn main:app --reload --port 8000
cd office-addin && npm run dev-server

# Build produção
cd office-addin && npm run build

# Testar manifest
npx office-addin-manifest validate manifest.xml
```

---

## Suporte

- Documentação Office Add-ins: https://docs.microsoft.com/office/dev/add-ins
- Partner Center: https://partner.microsoft.com/dashboard
- Validador de Manifest: https://aka.ms/manifest-validator
