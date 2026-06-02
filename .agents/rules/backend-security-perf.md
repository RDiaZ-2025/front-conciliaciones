---
trigger: glob
globs: backend/**
---

# Backend Security & Performance Rules

- Limit JSON payload sizes. Avoid excessively large limits (like 256mb) to prevent memory exhaustion/DoS. Set a reasonable limit globally (e.g., `10mb`) and increase it only on specific routes if needed.
- Maintain and use rate limiting (e.g., `express-rate-limit`), preferably backed by a distributed store like Redis when scaling in Azure.
- Keep sensitive data (passwords, tokens) out of logs.
- Sanitize inputs to prevent SQL injection (though TypeORM handles most of it, be careful with `QueryBuilder` raw queries).