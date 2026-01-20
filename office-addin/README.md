# Normaex Office Add-in

Office Add-in para Microsoft Word com IA integrada.

## 🚀 Setup

### 1. Instalar Dependências
```bash
npm install
```

### 2. Gerar Certificado SSL (Desenvolvimento)
```bash
npx office-addin-dev-certs install
```

### 3. Build do Projeto
```bash
npm run build:dev
```

### 4. Iniciar Dev Server
```bash
npm run dev-server
```

## 📦 Sideload no Word

### Windows

1. Abra o Word Desktop
2. Vá em **Arquivo** > **Opções** > **Central de Confiabilidade** > **Configurações da Central de Confiabilidade**
3. Selecione **Catálogos de Suplementos Confiáveis**
4. Em **URL do Catálogo**, adicione: `https://localhost:3001`
5. Marque **Mostrar no Menu**
6. Clique em **OK** e reinicie o Word
7. No Word, vá em **Inserir** > **Suplementos** > **Meus Suplementos**
8. Clique em **Upload Meu Suplemento** e selecione o arquivo `manifest.xml`

### Ou use o comando automático:
```bash
npm start
```

## 🛠️ Comandos Disponíveis

- `npm run build` - Build de produção
- `npm run build:dev` - Build de desenvolvimento
- `npm run dev-server` - Inicia servidor de desenvolvimento
- `npm start` - Sideload automático no Word
- `npm stop` - Para o debugging
- `npm run validate` - Valida o manifest.xml

## 📁 Estrutura

```
office-addin/
├── src/
│   ├── taskpane/
│   │   ├── components/
│   │   │   └── App.tsx
│   │   ├── styles/
│   │   │   └── taskpane.css
│   │   ├── index.html
│   │   └── taskpane.tsx
│   ├── services/
│   ├── types/
│   └── utils/
├── assets/
├── manifest.xml
├── package.json
├── tsconfig.json
└── webpack.config.js
```

## 🔧 Desenvolvimento

O add-in usa:
- **React** para UI
- **TypeScript** para type safety
- **Office.js** para interagir com Word
- **Webpack** para bundling

## 📝 Próximos Passos (FASE 2)

- [ ] Integração com backend FastAPI
- [ ] Implementar ApiService
- [ ] Implementar DocumentService (Office.js wrapper)
- [ ] WebSocket para validação em tempo real
- [ ] SSE para streaming de conteúdo IA
