# Backend Code Audit & Optimization Plan

This document outlines the necessary improvements, cleanups, and architectural changes required to bring the backend project up to standard, based on the established `.trae/rules` guidelines.

## 1. Architecture & Patterns

- [x] **Implement Centralized Error Handling**: Remove repetitive `try/catch` blocks from all controllers. Create a global error-handling middleware (`src/middleware/errorHandler.ts`) to intercept `next(error)` and format consistent HTTP responses.
- [x] **Refactor Static Classes to Dependency Injection**: Services like `AuthService`, `UserService`, `WorkflowService`, and controllers like `ProductionController`, `UserController` are heavily relying on `static` methods. Introduce a DI container (like `tsyringe` or `InversifyJS`) or simply pass class instances to improve unit testability and decoupling.
- [x] **Thin Controllers**: Review controllers (e.g., `productionController.ts`, `campaign.controller.ts`). Ensure they only handle HTTP concerns (extracting `req.body`, returning `res.status`) and move all core business logic and database interactions to the `services/` layer.
- [x] **Environment Variable Validation**: Introduce `Zod` or `Joi` in `src/server.ts` or `src/config/` to parse and validate all required environment variables at startup. Fail fast (`process.exit(1)`) if critical secrets (like `JWT_SECRET` or DB credentials) are missing.

## 2. Security & Performance

- [ ] **Reduce Payload Limits**: In `src/app.ts`, change `express.json({ limit: '256mb' })` and `express.urlencoded({ limit: '256mb' })` to a much safer global limit (e.g., `10mb`). If specific upload endpoints require larger limits, apply a custom middleware only to those specific routes.
- [ ] **Re-enable Rate Limiting**: The `express-rate-limit` middleware in `src/app.ts` is currently commented out. Re-enable it. If deployed in a multi-instance cloud environment (like Azure App Service), configure it with a Redis store (`rate-limit-redis`).
- [ ] **Secure Logging**: Ensure `actionLogger.ts` and standard console logs do not leak sensitive information like passwords, tokens, or PII. Consider migrating from `console.log` to a structured logging library like `Pino` or `Winston`.

## 3. Database & TypeORM

- [ ] **Connection Pooling**: Verify the pool configuration in `src/config/typeorm.config.ts`. The current max is `10`, which may cause bottlenecks under high load. Increase based on the Azure SQL instance limits.
- [ ] **Explicit Transactions**: Audit operations that touch multiple tables (e.g., creating a Production Request with files and relations). Ensure they are wrapped in explicit TypeORM `queryRunner` transactions to prevent partial data persistence.
- [x] **N+1 Query Audits**: Review `find` and `findOne` methods in services to ensure `relations` are explicitly defined where needed to avoid lazy-loading N+1 performance issues.

## 4. Naming Conventions & Consistency

- [ ] **Standardize File Names**:
  - Controllers: Rename `Cover15MinuteController.ts` and `campaign.controller.ts` to standard camelCase (`cover15MinuteController.ts`, `campaignController.ts`).
  - Routes: Rename `campaign.routes.ts` to `campaignRoutes.ts`.
  - Services: Ensure all service files follow camelCase (e.g., `Cover15MinuteService.ts` -> `cover15MinuteService.ts`).
- [ ] **Enforce Entity Naming**: Ensure all TypeORM models follow `PascalCase.ts` and do not mix conventions.

## 5. Code Quality & Types

- [ ] **Eliminate** **`any`**: The codebase has widespread usage of `any` across 69 files (e.g., controllers, models, services). Replace `any` with strict TypeScript interfaces or types defined in `src/types/`.
- [ ] **Clean Up Imports**: Run an automated pass to organize imports and remove unused variables/imports across the `src/` directory.
- [ ] **Remove Dead Code**: Clear out commented-out logic blocks found in `src/app.ts` (e.g., old rate limiting) and other controllers to keep the production code clean.

