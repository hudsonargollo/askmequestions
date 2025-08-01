# Technology Stack & Build System

## Core Technologies

### Frontend
- **React 19** with TypeScript
- **Tailwind CSS** for styling
- **Lucide React** for icons
- **React Router** for navigation
- **Vite** as build tool and dev server

### Backend
- **Hono** web framework
- **Cloudflare Workers** runtime
- **Cloudflare D1** (SQLite) database
- **OpenAI GPT-4** for AI responses
- **Zod** for schema validation

### File Processing
- **PDF Parse** for PDF documents
- **Mammoth** for DOCX files
- **AWS SDK S3** for file storage (MinIO compatible)

### Authentication
- **Google OAuth 2.0**
- **JWT sessions** with secure cookies

## Build System

### Development Commands
```bash
npm run dev          # Start Vite dev server
npm run build        # TypeScript compile + Vite build
npm run deploy       # Deploy to Cloudflare Workers
npm run check        # Full build + dry-run deploy
npm run lint         # ESLint code checking
npm run cf-typegen   # Generate Cloudflare types
```

### TypeScript Configuration
- **Project References**: Separate configs for app, worker, and node
- **Path Aliases**: `@/*` maps to `./src/*`
- **Strict Mode**: Enabled with unused parameter/local checking
- **Target**: ES2020 with modern module resolution

### Build Process
1. TypeScript compilation (`tsc -b`)
2. Vite bundling with React plugin
3. Cloudflare Workers deployment
4. Static assets served from `dist/client`

## Environment Variables
- `OPENAI_API_KEY` - Required for AI responses
- `GOOGLE_CLIENT_ID` - Optional for OAuth
- `GOOGLE_CLIENT_SECRET` - Optional for OAuth  
- `MINIO_ENDPOINT` - Optional for file storage
- `MINIO_ACCESS_KEY` - Optional for file storage
- `MINIO_SECRET_KEY` - Optional for file storage

## Deployment Target
- **Platform**: Cloudflare Workers
- **Database**: Cloudflare D1
- **Assets**: Cloudflare Pages (SPA mode)
- **Compatibility**: Node.js compatibility enabled