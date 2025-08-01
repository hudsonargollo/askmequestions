# Deployment Guide

This guide will help you deploy your knowledge search app to Cloudflare Workers with your own account.

## Prerequisites

1. **Cloudflare Account**: Sign up at [cloudflare.com](https://cloudflare.com)
2. **Node.js**: Install Node.js 18+ and npm
3. **Wrangler CLI**: Install globally with `npm install -g wrangler`

## Step 1: Setup Cloudflare

### 1.1 Login to Wrangler
```bash
wrangler login
```

### 1.2 Create D1 Database
```bash
wrangler d1 create knowledge-search-db
```

Copy the database ID from the output and update `wrangler.toml`:
```toml
[[d1_databases]]
binding = "DB"
database_name = "knowledge-search-db"
database_id = "your-actual-database-id-here"
```

### 1.3 Initialize Database Schema
```bash
wrangler d1 execute knowledge-search-db --file=./schema.sql
```

## Step 2: Environment Variables

### 2.1 Set Required Variables
```bash
# OpenAI API Key (required for AI responses)
wrangler secret put OPENAI_API_KEY

# Google OAuth credentials (optional, for Google login)
wrangler secret put GOOGLE_CLIENT_ID
wrangler secret put GOOGLE_CLIENT_SECRET

# Optional: MinIO/S3 credentials for file uploads
wrangler secret put MINIO_ENDPOINT
wrangler secret put MINIO_ACCESS_KEY
wrangler secret put MINIO_SECRET_KEY
```

### 2.2 Update Authentication
In `src/worker/index.ts`, update the login credentials:
```typescript
// Replace with your preferred admin credentials
if (email === 'your-email@domain.com' && password === 'your-secure-password') {
```

## Step 3: Deploy

### 3.1 Install Dependencies
```bash
npm install
```

### 3.2 Build and Deploy
```bash
npm run build
npm run deploy
```

## Step 4: Custom Domain (Optional)

For detailed custom domain setup, see [CUSTOM_DOMAIN_SETUP.md](./CUSTOM_DOMAIN_SETUP.md).

**Quick Steps:**
1. Add your domain to Cloudflare
2. Update nameservers at your registrar
3. Configure custom domain in Workers & Pages
4. Update Google OAuth settings with your new domain

## Step 5: Test Your Deployment

1. Visit your worker URL (provided after deployment)
2. Test the search functionality
3. Login with your admin credentials at `/login`
4. Test admin features (add knowledge, upload files)

## Environment Variables Reference

| Variable | Required | Description |
|----------|----------|-------------|
| `OPENAI_API_KEY` | Yes | OpenAI API key for AI responses |
| `GOOGLE_CLIENT_ID` | No | Google OAuth client ID for Google login |
| `GOOGLE_CLIENT_SECRET` | No | Google OAuth client secret for Google login |
| `MINIO_ENDPOINT` | No | MinIO/S3 endpoint for file storage |
| `MINIO_ACCESS_KEY` | No | MinIO/S3 access key |
| `MINIO_SECRET_KEY` | No | MinIO/S3 secret key |

## Troubleshooting

### Database Issues
```bash
# Check database status
wrangler d1 info knowledge-search-db

# View database contents
wrangler d1 execute knowledge-search-db --command="SELECT * FROM knowledge_entries LIMIT 5"
```

### Deployment Issues
```bash
# Check deployment logs
wrangler tail

# Dry run deployment
npm run check
```

### Local Development
```bash
# Run locally with Wrangler
npm run dev
```

## Security Notes

1. **Change default admin credentials** before deploying
2. **Use strong passwords** for admin access
3. **Keep API keys secure** - never commit them to version control
4. **Consider implementing proper user management** for production use

## Google OAuth Setup

For Google authentication, see [GOOGLE_OAUTH_SETUP.md](./GOOGLE_OAUTH_SETUP.md) for detailed instructions.

## Next Steps

- Set up monitoring and analytics
- Configure Google OAuth (see GOOGLE_OAUTH_SETUP.md)
- Add rate limiting for API endpoints
- Set up automated backups for your D1 database
- Configure custom error pages
- Implement user access control and role management