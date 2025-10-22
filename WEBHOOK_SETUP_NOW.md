# Quick Setup Guide - Deploy & Configure Webhook

**You Have**: 
✅ Vercel account  
✅ Domain crowdai.ca (GoDaddy)  
✅ Live Stripe keys configured  
✅ App running locally

**Goal**: Deploy to production and activate Stripe webhooks

---

## 🚀 Step 1: Deploy to Vercel (5 minutes)

### In Your Terminal (Chat directory):

```bash
cd Chat

# Install Vercel CLI (if not already installed)
npm install -g vercel

# Login to Vercel
vercel login

# Deploy (follow prompts)
vercel
```

**During deployment, answer these prompts**:
- Set up and deploy? **Y**
- Which scope? **Select your account**
- Link to existing project? **N**
- Project name? **crowdai** (or press enter)
- Directory? **./** (press enter)
- Override settings? **N**

Vercel will give you a URL like: `https://crowdai-xyz123.vercel.app`

---

## 🔧 Step 2: Add Environment Variables to Vercel

### Option A: Via Vercel Dashboard (Easier)

1. Go to: https://vercel.com/dashboard
2. Click your **crowdai** project
3. Click **Settings** → **Environment Variables**
4. Add each variable (copy from your `.env` file):

```
MONGODB_URI = mongodb+srv://rhroofer98_db_user:ilovefatchicks@cluster0.ewhwa6.mongodb.net/crowdai?retryWrites=true&w=majority&appName=Cluster0

JWT_SECRET = crowdai_jwt_secret_key_2025_super_secure_random_string_do_not_share_ever_64chars

STRIPE_SECRET_KEY = your-stripe-secret-key-here

STRIPE_PUBLISHABLE_KEY = pk_live_51SKa97IoiCSUPu0UWxjGARUdK35RuoA0MRZuABmAcqk2eYaY7WFDQ8q9y0xckHdwVEiQ2YfPrLWPBdrBN14AdhTl00vRDeRpc9

STRIPE_WEBHOOK_SECRET = (we'll add this after webhook setup)

ANTHROPIC_API_KEY = [your key]
OPENAI_API_KEY = [your key]
GEMINI_API_KEY = [your key]
TOGETHER_API_KEY = [your key]
OPENROUTER_API_KEY = [your key]
XAI_API_KEY = [your key]
FIRECRAWL_API_KEY = [your key]
LEONARDO_API_KEY = [your key]
```

5. Click **Save** after each one
6. Click **Redeploy** to apply changes

### Option B: Via CLI (Faster)

```bash
# In Chat directory
vercel env add MONGODB_URI
# Paste value, press enter
# Select Production + Preview environments

# Repeat for each variable
vercel env add JWT_SECRET
vercel env add STRIPE_SECRET_KEY
vercel env add STRIPE_PUBLISHABLE_KEY
# ... etc

# Redeploy with new variables
vercel --prod
```

---

## 🌐 Step 3: Connect crowdai.ca Domain

### In Vercel Dashboard:

1. Go to your project: https://vercel.com/dashboard
2. Click **Settings** → **Domains**
3. Click **Add Domain**
4. Enter: `crowdai.ca`
5. Click **Add**

Vercel will show you DNS records to add.

### In GoDaddy:

1. Go to: https://dcc.godaddy.com/domains
2. Click **crowdai.ca**
3. Click **DNS** → **Manage**
4. Add Vercel's DNS records (they'll look like):
   ```
   Type: A
   Name: @
   Value: 76.76.21.21
   
   Type: CNAME
   Name: www
   Value: cname.vercel-dns.com
   ```
5. Save changes (wait 5-60 minutes for DNS propagation)

---

## ⚡ Step 4: Configure Stripe Webhook

**Once your domain is live at `https://crowdai.ca`:**

### In Stripe Dashboard (where you are now):

1. Click **"Add destination"** button
2. Enter webhook URL:
   ```
   https://crowdai.ca/api/payments/webhook
   ```
3. Click **"Select events"**
4. Add these 4 events:
   - ✅ `checkout.session.completed`
   - ✅ `customer.subscription.updated`
   - ✅ `customer.subscription.deleted`
   - ✅ `invoice.payment_failed`
5. Click **"Add endpoint"**
6. **IMPORTANT**: Copy the **Signing secret** (starts with `whsec_...`)

### Add Webhook Secret to Vercel:

```bash
# In terminal
vercel env add STRIPE_WEBHOOK_SECRET

# Paste the whsec_... secret
# Select Production environment

# Redeploy
vercel --prod
```

**OR** via Dashboard:
1. Vercel → Settings → Environment Variables
2. Add: `STRIPE_WEBHOOK_SECRET` = `whsec_...`
3. Click **Redeploy**

---

## ✅ Step 5: Test Everything

### Test the Deployed App:

1. Go to: `https://crowdai.ca`
2. Create a new user account
3. Click **"Upgrade"** button
4. Select a tier (use test mode first!)
5. Complete Stripe checkout
6. Verify you're redirected back
7. Check if tier upgraded

### Check Webhook Status:

1. In Stripe Dashboard: **Webhooks** → Your endpoint
2. You should see:
   - ✅ Green status
   - Recent events
   - `200 OK` responses

---

## 🎯 Quick Checklist

- [ ] Deployed to Vercel (`vercel`)
- [ ] Added all environment variables
- [ ] Connected crowdai.ca domain
- [ ] Waited for DNS propagation
- [ ] Created Stripe webhook with production URL
- [ ] Added webhook secret to Vercel
- [ ] Redeployed app
- [ ] Tested signup and login
- [ ] Tested payment flow
- [ ] Verified tier upgrade works

---

## 🐛 If Something Doesn't Work:

**App not deploying?**
```bash
# Check build locally first
npm run build

# If successful, deploy again
vercel --prod
```

**Domain not working?**
- Wait 5-60 minutes for DNS
- Check: https://dnschecker.org
- Clear browser cache

**Webhook failing?**
- Verify URL is: `https://crowdai.ca/api/payments/webhook`
- Check webhook secret matches Vercel env variable
- Look at webhook logs in Stripe dashboard

---

## 📞 Current Status

✅ App ready for deployment  
✅ Stripe keys configured  
✅ Domain purchased  
⏳ Need to: Deploy to Vercel  
⏳ Need to: Configure webhook

**You're almost done! Just follow the steps above and you'll be live! 🚀**