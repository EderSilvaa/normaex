# Script para habilitar loopback do Edge WebView2 para Office Add-ins

Write-Host "Habilitando loopback do Microsoft Edge para Office Add-ins..." -ForegroundColor Cyan

# Comando para permitir loopback no Edge WebView2
CheckNetIsolation LoopbackExempt -a -n="Microsoft.Win32WebViewHost_cw5n1h2txyewy"

Write-Host ""
Write-Host "Loopback habilitado com sucesso!" -ForegroundColor Green
Write-Host ""
Write-Host "Agora tente carregar o add-in novamente no Word." -ForegroundColor Yellow
