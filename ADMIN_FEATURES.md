# Admin Features Documentation

## Overview

The CrowdAI Chat platform includes powerful administrative capabilities that are automatically granted to the designated admin email address. Admin users have unlimited access to all features and can manage other users' subscriptions.

---

## Admin Email Configuration

### Designated Admin
- **Email**: `rhroofer98@gmail.com`
- **Auto-Detection**: When this email registers, the account is automatically granted admin privileges
- **Initial Tier**: Enterprise (unlimited access)

### How It Works
```javascript
// In Chat/server/routes/auth.js
const ADMIN_EMAIL = 'rhroofer98@gmail.com';

// During registration
const isAdmin = email.toLowerCase() === ADMIN_EMAIL.toLowerCase();
const user = new User({
  email,
  password,
  username,
  tier: isAdmin ? 'enterprise' : 'free',
  isAdmin
});
```

---

## Admin Privileges

### Unlimited Access
Admin accounts bypass all tier restrictions:

```javascript
// Unlimited query limits
queriesPerDay: Infinity

// Access to all 6 AI providers
allowedAIs: ['claude', 'chatgpt', 'gemini', 'llama', 'deepseek', 'grok']

// All features enabled
codeExecution: true
dataVisualization: true
chatHistory: true
prioritySupport: true
apiAccess: true
customInstructions: true
fileUploads: true
```

### Special UI Elements
1. **Cost Tracking Dashboard** (Admin-Only)
   - Real-time cost monitoring for all AI queries
   - Displayed in the header with provider breakdowns
   - Shows: Claude, ChatGPT, Gemini, Llama, DeepSeek, Grok costs

2. **Admin Panel** (Coming Soon)
   - User management interface
   - Subscription management
   - Analytics dashboard

---

## Admin API Endpoints

All admin endpoints require authentication and admin role verification.

### 1. Grant Free Subscription
**Endpoint**: `POST /api/admin/grant-subscription`

**Purpose**: Grant a free Pro or Enterprise subscription to any user

**Headers**:
```
Authorization: Bearer <admin_jwt_token>
Content-Type: application/json
```

**Request Body**:
```json
{
  "email": "user@example.com",
  "tier": "pro",
  "duration": 30
}
```

**Parameters**:
- `email` (required): User's email address
- `tier` (required): "pro" or "enterprise"
- `duration` (required): Number of days (1-365)

**Response**:
```json
{
  "success": true,
  "message": "Pro subscription granted to user@example.com for 30 days",
  "user": {
    "email": "user@example.com",
    "tier": "pro",
    "subscriptionEndDate": "2025-11-20T10:00:00.000Z",
    "isFreeTrial": true
  }
}
```

**Example**:
```bash
curl -X POST http://localhost:3001/api/admin/grant-subscription \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "tier": "pro",
    "duration": 30
  }'
```

---

### 2. List All Users
**Endpoint**: `GET /api/admin/users`

**Purpose**: Retrieve a list of all users with optional filtering

**Headers**:
```
Authorization: Bearer <admin_jwt_token>
```

**Query Parameters**:
- `tier` (optional): Filter by subscription tier (free/standard/pro/enterprise)
- `search` (optional): Search by email or username
- `page` (optional): Page number (default: 1)
- `limit` (optional): Results per page (default: 50, max: 100)

**Response**:
```json
{
  "success": true,
  "users": [
    {
      "id": "507f1f77bcf86cd799439011",
      "email": "user@example.com",
      "username": "user123",
      "tier": "pro",
      "isAdmin": false,
      "queriesUsedToday": 45,
      "createdAt": "2025-01-15T10:00:00.000Z",
      "subscriptionEndDate": "2025-11-20T10:00:00.000Z",
      "isFreeTrial": true
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 150,
    "pages": 3
  }
}
```

**Examples**:
```bash
# Get all users
curl http://localhost:3001/api/admin/users \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"

# Filter by tier
curl "http://localhost:3001/api/admin/users?tier=pro" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"

# Search users
curl "http://localhost:3001/api/admin/users?search=john" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

---

### 3. Send Trial Email
**Endpoint**: `POST /api/admin/send-trial-email`

**Purpose**: Send a trial subscription invitation email to a user

**Headers**:
```
Authorization: Bearer <admin_jwt_token>
Content-Type: application/json
```

**Request Body**:
```json
{
  "email": "newuser@example.com",
  "tier": "pro",
  "duration": 14
}
```

**Response**:
```json
{
  "success": true,
  "message": "Trial email sent to newuser@example.com"
}
```

**Note**: Email functionality requires email service configuration (SendGrid, AWS SES, etc.)

---

### 4. Revoke Subscription
**Endpoint**: `DELETE /api/admin/revoke-subscription`

**Purpose**: Remove a user's paid/trial subscription and downgrade them to free tier

**Headers**:
```
Authorization: Bearer <admin_jwt_token>
Content-Type: application/json
```

**Request Body**:
```json
{
  "email": "user@example.com"
}
```

**Response**:
```json
{
  "success": true,
  "message": "Subscription revoked for user@example.com",
  "user": {
    "email": "user@example.com",
    "tier": "free",
    "subscriptionEndDate": null,
    "isFreeTrial": false
  }
}
```

---

## Security

### Authentication Required
All admin endpoints require:
1. Valid JWT token in Authorization header
2. `isAdmin: true` flag in user document
3. User must be authenticated

### Middleware Protection
```javascript
// requireAdmin middleware
export const requireAdmin = async (req, res, next) => {
  try {
    // Verify user is authenticated
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Verify user is admin
    if (!req.user.isAdmin) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    next();
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
};
```

---

## User Model Changes

### New Fields
```javascript
{
  isAdmin: {
    type: Boolean,
    default: false
  }
}
```

### Updated Methods

**getTierLimits()**
```javascript
// Returns unlimited access for admins
if (this.isAdmin) {
  return {
    queriesPerDay: Infinity,
    allowedAIs: ['claude', 'chatgpt', 'gemini', 'llama', 'deepseek', 'grok'],
    codeExecution: true,
    dataVisualization: true,
    // ... all features enabled
  };
}
```

**canMakeQuery()**
```javascript
// Admins always can make queries
if (this.isAdmin) {
  return true;
}
```

---

## Frontend Integration

### Accessing Admin Status
```javascript
// From AuthContext
const { user } = useAuth();
const isAdmin = user?.isAdmin || false;
```

### Conditional Rendering
```javascript
// Show cost tracking only to admins
{user?.isAdmin && (
  <div className="cost-display">
    Total Cost: ${costs.total.toFixed(4)}
  </div>
)}
```

### Example Component
```jsx
function AdminPanel() {
  const { user } = useAuth();

  if (!user?.isAdmin) {
    return <div>Access Denied</div>;
  }

  return (
    <div className="admin-panel">
      <h2>Admin Dashboard</h2>
      {/* Admin features here */}
    </div>
  );
}
```

---

## Testing Admin Features

### 1. Create Admin Account
```bash
# Register with admin email
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "rhroofer98@gmail.com",
    "password": "SecurePassword123!",
    "username": "admin"
  }'
