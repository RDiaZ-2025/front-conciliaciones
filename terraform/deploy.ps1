# PowerShell Deployment Script for VOC Test Infrastructure via Terraform
param(
    [switch]$AutoApprove = $false,
    [switch]$Destroy = $false
)

$ErrorActionPreference = "Stop"

Write-Host "=== VOC Azure Testing Infrastructure Deployment ===" -ForegroundColor Cyan

# 1. Verificar Terraform CLI
if (-not (Get-Command terraform -ErrorAction SilentlyContinue)) {
    Write-Host "[!] Terraform no está en PATH. Instalando vía winget..." -ForegroundColor Yellow
    winget install Hashicorp.Terraform --accept-package-agreements --accept-source-agreements
    $env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
}

# 2. Verificar Azure CLI Login
$account = az account show --output json 2>$null | ConvertFrom-Json
if (-not $account) {
    Write-Host "[!] Inicie sesión en Azure CLI..." -ForegroundColor Yellow
    az login
    $account = az account show --output json | ConvertFrom-Json
}
Write-Host "[OK] Azure Login: $($account.name) (Subscription: $($account.id))" -ForegroundColor Green

# 3. Ubicarse en carpeta terraform
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $scriptDir

# 4. Terraform Init
Write-Host "`n[1/3] Inicializando Terraform..." -ForegroundColor Cyan
terraform init

if ($Destroy) {
    Write-Host "`n[!] Destruyendo infraestructura de TEST..." -ForegroundColor Red
    terraform destroy -auto-approve
    exit 0
}

# 5. Terraform Plan & Apply
Write-Host "`n[2/3] Planificando infraestructura de TEST..." -ForegroundColor Cyan
terraform plan -out=tfplan

Write-Host "`n[3/3] Desplegando en Azure..." -ForegroundColor Cyan
if ($AutoApprove) {
    terraform apply -auto-approve tfplan
} else {
    terraform apply tfplan
}

# 6. Mostrar secretos de GitHub listos para copiar
Write-Host "`n=== DESPLIEGUE DE TEST COMPLETADO ===" -ForegroundColor Green
Write-Host "`n--- SECRETOS PARA GITHUB ACTIONS (TEST) ---" -ForegroundColor Yellow

$tokenTest = terraform output -raw azure_static_web_apps_api_token_test 2>$null
$clientId  = terraform output -raw azureappservice_clientid_test 2>$null
$tenantId  = terraform output -raw azureappservice_tenantid_test 2>$null
$subId     = terraform output -raw azureappservice_subscriptionid_test 2>$null
$appName   = terraform output -raw azureappservice_appname_test 2>$null
$frontUrl  = terraform output -raw frontend_test_url 2>$null
$backUrl   = terraform output -raw backend_test_url 2>$null

Write-Host "Frontend Test URL : $frontUrl" -ForegroundColor Cyan
Write-Host "Backend Test URL  : $backUrl" -ForegroundColor Cyan
Write-Host ""
Write-Host "AZURE_STATIC_WEB_APPS_API_TOKEN_TEST : $tokenTest" -ForegroundColor White
Write-Host "AZUREAPPSERVICE_CLIENTID_TEST        : $clientId" -ForegroundColor White
Write-Host "AZUREAPPSERVICE_TENANTID_TEST        : $tenantId" -ForegroundColor White
Write-Host "AZUREAPPSERVICE_SUBSCRIPTIONID_TEST  : $subId" -ForegroundColor White
Write-Host "AZUREAPPSERVICE_APPNAME_TEST         : $appName" -ForegroundColor White
