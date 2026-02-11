$certPassword = "password"
$cert = New-SelfSignedCertificate -CertStoreLocation Cert:\LocalMachine\My -DnsName "localhost" -Signer $cert -FriendlyName "Normaex Localhost" -NotAfter (Get-Date).AddYears(1)
$pwd = ConvertTo-SecureString -String $certPassword -Force -AsPlainText
Export-PfxCertificate -Cert $cert -FilePath "backend/certs/cert.pfx" -Password $pwd
Export-Certificate -Cert $cert -FilePath "backend/certs/cert.pem" -Type CERT
