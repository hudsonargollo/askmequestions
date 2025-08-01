# Custom Domain Setup Guide

This guide will help you configure a custom domain for your knowledge search app deployed on Cloudflare Workers.

## Prerequisites

- Your app deployed to Cloudflare Workers
- A domain name you own
- Access to your domain registrar's DNS settings

## Method 1: Using Cloudflare as Your DNS Provider (Recommended)

This is the easiest method and provides the best performance and features.

### Step 1: Add Your Domain to Cloudflare

1. **Login to Cloudflare Dashboard**
   - Go to [dash.cloudflare.com](https://dash.cloudflare.com)
   - Click "Add a Site"

2. **Enter Your Domain**
   - Type your domain (e.g., `yourdomain.com`)
   - Click "Add Site"

3. **Choose a Plan**
   - Select "Free" plan (sufficient for most use cases)
   - Click "Continue"

4. **Review DNS Records**
   - Cloudflare will scan your existing DNS records
   - Review and confirm they're correct
   - Click "Continue"

5. **Update Nameservers**
   - Cloudflare will provide you with 2 nameservers (e.g., `alice.ns.cloudflare.com`, `bob.ns.cloudflare.com`)
   - Go to your domain registrar (GoDaddy, Namecheap, etc.)
   - Replace your current nameservers with Cloudflare's nameservers
   - Save changes (can take 24-48 hours to propagate)

### Step 2: Configure Custom Domain for Workers

1. **Go to Workers & Pages**
   - In Cloudflare dashboard, click "Workers & Pages"
   - Find your deployed app and click on it

2. **Add Custom Domain**
   - Click the "Triggers" tab
   - In the "Custom Domains" section, click "Add Custom Domain"
   - Enter your domain or subdomain (e.g., `app.yourdomain.com` or `yourdomain.com`)
   - Click "Add Custom Domain"

3. **SSL Certificate**
   - Cloudflare will automatically provision an SSL certificate
   - This usually takes a few minutes

### Step 3: Configure DNS (if needed)

If you want to use a subdomain (recommended):

1. **Go to DNS Settings**
   - In Cloudflare dashboard, click "DNS" > "Records"
   - Add a CNAME record:
     - **Type**: CNAME
     - **Name**: `app` (for app.yourdomain.com)
     - **Target**: `your-worker-name.your-subdomain.workers.dev`
     - **Proxy status**: Proxied (orange cloud)

## Method 2: Using External DNS Provider

If you prefer to keep your DNS with your current provider:

### Step 1: Get Your Worker URL
- Note your worker URL (e.g., `your-app.your-subdomain.workers.dev`)

### Step 2: Configure DNS at Your Provider
1. **Add CNAME Record**
   - **Host/Name**: `app` (for app.yourdomain.com) or `@` (for yourdomain.com)
   - **Value/Target**: `your-worker-name.your-subdomain.workers.dev`
   - **TTL**: 300 (5 minutes)

### Step 3: Add Custom Domain in Cloudflare
1. Go to Workers & Pages > Your App > Triggers
2. Add Custom Domain as described in Method 1, Step 2

## Step 4: Update OAuth Configuration

After your domain is configured, update your Google OAuth settings:

### Update Google Console
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Navigate to APIs & Services > Credentials
3. Edit your OAuth 2.0 Client ID
4. Update **Authorized JavaScript origins**:
   - Add: `https://yourdomain.com` (or your subdomain)
5. Update **Authorized redirect URIs**:
   - Add: `https://yourdomain.com/api/auth/google/callback`
6. Save changes

### Update Environment Variables (if needed)
If your app needs to know its own domain:
```bash
wrangler secret put APP_DOMAIN
# Enter: https://yourdomain.com
```

## Step 5: Test Your Setup

### DNS Propagation Check
```bash
# Check if DNS is propagated
nslookup yourdomain.com
dig yourdomain.com

# Or use online tools:
# https://www.whatsmydns.net/
# https://dnschecker.org/
```

### Test Your App
1. Visit `https://yourdomain.com`
2. Test the search functionality
3. Test Google OAuth login
4. Verify admin features work

## Troubleshooting

### Common Issues

1. **"This site can't be reached" Error**
   - **Cause**: DNS not propagated yet
   - **Solution**: Wait 24-48 hours, or check DNS propagation tools

2. **SSL Certificate Error**
   - **Cause**: Certificate not provisioned yet
   - **Solution**: Wait a few minutes, then try again

3. **OAuth Redirect URI Mismatch**
   - **Cause**: Google OAuth not updated with new domain
   - **Solution**: Update Google Console settings (Step 4)

4. **Mixed Content Warnings**
   - **Cause**: HTTP resources on HTTPS page
   - **Solution**: Ensure all resources use HTTPS

### Debug Commands

```bash
# Check SSL certificate
openssl s_client -connect yourdomain.com:443 -servername yourdomain.com

# Check HTTP headers
curl -I https://yourdomain.com

# Test specific endpoints
curl https://yourdomain.com/api/filters
```

## Advanced Configuration

### Subdomain vs Root Domain

**Subdomain (Recommended):**
- `app.yourdomain.com`
- Easier to manage
- Can use root domain for marketing site

**Root Domain:**
- `yourdomain.com`
- Cleaner URLs
- Requires CNAME flattening (Cloudflare handles this)

### Multiple Environments

Set up different subdomains for different environments:
- `app.yourdomain.com` - Production
- `staging.yourdomain.com` - Staging
- `dev.yourdomain.com` - Development

### Custom Error Pages

Create custom error pages in Cloudflare:
1. Go to "Custom Pages" in Cloudflare dashboard
2. Customize 404, 500, and other error pages

### Analytics and Monitoring

Enable Cloudflare Analytics:
1. Go to "Analytics & Logs" > "Web Analytics"
2. Enable analytics for your domain
3. Add the analytics script to your app (optional)

## Security Considerations

### HTTPS Only
- Always use HTTPS in production
- Cloudflare provides free SSL certificates
- Enable "Always Use HTTPS" in SSL/TLS settings

### Security Headers
Consider adding security headers in your worker:
```typescript
// Add to your worker responses
const securityHeaders = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
  'Referrer-Policy': 'strict-origin-when-cross-origin'
};
```

### Rate Limiting
Enable rate limiting in Cloudflare:
1. Go to "Security" > "WAF"
2. Create rate limiting rules for your API endpoints

## Performance Optimization

### Caching
Configure caching rules:
1. Go to "Caching" > "Page Rules"
2. Set appropriate cache levels for static assets
3. Bypass cache for API endpoints

### Compression
Enable compression:
1. Go to "Speed" > "Optimization"
2. Enable Brotli compression
3. Enable Auto Minify for CSS, JS, HTML

## Monitoring

### Uptime Monitoring
Set up monitoring:
1. Use Cloudflare's built-in analytics
2. Consider external monitoring (UptimeRobot, Pingdom)
3. Set up alerts for downtime

### Performance Monitoring
- Monitor Core Web Vitals
- Track API response times
- Monitor error rates

## Next Steps

After your domain is configured:
1. Update all documentation with your new domain
2. Set up monitoring and alerts
3. Configure backup and disaster recovery
4. Plan for scaling and load testing
5. Set up proper logging and analytics

## Support

If you encounter issues:
1. Check Cloudflare's status page
2. Review Cloudflare documentation
3. Contact Cloudflare support (if needed)
4. Check community forums

Remember: DNS changes can take up to 48 hours to fully propagate worldwide, so be patient if your domain doesn't work immediately!