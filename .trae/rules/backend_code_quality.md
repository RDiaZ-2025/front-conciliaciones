---
alwaysApply: false
globs: backend/*
---
# Backend Code Quality Rules

- Write clear, self-documenting code. Do not leave commented-out code blocks in production.
- Keep imports organized and remove unused ones.
- Use TypeScript strict mode and avoid using `any`. Define proper interfaces/types in `src/types/`.