# Quick Domain Setup Reference

## 🚀 Fast Track: Custom Domain Setup

### 1. Add Domain to Cloudflare (5 minutes)
```
1. Go to dash.cloudflare.com
2. Click "Add a Site"
3. Enter your domain → Continue
4. Choose Free plan → Continue
5. Review DNS records → Continue
6. Copy the 2 nameservers provided
```

### 2. Update Nameservers (2 minutes + 24h wait)
```
1. Go to your domain registrar (GoDaddy, Namecheap, etc.)
2. Find DNS/Nameserver settings
3. Replace existing nameservers with Cloudflare's
4. Save changes
⏰ Wait 24-48 hours for propagation
```

### 3. Configure Worker Domain (2 minutes)
```
1. Go to Cloudflare → Workers & Pages
2. Click your app → Triggers tab
3. Custom Domains → Add Custom Domain
4. Enter: app.yourdomain.com (or yourdomain.com)
5. Click Add Custom Domain
✅ SSL certificate auto-generated
```

### 4. Update Google OAuth (3 minutes)
```
1. Go to console.cloud.google.com
2. APIs & Services → Credentials
3. Edit your OAuth 2.0 Client ID
4. Add to Authorized JavaScript origins:
   - https://yourdomain.com
5. Add to Authorized redirect URIs:
   - https://yourdomain.com/api/auth/google/callback
6. Save
```

### 5. Test Your Setup (1 minute)
```
✅ Visit https://yourdomain.com
✅ Test search functionality
✅ Test Google OAuth login
✅ Verify admin features
```

## 🔧 Common Issues & Quick Fixes

| Issue | Quick Fix |
|-------|-----------|
| "Site can't be reached" | Wait for DNS propagation (up to 48h) |
| SSL certificate error | Wait 5-10 minutes for auto-provisioning |
| OAuth redirect mismatch | Update Google Console with new domain |
| Mixed content warnings | Ensure all resources use HTTPS |

## 📋 Checklist

- [ ] Domain added to Cloudflare
- [ ] Nameservers updated at registrar
- [ ] Custom domain configured in Workers
- [ ] SSL certificate active (green padlock)
- [ ] Google OAuth updated
- [ ] App accessible at custom domain
- [ ] Search functionality working
- [ ] Google login working
- [ ] Admin features accessible

## 🆘 Need Help?

- **DNS Propagation**: Check at [whatsmydns.net](https://www.whatsmydns.net/)
- **SSL Issues**: Wait 10 minutes, then contact Cloudflare support
- **OAuth Issues**: Double-check Google Console settings
- **Detailed Guide**: See [CUSTOM_DOMAIN_SETUP.md](./CUSTOM_DOMAIN_SETUP.md)

## 💡 Pro Tips

- Use `app.yourdomain.com` instead of root domain for easier management
- Enable "Always Use HTTPS" in Cloudflare SSL settings
- Set up Cloudflare Analytics for monitoring
- Consider multiple subdomains for staging/dev environments