# Azure App Service Backend Optimizations

This document highlights critical architectural and operational improvements identified in the `d:\source\Red+\VOC\backend\` project for deployment in Microsoft Azure App Service. 

## 1. Application Insights & Monitoring
- **Issue:** The application heavily relies on `console.log` and `console.error` for logging.
- **Optimization:** Integrate `applicationinsights` (Azure Application Insights Node.js SDK). This provides auto-collection of HTTP requests, dependencies (like TypeORM/MSSQL queries), unhandled exceptions, and performance metrics without changing the codebase manually. Replace standard console logs with a structured logger like `pino` or `winston` piped to Application Insights.

## 2. Environment Variables & Startup Validation
- **Issue:** Variables like `JWT_SECRET` fall back to insecure defaults (e.g., `'fallback-secret-key-for-development'`) if not found.
- **Optimization:** Use an environment validation library like `zod` or `joi` during startup (`src/server.ts`). If critical variables are missing from Azure App Settings, the application should fail fast (`process.exit(1)`) rather than running in a compromised state.

## 3. Database Connection Pooling
- **Issue:** TypeORM is configured with `pool: { max: 10, min: 0 }`. In a production environment with high concurrency, 10 connections may be exhausted quickly.
- **Optimization:** Increase the connection pool size (e.g., `max: 50`) depending on the Azure SQL Database pricing tier (DTU/vCore limits). Ensure queries are optimized and connections are released promptly.

## 4. Payload Size Limits & Security
- **Issue:** In `src/app.ts`, `express.json({ limit: '256mb' })` is used globally. This is extremely large and makes the Azure App Service vulnerable to Memory Exhaustion or Denial of Service (DoS) attacks.
- **Optimization:** Reduce the global JSON body limit to a reasonable size (e.g., `1mb` or `10mb`). If specific endpoints (like file uploads) require larger payloads, configure the limit specifically on those routes.

## 5. Rate Limiting in a Scaled Environment
- **Issue:** `express-rate-limit` is commented out, possibly because the default in-memory store doesn't work well when scaling out to multiple App Service instances.
- **Optimization:** Re-enable rate limiting to protect the API, but configure it to use a distributed store like Azure Cache for Redis (`rate-limit-redis`). This ensures rate limits are respected across all running instances.

## 6. Centralized Error Handling
- **Issue:** Every controller uses `try/catch` blocks that repeat error logging and response formatting.
- **Optimization:** Implement a global Express error-handling middleware. Controllers can then simply use `next(error)`, allowing the middleware to format the response consistently, log to Application Insights, and prevent leaking internal errors or stack traces to the client.

## 7. Dependency Injection vs Static Classes
- **Issue:** Services and Controllers are using static methods (e.g., `AuthService.login`).
- **Optimization:** Refactor to use dependency injection (e.g., `tsyringe` or just passing instances). This makes the code much easier to unit test, mock dependencies, and manage lifecycles, which is an industry standard for scalable Node.js backends.

## 8. Health Check Endpoint
- **Optimization:** The existing `/health` endpoint is good. In Azure App Service, ensure the "Health Check" feature is configured in the portal to point to `/health`. This allows Azure to automatically route traffic away from unhealthy instances or restart them if they become unresponsive.
