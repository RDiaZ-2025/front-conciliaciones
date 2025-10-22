# Manual Backend Deployment to Azure App Service

This guide provides step-by-step instructions for manually deploying your VOC backend to Azure App Service.

## Prerequisites

1. **Azure CLI** installed on your machine
2. **Node.js 20+** and **npm** installed
3. **Azure subscription** with appropriate permissions
4. **Git** installed (for deployment method 2)

## Method 1: ZIP Deployment (Recommended for Testing)

### Step 1: Prepare Your Local Environment

```bash
# Navigate to your project root
cd d:/source/Red+/VOC

# Install all dependencies
npm ci

# Build the backend
cd backend
npm run build
cd ..
```

### Step 2: Create Deployment Package

```bash
# Create a temporary deployment folder
mkdir deploy-package
cd deploy-package

# Copy necessary files
cp -r ../backend/dist ./
cp ../package.json ./
cp ../package-lock.json ./
cp ../backend/.env ./ 2>/dev/null || echo "No .env file found"

# Copy node_modules (production dependencies)
cp -r ../node_modules ./

# Create a simple package.json for Azure
cat > package.json << 'EOF'
{
  "name": "voc-backend",
  "version": "1.0.0",
  "main": "dist/server.js",
  "scripts": {
    "start": "node dist/server.js"
  },
  "engines": {
    "node": ">=20.0.0",
    "npm": ">=10.0.0"
  }
}
EOF
```

### Step 3: Create ZIP File

```bash
# Create deployment ZIP
zip -r voc-backend-deployment.zip .
```

### Step 4: Deploy to Azure App Service

```bash
# Login to Azure
az login

# Set your subscription (if you have multiple)
az account set --subscription "your-subscription-id"

# Deploy the ZIP file
az webapp deployment source config-zip \
  --resource-group "your-resource-group" \
  --name "voc-backend" \
  --src voc-backend-deployment.zip
```

## Method 2: Git Deployment

### Step 1: Prepare Git Repository

```bash
# Create a deployment branch
git checkout -b azure-deployment

# Create deployment-specific files
cat > .deployment << 'EOF'
[config]
SCM_DO_BUILD_DURING_DEPLOYMENT=true
WEBSITE_NODE_DEFAULT_VERSION=20.x
EOF

cat > deploy.cmd << 'EOF'
@if "%SCM_TRACE_LEVEL%" NEQ "4" @echo off

:: ----------------------
:: KUDU Deployment Script
:: Version: 1.0.17
:: ----------------------

:: Prerequisites
:: -------------

:: Verify node.js installed
where node 2>nul >nul
IF %ERRORLEVEL% NEQ 0 (
  echo Missing node.js executable, please install node.js, if already installed make sure it can be reached from current environment.
  goto error
)

:: Setup
:: -----

setlocal enabledelayedexpansion

SET ARTIFACTS=%~dp0%..\artifacts

IF NOT DEFINED DEPLOYMENT_SOURCE (
  SET DEPLOYMENT_SOURCE=%~dp0%.
)

IF NOT DEFINED DEPLOYMENT_TARGET (
  SET DEPLOYMENT_TARGET=%ARTIFACTS%\wwwroot
)

IF NOT DEFINED NEXT_MANIFEST_PATH (
  SET NEXT_MANIFEST_PATH=%ARTIFACTS%\manifest

  IF NOT DEFINED PREVIOUS_MANIFEST_PATH (
    SET PREVIOUS_MANIFEST_PATH=%ARTIFACTS%\manifest
  )
)

IF NOT DEFINED KUDU_SYNC_CMD (
  :: Install kudu sync
  echo Installing Kudu Sync
  call npm install kudusync -g --silent
  IF !ERRORLEVEL! NEQ 0 goto error

  :: Locally just running "kuduSync" would also work
  SET KUDU_SYNC_CMD=%appdata%\npm\kuduSync.cmd
)

::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::
:: Deployment
:: ----------

echo Handling node.js deployment.

:: 1. KuduSync
IF /I "%IN_PLACE_DEPLOYMENT%" NEQ "1" (
  call :ExecuteCmd "%KUDU_SYNC_CMD%" -v 50 -f "%DEPLOYMENT_SOURCE%" -t "%DEPLOYMENT_TARGET%" -n "%NEXT_MANIFEST_PATH%" -p "%PREVIOUS_MANIFEST_PATH%" -i ".git;.hg;.deployment;deploy.cmd"
  IF !ERRORLEVEL! NEQ 0 goto error
)

:: 2. Select node version
call :SelectNodeVersion

:: 3. Install npm packages
IF EXIST "%DEPLOYMENT_TARGET%\package.json" (
  pushd "%DEPLOYMENT_TARGET%"
  call :ExecuteCmd !NPM_CMD! ci --only=production
  IF !ERRORLEVEL! NEQ 0 goto error
  popd
)

:: 4. Build backend
IF EXIST "%DEPLOYMENT_TARGET%\backend\package.json" (
  pushd "%DEPLOYMENT_TARGET%\backend"
  call :ExecuteCmd !NPM_CMD! run build
  IF !ERRORLEVEL! NEQ 0 goto error
  popd
)

::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::
goto end

:: Execute command routine that will echo out when error
:ExecuteCmd
setlocal
set _CMD_=%*
call %_CMD_%
if "%ERRORLEVEL%" NEQ "0" echo Failed exitCode=%ERRORLEVEL%, command=%_CMD_%
exit /b %ERRORLEVEL%

:error
endlocal
echo An error has occurred during web site deployment.
call :exitSetErrorLevel
call :exitFromFunction 2>nul

:exitSetErrorLevel
exit /b 1

:exitFromFunction
()

:end
endlocal
echo Finished successfully.
EOF
```

