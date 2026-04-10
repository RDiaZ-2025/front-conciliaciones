---
alwaysApply: false
globs: frontend/*
---
# Frontend Project Structure

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