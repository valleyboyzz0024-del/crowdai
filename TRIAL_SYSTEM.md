# Free Trial System Documentation

## Overview

The CrowdAI Chat platform includes a flexible trial system that allows administrators to grant free access to premium tiers (Pro or Enterprise) for specified durations. The trial automatically reverts users to their original tier when it expires.

## Features

- **Flexible Duration**: Grant trials for 1 week or 1 month
- **Multiple Tiers**: Support for Standard, Pro, and Enterprise trials
- **Automatic Expiration**: Trials automatically revert to original tier
- **Manual Control**: Admins can manually end trials early
- **Usage Reset**: Trial activation resets usage quotas
- **Trial Status Tracking**: System tracks trial status and end dates

## How It Works

### 1. Trial Activation

When an admin grants a trial:
1. User's current tier is saved as `originalTier`
2. User is upgraded to the trial tier (typically Pro)
3. `isOnTrial` flag is set to `true`
4. `trialEndDate` is calculated based on duration
5. Usage quotas are reset to allow full trial access
6. Subscription status is set to `'trial'`

### 2. Trial Expiration

The system automatically checks for expired trials:
- On every user authentication (login)
- When user data is fetched
- Via the `checkTrialExpiration()` method

When a trial expires:
1. User is downgraded to their `originalTier`
2. `isOnTrial` flag is set to `false`
3. Trial-related fields are cleared
4. Subscription status is updated

## API Endpoints

### Grant Trial

**Endpoint:** `POST /api/admin/grant-trial`

**Authentication:** Required (Admin only)

**Request Body:**
```json
{
  "email": "user@example.com",
  "tier": "pro",
  "duration": 1,
  "durationType": "month"
}
```

**Parameters:**
- `email` (required): User's email address
- `tier` (optional): Trial tier - "standard", "pro", or "enterprise" (default: "pro")
- `duration` (optional): Number of weeks or months (default: 1)
- `durationType` (optional): "week" or "month" (default: "month")

**Response:**
```json
{
  "success": true,
  "message": "Successfully granted 1-month pro trial to user@example.com",
  "user": {
    "email": "user@example.com",
    "username": "johndoe",
    "tier": "pro",
    "originalTier": "free",
    "isOnTrial": true,
    "trialEndDate": "2025-11-21T11:00:00.000Z"
  }
}
```

### End Trial Early

**Endpoint:** `POST /api/admin/end-trial`

**Authentication:** Required (Admin only)

**Request Body:**
```json
{
  "email": "user@example.com"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Successfully ended trial for user@example.com",
  "user": {
    "email": "user@example.com",
    "username": "johndoe",
    "tier": "free",
    "isOnTrial": false
  }
}
```

## Usage Examples

### Example 1: Grant 1-Month Pro Trial

```bash
curl -X POST http://localhost:3001/api/admin/grant-trial \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -d '{
    "email": "user@example.com",
    "tier": "pro",
    "duration": 1,
    "durationType": "month"
  }'
```

### Example 2: Grant 1-Week Pro Trial

```bash
curl -X POST http://localhost:3001/api/admin/grant-trial \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -d '{
    "email": "user@example.com",
    "tier": "pro",
    "duration": 1,
    "durationType": "week"
  }'
```

### Example 3: End Trial Early

```bash
curl -X POST http://localhost:3001/api/admin/end-trial \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -d '{
    "email": "user@example.com"
  }'
```

## Database Schema

### User Model Trial Fields

```javascript
{
  // Trial-specific fields
  isOnTrial: {
    type: Boolean,
    default: false
  },
  trialEndDate: {
    type: Date,
    default: null
  },
  originalTier: {
    type: String,
    enum: ['free', 'standard', 'pro', 'enterprise'],
    default: null
  }
}
```

### User Model Methods

#### checkTrialExpiration()

Automatically checks and processes expired trials:

```javascript
userSchema.methods.checkTrialExpiration = async function() {
  if (this.isOnTrial && this.trialEndDate) {
    const now = new Date();
    
    if (now >= this.trialEndDate) {
      // Trial has expired - revert to original tier
      this.tier = this.originalTier || 'free';
      this.isOnTrial = false;
      this.trialEndDate = null;
      this.originalTier = null;
      this.subscriptionStatus = null;
      this.subscriptionStartDate = null;
      this.subscriptionEndDate = null;
      this.billingCycle = null;
      
      await this.save();
      
      console.log(`⏰ Trial expired for user ${this.email} - reverted to ${this.tier}`);
      return true; // Trial was expired
    }
  }
  
  return false; // Trial still active or not on trial
};
```

## Best Practices

### 1. Verify User Exists

