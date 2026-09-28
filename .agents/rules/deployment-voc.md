---
trigger: model_decision
description: When I request deploy VOC frontend
---

# VOC (Sistema de Conciliaciones) Deployment Guide

This rule outlines the deployment process for VOC frontend and backend components across Test and Production environments.

## Environments and Triggers

| Environment | Trigger Branch | GitHub Environment Name |
|---|---|---|
| **Production** | `main` | `main` |
| **Test** | `test`, or manual `workflow_dispatch` | `test` |

---

## 1. VOC Frontend Deployment

The VOC frontend is an Angular application in `frontend/voc/`.

### Automated Deployment (Recommended)
- **CI/CD Pipeline:** Deployed automatically using GitHub Actions via `.github/workflows/azure-static-web-apps-blue-pebble-080603f0f.yml`.
- **Trigger:** Any push or merged Pull Request to the `main` branch that modifies files in the `frontend/**` path.
- **Azure Resource:** Azure Static Web App (e.g., `wonderful-coast-0c074260f`).

### Manual / Local Build
1. Navigate to the `frontend` directory:
   ```bash
   cd frontend
   ```
2. Build VOC:
   ```bash
   npm run build:voc
   ```
3. Artifacts generated in `frontend/dist/voc/browser/`.

---

## 2. VOC Backend Deployment

The VOC backend is a Node.js/Express application in `backend/`.

### Automated Deployment (GitHub Actions)
- **Production (`main`):** [.github/workflows/deploy-backend-main.yml](file:///c:/source/Voc/.github/workflows/deploy-backend-main.yml)
  - **Trigger:** Push to `main` affecting `backend/**`, or manual dispatch.
  - **Target:** Azure Web App `voc-backend`.
  - **Secrets:** `AZUREAPPSERVICE_CLIENTID_...` / `AZUREAPPSERVICE_TENANTID_...` / `AZUREAPPSERVICE_SUBSCRIPTIONID_...`.
- **Test (`test`):** [.github/workflows/deploy-backend-test.yml](file:///c:/source/Voc/.github/workflows/deploy-backend-test.yml)
  - **Trigger:** Push to `test` affecting `backend/**`, or manual dispatch.
  - **Target:** Azure Web App `voc-backend-test` (configurable via variable `AZUREAPPSERVICE_APPNAME_TEST`).
  - **Secrets:** `AZUREAPPSERVICE_CLIENTID_TEST`, `AZUREAPPSERVICE_TENANTID_TEST`, `AZUREAPPSERVICE_SUBSCRIPTIONID_TEST`.

### Manual Deployment via PowerShell Script
To deploy backend directly from local terminal:
```powershell
./deploy-to-azure.ps1 -ResourceGroup "<ResourceGroup>" -AppName "<AppName>" -SubscriptionId "<SubscriptionId>"
```