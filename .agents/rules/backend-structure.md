---
trigger: always_on
---

# Backend Project Structure Rules

`src/app.ts` -> Express application configuration, middlewares, and route registration
`src/server.ts` -> Entry point, database connection, and graceful shutdown
`src/routes/` -> API endpoint definitions and router configuration
`src/controllers/` -> Request/Response handling, input validation
`src/services/` -> Business logic and database interactions
`src/models/` -> TypeORM entities definition
`src/migrations/` -> Database migrations
`src/config/` -> Configuration files (database, TypeORM)
`src/middleware/` -> Custom Express middlewares