# Google OAuth Setup Guide

This guide will help you set up Google OAuth authentication for your knowledge search app.

## Step 1: Create Google OAuth Credentials

### 1.1 Go to Google Cloud Console
1. Visit [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the Google+ API (if not already enabled)

### 1.2 Configure OAuth Consent Screen
1. Go to **APIs & Services** > **OAuth consent screen**
2. Choose **External** user type (unless you have a Google Workspace)
3. Fill in the required information:
   - **App name**: Your app name (e.g., "Knowledge Search App")
   - **User support email**: Your email
   - **Developer contact information**: Your email
4. Add your domain to **Authorized domains** (e.g., `yourdomain.com`)
5. Save and continue through the scopes and test users sections

### 1.3 Create OAuth Credentials
1. Go to **APIs & Services** > **Credentials**
2. Click **Create Credentials** > **OAuth 2.0 Client IDs**
3. Choose **Web application**
4. Configure:
   - **Name**: Your app name
   - **Authorized JavaScript origins**: 
     - `https://yourdomain.com` (your production domain)
     - `https://your-worker-name.your-subdomain.workers.dev` (your worker URL)
     - `http://localhost:8787` (for local development)
   - **Authorized redirect URIs**:
     - `https://yourdomain.com/api/auth/google/callback`
     - `https://your-worker-name.your-subdomain.workers.dev/api/auth/google/callback`
     - `http://localhost:8787/api/auth/google/callback`
5. Click **Create**
6. Copy the **Client ID** and **Client Secret**

**Note**: Replace `yourdomain.com` with your actual domain and `your-worker-name.your-subdomain.workers.dev` with your actual worker URL.

## Step 2: Configure Your App

### 2.1 Set Environment Variables
```bash
# Set your Google OAuth credentials
wrangler secret put GOOGLE_CLIENT_ID
# Paste your Google Client ID when prompted

wrangler secret put GOOGLE_CLIENT_SECRET
# Paste your Google Client Secret when prompted
```

### 2.2 Update Domain Configuration
If you're using a custom domain:
1. Follow the [CUSTOM_DOMAIN_SETUP.md](./CUSTOM_DOMAIN_SETUP.md) guide first
2. Update the authorized origins and redirect URIs in Google Console with your custom domain
3. Ensure your domain is properly configured in Cloudflare

## Step 3: Test the Integration

### 3.1 Local Testing
```bash
# Start local development
npm run dev

# Visit http://localhost:8787/login
# Try the "Continue with Google" button
```

### 3.2 Production Testing
1. Deploy your app: `npm run deploy`
2. Visit your production URL
3. Test Google OAuth login

## Step 4: User Management

### 4.1 Understanding User Data
When users log in with Google, the app receives:
- `id`: Google user ID
- `email`: User's email address
- `name`: User's display name
- `picture`: Profile picture URL
- `provider`: Set to 'google'

### 4.2 Admin Access Control
By default, any user with a Google account can log in. To restrict access:

1. **Option A: Email Whitelist** (Recommended)
   Update `src/worker/index.ts` in the Google callback:
   ```typescript
   // Add after getting googleUser
   const allowedEmails = [
     'admin@yourdomain.com',
     'user@yourdomain.com'
   ];
   
   if (!allowedEmails.includes(googleUser.email)) {
     return c.redirect('/?error=access_denied');
   }
   ```

2. **Option B: Domain Restriction**
   ```typescript
   // Allow only users from your domain
   const allowedDomain = 'yourdomain.com';
   
   if (!googleUser.email.endsWith(`@${allowedDomain}`)) {
     return c.redirect('/?error=access_denied');
   }
   ```

## Step 5: Security Considerations

### 5.1 State Parameter
The current implementation generates a random state parameter but doesn't validate it. For production, consider:
```typescript
// Store state in a temporary cache/database
// Validate state parameter in callback
```

### 5.2 HTTPS Only
- Always use HTTPS in production
- Google OAuth requires HTTPS for redirect URIs (except localhost)

### 5.3 Session Security
- Sessions are stored in memory (resets on worker restart)
- For production, consider storing sessions in D1 database or KV storage

## Troubleshooting

### Common Issues

1. **"redirect_uri_mismatch" error**
   - Check that your redirect URI exactly matches what's configured in Google Console
   - Ensure you're using the correct protocol (http/https)

2. **"access_blocked" error**
   - Your OAuth consent screen might need verification
   - Add test users in Google Console for testing

3. **"oauth_not_configured" error**
   - Environment variables not set correctly
   - Run `wrangler secret list` to verify secrets are set

4. **Users can't access admin features**
   - Check if your user restriction logic is working correctly
   - Verify the user's email/domain matches your whitelist

### Debug Tips

1. **Check Environment Variables**
   ```bash
   wrangler secret list
   ```

2. **View Logs**
   ```bash
   wrangler tail
   ```

3. **Test Locally**
   ```bash
   npm run dev
   ```

## Advanced Configuration

### Custom Scopes
To request additional Google permissions, update the scope in `src/shared/auth.ts`:
```typescript
scope: 'openid email profile https://www.googleapis.com/auth/calendar.readonly',
```

### Session Persistence
To persist sessions across worker restarts, store them in D1:
```sql
CREATE TABLE user_sessions (
  session_id TEXT PRIMARY KEY,
  user_data TEXT NOT NULL,
  expires_at DATETIME NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### Multiple OAuth Providers
The architecture supports adding more providers (GitHub, Microsoft, etc.) by:
1. Adding provider-specific functions to `src/shared/auth.ts`
2. Adding new endpoints to the worker
3. Updating the React auth context

## Next Steps

- Set up proper session persistence
- Add user role management
- Implement user profile management
- Add audit logging for admin actions
- Consider implementing refresh tokens for long-lived sessions