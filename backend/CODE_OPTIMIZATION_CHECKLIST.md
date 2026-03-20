# Code Optimization and Best Practices Checklist

## 1. Architecture and Separation of Concerns
- [ ] **Thin Controllers, Fat Services**: Move business logic, direct repository access (`AppDataSource.getRepository(...)`), and complex operations (e.g., `performSmartAssignment` in `productionController.ts`) out of controllers and into dedicated service classes. Controllers should only handle HTTP requests, input validation, responses, and routing.
- [ ] **Dependency Injection**: Refactor static service instantiations (e.g., `export const teamService = new TeamService();`) and hardcoded repository access to use Dependency Injection (e.g., using `tsyringe` or passing instances via constructors). This improves testability and modularity.

## 2. Error Handling and Validation
- [ ] **Global Error Handling Middleware**: Remove repetitive `try/catch` blocks in every controller method. Implement a global Express error-handling middleware to catch asynchronous errors and return consistent HTTP responses.
- [ ] **Schema Validation**: Replace manual payload validation (e.g., `if (!name || !department)`) with a schema validation library like Zod or Joi at the route/middleware level.
- [ ] **Database Initialization Checks**: Remove the repetitive `if (!AppDataSource.isInitialized)` checks from every single controller method. Rely on a global health check, an application-level startup block, or a database connection middleware.

## 3. Database and TypeORM
- [ ] **Transactions for Multi-step Operations**: Wrap operations that modify multiple entities (e.g., saving a `ProductionRequest`, logging to `ProductionRequestHistory`, and creating a `Notification`) inside a single TypeORM transaction to ensure data consistency if an error occurs mid-process.
- [ ] **Optimize Queries**: Review uses of `.find()` with relations and `.createQueryBuilder()` to ensure indexes are utilized effectively and N+1 query problems are avoided.

## 4. Code Quality and Clean Code
- [ ] **Eliminate Magic Numbers and Strings**: Replace hardcoded IDs (e.g., `teamId: 5`, `teamId: 3`) and status strings (e.g., `get_data`, `create_proposal`) with TypeScript Enums or exported constants.
- [ ] **Strict Typing**: Remove usages of `any` (e.g., `(error as any)`, `obj: any`). Define strict interfaces for payloads, error handling, and internal data structures.
- [ ] **Extract Utility Functions**: Move inline helper functions (like `isEmptyObject` in `productionController.ts`) to a dedicated `src/utils/` directory so they can be reused across the application.

## 5. Security and Performance
- [ ] **Authentication Middleware Consistency**: Ensure all protected routes use the auth middleware consistently, and that `req.user` is properly typed via Express type merging.
- [ ] **Pagination and Limits**: Enforce pagination on all endpoints that return lists (e.g., `getAllProductionRequests`, action logs) to prevent memory exhaustion with large datasets.
