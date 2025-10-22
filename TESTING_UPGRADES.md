# Testing Tier Upgrades (Local Development)

## Problem
In local development, Stripe webhooks don't work without a tunneling service like ngrok. This means when you complete a payment on Stripe's checkout page and return to your app, the webhook never fires and your account tier isn't updated.

## Solution: Test Mode

We've added a **Test Mode** feature that allows you to test tier upgrades without going through Stripe.

---

## How to Test Upgrades

### Method 1: Test Mode (Recommended for Development)

1. **Click the "Upgrade" button** in the top-right header
2. **Enable Test Mode** by checking the checkbox at the top of the upgrade modal
3. **Select your tier** (Standard, Pro, or Enterprise)
4. **Click the upgrade button** (e.g., "Test Upgrade to Pro")
5. Your account will be **instantly upgraded** without payment
6. The page will **refresh automatically** with your new permissions

### Method 2: Manual API Call (Advanced)

You can also upgrade directly via API:

```bash
# Get your access token from localStorage
# Then call the manual upgrade endpoint:

curl -X POST http://localhost:3001/api/payments/manual-upgrade \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -d '{
    "tier": "pro",
    "billingCycle": "monthly"
  }'
```

### Method 3: Direct Database Update

Update the user document directly in MongoDB:

```javascript
db.users.updateOne(
  { email: "your@email.com" },
  { 
    $set: { 
      tier: "pro",
      subscriptionStatus: "active",
      subscriptionStartDate: new Date()
    } 
  }
)
```

---

## Tier Features

### Free Tier (Default)
- 25 AI queries per day
- Access to Claude & Gemini only
- Basic features

### Standard Tier ($9.99/month)
- 100 AI queries per day
- Access to Claude, ChatGPT & Gemini
- 2-hour active sessions
- Code execution enabled
- Image generation
- 4-hour cooldown after sessions

### Pro Tier ($29.99/month)
- 500 AI queries per day
- **All 6 AI models** (Claude, ChatGPT, Gemini, Llama, DeepSeek, Grok)
- **Unlimited sessions** (no cooldown)
- **File uploads enabled**
- Advanced code execution
- Image & video generation
- Priority support

### Enterprise Tier ($99.99/month)
- **Unlimited AI queries**
- All 6 AI models
- Everything unlimited
- Priority processing
- Dedicated account manager
- Custom integrations
- SLA guarantees
- 24/7 phone support

---

## Verifying Your Upgrade

After upgrading, check that:

1. **Tier badge in sidebar** shows your new tier
2. **Query limit** has increased (shown in usage bar)
3. **AI models** - All 6 AIs should be available if you upgraded to Pro/Enterprise
4. **Features unlocked**:
   - Pro: Can now upload files, no session cooldowns
   - Enterprise: Unlimited everything

---

## Testing Stripe (Production-like)

To test the actual Stripe integration locally:

### Option 1: Use Stripe CLI
```bash
# Install Stripe CLI
# https://stripe.com/docs/stripe-cli

# Forward webhooks to local server
stripe listen --forward-to localhost:3001/api/payments/webhook

# This will give you a webhook secret - update your .env:
STRIPE_WEBHOOK_SECRET=whsec_...

# Now test payments will trigger webhooks locally
```

### Option 2: Deploy to Vercel
```bash
# Deploy your app
vercel

# Update STRIPE_WEBHOOK_SECRET with production webhook
# Now real webhooks will work
```

---

## Troubleshooting

### "Still have limited access after upgrade"
**Solution**: The page should auto-refresh after upgrade. If not:
1. Manually refresh the page (F5)
2. Check your tier in the sidebar - it should show the new tier
3. If still showing old tier, log out and log back in

### "Test Mode button doesn't appear"
**Cause**: You may already be on Enterprise tier
**Solution**: Can't upgrade beyond Enterprise - you're already at the top!

### "Manual upgrade returns 403"
**Cause**: Manual upgrade is disabled in production
**Solution**: This is by design - use Stripe in production

### Changes not taking effect
1. **Hard refresh** the page (Ctrl+Shift+R or Cmd+Shift+R)
2. **Clear localStorage**: Open DevTools → Application → Local Storage → Clear
3. **Log out and log back in**

---

## Security Notes

⚠️ **Important**: 
- The manual upgrade endpoint is **development-only**
- It checks `process.env.NODE_ENV` and rejects requests in production
- **Never use Test Mode in production** - it bypasses payment
- In production, always use the actual Stripe checkout flow

---

## Production Deployment

When deploying to production:

1. **Set up webhook endpoint** in Stripe Dashboard:
   - URL: `https://your-domain.com/api/payments/webhook`
   - Events: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_failed`

2. **Update environment variables**:
   ```
   NODE_ENV=production
   STRIPE_WEBHOOK_SECRET=whsec_your_production_webhook_secret
   ```

3. **Test Mode will automatically be disabled** (the manual upgrade endpoint returns 403 in production)

4. Real Stripe payments will work and webhooks will update user tiers automatically

---

## Need Help?

- Check server logs for detailed error messages
- Verify your MongoDB connection is working
- Ensure JWT token is valid (not expired)
- Check browser console for errors

**Last Updated**: 2025-01-21