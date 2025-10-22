# CrowdAI Production Deployment Guide

**Domain**: crowdai.ca (GoDaddy)  
**Current Status**: Running locally  
**Goal**: Deploy to production with Stripe webhooks

---

## 🎯 Deployment Options

You have two paths forward:

### Option A: Quick Deploy to Test (Recommended First)
Use a platform that handles SSL automatically:
- **Vercel** (Easiest, Free tier available)
- **Netlify** (Easy, Free tier available)  
- **Railway** (Very easy for full-stack apps)
- **Render** (Good for backend + frontend)

### Option B: Custom Server
- **VPS** (DigitalOcean, AWS, Linode)
- **Requires**: SSL certificate setup, server configuration
- **More control** but more setup required

---

## 🚀 RECOMMENDED: Deploy to Railway (Easiest Full-Stack)

Railway is perfect for your app because it:
- Handles both frontend (Vite) and backend (Express) 
- Automatically provides HTTPS
- Free to start
- Easy custom domain connection

### Step-by-Step Railway Deployment:

#### 1. Sign Up for Railway
- Go to: https://railway.app
- Sign up with GitHub account (free)

#### 2. Install Railway CLI
```bash
# Install Railway CLI
npm install -g @railway/cli

# Login
railway login
```

#### 3. Initialize Your Project
```bash
cd Chat
railway init
```

#### 4. Add Environment Variables
```bash
# Add all your .env variables to Railway
railway variables set MONGODB_URI="mongodb+srv://rhroofer98_db_user:ilovefatchicks@cluster0.ewhwa6.mongodb.net/crowdai?retryWrites=true&w=majority&appName=Cluster0"

railway variables set JWT_SECRET="crowdai_jwt_secret_key_2025_super_secure_random_string_do_not_share_ever_64chars"

railway variables set STRIPE_SECRET_KEY="your-stripe-secret-key-here"

railway variables set STRIPE_PUBLISHABLE_KEY="pk_live_51SKa97IoiCSUPu0UWxjGARUdK35RuoA0MRZuABmAcqk2eYaY7WFDQ8q9y0xckHdwVEiQ2YfPrLWPBdrBN14AdhTl00vRDeRpc9"

# Add all your AI API keys
railway variables set ANTHROPIC_API_KEY="sk-ant-api03-..."
railway variables set OPENAI_API_KEY="sk-proj-..."
railway variables set GEMINI_API_KEY="AIzaSy..."
railway variables set TOGETHER_API_KEY="tgp_v1_..."
railway variables set OPENROUTER_API_KEY="sk-or-v1-..."
railway variables set XAI_API_KEY="xai-..."
railway variables set FIRECRAWL_API_KEY="fc-..."
railway variables set LEONARDO_API_KEY="80b3eed1-..."
```

#### 5. Deploy
```bash
railway up
```

Railway will give you a URL like: `https://your-app.up.railway.app`

#### 6. Connect Your Domain (crowdai.ca)

**In Railway Dashboard**:
1. Go to your project
2. Click "Settings" → "Domains"
3. Click "Add Domain"
4. Enter: `crowdai.ca` and `www.crowdai.ca`
5. Railway will show you DNS records to add

**In GoDaddy**:
1. Go to: https://dcc.godaddy.com/domains
2. Click your domain `crowdai.ca`
3. Click "DNS" → "Manage Zones"
4. Add the DNS records Railway provided:
   ```
   Type: A
   Name: @
   Value: [Railway IP address]
   
   Type: CNAME
   Name: www
   Value: [Railway domain]
   ```
5. Save changes (DNS propagation takes 5-60 minutes)

---

## 🔗 Configure Stripe Webhook

Once your app is deployed at `https://crowdai.ca`:

### 1. In Stripe Dashboard
- Go to: https://dashboard.stripe.com
- Click: **Developers** → **Webhooks** → **Add endpoint**

### 2. Enter Webhook URL
```
https://crowdai.ca/api/payments/webhook
```

### 3. Select Events
Select these 4 events:
- ✅ `checkout.session.completed`
- ✅ `customer.subscription.updated`
- ✅ `customer.subscription.deleted`
- ✅ `invoice.payment_failed`

### 4. Save and Get Secret
- Click "Add endpoint"
- Copy the **Signing secret** (starts with `whsec_...`)

### 5. Add Secret to Railway
```bash
railway variables set STRIPE_WEBHOOK_SECRET="whsec_YOUR_SECRET_HERE"
```

### 6. Redeploy
```bash
railway up
```

---

## 🧪 Testing Locally (Alternative)

If you want to test webhooks on localhost BEFORE deploying:

### Install Stripe CLI