### Step 2: Configure Azure App Service for Git Deployment

```bash
# Enable local git deployment
az webapp deployment source config-local-git \
  --resource-group "your-resource-group" \
  --name "voc-backend"

# Get deployment credentials
az webapp deployment list-publishing-credentials \
  --resource-group "your-resource-group" \
  --name "voc-backend"
```

### Step 3: Deploy via Git

```bash
# Add Azure remote
git remote add azure https://your-deployment-username@voc-backend.scm.azurewebsites.net/voc-backend.git

# Push to Azure
git add .
git commit -m "Deploy backend to Azure"
git push azure azure-deployment:master
```

## Method 3: Azure CLI with Source Code

### Step 1: Prepare Source Code

```bash
# Ensure you're in the project root
cd d:/source/Red+/VOC

# Install dependencies and build
npm ci
cd backend && npm run build && cd ..
```

### Step 2: Deploy Source Code

```bash
# Deploy from source
az webapp up \
  --resource-group "your-resource-group" \
  --name "voc-backend" \
  --runtime "NODE:20-lts" \
  --src-path .
```

## Configuration Steps (Required for All Methods)

### Step 1: Configure Application Settings

```bash
# Set Node.js version
az webapp config appsettings set \
  --resource-group "your-resource-group" \
  --name "voc-backend" \
  --settings WEBSITE_NODE_DEFAULT_VERSION="20.x"

# Set startup command
az webapp config set \
  --resource-group "your-resource-group" \
  --name "voc-backend" \
  --startup-file "node dist/server.js"

# Set environment variables
az webapp config appsettings set \
  --resource-group "your-resource-group" \
  --name "voc-backend" \
  --settings \
    NODE_ENV="production" \
    DB_SERVER="your-db-server" \
    DB_DATABASE="your-database" \
    DB_USER="your-db-user" \
    DB_PASSWORD="your-db-password" \
    JWT_SECRET="your-jwt-secret"
```

### Step 2: Configure CORS (if needed)

```bash
az webapp cors add \
  --resource-group "your-resource-group" \
  --name "voc-backend" \
  --allowed-origins "https://your-frontend-domain.com"
```

### Step 3: Enable Logging

```bash
az webapp log config \
  --resource-group "your-resource-group" \
  --name "voc-backend" \
  --application-logging filesystem \
  --level information
```

## Verification Steps

### Step 1: Check Deployment Status

```bash
# Check deployment status
az webapp deployment list \
  --resource-group "your-resource-group" \
  --name "voc-backend"

# View logs
az webapp log tail \
  --resource-group "your-resource-group" \
  --name "voc-backend"
```

### Step 2: Test the Application

```bash
# Test health endpoint
curl https://voc-backend.azurewebsites.net/health

# Test API endpoint
curl https://voc-backend.azurewebsites.net/api/auth/health
```

## Troubleshooting

### Common Issues and Solutions

1. **Application won't start**
   - Check startup command: `node dist/server.js`
   - Verify Node.js version: 20.x
   - Check application logs

2. **Database connection issues**
   - Verify connection string in app settings
   - Check firewall rules for Azure SQL
   - Ensure database exists

3. **Missing dependencies**
   - Ensure `package.json` is in the root
   - Check if `npm ci` ran successfully
   - Verify `node_modules` is included

4. **Build failures**
   - Check TypeScript compilation
   - Verify all source files are included
   - Check for missing type definitions

### Useful Commands

```bash
# Restart the app
az webapp restart --resource-group "your-resource-group" --name "voc-backend"

# View real-time logs
az webapp log tail --resource-group "your-resource-group" --name "voc-backend"

# SSH into the container (for debugging)
az webapp ssh --resource-group "your-resource-group" --name "voc-backend"

# Download logs
az webapp log download --resource-group "your-resource-group" --name "voc-backend"
```

## Quick Deployment Script

For convenience, here's a PowerShell script that automates Method 1:

```powershell
# Set your Azure details
$resourceGroup = "your-resource-group"
$appName = "voc-backend"

# Build and package
Write-Host "Building application..." -ForegroundColor Green
npm ci
Set-Location backend
npm run build
Set-Location ..

# Create deployment package
Write-Host "Creating deployment package..." -ForegroundColor Green
if (Test-Path "deploy-package") { Remove-Item "deploy-package" -Recurse -Force }
New-Item -ItemType Directory -Path "deploy-package"
Copy-Item "backend/dist" "deploy-package/" -Recurse
Copy-Item "package.json" "deploy-package/"
Copy-Item "package-lock.json" "deploy-package/"
Copy-Item "node_modules" "deploy-package/" -Recurse

# Create ZIP
Set-Location deploy-package
Compress-Archive -Path * -DestinationPath "../voc-backend-deployment.zip" -Force
Set-Location ..

# Deploy to Azure
Write-Host "Deploying to Azure..." -ForegroundColor Green
az webapp deployment source config-zip --resource-group $resourceGroup --name $appName --src "voc-backend-deployment.zip"

Write-Host "Deployment completed!" -ForegroundColor Green
Write-Host "Check your app at: https://$appName.azurewebsites.net" -ForegroundColor Cyan
```

Save this as `quick-deploy.ps1` and run it after setting your Azure details.