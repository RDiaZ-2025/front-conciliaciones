---
alwaysApply: false
globs: frontend/*
---
# Frontend Architecture & Code Reusability

### Code Organization
- Follow Angular style guide conventions
- Use barrel exports (index.ts) for clean imports
- Organize files by feature, not by file type
- Keep components focused and single-purpose

### Code Reusability
- NEVER duplicate code functionality across components
- ALWAYS extract common functionality into shared services
- Use dependency injection to share services across components
- Create reusable utilities and helper functions
- Avoid copy-pasting code between components