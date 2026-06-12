---
trigger: model_decision
description: When I request deploy NOC frontend
---

# NOC (Network Operations Center) Deployment Guide

This rule outlines the step-by-step process to deploy the NOC system components.

## 1. NOC Frontend Deployment

The NOC frontend is an Angular application located in `frontend/noc/`.

### Automated Deployment (Recommended)
- **CI/CD Pipeline:** Deployed automatically using GitHub Actions via `.github/workflows/azure-static-web-apps-noc.yml`.
- **Trigger:** Any push or merged Pull Request to the `main` branch that modifies files in the `frontend/noc/**` path.
- **Azure Resource:** Azure Static Web App.

### Manual / Local Build
If you need to build the frontend locally to verify it:
1. Navigate to the `frontend` directory:
   ```bash
   cd frontend
   ```
2. Build the NOC project:
   ```bash
   npm run build:noc
   ```
3. The build artifacts will be generated in `frontend/dist/noc/browser/`.

---

## 2. NOC Backend Deployment

The NOC backend routes and logic are fully integrated into the main Node.js/Express backend (in `backend/src/routes/noc.routes.ts` and associated controllers).
- **Deployment Process:** Deploying the NOC backend is identical to deploying the VOC backend.
- **Reference:** Follow the steps in `deployment-voc.md` to deploy the backend to Azure App Service.
- **Verify Integration:** Once deployed, the NOC API routes are available at `https://<backend-app-name>.azurewebsites.net/api/dashboard/...`, `/api/ingresos/...`, etc.

---

## 3. NOC ETL/Functions Deployment

The Python ETL scripts in the `NOC/functions/` directory process background data and ingestions.

- **Infrastructure:** These run as serverless Azure Functions with Timer Triggers or as CRON jobs on a Linux server.
- **Manual Execution (for verification):**
  1. Navigate to `NOC/backend` or `NOC/functions`.
  2. Activate the virtual environment.
  3. Set up environment variables in `backend/.env`.
  4. Run the ETL script directly using python (e.g., `python dashboard_etl.py`).