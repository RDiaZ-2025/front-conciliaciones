# Manual Backend Deployment Script
# This script mimics the GitHub Actions workflow for local testing

Write-Host "🚀 Starting manual backend deployment..." -ForegroundColor Green

# Step 1: Install monorepo dependencies
Write-Host "📦 Installing monorepo dependencies..." -ForegroundColor Yellow
npm ci
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Failed to install dependencies" -ForegroundColor Red
    exit 1
}

# Step 2: Build backend
Write-Host "🔨 Building backend..." -ForegroundColor Yellow
Set-Location backend
npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Failed to build backend" -ForegroundColor Red
    Set-Location ..
    exit 1
}
Set-Location ..

# Step 3: Prepare deployment folder
Write-Host "📁 Preparing deployment folder..." -ForegroundColor Yellow
$deployFolder = "deploy-temp"
if (Test-Path $deployFolder) {
    Remove-Item $deployFolder -Recurse -Force
}
New-Item -ItemType Directory -Path $deployFolder

# Step 4: Copy necessary files
Write-Host "📋 Copying files for deployment..." -ForegroundColor Yellow
Copy-Item "backend/dist" "$deployFolder/dist" -Recurse
Copy-Item "package.json" "$deployFolder/"
Copy-Item "package-lock.json" "$deployFolder/"
Copy-Item "backend/.env" "$deployFolder/" -ErrorAction SilentlyContinue
Copy-Item "node_modules" "$deployFolder/node_modules" -Recurse

# Step 5: Test the deployment
Write-Host "🧪 Testing deployment..." -ForegroundColor Yellow
Set-Location $deployFolder
$env:NODE_ENV = "production"
Write-Host "Starting server with: node dist/server.js" -ForegroundColor Cyan
Write-Host "Press Ctrl+C to stop the server" -ForegroundColor Cyan
node dist/server.js
Set-Location ..

Write-Host "✅ Deployment test completed!" -ForegroundColor Green