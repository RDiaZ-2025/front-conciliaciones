# VOC - Sistema de Conciliaciones

Comprehensive document management and reconciliation system built with modern technologies and monorepo architecture for efficient development and deployment.

## Project Overview

VOC is a full-stack web application that enables efficient management of users, document uploads, dashboard visualization, and permission administration. The system is designed to facilitate reconciliation processes and document tracking with a focus on security, scalability, and maintainability.

## Monorepo Architecture

This project uses npm workspaces to create a unified development environment with shared dependencies and streamlined workflows.

### Structure

```
VOC/
├── package.json              # Root package.json with shared dependencies
├── node_modules/             # Shared node_modules folder
├── frontend/                 # React application
│   ├── package.json          # Frontend-specific scripts only
│   ├── src/
│   │   ├── pages/            # Modular page components
│   │   ├── components/       # Reusable UI components
│   │   ├── services/         # API communication layer
│   │   └── contexts/         # Global state management
│   └── dist/
├── backend/                  # Node.js/TypeScript API
│   ├── package.json          # Backend-specific scripts only
│   ├── src/
│   │   ├── controllers/      # Request handlers
│   │   ├── services/         # Business logic
│   │   ├── middleware/       # Express middleware
│   │   └── types/            # TypeScript definitions
│   └── dist/
├── .github/
│   └── workflows/            # CI/CD with GitHub Actions
└── README.md
```

### Monorepo Benefits

- **Reduced Storage**: Single node_modules folder instead of separate ones
- **Faster Installation**: Dependencies are installed once at the root level
- **Simplified Management**: All dependencies managed in one place
- **Concurrent Development**: Run both projects simultaneously
- **Consistent Versioning**: Shared dependencies ensure compatibility
- **Streamlined CI/CD**: Single pipeline for both frontend and backend

## Technology Stack

### Frontend
- **React**: 19.1.0 with modern hooks and functional components
- **Material-UI**: 7.2.0 for comprehensive UI components
- **Vite**: 7.0.4 for fast development and building
- **TypeScript**: Gradual migration for better type safety
- **PDF.js**: 5.3.93 for document processing
- **XLSX**: 0.18.5 for Excel export functionality
- **Azure Blob Storage**: Document storage integration

### Backend
- **Node.js**: Runtime environment with TypeScript
- **Express.js**: 4.21.2 web framework
- **Microsoft SQL Server**: Database with mssql driver
- **JWT**: Authentication with jsonwebtoken
- **bcrypt**: Password hashing and security
- **Helmet**: Security headers and protection
- **Morgan**: HTTP request logging
- **Express Validator**: Input validation
- **Rate Limiting**: API protection

### Development Tools
- **Concurrently**: Run multiple processes simultaneously
- **Nodemon**: Auto-restart during development
- **ESLint**: Code quality and consistency
- **Rimraf**: Cross-platform file cleanup
- **TypeScript**: Type safety and better development experience

## Available Scripts

### Development
```bash
# Run both frontend and backend simultaneously
npm run dev

# Run only frontend (http://localhost:5173)
npm run dev:frontend

# Run only backend (http://localhost:22741)
npm run dev:backend
```

### Building
```bash
# Build both projects
npm run build

# Build only frontend
npm run build:frontend

# Build only backend
npm run build:backend
```

### Production
```bash
# Start both projects in production mode
npm start
```

### Maintenance
```bash
# Install all dependencies
npm install

# Clean all node_modules and dist folders
npm run clean

# Run linting
npm run lint
```

## Key Features

### Modular Frontend Architecture
- **Pages**: Full page components with dedicated folder structure
- **Custom Hooks**: Business logic separation from UI components
- **TypeScript Integration**: Type safety for critical components
- **Service Layer**: Centralized API communication
- **Context API**: Global state management

### Robust Backend API
- **RESTful Architecture**: Clean and predictable API design
- **Authentication & Authorization**: JWT-based security
- **Input Validation**: Comprehensive request validation
- **Error Handling**: Centralized error management
- **Database Integration**: Efficient SQL Server operations
- **Security Middleware**: Protection against common vulnerabilities

### User Management
- Secure authentication with email and password
- Role-based access control (RBAC)
- Granular permission system:
  - `ADMIN_PANEL`: Complete administrative access
  - `DOCUMENT_UPLOAD`: Document upload permissions
  - `MANAGEMENT_DASHBOARD`: Dashboard access
  - `USER_MANAGEMENT`: User administration

### Document Management
- PDF upload with validation
- Digital signature verification
- Document preview and thumbnails
- Azure Blob Storage integration
- Upload progress tracking
- Document status management

### Interactive Dashboard
- Real-time financial data visualization
- Interactive charts and graphs
- Multi-level category filtering
- Export functionality to Excel
- Responsive design with dark/light themes
- Drill-down capabilities for detailed analysis

### Administrative Panel
- Complete user CRUD operations
- Role assignment and permission management
- User status management (enable/disable)
- Activity monitoring and logging
- System configuration options

## Security Features

### Authentication & Authorization
- JWT token-based authentication
- Secure password hashing with bcrypt
- Role-based access control
- Protected routes and API endpoints
- Automatic token refresh and logout

