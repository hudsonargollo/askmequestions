# Project Structure & Organization

## Directory Layout

```
src/
├── react-app/           # Frontend React application
│   ├── components/      # Reusable React components
│   ├── contexts/        # React contexts (AuthContext)
│   ├── pages/          # Page-level components
│   ├── App.tsx         # Main application component
│   ├── main.tsx        # React entry point
│   └── index.css       # Global styles
├── worker/             # Cloudflare Worker backend
│   ├── index.ts        # Main worker entry point
│   └── fileService.ts  # File processing utilities
└── shared/             # Shared code between frontend/backend
    ├── types.ts        # TypeScript type definitions
    └── auth.ts         # Authentication utilities
```

## Architecture Patterns

### Frontend Architecture
- **Component-Based**: Modular React components in `/components`
- **Page-Based Routing**: Route components in `/pages`
- **Context Pattern**: AuthContext for global state management
- **Utility-First CSS**: Tailwind CSS classes

### Backend Architecture
- **Hono Framework**: RESTful API with middleware pattern
- **Service Layer**: FileService for document processing
- **Shared Types**: Zod schemas for validation across frontend/backend
- **Authentication Middleware**: JWT session management

### Code Organization Rules

#### Import Paths
- Use `@/*` alias for all internal imports
- Frontend imports: `@/react-app/*`
- Worker imports: `@/worker/*` 
- Shared imports: `@/shared/*`

#### Component Structure
- One component per file
- Default exports for components
- Props interfaces defined inline or imported from shared types
- Functional components with hooks

#### API Routes
- RESTful conventions (`/api/resource`)
- Protected routes use `authMiddleware`
- Admin routes prefixed with `/api/admin/`
- Validation with Zod schemas

#### File Naming
- Components: PascalCase (e.g., `SearchInterface.tsx`)
- Pages: PascalCase (e.g., `Home.tsx`)
- Utilities: camelCase (e.g., `fileService.ts`)
- Types: camelCase with Schema suffix (e.g., `SearchRequestSchema`)

## Configuration Files

### Root Level
- `wrangler.toml` - Cloudflare Workers configuration
- `vite.config.ts` - Vite build configuration
- `tailwind.config.js` - Tailwind CSS configuration
- `tsconfig.json` - TypeScript project references

### TypeScript Configs
- `tsconfig.app.json` - Frontend React app
- `tsconfig.worker.json` - Cloudflare Worker
- `tsconfig.node.json` - Node.js tooling

### Database
- `schema.sql` - Database schema definition
- `migrations/` - Database migration files