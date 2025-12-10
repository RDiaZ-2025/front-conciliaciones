# Frontend - VOC Sistema de Conciliaciones

Modern React application for the VOC document management and reconciliation system, built with a modular architecture and TypeScript integration.

## Architecture Overview

The frontend follows a clean architecture pattern with clear separation of concerns:

- **Pages**: Full page components with dedicated folder structure
- **Components**: Reusable UI components
- **Services**: API communication layer
- **Contexts**: Global state management
- **Utils**: Helper functions and utilities

## Technology Stack

- **React**: 19.1.0 - Modern React with hooks and functional components
- **Vite**: 7.0.4 - Fast build tool and development server
- **Material-UI**: 7.2.0 - Comprehensive UI component library
- **TypeScript**: Gradual migration for better type safety
- **PDF.js**: 5.3.93 - PDF processing and validation
- **XLSX**: 0.18.5 - Excel file handling and export
- **Azure Blob Storage**: Document storage integration

## Project Structure

```
src/
├── pages/                   # Page components with modular structure
│   ├── AdminPanel/          # Admin panel with user management
│   │   ├── index.ts         # Barrel exports
│   │   ├── types.ts         # TypeScript interfaces
│   │   ├── useAdminPanel.ts # Custom hook with business logic
│   │   └── AdminPanel.tsx   # UI component
│   ├── DashboardGeneral/    # Financial dashboard
│   ├── LoadDocumentsOCbyUserView/ # Document listing
│   ├── Login/               # Authentication
│   └── UploadForm/          # Document upload
├── components/              # Reusable UI components
│   ├── CustomDatePicker.jsx # Date selection component
│   ├── DarkModeToggle.jsx   # Theme switcher
│   └── ProtectedRoute.jsx   # Route protection
├── services/                # API communication layer
│   ├── baseApiService.js    # Core HTTP client
│   ├── authService.js       # Authentication API
│   └── userService.js       # User management API
├── contexts/                # Global state management
│   └── AuthContext.jsx      # Authentication context
├── constants/               # Application constants
│   └── auth.js              # Permission and role definitions
├── utils/                   # Helper functions
│   └── validatePdfSignatures.js # PDF validation utilities
├── assets/                  # Static resources
└── App.jsx                  # Main application component
```

## Key Features

### Modular Page Architecture
Each page follows a consistent structure:
- **Component**: Pure UI rendering with TypeScript
- **Custom Hook**: Business logic and state management
- **Types**: TypeScript interfaces and type definitions
- **Index**: Barrel exports for clean imports

### Authentication & Authorization
- JWT-based authentication
- Role-based access control (RBAC)
- Protected routes with permission checking
- Automatic token refresh and logout

### Document Management
- PDF upload with validation
- Digital signature verification
- Document preview and thumbnails
- Azure Blob Storage integration
- Upload progress tracking

### Interactive Dashboard
- Real-time financial data visualization
- Interactive charts and graphs
- Multi-level category filtering
- Export functionality to Excel
- Responsive design with dark/light themes

### User Management
- Complete user CRUD operations
- Role assignment and permission management
- User status management
- Activity monitoring

## Component Architecture

### Separation of Concerns
- **UI Components**: Focus solely on rendering and user interaction
- **Custom Hooks**: Handle business logic, API calls, and state management
- **Type Definitions**: Ensure type safety across the application
- **Service Layer**: Centralized API communication

### Benefits
- **Maintainability**: Clear separation makes code easier to maintain
- **Testability**: Business logic can be tested independently
- **Reusability**: Hooks can be reused across different components
- **Type Safety**: TypeScript interfaces prevent runtime errors
- **Scalability**: Modular structure supports easy feature additions

## Service Layer

### Base API Service
- Centralized HTTP client configuration
- Automatic token management
- Request/response interceptors
- Error handling and retry logic

### Specialized Services
- **Auth Service**: Login, logout, token verification
- **User Service**: User management operations
- Modular design allows easy addition of new services

## State Management

### Context API
- **AuthContext**: Global authentication state
- User permissions and role management
- Session persistence and cleanup

### Local State
- Component-specific state in custom hooks
- Form state management
- UI state (loading, errors, etc.)

## Development Features

### Hot Module Replacement
- Instant updates during development
- State preservation across changes
- Fast development iteration

### TypeScript Integration
- Gradual migration from JavaScript
- Type safety for critical components
- Better IDE support and autocomplete

### ESLint Configuration
- Code quality enforcement
- Consistent coding standards
- React-specific linting rules

## Performance Optimizations

### Code Splitting
- Lazy loading of page components
- Reduced initial bundle size
- Better loading performance

### Efficient Rendering
- Proper use of React hooks
- Memoization where appropriate
- Optimized re-render patterns

### Asset Optimization
- Image optimization and compression
- Efficient PDF processing
- Minimal bundle size

## Security Features

### Input Validation
- Client-side form validation
- File type and size restrictions
- XSS prevention measures

### Authentication Security
- Secure token storage
- Automatic session cleanup
- Protected route enforcement

## Responsive Design

### Mobile-First Approach
- Responsive layouts with Material-UI
- Touch-friendly interfaces
- Adaptive navigation

### Theme Support
- Dark and light mode support
- Consistent design system
- Accessibility considerations

## Development Workflow

### Getting Started
```bash
# Install dependencies (from root)
npm install

# Start development server
npm run dev:frontend

# Build for production
npm run build:frontend
```

### Code Organization
- Follow the established folder structure
- Use TypeScript for new components
- Implement custom hooks for business logic
- Add proper type definitions

### Best Practices
- Keep components focused and small
- Use custom hooks for complex logic
- Implement proper error boundaries
- Follow Material-UI design patterns
- Write descriptive commit messages

## Testing Strategy

### Unit Testing
- Test custom hooks independently
- Component testing with React Testing Library
- Service layer testing

### Integration Testing
- End-to-end user workflows
- API integration testing
- Cross-browser compatibility

## Future Enhancements

### Technical Improvements
- Complete TypeScript migration
- Implement comprehensive testing suite
- Add Storybook for component documentation
- Implement service workers for offline support

### Feature Additions
- Real-time notifications
- Advanced filtering and search
- Bulk operations
- Enhanced reporting capabilities

### Performance
- Implement virtual scrolling for large lists
- Add caching strategies
- Optimize bundle splitting
- Implement progressive web app features

## Troubleshooting

### Common Issues
- **Build Errors**: Check TypeScript types and imports
- **Authentication Issues**: Verify token storage and API endpoints
- **Routing Problems**: Ensure proper route protection setup
- **Performance Issues**: Check for unnecessary re-renders

### Debug Tools
- React Developer Tools
- Network tab for API debugging
- Console logging in development
- Vite development tools

## Contributing

### Code Standards
- Follow existing architectural patterns
- Use TypeScript for new features
- Implement proper error handling
- Add appropriate documentation

### Pull Request Process
1. Create feature branch
2. Implement changes following patterns
3. Add/update tests
4. Update documentation
5. Submit pull request with description

This frontend application provides a solid foundation for the VOC system with modern React patterns, TypeScript integration, and a scalable architecture that supports future growth and maintenance.
