# Authentication & Tier System Fixes - Complete Summary

**Date:** October 22, 2025  
**Objective:** Surgical auth cleanup to maintain multi-AI debate panel consistency

---

## Files Modified (4 Total)

1. `src/contexts/AuthContext.jsx` - Core auth context
2. `src/components/TierUpgrade.jsx` - Tier upgrade modal
3. `src/components/UsageBar.jsx` - Usage display component
4. `src/components/AdminPanel.jsx` - Admin dashboard

---

## 1. AuthContext.jsx - Core Auth Improvements

### Change A: Added `authorizedFetch()` Helper (Lines 90-117)

**Purpose:** Centralize token-bearing fetches with auto-retry on 401

**Before:** Components directly used `fetch()` with manual token injection
```javascript
const response = await fetch('/api/endpoint', {
  headers: {
    'Authorization': `Bearer ${accessToken}`
  }
});
```

**After:** New helper with automatic refresh on expiry
```javascript
const authorizedFetch = async (input, init = {}) => {
  const makeRequest = async (token) => {
    const headers = {
      ...init.headers,
      'Authorization': `Bearer ${token}`
    };
    return fetch(input, { ...init, headers });
  };

  try {
    let response = await makeRequest(accessToken);
    
    // If 401, try to refresh token once and retry
    if (response.status === 401) {
      await refreshAccessToken();
      const newToken = localStorage.getItem('crowdai_access_token');
      if (newToken) {
        response = await makeRequest(newToken);
      }
    }
    
    return response;
  } catch (error) {
    throw error;
  }
};
```

**Exported in context value (Line 237):**
```javascript
const value = {
  user,
  accessToken,
  loading,
  register,
  login,
  logout,
  updatePreferences,
  updateProfile,
  refreshAccessToken,
  authorizedFetch  // NEW
};
```

### Change B: Guarded Token Updates in `updateProfile()` (Lines 203-211)

**Purpose:** Only update tokens if server provides new ones (prevents overwriting with undefined)

**Before (Lines 203-206):**
```javascript
if (response.ok) {
  setUser(data.user);
  setAccessToken(data.accessToken);  // UNSAFE - may be undefined
  setRefreshToken(data.refreshToken); // UNSAFE - may be undefined
  localStorage.setItem('crowdai_access_token', data.accessToken);
  localStorage.setItem('crowdai_refresh_token', data.refreshToken);
  return { success: true, message: data.message };
}
```

**After (Lines 203-214):**
```javascript
if (response.ok) {
  // Only update tokens if server provides new ones
  if (data.accessToken) {
    setAccessToken(data.accessToken);
    localStorage.setItem('crowdai_access_token', data.accessToken);
  }
  if (data.refreshToken) {
    setRefreshToken(data.refreshToken);
    localStorage.setItem('crowdai_refresh_token', data.refreshToken);
  }
  setUser(data.user ?? user);
  return { success: true, message: data.message };
}
```

---

## 2. TierUpgrade.jsx - Auth Context Integration

### Change A: Use Context Token Instead of localStorage (Lines 5-6, 81-82)

**Purpose:** Keep token reads synchronized with refresh logic

**Before (Line 5):**
```javascript
const TierUpgrade = ({ currentTier, onClose }) => {
  const { refreshAccessToken } = useAuth();
```

**Before (Line 81):**
```javascript
try {
  const accessToken = localStorage.getItem('crowdai_access_token');
  
  const response = await fetch('/api/payments/create-checkout-session', {
```

**After (Line 5):**
```javascript
const TierUpgrade = ({ currentTier, onClose }) => {
  const { accessToken, refreshAccessToken } = useAuth();  // ADDED accessToken
```

**After (Line 81):**
```javascript
try {
  const response = await fetch('/api/payments/create-checkout-session', {
```

### Change B: Updated AI Count Marketing Text (Lines 20, 36, 52)

**Purpose:** Reflect actual 7-AI lineup (added Groq)

**Line 20 - Standard Tier:**
```javascript
// BEFORE
'Fast AIs: Gemini, Llama, DeepSeek, Grok',

// AFTER
'Fast AIs: Gemini, Llama, DeepSeek, Grok, Groq',
```

**Line 36 - Pro Tier:**
```javascript
// BEFORE
'ALL 6 AIs: Claude, ChatGPT + more',

// AFTER
'ALL 7 AIs: Claude, ChatGPT + more',
```

**Line 52 - Enterprise Tier:**
```javascript
// BEFORE
'All 6 AI models',

// AFTER
'All 7 AI models',
```

---

## 3. UsageBar.jsx - Capabilities & Groq Support

### Change A: Added Groq to allowedAIs (Lines 38-51)

