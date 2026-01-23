# Project Structure
`public/assets` -> images
`src/app/` -> base project
`./services` -> services
`./i18n` -> translations
`./directives` -> directives
`./pipes` -> pipes
`./guards` -> guards
`./models` -> models
`./components` -> reusable components
`./components/{component}/{component}.component.{html|css|ts}` -> component html/css/ts
`./pages` -> pages
`./pages/{page}/{page}.component.{html|css|ts}` -> page html/css/ts
`./pages/{page}/{child}/{child}.component.{html|css|ts}` -> child html/css/ts

- All changes over the models must be reflected in the database creating a migration and running it
### Use PrimeNG Components
Use the Tailwind classes for styles, prioritizing dark and light themes
Use Lucide icons for Standalone components
Use p-select instead for dropdown functionality
Use p-floatLabel for input fields with variant="in"
Use p components from primeNG library

### Code Organization
- Follow Angular style guide conventions
- Use barrel exports (index.ts) for clean imports
- Organize files by feature, not by file type
- Keep components focused and single-purpose

### Naming Conventions
- Use kebab-case for file names
- Use PascalCase for class names
- Use camelCase for variables and functions
- Use UPPER_SNAKE_CASE for constants

### Import Organization
- Group imports: Angular core, third-party, application modules
- Use absolute paths for imports when configured
- Avoid circular dependencies
- Keep imports organized and remove unused ones

### Documentation
- Write clear, concise README files for each project
- Document complex business logic with JSDoc comments
- Keep documentation up to date with code changes
- Use English for all documentation

### Code Reusability
- NEVER duplicate code functionality across components
- ALWAYS extract common functionality into shared services
- Use dependency injection to share services across components
- Create reusable utilities and helper functions
- Avoid copy-pasting code between components