**Windows**:
```bash
# Download from: https://github.com/stripe/stripe-cli/releases/latest
# Or use Scoop:
scoop bucket add stripe https://github.com/stripe/scoop-stripe-cli.git
scoop install stripe
```

**Mac**:
```bash
brew install stripe/stripe-cli/stripe
```

### Login to Stripe
```bash
stripe login
```

### Forward Webhooks to Localhost
```bash
# This creates a tunnel from Stripe to your local server
stripe listen --forward-to localhost:3001/api/payments/webhook
```

You'll get a webhook secret like: `whsec_...`

### Update .env
```env
STRIPE_WEBHOOK_SECRET=whsec_YOUR_LOCAL_SECRET_HERE
```

### Test a Payment
```bash
# In another terminal
stripe trigger checkout.session.completed
```

---

## 📋 Pre-Deployment Checklist

Before deploying to production:

### Code Preparation
- [x] All environment variables documented
- [x] Live Stripe API keys configured
- [x] MongoDB connection string ready
- [x] All features tested locally
- [ ] Build scripts working (`npm run build`)
- [ ] Dependencies up to date

### Domain & SSL
- [x] Domain purchased (crowdai.ca)
- [ ] DNS configured
- [ ] SSL certificate (automatic with Railway/Vercel)
- [ ] Domain pointing to production server

### Stripe Setup
- [x] Live API keys obtained
- [ ] Webhook endpoint configured
- [ ] Webhook secret added to environment
- [ ] Test payment completed successfully

### Security
- [ ] All API keys secured
- [ ] CORS configured properly
- [ ] Rate limiting enabled (if needed)
- [ ] Backup strategy in place

---

## 🔧 Update Frontend API URL

After deployment, update your frontend to use the production API:

**Option 1**: Environment variable (RECOMMENDED)
```javascript
// In Chat/src/config.js (create this file)
export const API_URL = import.meta.env.PROD 
  ? 'https://crowdai.ca/api'
  : 'http://localhost:3001/api';
```

Then use in your components:
```javascript
import { API_URL } from './config';

fetch(`${API_URL}/auth/login`, ...)
```

**Option 2**: Add to .env files
```env
# .env.development
VITE_API_URL=http://localhost:3001

# .env.production  
VITE_API_URL=https://crowdai.ca
```

---

## 📊 Monitoring & Maintenance

After deployment:

### Check Webhook Health
```
Stripe Dashboard → Webhooks → [Your Endpoint]
```
Look for:
- ✅ Green status indicator
- Recent successful events
- Response times < 1 second

### Monitor Server Logs
```bash
# Railway
railway logs

# Or in Railway dashboard
```

### Test Full Flow
1. Create new user account
2. Login successfully
3. Click "Upgrade" button
4. Complete Stripe checkout
5. Verify tier upgraded
6. Verify usage limits increased
7. Test restricted AI access

---

## 🚨 Troubleshooting

### Domain Not Working?
- Check DNS propagation: https://dnschecker.org
- Wait up to 48 hours (usually 5-60 minutes)
- Clear browser cache
- Try incognito mode

### Webhook Failing?
- Verify endpoint URL is correct (https://crowdai.ca/api/payments/webhook)
- Check webhook secret matches .env
- Look at webhook logs in Stripe dashboard
- Check server logs for errors

### SSL Certificate Issues?
- Railway/Vercel handle this automatically
- For custom server, use Let's Encrypt: https://letsencrypt.org
- Or use Cloudflare (free SSL): https://cloudflare.com

---

## 💰 Cost Estimate

**Monthly Costs**:
- Domain (crowdai.ca): $12-20/year = ~$1.50/month
- Railway/Vercel: FREE for small traffic, $5-20/month for production
- MongoDB Atlas: FREE tier (500MB), $9/month for 2GB
- Stripe: 2.9% + 30¢ per transaction (no monthly fee)

**Total**: $10-30/month for small-medium traffic

---

## 🎉 Launch Checklist

When you're ready to go live:

- [ ] App deployed to crowdai.ca
- [ ] SSL certificate active (HTTPS working)
- [ ] Stripe webhook configured and tested
- [ ] Test payment successful
- [ ] User registration working
- [ ] MongoDB connection stable
- [ ] All 6 AI providers responding
- [ ] Code execution working
- [ ] Chat history syncing
- [ ] Usage tracking accurate
- [ ] Error monitoring set up (optional but recommended)

---

## 📞 Next Steps

1. **Choose deployment platform** (Railway recommended)
2. **Deploy application**
3. **Configure DNS** in GoDaddy
4. **Set up Stripe webhook** with production URL
5. **Test end-to-end** payment flow
6. **Launch!** 🚀

---

**Need help with any step? Just ask!**