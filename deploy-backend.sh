#!/bin/bash
# Manual Backend Deployment Script
# This script mimics the GitHub Actions workflow for local testing

echo "🚀 Starting manual backend deployment..."

# Step 1: Install monorepo dependencies
echo "📦 Installing monorepo dependencies..."
npm ci
if [ $? -ne 0 ]; then
    echo "❌ Failed to install dependencies"
    exit 1
fi

# Step 2: Build backend
echo "🔨 Building backend..."
cd backend
npm run build
if [ $? -ne 0 ]; then
    echo "❌ Failed to build backend"
    cd ..
    exit 1
fi
cd ..

# Step 3: Prepare deployment folder
echo "📁 Preparing deployment folder..."
DEPLOY_FOLDER="deploy-temp"
if [ -d "$DEPLOY_FOLDER" ]; then
    rm -rf "$DEPLOY_FOLDER"
fi
mkdir -p "$DEPLOY_FOLDER"

# Step 4: Copy necessary files
echo "📋 Copying files for deployment..."
cp -r backend/dist "$DEPLOY_FOLDER/"
cp package.json "$DEPLOY_FOLDER/"
cp package-lock.json "$DEPLOY_FOLDER/"
cp backend/.env "$DEPLOY_FOLDER/" 2>/dev/null || echo "No .env file found"
cp -r node_modules "$DEPLOY_FOLDER/"

# Step 5: Test the deployment
echo "🧪 Testing deployment..."
cd "$DEPLOY_FOLDER"
export NODE_ENV=production
echo "Starting server with: node dist/server.js"
echo "Press Ctrl+C to stop the server"
node dist/server.js
cd ..

echo "✅ Deployment test completed!"