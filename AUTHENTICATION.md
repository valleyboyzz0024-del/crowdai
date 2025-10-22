# CrowdAI Authentication System Documentation

## Overview

CrowdAI now features a complete authentication and authorization system with user accounts, tier-based access control, usage tracking, and cloud synchronization capabilities.

## System Architecture

### Backend Components

#### 1. Database Layer (MongoDB Atlas)
- **Connection**: `Chat/server/config/database.js`
- **Models**:
  - `Chat/server/models/User.js` - User accounts with tier system
  - `Chat/server/models/Chat.js` - Conversation storage

#### 2. Authentication Infrastructure
- **JWT Utilities**: `Chat/server/utils/jwt.js`
  - Access tokens (24-hour expiry)
  - Refresh tokens (7-day expiry)
  - Token verification and extraction

- **Middleware**: `Chat/server/middleware/auth.js`
  - `authenticate` - Verifies JWT and attaches user to request
  - `requireTier` - Enforces tier-based access control
  - `checkQueryLimit` - Tracks and enforces daily query limits
  - `checkAIAccess` - Validates AI availability for user's tier

#### 3. API Endpoints
- **Auth Routes**: `Chat/server/routes/auth.js`
  - `POST /api/auth/register` - Create new account
  - `POST /api/auth/login` - Authenticate user
  - `POST /api/auth/refresh` - Refresh access token
  - `GET /api/auth/me` - Get current user info
  - `PUT /api/auth/preferences` - Update user preferences
  - `POST /api/auth/logout` - Logout user

### Frontend Components

#### 1. Context & State Management
- **AuthContext**: `Chat/src/contexts/AuthContext.jsx`
  - Global authentication state
  - User session management
  - Token refresh logic
  - Login/Signup/Logout functions

#### 2. UI Components
- **Login Modal**: `Chat/src/components/Login.jsx`
  - Email/password authentication
  - Form validation
  - Error handling
  
- **Signup Modal**: `Chat/src/components/Signup.jsx`
  - User registration with username
  - Password confirmation
  - Tier information display
  
- **Usage Bar**: `Chat/src/components/UsageBar.jsx`
  - Daily query usage tracking
  - Tier badge display
  - Available AIs list
  - Cooldown timers (Standard tier)
  - Upgrade prompts

#### 3. Protected API Calls
All AI endpoints now require authentication:
- Authorization header: `Bearer {accessToken}`
- Automatic token inclusion in all requests
- Token refresh on expiry

## Tier System

### Free Tier
- **Daily Queries**: 25
- **Available AIs**: Claude, Gemini (2 AIs)
- **Features**: Basic chat functionality
- **Cost**: Free

### Standard Tier
- **Daily Queries**: 100
- **Available AIs**: Claude, ChatGPT, Gemini (3 AIs)
- **Sessions**: 2-hour sessions with 4-hour cooldown
- **Features**: Code execution enabled
- **Cost**: $9.99/month (example)

### Pro Tier
- **Daily Queries**: 500
- **Available AIs**: All 6 AIs (Claude, ChatGPT, Gemini, Llama, DeepSeek, Grok)
- **Sessions**: Unlimited
- **Features**: File uploads, priority processing
- **Cost**: $29.99/month (example)

### Enterprise Tier
- **Daily Queries**: Unlimited
- **Available AIs**: All 6 AIs
- **Features**: All features, priority processing, dedicated support
- **Cost**: Custom pricing

## Usage Tracking

### Query Limits
- Tracked per user in MongoDB
- Automatic daily reset at midnight
- Real-time counter updates
- Warning at 5 queries remaining
- Blocked when limit reached

### Session Management (Standard Tier)
- 2-hour active session window
- 4-hour cooldown after session ends
- Automatic session tracking
- Cooldown timer display in UI

### Response Tracking
- Response time monitoring
- Token usage estimation
- Cost calculation per AI
- Persistent analytics in localStorage

## Security Features

### Password Security
- Bcrypt hashing (12 rounds)
- No plaintext storage
- Secure comparison in login

### Token Management
- Short-lived access tokens (24h)
- Long-lived refresh tokens (7d)
- Automatic token rotation
- Secure token storage (localStorage)

### API Protection
- JWT verification on all protected routes
- Rate limiting via middleware
- Tier validation before AI calls
- Query limit enforcement

## Environment Configuration

Required environment variables in `.env`:

```env
# MongoDB
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/crowdai

# JWT
JWT_SECRET=your_super_secure_secret_key_here

# Supabase (optional - for future features)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_KEY=your_service_key

# AI API Keys (existing)
ANTHROPIC_API_KEY=...
OPENAI_API_KEY=...
# etc.
```

## User Flow

