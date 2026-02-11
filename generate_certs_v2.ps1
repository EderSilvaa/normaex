# Create a self-signed root certificate
$rootCert = New-SelfSignedCertificate -CertStoreLocation Cert:\CurrentUser\My -DnsName "NormaexLocalhostRoot" -FriendlyName "Normaex Localhost Root" -KeyUsage CertSign

# Create a self-signed certificate for localhost signed by the root
$cert = New-SelfSignedCertificate -CertStoreLocation Cert:\CurrentUser\My -DnsName "localhost" -Signer $rootCert -FriendlyName "Normaex Localhost" -NotAfter (Get-Date).AddYears(1)

# Export the certificate and private key to PEM format (requires OpenSSL usually, but we can export to PFX and use Python to extract or just use PFX in uvicorn if supported, but uvicorn needs PEM)
# Since we don't have OpenSSL, we'll use a Python script to convert PFX to PEM later.
# For now, let's just export PFX.

$password = ConvertTo-SecureString -String "password" -Force -AsPlainText
Export-PfxCertificate -Cert $cert -FilePath "backend/certs/cert.pfx" -Password $password

Write-Host "Certificates generated. Root CA needs to be trusted manually if not using mkcert."
