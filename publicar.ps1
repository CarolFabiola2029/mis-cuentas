# Publica los cambios en GitHub Pages. Se ejecuta con doble clic en publicar.bat.
$ErrorActionPreference = 'Stop'
Set-Location $PSScriptRoot

function Git-Ok {
    git @args
    if ($LASTEXITCODE -ne 0) { throw "Fallo: git $args" }
}

if (-not (Test-Path '.git')) { Git-Ok init -b main }

if (-not (git config user.name)) {
    Git-Ok config user.name (Read-Host 'Tu nombre (para el historial de cambios)')
}
if (-not (git config user.email)) {
    Git-Ok config user.email (Read-Host 'El correo de tu cuenta de GitHub')
}

$remoto = git remote
if (-not $remoto) {
    $url = Read-Host 'Pega la direccion del repositorio (https://github.com/USUARIO/mis-cuentas.git)'
    Git-Ok remote add origin $url
}

# Una version nueva en sw.js es lo que hace que el iPhone descargue los cambios.
$version = 'v' + (Get-Date -Format 'yyyyMMdd-HHmmss')
$ruta = Join-Path $PSScriptRoot 'sw.js'
$texto = [IO.File]::ReadAllText($ruta)
$texto = $texto -replace "const VERSION = '[^']*';", "const VERSION = '$version';"
[IO.File]::WriteAllText($ruta, $texto, (New-Object Text.UTF8Encoding $false))

Git-Ok add -A
Git-Ok commit -m "Publicar version $version"
Git-Ok push -u origin main

Write-Host ''
Write-Host "Listo. Publicada la version $version." -ForegroundColor Green
Write-Host 'GitHub tarda 1 o 2 minutos en actualizar la pagina.'
Write-Host 'En el iPhone: abre la app, espera el aviso de version nueva y tocalo.'
