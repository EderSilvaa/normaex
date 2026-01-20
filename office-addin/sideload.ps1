# Normaex Add-in Sideload Script

$manifestPath = "$PSScriptRoot\manifest.xml"
$registryPath = "HKCU:\Software\Microsoft\Office\16.0\WEF\Developer"

Write-Host "Registrando Normaex Add-in..."

# Criar chave se nao existir
if (-not (Test-Path $registryPath)) {
    New-Item -Path $registryPath -Force | Out-Null
}

# Adicionar manifest
New-ItemProperty -Path $registryPath -Name "NormaexAddin" -Value $manifestPath -PropertyType String -Force | Out-Null

Write-Host "Add-in registrado com sucesso!"
Write-Host ""
Write-Host "Proximos passos:"
Write-Host "1. Feche o Word completamente"
Write-Host "2. Abra o Word novamente"
Write-Host "3. Inserir > Suplementos > Meus Suplementos"
Write-Host "4. Procure por Normaex AI"