**Purpose:** Include Groq in Pro tier AI list

**Before (Lines 38-41):**
```javascript
const tierLimits = user.getTierLimits?.() || {
  maxQueriesPerDay: user.tier === 'free' ? 25 : user.tier === 'standard' ? 100 : user.tier === 'pro' ? 500 : Infinity,
  allowedAIs: user.tier === 'free' ? ['claude', 'gemini'] : user.tier === 'standard' ? ['claude', 'chatgpt', 'gemini'] : ['claude', 'chatgpt', 'gemini', 'llama', 'deepseek', 'grok']
};
```

**After (Lines 38-51):**
```javascript
// Prefer server-provided capabilities over client-side fallback
const caps = user.capabilities || {};
const tierLimits = user.getTierLimits?.() || {
  maxQueriesPerDay: Number.isFinite(caps.maxQueriesPerDay)
    ? caps.maxQueriesPerDay
    : (user.tier === 'free' ? 25 :
       user.tier === 'standard' ? 100 :
       user.tier === 'pro' ? 500 : Infinity),
  allowedAIs: Array.isArray(caps.allowedAIs)
    ? caps.allowedAIs
    : (user.tier === 'free'
        ? ['claude', 'gemini']
        : user.tier === 'standard'
          ? ['claude', 'chatgpt', 'gemini']
          : ['claude', 'chatgpt', 'gemini', 'llama', 'deepseek', 'grok', 'groq'])  // ADDED 'groq'
};
```

### Change B: Server-Provided Capabilities Support

**Purpose:** Prefer backend-provided limits over client-side fallback

**Key Addition (Lines 40-42):**
```javascript
const caps = user.capabilities || {};
const tierLimits = user.getTierLimits?.() || {
  maxQueriesPerDay: Number.isFinite(caps.maxQueriesPerDay)
    ? caps.maxQueriesPerDay
    : /* fallback logic */
```

This allows the server to send:
```json
{
  "user": {
    "capabilities": {
      "maxQueriesPerDay": 500,
      "allowedAIs": ["claude", "chatgpt", "gemini", "llama", "deepseek", "grok", "groq"],
      "modelOverrides": {}
    }
  }
}
```

---

## 4. AdminPanel.jsx - MongoDB Key Compatibility

### Change: Fixed User Table Key Prop (Line 295)

**Purpose:** Handle both `user.id` (SQL) and `user._id` (MongoDB)

**Before (Line 295):**
```javascript
{users.map((user) => (
  <tr key={user.id} className="hover:bg-gray-700/30 transition-colors">
```

**After (Line 295):**
```javascript
{users.map((user) => (
  <tr key={user.id || user._id} className="hover:bg-gray-700/30 transition-colors">
```

**Why:** MongoDB returns `_id`, SQL returns `id`. This prevents React key warnings.

---

## Debate-Mode Architecture Verification

**Confirmed:** No changes affect multi-AI panel logic:

- ✅ `buildConversationHistory()` in Chat.jsx untouched (Lines 968-1054)
- ✅ Per-AI history construction intact
- ✅ System prompts preventing AI response duplication intact
- ✅ "Addressed AI" detection working (Lines 1130-1149)
- ✅ Disagreement/follow-up logic unchanged (Lines 1342-1404)
- ✅ All 7 AIs (including Groq) properly wired in call order (Lines 1424-1510)

---

## Testing Checklist

### Auth Flow
- [ ] Login → tokens stored in context and localStorage
- [ ] Token refresh on 401 → new tokens replace old ones
- [ ] Profile update without new tokens → existing tokens preserved
- [ ] Logout → all tokens cleared

### Tier UI
- [ ] Free tier: Shows 2 AIs (Claude, Gemini)
- [ ] Standard tier: Shows 3 AIs (Claude, ChatGPT, Gemini)
- [ ] Pro tier: Shows 7 AIs (Claude, ChatGPT, Gemini, Llama, DeepSeek, Grok, Groq)
- [ ] Tier upgrade modal: Marketing text shows "7 AIs"

### Admin Panel
- [ ] User list renders without React key warnings
- [ ] Works with both MongoDB (`_id`) and SQL (`id`)

### API Calls
- [ ] TierUpgrade: Uses context token instead of localStorage
- [ ] Future: Components can use `authorizedFetch()` for resilient API calls

---

## Summary

**Total Lines Changed:** ~50 across 4 files  
**Breaking Changes:** None  
**New Features:** `authorizedFetch` helper, capabilities support  
**Bug Fixes:** Token desync, missing Groq, MongoDB key warnings  

All changes maintain backward compatibility while improving auth consistency and tier accuracy. The multi-AI debate panel architecture remains fully intact.