```

### 2. Login as Admin
```bash
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "rhroofer98@gmail.com",
    "password": "SecurePassword123!"
  }'
```

Response will include `isAdmin: true`:
```json
{
  "token": "eyJhbGc...",
  "user": {
    "id": "...",
    "email": "rhroofer98@gmail.com",
    "username": "admin",
    "tier": "enterprise",
    "isAdmin": true
  }
}
```

### 3. Grant Free Pro Subscription
```bash
curl -X POST http://localhost:3001/api/admin/grant-subscription \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "testuser@example.com",
    "tier": "pro",
    "duration": 30
  }'
```

### 4. List All Users
```bash
curl http://localhost:3001/api/admin/users \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

### 5. Revoke Subscription
```bash
curl -X DELETE http://localhost:3001/api/admin/revoke-subscription \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "testuser@example.com"
  }'
```

---

## Error Handling

### Common Errors

**401 Unauthorized**
```json
{
  "error": "Authentication required"
}
```
- Solution: Include valid JWT token in Authorization header

**403 Forbidden**
```json
{
  "error": "Admin access required"
}
```
- Solution: User must have `isAdmin: true` in their account

**404 Not Found**
```json
{
  "error": "User not found"
}
```
- Solution: Verify email address is correct and user exists

**400 Bad Request**
```json
{
  "error": "Duration must be between 1 and 365 days"
}
```
- Solution: Check request parameters match validation rules

---

## Future Enhancements

### Planned Features
1. **Admin Dashboard UI**
   - User management interface
   - Subscription analytics
   - Cost analytics per user
   - Usage statistics

2. **Bulk Operations**
   - Grant subscriptions to multiple users
   - Export user data
   - Bulk email trials

3. **Advanced Analytics**
   - Revenue tracking
   - User engagement metrics
   - AI usage patterns
   - Cost optimization insights

4. **Audit Logs**
   - Track all admin actions
   - User activity monitoring
   - Subscription change history

5. **Email Templates**
   - Custom trial invitation emails
   - Subscription renewal reminders
   - Feature announcement emails

---

## Best Practices

### Security
1. Never share admin credentials
2. Use strong passwords for admin accounts
3. Regularly audit admin actions
4. Monitor unusual subscription patterns
5. Implement rate limiting for admin endpoints

### Subscription Management
1. Set reasonable trial durations (7-30 days typical)
2. Document why free subscriptions were granted
3. Monitor trial conversion rates
4. Follow up with trial users before expiry
5. Use analytics to optimize trial duration

### User Communication
1. Notify users when granting trials
2. Send reminders before trial expiry
3. Provide clear upgrade paths
4. Explain benefits of each tier
5. Be responsive to user feedback

---

## Troubleshooting

### Admin Not Detected on Registration
**Problem**: Account created but `isAdmin` is false

**Solutions**:
1. Verify email exactly matches: `rhroofer98@gmail.com`
2. Check for typos in email address
3. Ensure server has latest code deployed
4. Verify ADMIN_EMAIL constant in auth.js

### Cost Tracking Not Visible
**Problem**: Admin logged in but can't see costs

**Solutions**:
1. Verify `user.isAdmin` is true in state
2. Check browser console for errors
3. Refresh page after login
4. Verify Chat.jsx has correct conditional rendering

### Admin Endpoints Return 403
**Problem**: Admin routes return "Admin access required"

**Solutions**:
1. Verify JWT token is valid and not expired
2. Check user document has `isAdmin: true`
3. Ensure Authorization header format is correct
4. Log in again to get fresh token

---

## Support

For admin-related issues or questions:
1. Check this documentation first
2. Review server logs for detailed error messages
3. Verify MongoDB user document structure
4. Test with curl commands before frontend integration
5. Contact system administrator if issues persist

---

**Last Updated**: 2025-01-21  
**Version**: 2.1.0  
**Admin Email**: rhroofer98@gmail.com