---
trigger: glob
globs: backend/**
---

# Backend Database & TypeORM Rules

- All changes over the models must be reflected in the database by creating a migration and running it. NEVER use `synchronize: true` in production.
- Use explicit relations in TypeORM queries to avoid lazy loading N+1 problems.
- Always handle transactions explicitly for operations that modify multiple tables.
- Do not expose database internal IDs or errors directly to the client.