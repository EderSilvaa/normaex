# Office Add-in - Guia de Desenvolvimento e Troubleshooting

## Setup Inicial (Primeira vez)

### 1. Instalar dependencias
```bash
cd office-addin
npm install
```

### 2. Gerar e instalar certificados SSL
```bash
npx office-addin-dev-certs install
```
Isso cria 3 arquivos em `~/.office-addin-dev-certs/`:
- `ca.crt` - Certificado da CA (instalado no Windows Trusted Root)
- `localhost.crt` - Certificado do servidor (SAN: localhost + 127.0.0.1)
- `localhost.key` - Chave privada

### 3. Habilitar loopback do Edge (REQUER ADMIN)
O Office usa Edge WebView2 para renderizar add-ins. Por padrao, apps UWP nao acessam localhost.

**Abrir PowerShell como Administrador:**
```powershell
CheckNetIsolation LoopbackExempt -a -n="Microsoft.Win32WebViewHost_cw5n1h2txyewy"
```

Verificar se foi aplicado:
```powershell
CheckNetIsolation LoopbackExempt -s
```

### 4. Registrar o manifest de desenvolvimento
```powershell
$registryPath = "HKCU:\Software\Microsoft\Office\16.0\WEF\Developer"
New-Item -Path $registryPath -Force | Out-Null
New-ItemProperty -Path $registryPath -Name "f9d10b7b-3b54-4e35-91a6-3cfb1cba7542" -Value "C:\Users\EDER\normaex\office-addin\manifest.dev.xml" -PropertyType String -Force
```

### 5. Iniciar dev server
```bash
cd office-addin
npm run dev-server
```
Servidor HTTPS em `https://localhost:3001`

### 6. Iniciar backend (outro terminal)
```bash
cd backend
python -m uvicorn main:app --reload --port 8000
```

### 7. Abrir Word e carregar o add-in
Inserir > Suplementos > Meus Suplementos > Normaex (DEV)

---

## Problemas Comuns e Solucoes

### "Erro do Suplemento - Ocorreu um problema e nao conseguimos iniciar este suplemento"

Esse erro generico tem varias causas possiveis. Verificar na ordem:

#### Causa 1: Dev server nao esta rodando
```bash
# Verificar se porta 3001 esta em uso
netstat -ano | findstr :3001

# Se nao estiver, iniciar:
cd office-addin && npm run dev-server
```

#### Causa 2: Loopback do Edge nao habilitado
```powershell
# Verificar (PowerShell Admin):
CheckNetIsolation LoopbackExempt -s

# Se vazio, habilitar:
CheckNetIsolation LoopbackExempt -a -n="Microsoft.Win32WebViewHost_cw5n1h2txyewy"
```
**IMPORTANTE:** Esse comando precisa de PowerShell como Administrador.

#### Causa 3: Certificado SSL expirado ou nao confiavel
Os certificados dev expiram em 30 dias. Verificar:
```bash
npx office-addin-dev-certs verify
```

Se expirado, reinstalar:
```bash
npx office-addin-dev-certs uninstall
npx office-addin-dev-certs install
```
Depois **reiniciar o dev server** (ele le os certs no startup).

#### Causa 4: Conflito de manifests no registry
Ambos `manifest.xml` (producao) e `manifest.dev.xml` (dev) usam o mesmo ID.
Se ambos estiverem registrados, o Office pode tentar carregar o de producao.

Verificar:
```powershell
Get-ItemProperty -Path "HKCU:\Software\Microsoft\Office\16.0\WEF\Developer" | Format-List
```

Deve ter APENAS uma entrada apontando para `manifest.dev.xml`:
```
f9d10b7b-3b54-4e35-91a6-3cfb1cba7542 : C:\Users\EDER\normaex\office-addin\manifest.dev.xml
```

Remover entrada de producao se existir:
```powershell
Remove-ItemProperty -Path "HKCU:\Software\Microsoft\Office\16.0\WEF\Developer" -Name "NormaexAddin"
```

