ALWAYS write code in english
Use camelCase for variables and functions
Use PascalCase for classes and components
Use UPPER_SNAKE_CASE for constants
DO NOT CREATE AUTOMATIC SCRIPTS TO RUN IN DATABASE
All new pages MUST BE PLACED in the /src/pages directory
All new shared components MUST BE PLACED in the /src/components directory
All new services MUST BE PLACED in the /src/services directory
All new styles MUST BE PLACED in the /src/styles directory
ALWAYS use the theme for colors and fonts with PrimeNG and PrimeFlex
ALWAYS USE PrimeNG Components (v20+) and PrimeFlex for layout/styling.
NEVER CHANGE THE PORTS in the .env files, it will cause errors in the application
NEVER hardcode API endpoints, always use the environment variable
NEVER hardcode cloud storage credentials or SAS tokens in the frontend; use backend-mediated authentication.
For new components that belong to a specific page (e.g. complex dialogs, specific sections), CREATE them in a 'components' subfolder within that page's directory (e.g. /src/app/pages/production/components/ans-dialog/).
