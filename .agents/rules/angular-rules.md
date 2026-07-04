---
trigger: glob
globs: Frontend/*.*
---

# Frontend Project Rules

## Directory Structure
- `public/assets` -> images
- `src/app/` -> base project
- `./services` -> services
- `./i18n` -> translations (Needed if more than one language translations is required)
- `./directives` -> directives
- `./pipes` -> pipes
- `./guards` -> guards
- `./models` -> models (Separated into subdirectories: `firestore`, `requests`, `responses`, `common`. One model per file).
- `./components` -> reusable components (`./components/{component}/{component}.component.{html|css|ts}`)
- `./pages` -> pages (`./pages/{page}/{page}.component.{html|css|ts}`)
- `./pages/{page}/{child}/{child}.component.{html|css|ts}` -> child components of a page

## Core Principles
- Check if project builds successfully with `npm run build:all`.
- Use Tailwind classes for styles, prioritizing dark and light themes.
- Avoid custom CSS.
- Use Lucide icons for Standalone components.
- Use `p-select` instead for dropdown functionality.
- Use `p-floatLabel` for input fields with `variant="in"`.
- Use `p` components from primeNG library.
- Use `cachedImage` pipe for image loading. (Note: Currently a structural placeholder returning the URL directly; designed to be extended to implement client-side caching of static assets using CacheStorage, Service Workers, or blob loading as needed).
- Use `BaseApiService` for all HTTP services to ensure consistent authentication and URL handling.
- Use `CoreDialogService` for all modal interactions to ensure consistent behavior and styling.
- For translations check `translations_rules.md`.

## Code Organization
- Follow Angular style guide conventions.
- Use barrel exports (`index.ts`) for clean imports.
- Organize files by feature, not by file type.
- Keep components focused and single-purpose.
- NEVER duplicate code functionality across components.
- ALWAYS extract common functionality into shared services.
- Avoid copy-pasting code between components.

## Naming Conventions
- File names: `kebab-case`
- Class names: `PascalCase`
- Variables and functions: `camelCase`
- Constants: `UPPER_SNAKE_CASE`

## Import Organization
- Group imports: Angular core, third-party, application modules.
- Use absolute paths for imports when configured.
- Avoid circular dependencies.

## Color Palette Rules
- ALWAYS use a PrimeNG custom theme.
- NEVER use purple or other unauthorized random/weird colors.
- STRICTLY adhere to the following color semantics:
  - **primary-color**: Use exclusively for main controls and main icons.
  - **secondary-color**: Use for accent controls and secondary elements.
  - **green**: Use exclusively for success indicators and success-related messages.
  - **yellow**: Use exclusively for warnings.
  - **red**: Use exclusively for danger zone actions, errors, and critical warnings.