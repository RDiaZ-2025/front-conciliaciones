# Consolidated Node.js & TypeScript Backend Development Rules

This document consolidates structural, architectural, database, naming, security, and code quality rules for developing Node.js backend projects.

---

## 1. Project Structure & File Organization

Organize code by technical concerns to maintain clean separation:
* **`src/server.ts`**: Entry point. Establishes database connections, boots servers, and handles graceful shutdowns.
* **`src/app.ts`**: Configures the Express application, sets up global middlewares, and registers routes.
* **`src/routes/`**: Defines API endpoints, HTTP verbs, path variables, and mounts controllers.
* **`src/controllers/`**: Extracts HTTP input (params, query, body), validates schemas, delegates to services, and returns responses.
* **`src/services/`**: Implements core business logic and performs database queries.
* **`src/models/`**: Defines TypeORM entities and schema declarations.
* **`src/migrations/`**: Holds database migration scripts.
* **`src/config/`**: Houses configuration files (e.g., database connection setups, service credentials).
* **`src/middleware/`**: Contains custom Express middlewares (e.g., auth checks, error handling, rate limiting).
* **`src/types/`**: Declares global TypeScript interfaces and custom type overrides.

---

## 2. Naming Conventions

Enforce consistent casing to maintain readability across directories:
* **Files (Controllers, Services, Routes, Middlewares)**: Use `snake.case` (e.g., `auth.controller.ts`, `user.service.ts`).
* **Entities / Models**: Use `PascalCase` matching class names (e.g., `User.ts`, `ProductionRequest.ts`).
* **Classes (Services, Controllers, Controllers, Entities)**: Use `PascalCase` (e.g., `class UserService`, `class AuthController`).
* **Constants & Environment Variables**: Use `UPPER_SNAKE_CASE` (e.g., `JWT_SECRET`, `MAX_PAYLOAD_SIZE`).

---

## 3. Architecture & Design Patterns

* **Thin Controllers**: Keep controllers focused strictly on HTTP concerns (request parsing, schemas, status codes, and responses). Offload all business calculations, external integrations, and database operations to Services.
* **Centralized Error Handling**: Avoid redundant `try/catch` blocks inside controllers. Let errors bubble up to a global custom Express error handler middleware that catches exceptions, formats responses, and hides internal stack traces.
* **Dependency Injection (DI)**: Avoid static classes for Services. Inject service instances or pass them to constructors to facilitate mock injection during unit tests.
* **Startup Validation**: Validate environment variables at boot time (e.g., using schema validators like Zod or Joi). Fail fast and abort startup if mandatory credentials (e.g., `DATABASE_URL`, `JWT_SECRET`) are missing or invalid. Never fallback to hardcoded secrets in production environments.

---

## 4. Database & Persistence (TypeORM & Migrations)

* **Migrations Only**: Never use `synchronize: true` in production environments. All changes to entities/models must be reflected in the database via migration scripts.
* **Explicit Relations**: Avoid lazy-loading issues and N+1 query problems. Explicitly define relations using TypeORM query builder joins or query options relation arrays.
* **Explicit Transactions**: Always handle transaction contexts explicitly for sequences of operations modifying multiple tables to prevent partial states.
* **Data Masking**: Never expose raw database errors, internal primary keys, or database IDs directly to the client. Map internal database models to safe Data Transfer Objects (DTOs) before sending responses.

---

## 5. Security & Performance

* **Payload Limitations**: Restrict incoming JSON request sizes. Set a safe global limit (e.g., `10mb`) to prevent memory exhaustion and DoS attacks. Only override limits on routes explicitly requiring larger uploads.
* **Rate Limiting**: Protect endpoints against brute-force attacks using rate-limiting middleware (e.g., `express-rate-limit`). Use distributed stores (e.g., Redis) when scaling backend instances.
* **Log Sanitization**: Clean logs of sensitive information. Strip credentials, credit card numbers, passwords, and authorization tokens before logging request/response payloads.
* **Input Sanitization**: Always sanitize queries and parameters to prevent SQL injection. Avoid writing raw SQL strings inside query builder methods; use parameterized queries.

---

## 6. Code Quality & TypeScript

* **Strict Type Checking**: Enable strict mode in `tsconfig.json`. Avoid using `any`; define concrete types, types, and interfaces for data structures.
* **No Commented-Out Code**: Remove dead blocks, console logs, and commented-out code before pushing to production.
* **Organized Imports**: Keep imports clean and sorted, removing unused declarations.
