# Simple 3-Step Deployment Process

I've prepared everything for you. Just follow these 3 steps:

---

## Step 1: Deploy to Vercel (You need to do this)

Open a NEW terminal in the Chat folder and run:

```bash
cd Chat

# Login to Vercel (opens browser)
vercel login

# Deploy with one command
vercel --prod
```

**What will happen**:
- Browser opens for Vercel login
- You authorize the CLI
- Vercel asks a few questions:
  - "Set up and deploy?" → Press **Enter** (Yes)
  - "Which scope?" → Press **Enter** (your account)
  - "Link to existing project?" → Type **N** and press **Enter**
  - "What's your project's name?" → Type **crowdai** and press **Enter**
  - "In which directory is your code located?" → Press **Enter** (current directory)

Vercel will deploy and give you a URL like: `https://crowdai-xyz123.vercel.app`

---

## Step 2: Add Environment Variables

### Go to Vercel Dashboard:
https://vercel.com/dashboard

### Click your "crowdai" project → Settings → Environment Variables

### Add each of these (copy from your .env file):

```
MONGODB_URI
JWT_SECRET
STRIPE_SECRET_KEY
STRIPE_PUBLISHABLE_KEY
ANTHROPIC_API_KEY
OPENAI_API_KEY
GEMINI_API_KEY
TOGETHER_API_KEY
OPENROUTER_API_KEY
XAI_API_KEY
FIRECRAWL_API_KEY
LEONARDO_API_KEY
```

For each one:
1. Click "Add New"
2. Name: (variable name)
3. Value: (paste from .env)
4. Select: Production + Preview
5. Click "Save"

### After adding all, click "Redeploy" button

---

## Step 3: Configure Domain & Webhook

### A. Connect Domain (Vercel Dashboard):
1. Still in your project → Settings → Domains
2. Click "Add Domain"
3. Type: `crowdai.ca`
4. Vercel shows DNS records

### B. Update DNS (GoDaddy):
1. Go to: https://dcc.godaddy.com/domains
2. Click "crowdai.ca"
3. Click "DNS" → "Manage"
4. Add the records Vercel showed you
5. Wait 10-30 minutes

### C. Configure Stripe Webhook:
**In the Stripe tab you have open:**
1. Click "Add destination" 
2. URL: `https://crowdai.ca/api/payments/webhook`
3. Select events:
   - checkout.session.completed
   - customer.subscription.updated
   - customer.subscription.deleted
   - invoice.payment_failed
4. Click "Add endpoint"
5. Copy the webhook secret (`whsec_...`)

### D. Add Webhook Secret to Vercel:
1. Back to Vercel Dashboard → Environment Variables
2. Add: `STRIPE_WEBHOOK_SECRET` = (paste the whsec_ secret)
3. Click "Redeploy"

---

## ✅ You're Done!

Visit: **https://crowdai.ca**

Test by:
1. Creating an account
2. Clicking "Upgrade"
3. Completing a test payment

---

**If you get stuck on any step, let me know which one and I'll help!**