### API Security
- Input validation with express-validator
- Rate limiting to prevent abuse
- CORS configuration
- Security headers with Helmet
- SQL injection prevention
- XSS protection measures

### Data Protection
- Secure token storage
- Encrypted password storage
- Secure file upload handling
- Data sanitization

## Performance Optimizations

### Frontend
- Code splitting and lazy loading
- Efficient React rendering patterns
- Memoization where appropriate
- Optimized bundle size
- Asset optimization

### Backend
- Response compression
- Efficient database queries
- Connection pooling
- Caching strategies
- Optimized middleware stack

## Development Workflow

### Getting Started
1. **Clone Repository**: `git clone <repository-url>`
2. **Install Dependencies**: `npm install` (from root directory)
3. **Environment Setup**: Configure `.env` files for both frontend and backend
4. **Database Setup**: Run database setup scripts
5. **Start Development**: `npm run dev`

### Development Environment
- Frontend available at: http://localhost:5173
- Backend available at: http://localhost:22741
- Hot reload enabled for both applications
- Shared dependencies managed at root level

### Code Organization
- Follow established architectural patterns
- Use TypeScript for new features
- Implement proper error handling
- Add appropriate documentation
- Write descriptive commit messages

## Workspace Commands

You can run commands for specific workspaces:

```bash
# Run a command in the frontend workspace
npm run <command> --workspace=frontend

# Run a command in the backend workspace
npm run <command> --workspace=backend
```

## Deployment

### Azure Static Web Apps
- Automated deployment via GitHub Actions
- Frontend deployed as static web app
- Backend deployed as Azure Functions
- Environment-specific configurations
- Continuous integration and deployment

### CI/CD Pipeline
- Automated testing on pull requests
- Build verification for both applications
- Deployment to staging and production environments
- Rollback capabilities

## System Requirements

- **Node.js**: 20.x or higher
- **npm**: 10.0.0 or higher
- **SQL Server**: For database operations
- **Azure Blob Storage**: For document storage
- **Modern Browser**: ES6+ support required

## Installation and Setup

### Prerequisites
- Node.js 20.x or higher installed
- SQL Server instance available
- Azure Blob Storage account configured
- Git for version control

### Quick Start
```bash
# Clone the repository
git clone <repository-url>
cd VOC

# Install all dependencies
npm install

# Set up environment variables
cp frontend/.env.example frontend/.env
cp backend/.env.example backend/.env

# Configure database connection in backend/.env
# Configure Azure storage in frontend/.env

# Start development servers
npm run dev
```

### Environment Configuration

#### Frontend (.env)
```env
VITE_API_URL=http://localhost:22741/api
```

#### Backend (.env)
```env
DB_SERVER=your-sql-server
DB_DATABASE=your-database
DB_USER=your-username
DB_PASSWORD=your-password
JWT_SECRET=your-jwt-secret
PORT=22741
```

## Testing Strategy

### Unit Testing
- Component testing with React Testing Library
- API endpoint testing
- Service layer testing
- Custom hook testing

### Integration Testing
- End-to-end user workflows
- API integration testing
- Database integration testing
- Cross-browser compatibility

## Troubleshooting

### Common Issues
1. **Dependency Conflicts**: Run `npm run clean` then `npm install`
2. **Port Conflicts**: Check if ports 5173 or 22741 are in use
3. **Database Connection**: Verify SQL Server configuration
4. **Build Errors**: Check TypeScript types and imports
5. **Authentication Issues**: Verify JWT secret and token storage

### Debug Tools
- React Developer Tools for frontend debugging
- Network tab for API request inspection
- SQL Server Management Studio for database queries
- Postman for API testing
- Browser console for client-side debugging

## Migration Notes

- Legacy AdminPanel.jsx has been refactored into modular structure
- All page components now follow consistent architectural patterns
- Dependencies consolidated at root level for better management
- Service layer restructured for better separation of concerns

## Future Enhancements

### Technical Improvements
- Complete TypeScript migration
- Comprehensive testing suite implementation
- Performance monitoring and analytics
- Advanced caching strategies
- Microservices architecture consideration

### Feature Additions
- Real-time notifications
- Advanced search and filtering
- Bulk operations
- Enhanced reporting capabilities
- Mobile application
- Offline support

### Infrastructure
- Container orchestration with Docker
- Kubernetes deployment
- Advanced monitoring and logging
- Automated backup strategies
- Disaster recovery planning

## Contributing

### Development Standards
- Follow existing architectural patterns
- Use TypeScript for new features
- Implement proper error handling
- Add comprehensive documentation
- Write meaningful tests

### Pull Request Process
1. Create feature branch from main
2. Implement changes following established patterns
3. Add or update tests as needed
4. Update documentation
5. Submit pull request with detailed description
6. Address code review feedback
7. Merge after approval

### Code Review Guidelines
- Verify architectural consistency
- Check for security vulnerabilities
- Ensure proper error handling
- Validate test coverage
- Review documentation updates

## License

This project is proprietary software. All rights reserved.

## Support

For technical support or questions about the VOC system, please contact the development team or create an issue in the project repository.

---

**VOC Sistema de Conciliaciones** - Built with modern technologies for efficient document management and reconciliation processes.