Always check that the user exists before granting a trial:
```javascript
const user = await User.findOne({ email: email.toLowerCase() });
if (!user) {
  return res.status(404).json({ error: 'User not found' });
}
```

### 2. Check Existing Trial

Prevent overlapping trials:
```javascript
if (user.isOnTrial) {
  return res.status(400).json({
    error: 'User is already on a trial. End existing trial first.'
  });
}
```

### 3. Save Original Tier

Always save the original tier before upgrading:
```javascript
user.originalTier = user.tier;
```

### 4. Reset Usage Quotas

Reset usage when starting a trial:
```javascript
user.usage.queriesUsed = 0;
user.usage.lastResetDate = now;
user.usage.cooldownUntil = null;
```

### 5. Monitor Expiration

The system automatically checks trials on login, but you can also run periodic checks:
```javascript
// In a cron job or scheduled task
const trialUsers = await User.find({ isOnTrial: true });
for (const user of trialUsers) {
  await user.checkTrialExpiration();
}
```

## Error Handling

### Common Errors

1. **User Not Found**
   ```json
   {
     "success": false,
     "error": "User not found"
   }
   ```

2. **Already On Trial**
   ```json
   {
     "success": false,
     "error": "User is already on a trial. End existing trial first."
   }
   ```

3. **Invalid Tier**
   ```json
   {
     "success": false,
     "error": "Invalid tier. Must be: standard, pro, or enterprise"
   }
   ```

4. **Invalid Duration Type**
   ```json
   {
     "success": false,
     "error": "Invalid durationType. Must be: week or month"
   }
   ```

5. **Not On Trial**
   ```json
   {
     "success": false,
     "error": "User is not on a trial"
   }
   ```

## Admin Access

### Requirements

To use trial management endpoints:
1. User must be authenticated
2. User must have `isAdmin: true` in database
3. Valid JWT token required in Authorization header

### Creating an Admin User

```javascript
// In MongoDB shell or backend script
db.users.updateOne(
  { email: 'admin@example.com' },
  { $set: { isAdmin: true } }
);
```

## Monitoring and Logging

The system logs all trial operations:

- **Grant Trial:** `🎁 Admin granted 1-month pro trial to user@example.com (original tier: free)`
- **End Trial:** `🚫 Admin manually ended trial for user@example.com (restored to free)`
- **Auto-Expire:** `⏰ Trial expired for user user@example.com - reverted to free`

## Integration with Existing Systems

### Authentication Flow

The trial system integrates with the authentication middleware:

```javascript
// In auth.js
const user = await User.findById(userId);
await user.checkTrialExpiration(); // Automatically check on every auth
```

### Subscription Management

Trials work alongside the Stripe subscription system:
- Trial status: `subscriptionStatus: 'trial'`
- Paid status: `subscriptionStatus: 'active'`
- Users on trial cannot have Stripe subscriptions

## Future Enhancements

Potential improvements:
1. Email notifications when trial expires
2. Trial extension capability
3. Multiple trial types (feature-limited trials)
4. Trial analytics and conversion tracking
5. Automated trial offers based on user behavior
6. Trial reminder emails (3 days before expiration)

## Security Considerations

1. **Admin-Only Access**: Trial management restricted to admin users
2. **Email Validation**: Email addresses validated and normalized
3. **Rate Limiting**: Consider adding rate limits to prevent abuse
4. **Audit Logging**: All trial operations logged for accountability
5. **Token Security**: JWT tokens required for all operations

## Testing

### Test Scenarios

1. **Grant 1-week trial to free user**
2. **Grant 1-month trial to standard user**
3. **Attempt to grant trial to user already on trial** (should fail)
4. **Manually end active trial**
5. **Verify automatic expiration after duration**
6. **Check usage quota reset on trial start**
7. **Verify tier restoration on trial end**

### Manual Testing

```bash
# 1. Grant trial
curl -X POST http://localhost:3001/api/admin/grant-trial \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"email":"test@example.com","durationType":"week"}'

# 2. Verify user upgraded
curl http://localhost:3001/api/auth/me \
  -H "Authorization: Bearer USER_TOKEN"

# 3. End trial
curl -X POST http://localhost:3001/api/admin/end-trial \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"email":"test@example.com"}'

# 4. Verify user downgraded
curl http://localhost:3001/api/auth/me \
  -H "Authorization: Bearer USER_TOKEN"
```

## Support

For issues or questions about the trial system:
1. Check server logs for error messages
2. Verify admin permissions are set correctly
3. Ensure MongoDB is running and accessible
4. Review this documentation for proper API usage

---

**Last Updated:** October 21, 2025
**Version:** 1.0.0