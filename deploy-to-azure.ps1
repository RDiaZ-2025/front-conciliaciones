param(
    [Parameter(Mandatory=$true)]
    [string]$ResourceGroup,
    
    [Parameter(Mandatory=$true)]
    [string]$AppName,
    
    [Parameter(Mandatory=$true)]
    [string]$SubscriptionId,
    
    [string]$Location = "East US",
    [string]$AppServicePlan = "$AppName-plan",
    [string]$Runtime = "NODE:18-lts"
)

function Write-Step {
    param([string]$Message)
    Write-Host "`n=== $Message ===" -ForegroundColor Cyan
}

function Write-Success {
    param([string]$Message)
    Write-Host "✓ $Message" -ForegroundColor Green
}

function Write-Error {
    param([string]$Message)
    Write-Host "✗ $Message" -ForegroundColor Red
}

function Write-Warning {
    param([string]$Message)
    Write-Host "⚠ $Message" -ForegroundColor Yellow
}

function Test-AzureCLI {
    try {
        $version = az version 2>$null
        if ($version) {
            Write-Success "Azure CLI is installed"
            return $true
        }
    }
    catch {
        Write-Error "Azure CLI is not installed. Please install it from https://docs.microsoft.com/en-us/cli/azure/install-azure-cli"
        return $false
    }
    return $false
}

function Test-AzureLogin {
    try {
        $account = az account show 2>$null | ConvertFrom-Json
        if ($account) {
            Write-Success "Already logged in to Azure as $($account.user.name)"
            return $true
        }
    }
    catch {
        Write-Warning "Not logged in to Azure"
        return $false
    }
    return $false
}

Write-Step "VOC Backend Azure Deployment Script"
Write-Host "This script will deploy your VOC backend to Azure App Service" -ForegroundColor Gray

if (-not (Test-AzureCLI)) {
    exit 1
}

if (-not (Test-AzureLogin)) {
    Write-Step "Logging in to Azure"
    try {
        az login
        Write-Success "Successfully logged in to Azure"
    }
    catch {
        Write-Error "Failed to login to Azure"
        exit 1
    }
}

Write-Step "Setting Azure subscription"
try {
    az account set --subscription $SubscriptionId
    Write-Success "Set subscription to $SubscriptionId"
}
catch {
    Write-Error "Failed to set subscription"
    exit 1
}

Write-Step "Checking Resource Group"
$rgExists = az group exists --name $ResourceGroup
if ($rgExists -eq "false") {
    Write-Host "Creating Resource Group: $ResourceGroup" -ForegroundColor Yellow
    try {
        az group create --name $ResourceGroup --location $Location
        Write-Success "Created Resource Group: $ResourceGroup"
    }
    catch {
        Write-Error "Failed to create Resource Group"
        exit 1
    }
} else {
    Write-Success "Resource Group exists: $ResourceGroup"
}

Write-Step "Checking App Service Plan"
$planExists = az appservice plan show --name $AppServicePlan --resource-group $ResourceGroup 2>$null
if (-not $planExists) {
    Write-Host "Creating App Service Plan: $AppServicePlan" -ForegroundColor Yellow
    try {
        az appservice plan create --name $AppServicePlan --resource-group $ResourceGroup --sku B1
        Write-Success "Created App Service Plan: $AppServicePlan"
    }
    catch {
        Write-Error "Failed to create App Service Plan"
        exit 1
    }
} else {
    Write-Success "App Service Plan exists: $AppServicePlan"
}

Write-Step "Checking Web App"
$appExists = az webapp show --name $AppName --resource-group $ResourceGroup 2>$null
if (-not $appExists) {
    Write-Host "Creating Web App: $AppName" -ForegroundColor Yellow
    try {
        az webapp create --name $AppName --resource-group $ResourceGroup --plan $AppServicePlan --runtime $Runtime
        Write-Success "Created Web App: $AppName"
    }
    catch {
        Write-Error "Failed to create Web App"
        exit 1
    }
} else {
    Write-Success "Web App exists: $AppName"
}

Write-Step "Installing dependencies"
#Set-Location "backend"
try {
    npm ci
    Write-Success "Dependencies installed"
}
catch {
    Write-Error "Failed to install dependencies"
    exit 1
}

Write-Step "Building application"
try {
    npm run build
    Write-Success "Application built successfully"
}
catch {
    Write-Error "Failed to build application"
    exit 1
}

Write-Step "Preparing deployment package"
#Set-Location ".."
$deployDir = "deploy-package"
if (Test-Path $deployDir) {
    Remove-Item $deployDir -Recurse -Force
}
New-Item -ItemType Directory -Path $deployDir

Copy-Item "backend/dist" "$deployDir/dist" -Recurse
Copy-Item "backend/package.json" "$deployDir/"
Copy-Item "backend/package-lock.json" "$deployDir/"
Copy-Item "backend/web.config" "$deployDir/"
Copy-Item "backend/.env" "$deployDir/" -ErrorAction SilentlyContinue

# Set-Location $deployDir
# npm ci
# Set-Location ".."
Write-Step "Creating deployment archive"
$archivePath = "voc-backend-deployment.zip"
if (Test-Path $archivePath) {
    Remove-Item $archivePath -Force
}

Compress-Archive -Path "$deployDir/*" -DestinationPath $archivePath -Force
Write-Success "Created deployment archive: $archivePath"

Write-Step "Configuring App Service settings"
try {
    az webapp config appsettings set --resource-group $ResourceGroup --name $AppName --settings NODE_ENV=production
    Write-Success "Configured app settings"
}
catch {
    Write-Warning "Could not configure app settings"
}

Write-Step "Deploying to Azure"
try {
    az webapp deploy --resource-group $ResourceGroup --name $AppName --src-path $archivePath
    Write-Success "Deployment completed"
}
catch {
    Write-Error "Deployment failed"
    exit 1
}

Write-Step "Verifying deployment"
try {
    $appUrl = "https://$AppName.azurewebsites.net"
    Write-Host "Testing application at: $appUrl" -ForegroundColor Gray
    
    Start-Sleep -Seconds 30
    
    try {
        $response = Invoke-WebRequest -Uri "$appUrl/health" -TimeoutSec 30 -ErrorAction SilentlyContinue
        if ($response.StatusCode -eq 200) {
            Write-Success "Application is responding"
        } else {
            Write-Warning "Application may not be fully ready yet"
        }
    }
    catch {
        Write-Warning "Could not verify application health"
    }
    
    Write-Host "`nDeployment logs can be viewed with:" -ForegroundColor Yellow
    Write-Host "az webapp log tail --resource-group $ResourceGroup --name $AppName" -ForegroundColor Gray
}
catch {
    Write-Warning "Could not verify deployment"
}

Write-Step "Cleanup"
try {
    Remove-Item "voc-backend-deployment.zip" -Force -ErrorAction SilentlyContinue
    Remove-Item "deploy-package" -Recurse -Force -ErrorAction SilentlyContinue
    Write-Success "Temporary files cleaned up"
}
catch {
    Write-Warning "Could not clean up temporary files"
}

Write-Host "`n🎉 Deployment completed successfully!" -ForegroundColor Green
Write-Host "Your application is available at: https://$AppName.azurewebsites.net" -ForegroundColor Cyan
Write-Host "`nNext steps:" -ForegroundColor Yellow
Write-Host "1. Configure your database connection strings in Azure App Service settings" -ForegroundColor Gray
Write-Host "2. Set up any required environment variables" -ForegroundColor Gray
Write-Host "3. Configure CORS settings if needed" -ForegroundColor Gray
Write-Host "4. Set up custom domain (optional)" -ForegroundColor Gray