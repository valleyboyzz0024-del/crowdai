# MongoDB Connection Fix Guide

## Current Problem
```
MongoServerSelectionError: connect ETIMEDOUT
```

Your server can't reach MongoDB Atlas. This is a **network/firewall issue**, not a code problem.

## Solution: Whitelist Your IP in MongoDB Atlas

### Step 1: Go to MongoDB Atlas
1. Open https://cloud.mongodb.com
2. Login with your account
3. Click on your project (should have `Cluster0`)

### Step 2: Add Your IP to Whitelist
1. Click **"Network Access"** in the left sidebar
2. Click **"Add IP Address"** button
3. Choose one:
   - **Option A (Recommended for Testing)**: Click "Allow Access From Anywhere" → Adds `0.0.0.0/0`
   - **Option B (More Secure)**: Add your current IP address

4. Click **"Confirm"**
5. Wait 1-2 minutes for changes to apply

### Step 3: Restart Server
```bash
cd Chat && npm run server
```

## Alternative: Check Firewall

### Windows Firewall:
1. Open Windows Defender Firewall
2. Click "Allow an app through firewall"
3. Find Node.js and check both Private and Public
4. Save and restart server

### Antivirus:
- Temporarily disable antivirus
- Test if MongoDB connects
- If it works, add Node.js to antivirus exceptions

## Test MongoDB Connection

Run this test:
```bash
cd Chat
node -e "const mongoose = require('mongoose'); mongoose.connect(process.env.MONGODB_URI || 'mongodb+srv://rhroofer98_db_user:ilovefatchicks@cluster0.ewhwa6.mongodb.net/crowdai?retryWrites=true&w=majority').then(() => { console.log('✅ MongoDB Connected!'); process.exit(0); }).catch(err => { console.error('❌ MongoDB Error:', err.message); process.exit(1); });"
```

## If Still Not Working

### Check Internet Connection
```bash
ping google.com
```

### Try Different Network
- Switch from WiFi to Ethernet (or vice versa)
- Try mobile hotspot
- Try different internet connection

### Contact MongoDB Support
If none of these work, your ISP might be blocking MongoDB ports (27017).

## Quick Temporary Fix: Use Local MongoDB

If you need to test immediately:

1. Install MongoDB locally:
   - Windows: https://www.mongodb.com/try/download/community
   - Or use Docker: `docker run -d -p 27017:27017 mongo`

2. Update `.env`:
   ```
   MONGODB_URI=mongodb://localhost:27017/crowdai
   ```

3. Restart server

This will work offline but you'll lose cloud sync.

---

**Most Common Solution**: Add `0.0.0.0/0` to MongoDB Atlas Network Access and wait 2 minutes.