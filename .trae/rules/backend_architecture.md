---
alwaysApply: false
description: 
---
# Backend Architecture & Patterns Rules

- Keep controllers thin: Controllers should only handle HTTP concerns (req/res, status codes). Move all business logic to `services/`.
- Use a centralized error handling middleware instead of repeating `try/catch` in every controller.
- Avoid using static classes for Services if possible; consider Dependency Injection to improve testability.
- Validate environment variables at startup (e.g., using Zod or Joi) and fail fast if required variables (like `JWT_SECRET`) are missing. Never use fallback secrets in production.