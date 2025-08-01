# Knowledge Search App

A full-stack AI-powered knowledge search application built with React, Hono, and Cloudflare Workers. This app allows users to search through a knowledge base using natural language queries and get AI-generated responses.

## Features

- **AI-Powered Search**: Uses OpenAI GPT to provide intelligent responses
- **Google OAuth**: Secure authentication with Google accounts
- **Document Upload**: Support for PDF, DOCX, and TXT file processing
- **Admin Interface**: Add knowledge entries, FAQs, and manage content
- **Real-time Search**: Fast search with category filtering
- **User Management**: Profile display with logout functionality
- **Responsive Design**: Modern UI with Tailwind CSS
- **Cloudflare Integration**: Deployed on Cloudflare Workers with D1 database

## Tech Stack

- **Frontend**: React 19, TypeScript, Tailwind CSS
- **Backend**: Hono (Web Framework), Cloudflare Workers
- **Database**: Cloudflare D1 (SQLite)
- **AI**: OpenAI GPT-4
- **File Storage**: MinIO/S3 compatible storage
- **Build Tool**: Vite
- **Deployment**: Cloudflare Workers

## Quick Start

1. **Clone and Install**
   ```bash
   git clone <your-repo>
   cd knowledge-search-app
   npm install
   ```

2. **Setup Cloudflare**
   ```bash
   wrangler login
   wrangler d1 create knowledge-search-db
   # Update database ID in wrangler.toml
   wrangler d1 execute knowledge-search-db --file=./schema.sql
   ```

3. **Set Environment Variables**
   ```bash
   wrangler secret put OPENAI_API_KEY
   # Optional: For Google OAuth
   wrangler secret put GOOGLE_CLIENT_ID
   wrangler secret put GOOGLE_CLIENT_SECRET
   ```

4. **Deploy**
   ```bash
   npm run build
   npm run deploy
   ```

5. **Setup Custom Domain (Optional)**
   - Quick setup: See [DOMAIN_QUICK_SETUP.md](./DOMAIN_QUICK_SETUP.md)
   - Detailed guide: See [CUSTOM_DOMAIN_SETUP.md](./CUSTOM_DOMAIN_SETUP.md)

## Development

```bash
# Start development server
npm run dev

# Build for production
npm run build

# Deploy to Cloudflare
npm run deploy

# Check deployment
npm run check
```

## Configuration

### Authentication

**Google OAuth (Recommended):**
1. Set up Google OAuth credentials (see [GOOGLE_OAUTH_SETUP.md](./GOOGLE_OAUTH_SETUP.md))
2. Configure environment variables
3. Users can sign in with their Google accounts

**Email/Password Fallback:**
Update admin credentials in `src/worker/index.ts`:
```typescript
if (email === 'your-email@domain.com' && password === 'your-secure-password') {
```

### Environment Variables
- `OPENAI_API_KEY`: Required for AI responses
- `GOOGLE_CLIENT_ID`: Optional for Google OAuth
- `GOOGLE_CLIENT_SECRET`: Optional for Google OAuth
- `MINIO_ENDPOINT`: Optional for file storage
- `MINIO_ACCESS_KEY`: Optional for file storage  
- `MINIO_SECRET_KEY`: Optional for file storage

## Usage

### For Users
1. Visit your deployed app
2. Type questions in natural language
3. Get AI-powered responses with relevant documentation
4. Use category filters to narrow search results

### For Admins
1. Login at `/login` with Google OAuth or admin credentials
2. Click the floating + button to access admin panel
3. Add text entries, FAQs, or upload documents
4. Manage knowledge base content
5. View user profile and logout from the top-right corner

## API Endpoints

**Public:**
- `POST /api/search` - Search knowledge base
- `GET /api/filters` - Get available categories

**Authentication:**
- `POST /api/login` - Email/password login
- `GET /api/auth/google/url` - Get Google OAuth URL
- `GET /api/auth/google/callback` - Google OAuth callback
- `POST /api/logout` - Logout
- `GET /api/users/me` - Get current user

**Admin (Protected):**
- `POST /api/admin/add-text` - Add text entry
- `POST /api/admin/add-faq` - Add FAQ entry
- `POST /api/admin/upload-file` - Upload file
- `GET /api/admin/files` - List uploaded files
- `DELETE /api/admin/files/:id` - Delete uploaded file

## File Structure

```
src/
├── react-app/           # React frontend
│   ├── components/      # React components
│   ├── contexts/        # React contexts (auth)
│   ├── pages/          # Page components
│   └── App.tsx         # Main app component
├── worker/             # Cloudflare Worker backend
│   ├── index.ts        # Main worker file
│   └── fileService.ts  # File processing service
└── shared/             # Shared types and utilities
    ├── types.ts        # TypeScript types
    └── auth.ts         # Authentication utilities
```

## Deployment

- **Main Guide**: [DEPLOYMENT.md](./DEPLOYMENT.md) - Complete deployment instructions
- **Custom Domain**: [CUSTOM_DOMAIN_SETUP.md](./CUSTOM_DOMAIN_SETUP.md) - Detailed domain configuration
- **Quick Domain Setup**: [DOMAIN_QUICK_SETUP.md](./DOMAIN_QUICK_SETUP.md) - Fast track domain setup
- **Google OAuth**: [GOOGLE_OAUTH_SETUP.md](./GOOGLE_OAUTH_SETUP.md) - Google authentication setup

## License

MIT License - feel free to use this project for your own applications.