---
trigger: model_decision
description: When I request deploy VOC frontend
---

# VOC (Sistema de Conciliaciones) Deployment Guide

This rule outlines the step-by-step process to deploy the VOC system components.

## 1. VOC Frontend Deployment

The VOC frontend is an Angular application located in `frontend/voc/`.

### Automated Deployment (Recommended)
- **CI/CD Pipeline:** Deployed automatically using GitHub Actions via `.github/workflows/azure-static-web-apps-blue-pebble-080603f0f.yml`.
- **Trigger:** Any push or merged Pull Request to the `main` branch that modifies files in the `frontend/voc/**` path.
- **Azure Resource:** Azure Static Web App (e.g., `wonderful-coast-0c074260f`).

### Manual / Local Build
If you need to build the frontend locally to verify it:
1. Navigate to the `frontend` directory:
   ```bash
   cd frontend
   ```
2. Build the VOC project:
   ```bash
   npm run build:voc
   ```
3. The build artifacts will be generated in `frontend/dist/voc/browser/`.

---

## 2. VOC Backend Deployment

The VOC backend is a Node.js/Express application located in `backend/`.

### Deployment via PowerShell Script
To deploy the backend directly to Azure App Service:
1. Open a PowerShell terminal in the project root directory.
2. Run the deployment script `deploy-to-azure.ps1` with the required parameters:
   ```powershell
   ./deploy-to-azure.ps1 -ResourceGroup "<ResourceGroup>" -AppName "<AppName>" -SubscriptionId "<SubscriptionId>"
   ```
   **Parameters:**
   - `-ResourceGroup`: The name of the Azure Resource Group.
   - `-AppName`: The Azure Web App name (e.g., `voc-backend`).
   - `-SubscriptionId`: Your Azure Subscription ID.
   - `-Location`: (Optional) Azure region (defaults to `"East US"`).
   - `-AppServicePlan`: (Optional) App Service Plan name.
   - `-Runtime`: (Optional) Node runtime (defaults to `"NODE:18-lts"`).

### Automated Pipeline (Disabled by Default)
- **GitHub Workflow:** There is a commented-out workflow `.github/workflows/main_voc-backend.yml` that can be configured to deploy the Express backend to Azure App Service upon push to `main`.