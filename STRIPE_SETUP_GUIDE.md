# Stripe Live Mode Setup Guide

**Status**: Live API keys configured ✅  
**Last Updated**: 2025-10-21

---

## ✅ Completed Steps

1. **Live API Keys Configured**:
   - `STRIPE_SECRET_KEY`: sk_live_51SKa97... ✅
   - `STRIPE_PUBLISHABLE_KEY`: pk_live_51SKa97... ✅

2. **Server Restarted**: Vite automatically detected .env changes and restarted ✅

---

## 🔧 Final Setup Step: Configure Webhook

### Why Webhooks Are Critical:
Webhooks allow Stripe to notify your server when subscription events occur (payments, cancellations, failures). Without this, tier upgrades won't work.

### Step-by-Step Instructions:

#### 1. Access Stripe Dashboard
- Go to: https://dashboard.stripe.com
- Make sure you're in **Live mode** (toggle in top-right corner)

#### 2. Navigate to Webhooks
```
Dashboard → Developers → Webhooks → Add endpoint
```

#### 3. Configure Endpoint URL
**For Production (HTTPS required)**:
```
https://yourdomain.com/api/payments/webhook
```

**For Local Testing** (requires Stripe CLI):
```
http://localhost:3001/api/payments/webhook
```

#### 4. Select Events to Listen For
Click "Select events" and add these **4 critical events**:

```
✅ checkout.session.completed
✅ customer.subscription.updated
✅ customer.subscription.deleted
✅ invoice.payment_failed
```

**What each event does**:
- `checkout.session.completed`: User completed payment → Upgrade their tier
- `customer.subscription.updated`: Subscription changed → Update status in DB
- `customer.subscription.deleted`: User canceled → Downgrade to free at period end
- `invoice.payment_failed`: Payment failed → Mark subscription as past_due

#### 5. Save Endpoint
Click "Add endpoint" to save.

#### 6. Copy Webhook Secret
After saving, you'll see a **"Signing secret"** starting with `whsec_...`

Copy this secret and update your `.env` file:
```env
STRIPE_WEBHOOK_SECRET=whsec_YOUR_ACTUAL_SECRET_HERE
```

#### 7. Restart Server
After updating `.env`, restart your backend server:
```bash
# Stop server (Ctrl+C in terminal)
# Then restart:
npm run server
```

---

## 🧪 Testing Your Setup

### Test with Stripe Test Cards (in Test Mode):

1. **Switch to Test Mode** in Stripe dashboard
2. **Create test webhook** pointing to your local server
3. **Use test cards**:
   ```
   Success: 4242 4242 4242 4242
   Decline: 4000 0000 0000 0002
   Requires Auth: 4000 0025 0000 3155
   ```

### Test Flow:

1. **Register a new user** in your app
2. **Click "Upgrade"** button
3. **Select Standard tier**
4. **Complete checkout** with test card
5. **Verify**:
   - Webhook received in Stripe dashboard
   - User tier upgraded in MongoDB
   - Usage limits increased
   - Access to new AIs enabled

### Check Webhook Logs:

In Stripe Dashboard:
```
Developers → Webhooks → Your Endpoint → Events
```

You should see:
- ✅ `checkout.session.completed` - Succeeded
- Response: `200 OK`

---

## 🚨 Important Security Notes

### Production Checklist:

- ✅ Live API keys configured
- ⏳ Webhook endpoint configured (PENDING)
- ⚠️ **HTTPS Required**: Stripe requires HTTPS for live webhooks
- ⚠️ **Webhook Signature Verification**: Already implemented in code
- ⚠️ **Environment Variables**: Never commit .env to git

### SSL Certificate:

For production, you **MUST** have HTTPS. Options:
1. **Let's Encrypt** (Free): https://letsencrypt.org
2. **Cloudflare SSL** (Free): https://cloudflare.com
3. **AWS Certificate Manager** (Free on AWS)

---

## 🐛 Troubleshooting

### Webhook Not Working?

**Check these**:
1. Is webhook URL correct?
   ```bash
   # Test endpoint manually:
   curl -X POST https://yourdomain.com/api/payments/webhook
   ```

2. Is STRIPE_WEBHOOK_SECRET correct in .env?
   ```bash
   # Verify it starts with whsec_
   echo $STRIPE_WEBHOOK_SECRET
   ```

3. Are events configured correctly?
   - Go to webhook settings
   - Verify all 4 events are selected

4. Check server logs:
   ```bash
   # Look for webhook logs:
   tail -f server.log
   ```

### Common Errors:

**Error**: "No signatures found matching the expected signature for payload"
- **Fix**: Wrong webhook secret in .env

**Error**: "404 Not Found"
- **Fix**: Incorrect webhook URL path

**Error**: "Webhook signature verification failed"
- **Fix**: Check that you're using the correct webhook secret for your mode (test vs live)

---

## 📊 Monitoring Webhooks

### View Webhook Activity:

```
Stripe Dashboard → Developers → Webhooks → [Your Endpoint]
```

You can see:
- Recent events
- Response times
- Success/failure rates
- Retry attempts

### Server Logs:

Your server logs webhook activity:
```
✅ [WEBHOOK] checkout.session.completed processed
✅ User upgraded to standard tier
✅ [WEBHOOK] customer.subscription.updated processed
```

---

## 🎯 Production Launch Checklist

Before going live:

- [ ] Live API keys configured in .env ✅
- [ ] Webhook endpoint created in Stripe Dashboard
- [ ] Webhook secret added to .env
- [ ] HTTPS certificate installed
- [ ] Test payment flow end-to-end
- [ ] Verify webhook events are being received
- [ ] Check user tier is upgraded after payment
- [ ] Test subscription cancellation
- [ ] Test payment failure handling
- [ ] Set up error monitoring (Sentry, DataDog)
- [ ] Configure backup webhook endpoint (recommended)

---

## 📞 Support

**Stripe Support**:
- Dashboard → Help → Contact Support
- Documentation: https://stripe.com/docs/webhooks

**CrowdAI Support**:
- Email: support@crowdai.com
- Documentation: `/Chat/COMPLETE_FEATURES.md`

---

## ✅ Next Steps

1. **Set up webhook endpoint** in Stripe Dashboard (follow instructions above)
2. **Update STRIPE_WEBHOOK_SECRET** in .env
3. **Restart server**
4. **Test payment flow** with test card
5. **Go live!** 🚀

---

**Once webhook is configured, your payment system will be fully operational!**