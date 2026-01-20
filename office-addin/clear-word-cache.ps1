# Limpar cache do Word para Office Add-ins

Write-Host "Fechando Word..." -ForegroundColor Yellow
Stop-Process -Name WINWORD -Force -ErrorAction SilentlyContinue

Write-Host "Limpando cache do Office..." -ForegroundColor Yellow

# Limpar cache do Office
$cachePaths = @(
    "$env:LOCALAPPDATA\Microsoft\Office\16.0\Wef",
    "$env:LOCALAPPDATA\Microsoft\Office\16.0\WEF\Developer",
    "$env:TEMP\Wef"
)

foreach ($path in $cachePaths) {
    if (Test-Path $path) {
        Remove-Item -Path $path -Recurse -Force -ErrorAction SilentlyContinue
        Write-Host "Removido: $path" -ForegroundColor Green
    }
}

Write-Host ""
Write-Host "Cache limpo com sucesso!" -ForegroundColor Green
Write-Host "Agora abra o Word e tente carregar o add-in novamente." -ForegroundColor Cyan
