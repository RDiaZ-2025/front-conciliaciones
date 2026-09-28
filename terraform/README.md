# VOC Azure Infrastructure (Terraform)

Módulo completo de infraestructura como código (IaC) para el proyecto VOC en Microsoft Azure.

## Recursos desplegados

1. **Resource Group**: `voc-project` (o existente).
2. **App Service Plan & Web Apps**:
   - `voc-backend` (Producción, Windows Node.js 20, configurado con IISNode).
   - `voc-backend-test` (Test).
   - Configuración automática de variables de entorno (DB, Storage, Service Bus, JWT).
3. **Azure SQL Database & Server**:
   - SQL Server con TLS 1.2 y regla de firewall para servicios de Azure.
   - Base de datos `voc_db` lista para TypeORM.
4. **Azure Storage Account**:
   - Contenedores de Blobs: `public` y `private`.
   - File Share: `conciliaciones-share`.
5. **Azure Service Bus**:
   - Namespace + Cola `noc-news-schedules` + SAS Rule para backend.
6. **Azure Static Web Apps**:
   - `frontend` (Producción).
   - `voc-frontend-test` (Test).
7. **OIDC Managed Identity**:
   - Identidad administrada con credenciales federadas para ramas `main` y `test` en GitHub Actions (`RDiaZ-2025/front-conciliaciones`).
   - Rol `Website Contributor` asignado.
8. **Monitoreo**:
   - Log Analytics Workspace + Application Insights para Node.js.

---

## Ejecución Rápida

Ejecute en PowerShell:

```powershell
cd terraform
./deploy.ps1
```

Al terminar, el script imprime directamente los tokens y secretos listos para pegar en GitHub Repository Secrets.
