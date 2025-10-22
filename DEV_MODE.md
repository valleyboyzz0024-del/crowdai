# DEV MODE - Temporary Authentication Bypass

## ⚠️ WARNING: DEVELOPMENT ONLY

This mode bypasses MongoDB authentication for testing when the database is unavailable. **NEVER use in production!**

## Current Status

✅ **DEV_MODE is ENABLED** - Authentication is bypassed

## What DEV_MODE Does

When `DEV_MODE=true` in `.env`:

1. **Authentication Bypass**: All API requests are treated as coming from a mock Pro tier user
2. **No Query Limits**: Unlimited AI queries (no 200/day restriction)
3. **Full AI Access**: All 6 AI models available (Claude, ChatGPT, Gemini, Llama, DeepSeek, Grok)
4. **Code Execution**: Full access to Docker containerized code execution

## Mock User Details

```javascript
{
  _id: 'dev-user-123',
  email: 'dev@test.com',
  tier: 'pro',
  usage: {
    queriesUsed: 0,
    lastResetDate: new Date()
  },
  limits: {
    queriesPerDay: 200,
    allowedAIs: ['claude', 'chatgpt', 'gemini', 'llama', 'deepseek', 'grok'],
    codeExecution: true,
    apiAccess: true,
    prioritySupport: true
  }
}
```

## Test the Profit-Optimized Platform

Now you can test all the new features:

1. **Open Browser**: Go to http://localhost:5173
2. **Test All 6 AIs**: No authentication required - try Claude, ChatGPT, Gemini, Llama, DeepSeek, Grok
3. **View API Costs**: Check the cost tracker - it persists across page refreshes
4. **Code Execution**: Test Python/JavaScript code execution with Docker sandbox

## Console Logs to Watch For

You'll see these logs confirming DEV_MODE is active:

- `🔓 [DEV MODE] Authentication bypassed - using mock Pro tier user`
- `🔓 [DEV MODE] Query limit check bypassed`
- `🔓 [DEV MODE] AI access check bypassed for [model_name]`

## Return to Production Mode

When MongoDB is working, disable DEV_MODE:

1. Open `Chat/.env`
2. Change `DEV_MODE=true` to `DEV_MODE=false` (or remove the line)
3. Restart backend: `cd Chat && npm run server`

## MongoDB Connection Issue

The current MongoDB issue is due to **IP whitelisting**. To fix:

1. Go to MongoDB Atlas dashboard
2. Navigate to **Network Access**
3. Click **"+ ADD IP ADDRESS"**
4. Select **"ALLOW ACCESS FROM ANYWHERE"** (0.0.0.0/0)
5. Click **"Confirm"**
6. Wait 2-3 minutes for changes to propagate

Once MongoDB is connected, you'll have:
- User authentication with JWT tokens
- Persistent user accounts with tier tracking
- Query usage limits (Free: 10/day, Starter: 50/day, Pro: 200/day, Enterprise: 1000/day)
- Stripe payment integration for tier upgrades
- Chat history saved to MongoDB

## Testing Profit Optimization Features

With DEV_MODE enabled, you can test:

### 1. API Cost Tracking (Already Working)
- Cost tracker persists across page refreshes
- Shows real-time costs per AI model
- Displays total queries and spending

### 2. Tier Pricing (View Only - No Real Payments)
The new profit-optimized pricing:
- **Free**: $0/month - 10 queries/day - Only Gemini, Llama, DeepSeek (cheap AIs)
- **Starter**: $8.99/month - 50 queries/day - Cheap AIs + Grok (90% margin)
- **Pro**: $28.99/month - 200 queries/day - All 6 AIs (75% margin)
- **Enterprise**: $98.99/month - 1000 queries/day - All 6 AIs + priority (63% margin)

### 3. Financial Projections
At 100 users with mixed tiers:
- Monthly Revenue: $2,839
- Monthly Costs: $450
- **Monthly Profit: $2,389 (84% margin)**

Compare to old system:
- Old Profit: $1,775 (63% margin)
- **Improvement: +$614/month (+35%)**

## Current Servers

- **Frontend**: http://localhost:5173 (Vite dev server)
- **Backend**: http://localhost:3001 (Express API)

Both servers are running and ready for testing! 🚀