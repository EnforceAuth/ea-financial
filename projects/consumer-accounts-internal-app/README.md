# EA Financial - Consumer Accounts Web App

A modern React-based web application for EA Financial's consumer account management system. This application provides bank employees with a secure, user-friendly interface to manage customer accounts, process transactions, and access banking policies.

## 🏦 Overview

The Consumer Accounts Web App is the frontend companion to the EA Financial Internal API, designed specifically for internal bank employee use. It provides comprehensive account management capabilities with role-based access control and a responsive, intuitive interface.

## ✨ Features

### 🔐 Authentication & Authorization
- Secure login with role-based permissions
- Token-based authentication with automatic renewal
- Role-specific UI elements and capabilities
- Session management with automatic logout

### 📊 Dashboard
- Welcome screen with personalized greeting
- Quick account search functionality
- System health monitoring
- Recent activity tracking
- Role-appropriate quick actions

### 👤 Account Management
- Comprehensive account details view
- Real-time balance information
- Account status monitoring
- Customer information display
- Account type indicators

### 💰 Transaction Processing
- Credit and debit transaction processing
- Transaction validation and preview
- Real-time balance calculations
- Comprehensive form validation
- Transaction confirmation and receipts

### 📈 Transaction History
- Paginated transaction history
- Advanced filtering options (date, type, amount)
- Search functionality across transaction data
- Export capabilities
- Detailed transaction information

### 📋 Terms & Policies
- Searchable policy documents
- Categorized content (General, Employee Procedures, Regulatory, etc.)
- Expandable/collapsible sections
- Version tracking
- Print functionality

### 🎨 User Experience
- Modern, responsive design
- Dark/light mode support
- Accessible interface (WCAG compliant)
- Loading states and error handling
- Intuitive navigation

## 🚀 Getting Started

### Prerequisites

- Node.js >= 18.0.0
- bun (or npm, yarn, pnpm) package manager
- EA Financial Internal API running on port 3001

### Installation

1. **Clone the repository:**
   ```bash
   git clone <repository-url>
   cd ea-financial/projects/consumer-accounts-internal-app
   ```

2. **Install dependencies:**
   ```bash
   bun install
   ```

3. **Configure environment (optional):**
   ```bash
   # Create .env file for custom API URL
   echo "VITE_API_URL=http://localhost:3001" > .env
   ```

4. **Start the development server:**
   ```bash
   bun run dev
   ```