### 1. New User Registration
1. User clicks "Sign Up" in sidebar or header
2. Fills out registration form (username, email, password)
3. Backend creates user with Free tier
4. Returns JWT tokens
5. Frontend stores tokens and updates UI
6. User can immediately start using the app

### 2. Existing User Login
1. User clicks "Login" in sidebar or header
2. Enters email and password
3. Backend verifies credentials
4. Returns JWT tokens and user data
5. Frontend stores tokens and loads user info
6. Usage bar displays with current limits

### 3. Making AI Queries
1. User types message and sends
2. Frontend includes Authorization header with access token
3. Backend middleware validates token
4. Middleware checks user's tier and query limit
5. If authorized, AI query proceeds
6. Query count increments in database
7. Response returned to user
8. Usage bar updates in real-time

### 4. Token Refresh
1. Access token expires (24h)
2. API returns 401 Unauthorized
3. Frontend automatically calls refresh endpoint
4. Backend validates refresh token
5. Returns new access + refresh tokens
6. Frontend stores new tokens
7. Original request retries with new token

### 5. Logout
1. User clicks logout button
2. Backend invalidates tokens (if tracking)
3. Frontend clears localStorage
4. User redirected to login screen

## API Response Examples

### Successful Registration
```json
{
  "user": {
    "_id": "...",
    "username": "johndoe",
    "email": "john@example.com",
    "tier": "free",
    "queriesUsed": 0,
    "createdAt": "2025-10-21T09:00:00.000Z"
  },
  "accessToken": "eyJhbGci...",
  "refreshToken": "eyJhbGci..."
}
```

### Query Limit Exceeded
```json
{
  "error": "Daily query limit exceeded",
  "queriesUsed": 25,
  "dailyLimit": 25,
  "resetsAt": "2025-10-22T00:00:00.000Z"
}
```

### Tier Restriction
```json
{
  "error": "This AI is not available on your tier",
  "requiredTier": "standard",
  "currentTier": "free"
}
```

## Database Schema

### User Model
```javascript
{
  username: String (unique, required)
  email: String (unique, required, lowercase)
  password: String (required, hashed)
  tier: String (enum: free, standard, pro, enterprise)
  queriesUsed: Number (default: 0)
  dailyLimit: Number (virtual, based on tier)
  lastResetDate: Date
  sessionStartTime: Date
  cooldownUntil: Date
  preferences: Object
  createdAt: Date
  updatedAt: Date
}
```

### Chat Model
```javascript
{
  userId: ObjectId (ref: User)
  title: String
  messages: Array
  participatingAIs: Array
  fileAttachments: Array
  createdAt: Date
  updatedAt: Date
}
```

## Testing Checklist

### Backend Tests
- [x] User registration works
- [x] Login returns valid tokens
- [x] Token refresh updates tokens
- [x] Query limits enforced correctly
- [x] Tier restrictions applied properly
- [x] All 6 AI endpoints protected
- [x] Code execution requires Standard+ tier

### Frontend Tests
- [x] Login modal displays correctly
- [x] Signup modal displays correctly
- [x] Usage bar shows correct information
- [x] Tokens stored in localStorage
- [x] Authorization headers sent on requests
- [x] Logout clears session
- [x] Auto token refresh on expiry

### Integration Tests
- [ ] Register → Login → Make Query → Logout
- [ ] Hit query limit → See error → Wait for reset
- [ ] Try restricted AI → See tier error
- [ ] Standard tier session cooldown
- [ ] Token expiry → Auto refresh → Continue

## Future Enhancements

### Phase 2: Chat Sync
- Save conversations to MongoDB
- Load chat history from database
- Sync across devices
- Search within saved chats

### Phase 3: Payment Integration
- Stripe/PayPal integration
- Tier upgrade flow
- Subscription management
- Usage billing

### Phase 4: Advanced Features
- Team accounts
- Shared conversations
- Admin dashboard
- Usage analytics per user
- Custom AI configurations per tier

## Troubleshooting

### "Unauthorized" Error
- Check if tokens exist in localStorage
- Verify token hasn't expired
- Ensure Authorization header is being sent
- Check if user is logged in

### Query Limit Errors
- Check user's tier and daily limit
- Verify queriesUsed count
- Check if lastResetDate needs update
- Confirm date comparison logic

### Tier Restriction Errors
- Verify user's current tier
- Check AI access matrix for tier
- Ensure middleware applied to endpoint
- Validate tier comparison logic

### Token Refresh Failing
- Check refresh token validity (7-day expiry)
- Verify JWT_SECRET matches
- Check token format in request
- Ensure refresh endpoint working

## Support

For issues or questions:
- Check console logs (frontend & backend)
- Review MongoDB connection status
- Verify environment variables
- Check API endpoint accessibility
- Review authentication flow in AuthContext

---

**Last Updated**: 2025-10-21  
**Version**: 1.0.0  
**Status**: Production Ready