#### Causa 5: Cache do Office corrompido
```powershell
# Fechar Word primeiro
Stop-Process -Name WINWORD -Force -ErrorAction SilentlyContinue

# Limpar caches
Remove-Item -Recurse -Force "$env:LOCALAPPDATA\Microsoft\Office\16.0\Wef" -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force "$env:TEMP\Wef" -ErrorAction SilentlyContinue
```
Depois abrir Word novamente.

---

### "A pagina https://localhost:3001/taskpane.html pode estar temporariamente indisponivel"

Essa mensagem aparece no WebView2 quando nao consegue conectar ao localhost. Causas:

1. **Dev server parou** - Verificar e reiniciar
2. **Loopback nao habilitado** - Ver Causa 2 acima
3. **Firewall bloqueando** - Windows Defender pode bloquear a porta 3001

### Backend offline (indicador vermelho no add-in)
O add-in abre mas o ponto de status fica vermelho.

```bash
# Verificar se backend esta rodando
netstat -ano | findstr :8000

# Se nao, iniciar:
cd backend && python -m uvicorn main:app --reload --port 8000
```
O add-in funciona sem backend (abre normalmente), mas as funcionalidades de IA nao funcionam.

---

## Peculiaridades do Ambiente Windows

### Certificados SSL
- Gerados por `office-addin-dev-certs` em `~/.office-addin-dev-certs/`
- CA instalada em `Cert:\CurrentUser\Root` (Windows Trusted Root Store)
- **Expiram em 30 dias** - precisam ser regenerados periodicamente
- O webpack.config.js le os certs no startup, entao reiniciar o dev server apos regenerar

### WebView2 (Edge)
- O Office no Windows 11 usa Edge WebView2 para renderizar o taskpane
- WebView2 obedece ao cert store do Windows (diferente do Chrome/Firefox)
- Loopback exemption e OBRIGATORIO para acessar localhost
- O pacote UWP e `Microsoft.Win32WebViewHost_cw5n1h2txyewy`

### Registry do Office
- Manifests de dev ficam em `HKCU:\Software\Microsoft\Office\16.0\WEF\Developer`
- Cada entrada e `nome = caminho_absoluto_do_manifest.xml`
- O ID do add-in (`f9d10b7b-3b54-4e35-91a6-3cfb1cba7542`) deve ser unico
- Ter dois manifests com o mesmo ID causa conflito (Office pode carregar o errado)

### Portas
| Servico | Porta | Protocolo |
|---------|-------|-----------|
| Office Add-in (dev) | 3001 | HTTPS |
| Backend API | 8000 | HTTP |
| Frontend Next.js | 3000 | HTTP |

---

## Checklist de Debug Rapido

Quando o add-in nao abre, verificar nesta ordem:

- [ ] Dev server rodando? (`netstat -ano | findstr :3001`)
- [ ] Certificados validos? (`npx office-addin-dev-certs verify`)
- [ ] Loopback habilitado? (`CheckNetIsolation LoopbackExempt -s` como Admin)
- [ ] Manifest correto no registry? (apenas `manifest.dev.xml`)
- [ ] Cache do Office limpo? (deletar `%LOCALAPPDATA%\Microsoft\Office\16.0\Wef`)
- [ ] Word reiniciado? (fechar e abrir novamente)

---

## Scripts Uteis

| Script | O que faz |
|--------|-----------|
| `office-addin/sideload.ps1` | Registra manifest no registry (USA manifest.xml de PRODUCAO) |
| `office-addin/clear-word-cache.ps1` | Fecha Word e limpa cache do Office |
| `office-addin/enable-edge-loopback.ps1` | Habilita loopback do Edge (requer Admin) |

**ATENCAO:** O `sideload.ps1` registra `manifest.xml` (producao, aponta para normaex.com.br).
Para dev local, registrar manualmente `manifest.dev.xml` conforme Passo 4 do Setup.

---

## Manifests

| Arquivo | Ambiente | URLs |
|---------|----------|------|
| `manifest.dev.xml` | Desenvolvimento | `https://localhost:3001/*` |
| `manifest.xml` | Producao | `https://normaex.com.br/*` |

Ambos compartilham o mesmo ID (`f9d10b7b-3b54-4e35-91a6-3cfb1cba7542`).
**Nunca registrar ambos ao mesmo tempo** no registry do Office.