5. **Access the application:**
   Open [http://localhost:3000](http://localhost:3000) in your browser

## 🧑‍💻 Development

### Available Scripts

```bash
# Development
bun run dev          # Start development server with hot reload
bun run build    # Build for production
bun run preview      # Preview production build locally

# Code Quality
bun run lint         # Run ESLint
bun run type-check   # Run TypeScript compiler check

# Testing (when implemented)
bun run test         # Run unit tests
bun run test:watch   # Run tests in watch mode
bun run test:e2e     # Run end-to-end tests
```

### Project Structure

```
src/
├── components/          # React components
│   ├── Auth/           # Authentication components
│   ├── Dashboard/      # Dashboard components
│   ├── Accounts/       # Account management components
│   ├── Terms/          # Terms and policies components
│   └── Layout/         # Layout and navigation components
├── context/            # React context providers
│   └── AuthContext.tsx # Authentication state management
├── services/           # API service layer
│   └── api.ts         # API client and methods
├── types/             # TypeScript type definitions
│   └── index.ts       # Shared types and interfaces
├── styles/            # CSS stylesheets
│   └── App.css        # Main stylesheet
├── App.tsx            # Main application component
└── main.tsx           # Application entry point
```

## 🔑 Demo Credentials

The application includes demo credentials for testing different user roles:

| Username | Password    | Role                | Permissions |
|----------|------------|---------------------|-------------|
| `jsmith` | `password123` | Senior Representative | View accounts, transactions, basic operations |
| `mjohnson` | `password456` | Manager | All permissions including account management |
| `rbrown` | `password789` | Representative | View accounts and transactions only |
| `slee` | `password000` | Analyst | View accounts, transactions, risk analysis (Inactive) |

## 🛡️ Security Features

- **Token-based authentication** with automatic expiration handling
- **Role-based access control** with permission checking
- **Secure API communication** with request/response interceptors
- **Input validation and sanitization** on all forms
- **HTTPS enforcement** in production
- **Session timeout** with automatic logout

## 📱 Responsive Design

The application is fully responsive and works on:
- Desktop computers (1200px+)
- Tablets (768px - 1199px)
- Mobile phones (320px - 767px)

## 🎯 User Roles & Permissions

### Representative
- ✅ View account information
- ✅ View transaction history
- ❌ Process transactions
- ❌ Account management

### Senior Representative
- ✅ View account information
- ✅ View transaction history
- ✅ Process basic transactions (credit/debit)
- ❌ Advanced account management

### Manager
- ✅ All Senior Representative permissions
- ✅ Advanced transaction operations
- ✅ Account status modifications
- ✅ Full system access

### Analyst
- ✅ View account information
- ✅ View transaction history
- ✅ Risk analysis tools
- ❌ Transaction processing

## 🔧 Configuration

### Environment Variables

```bash
# API Configuration
VITE_API_URL=http://localhost:3001    # Internal API base URL
VITE_APP_NAME=EA Financial Portal     # Application name
VITE_APP_VERSION=1.0.0               # Application version

# Feature Flags
VITE_ENABLE_ANALYTICS=false          # Enable analytics tracking
VITE_DEBUG_MODE=false                # Enable debug logging
```

### Build Configuration

The application uses Vite for fast development and optimized production builds:

- **Development:** Hot module replacement, source maps, dev server
- **Production:** Minified bundles, tree shaking, asset optimization
- **TypeScript:** Full type checking and compilation
- **CSS:** PostCSS processing with autoprefixer

## 🚀 Deployment

### Production Build

```bash
# Build for production
bun run build

# Preview production build locally
bun preview
```

### Docker Deployment (Optional)

```dockerfile
FROM node:18-alpine as builder
WORKDIR /app
COPY package*.json ./
RUN bun ci
COPY . .
RUN bun run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

### Environment-Specific Builds

```bash
# Development
bun run build -- --mode development

# Staging
bun run build -- --mode staging

# Production
bun run build -- --mode production
```

## 🧪 Testing

### Testing Strategy

- **Unit Tests:** Component testing with React Testing Library
- **Integration Tests:** API integration and user flow testing
- **E2E Tests:** Full application testing with Playwright/Cypress
- **Accessibility Tests:** WCAG compliance testing

### Running Tests

```bash
# Unit tests
bun run test

# E2E tests
bun run test:e2e

# Coverage report
bun run test:coverage
```

## 📊 Performance

### Optimization Features

- **Code Splitting:** Lazy loading of route components
- **Bundle Optimization:** Tree shaking and minification
- **Asset Optimization:** Image compression and caching
- **API Caching:** Smart caching of API responses
- **Virtual Scrolling:** Efficient rendering of large lists

### Performance Metrics

- **Lighthouse Score:** 95+ across all categories
- **First Contentful Paint:** < 1.5s
- **Largest Contentful Paint:** < 2.5s
- **Time to Interactive:** < 3s

## 🐛 Troubleshooting

### Common Issues

1. **API Connection Issues**
   ```bash
   # Check if Internal API is running
   curl http://localhost:3001/health
   
   # Verify environment variables
   echo $VITE_API_URL
   ```

2. **Build Issues**
   ```bash
   # Clear node_modules and reinstall
   rm -rf node_modules package-lock.json
   bun install
   
   # Clear Vite cache
   bunx vite clean
   ```

3. **Authentication Issues**
   - Clear browser localStorage
   - Check token expiration
   - Verify API connectivity
   - Ensure correct credentials

### Debug Mode

Enable debug mode for detailed logging:
```bash
# In .env file
VITE_DEBUG_MODE=true
```

## 🤝 Contributing

### Development Workflow

1. **Create a feature branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make your changes**
   - Follow TypeScript best practices
   - Add appropriate types and interfaces
   - Include error handling
   - Write unit tests

3. **Test your changes**
   ```bash
   bun run lint
   bun run type-check
   bun run test
   ```

4. **Submit a pull request**
   - Include detailed description
   - Add screenshots for UI changes
   - Ensure all checks pass

### Code Style Guidelines

- Use TypeScript for all new code
- Follow React best practices and hooks patterns
- Use semantic HTML and ARIA labels for accessibility
- Follow the existing CSS architecture and naming conventions
- Include JSDoc comments for complex functions

## 📄 License

This project is proprietary to EA Financial. All rights reserved.

## 📞 Support

For internal support and questions:
- **Engineering Team:** engineering@eafinancial.com
- **UI/UX Team:** design@eafinancial.com
- **Security Issues:** security@eafinancial.com
- **Bug Reports:** Use the internal issue tracking system

## 🔮 Roadmap

### Upcoming Features

- [ ] Real-time notifications
- [ ] Advanced reporting dashboard
- [ ] Mobile app companion
- [ ] Offline mode support
- [ ] Advanced search and filtering
- [ ] Bulk operations
- [ ] Audit trail visualization
- [ ] Customer communication tools

### Technical Improvements

- [ ] GraphQL API integration
- [ ] PWA capabilities
- [ ] Enhanced caching strategies
- [ ] Micro-frontend architecture
- [ ] Advanced monitoring and analytics

---

**Note**: This is an internal banking application for EA Financial employees only. All data is fictional and for demonstration purposes. Do not use in production environments without proper security audits and compliance reviews.