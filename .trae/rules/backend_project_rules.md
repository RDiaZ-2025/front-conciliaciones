# Backend Project Rules

### Project Structure
`src/app.ts` -> Express application configuration, middlewares, and route registration
`src/server.ts` -> Entry point, database connection, and graceful shutdown
`src/routes/` -> API endpoint definitions and router configuration
`src/controllers/` -> Request/Response handling, input validation
`src/services/` -> Business logic and database interactions
`src/models/` -> TypeORM entities definition
`src/migrations/` -> Database migrations
`src/config/` -> Configuration files (database, TypeORM)
`src/middleware/` -> Custom Express middlewares

### Architecture & Patterns
- Keep controllers thin: Controllers should only handle HTTP concerns (req/res, status codes). Move all business logic to `services/`.
- Use a centralized error handling middleware instead of repeating `try/catch` in every controller.
- Avoid using static classes for Services if possible; consider Dependency Injection to improve testability.
- Validate environment variables at startup (e.g., using Zod or Joi) and fail fast if required variables (like `JWT_SECRET`) are missing. Never use fallback secrets in production.

### Database & TypeORM
- All changes over the models must be reflected in the database by creating a migration and running it. NEVER use `synchronize: true` in production.
- Use explicit relations in TypeORM queries to avoid lazy loading N+1 problems.
- Always handle transactions explicitly for operations that modify multiple tables.
- Do not expose database internal IDs or errors directly to the client.

### Naming Conventions
- Use `camelCase` for file names in controllers, services, and routes (e.g., `authController.ts`).
- Use `PascalCase` for Model/Entity file names (e.g., `User.ts`).
- Use `PascalCase` for class names.
- Use `UPPER_SNAKE_CASE` for constants and environment variables.

### Security & Performance
- Limit JSON payload sizes. Avoid excessively large limits (like 256mb) to prevent memory exhaustion/DoS. Set a reasonable limit globally (e.g., `10mb`) and increase it only on specific routes if needed.
- Maintain and use rate limiting (e.g., `express-rate-limit`), preferably backed by a distributed store like Redis when scaling in Azure.
- Keep sensitive data (passwords, tokens) out of logs.
- Sanitize inputs to prevent SQL injection (though TypeORM handles most of it, be careful with `QueryBuilder` raw queries).

### Code Quality
- Write clear, self-documenting code. Do not leave commented-out code blocks in production.
- Keep imports organized and remove unused ones.
- Use TypeScript strict mode and avoid using `any`. Define proper interfaces/types in `src/types/`.
