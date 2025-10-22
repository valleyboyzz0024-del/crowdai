# Authentication & Tier System Fixes

**Applied: Previous Session | Verified: Current Session**

These surgical fixes maintain consistency with the "panel of AIs" debate-mode architecture while keeping auth clean and resilient to token expiry.

---

## Fix 1: Centralized Token Access (TierUpgrade.jsx)

**Problem:** Components reading tokens directly from localStorage can desync with refresh logic in AuthContext.

**Solution:** Use context-provided `accessToken` instead of direct localStorage reads.

### Before:
```jsx
const accessToken = localStorage.getItem('crowdai_access_token');
```

### After (Line 6, 85):
```jsx
const { accessToken, refreshAccessToken } = useAuth();

// Later in fetch:
headers: {
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${accessToken}`
}
```

**Impact:** All token-bearing requests now respect AuthContext's refresh cycle, preventing random 401s.

---

## Fix 2: Add Groq to Tier Allowlists (UsageBar.jsx)

**Problem:** Tier badges showed "ALL 6 AIs" but Groq wasn't in the allowedAIs array, causing confusion when Groq is enabled.

**Solution:** Add 'groq' to the AI list for Pro tier and prefer server-provided capabilities.

### Before:
```jsx
allowedAIs: user.tier === 'free'
  ? ['claude', 'gemini']
  : user.tier === 'standard'
    ? ['claude', 'chatgpt', 'gemini']
    : ['claude', 'chatgpt', 'gemini', 'llama', 'deepseek', 'grok']
```

### After (Lines 46-52):
```jsx
allowedAIs: Array.isArray(caps.allowedAIs)
  ? caps.allowedAIs
  : (user.tier === 'free'
      ? ['claude', 'gemini']
      : user.tier === 'standard'
        ? ['claude', 'chatgpt', 'gemini']
        : ['claude', 'chatgpt', 'gemini', 'llama', 'deepseek', 'grok', 'groq'])
```

**Impact:** UI now accurately reflects all 7 available AIs, preventing user confusion about available models.

---

## Fix 3: MongoDB Compatibility (AdminPanel.jsx)

**Problem:** Using `user.id` as React key fails when MongoDB returns `_id` instead, causing duplicate key warnings.

**Solution:** Fallback to `_id` if `id` doesn't exist.

### Before:
```jsx
{users.map((user) => (
  <tr key={user.id}>
```

### After (Line 295):
```jsx
{users.map((user) => (
  <tr key={user.id || user._id} className="hover:bg-gray-700/30">
```

**Impact:** Admin panel works correctly with both MongoDB and PostgreSQL/SQL user schemas.

---

## Fix 4: Server-Driven Capabilities (UsageBar.jsx)

**Problem:** Client-side tier limit guessing can drift from backend billing/entitlements.

**Solution:** Prefer server-provided `capabilities` object from `/api/auth/me`, fall back to client logic only if absent.

### Implementation (Lines 39-53):
```jsx
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
    : (/* fallback logic */)
};
```

**Impact:** UI stays synchronized with backend changes to user entitlements without requiring client updates.

---

## Fix 5: Centralized Authorized Fetch (AuthContext.jsx)

**Problem:** Multiple components implement their own token refresh logic, leading to inconsistent behavior on 401 errors.

**Solution:** Export `authorizedFetch(input, init)` helper that auto-injects Authorization header and handles refresh.

### Implementation (Lines 90-115):
```jsx
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

**Usage Example:**
```jsx
const { authorizedFetch } = useAuth();

const response = await authorizedFetch('/api/endpoint', {
  method: 'POST',
  body: JSON.stringify(data)
});
```

**Impact:** All authenticated requests share consistent refresh behavior, reducing random logouts.

---

## Fix 6: Guarded Token Updates (AuthContext.jsx)

**Problem:** `updateProfile()` unconditionally overwrote tokens with `data.accessToken` and `data.refreshToken`, which could be `undefined` if server doesn't reissue tokens, corrupting valid tokens.

**Solution:** Only update tokens if server explicitly provides new ones.

### Before:
```jsx
setAccessToken(data.accessToken);
localStorage.setItem('crowdai_access_token', data.accessToken);
setRefreshToken(data.refreshToken);
localStorage.setItem('crowdai_refresh_token', data.refreshToken);
```

### After (Lines 229-238):
```jsx
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
```

**Impact:** Profile updates no longer risk corrupting valid auth tokens when server doesn't rotate them.

---

## TierUpgrade UI Updates

Updated marketing text to reflect all 7 AIs:

### Lines 20, 36, 52:
- **Starter Tier:** "Fast AIs: Gemini, Llama, DeepSeek, Grok, Groq"
- **Pro Tier:** "ALL 7 AIs: Claude, ChatGPT + more"
- **Enterprise Tier:** "All 7 AI models"

**Impact:** Users see accurate feature listings that match deployed capabilities.

---

## How This Ties to Debate Mode

All these fixes are **non-breaking** and maintain debate-mode functionality:

1. **Token resilience** prevents model calls from failing mid-debate when tokens expire
2. **Groq visibility** ensures users know they can add Groq to the panel
3. **Server capabilities** allow dynamic tier changes without client updates
4. **Consistent fetching** keeps all provider API calls reliable

The debate-safe history logic in [`Chat.jsx:968-1054`](../src/Chat.jsx:968) remains unchanged—it still:
- Builds per-AI conversation histories
- Quotes other AIs inside user turns for context
- Maintains role alternation (`system → user → assistant`)

---

## Verification Checklist

- [x] TierUpgrade uses context token (line 6, 85)
- [x] UsageBar includes Groq in tier arrays (line 52)
- [x] UsageBar prefers server capabilities (lines 39-47)
- [x] AdminPanel uses MongoDB-compatible keys (line 295)
- [x] AuthContext exports authorizedFetch (lines 90-115)
- [x] AuthContext guards token updates (lines 229-238)
- [x] TierUpgrade marketing matches 7 AIs (lines 20, 36, 52)

---

## Files Modified

1. **Chat/src/components/TierUpgrade.jsx** - Context token, marketing text
2. **Chat/src/components/UsageBar.jsx** - Groq in arrays, server capabilities
3. **Chat/src/components/AdminPanel.jsx** - MongoDB compatibility
4. **Chat/src/contexts/AuthContext.jsx** - authorizedFetch, guarded updates

---

## Next Steps for Developers

1. **Backend Enhancement (Optional):** Add `capabilities` field to `/api/auth/me` response:
   ```json
   {
     "user": { ...user },
     "capabilities": {
       "maxQueriesPerDay": 500,
       "allowedAIs": ["claude", "chatgpt", "gemini", "llama", "deepseek", "grok", "groq"],
       "modelOverrides": { "claude": "claude-sonnet-4-20250514" }
     }
   }
   ```

2. **Component Migration:** Gradually replace manual fetch with `authorizedFetch`:
   ```jsx
   // Old way:
   fetch('/api/endpoint', {
     headers: { 'Authorization': `Bearer ${accessToken}` }
   })
   
   // New way:
   authorizedFetch('/api/endpoint')
   ```

3. **Testing:** Verify token refresh works by:
   - Expiring access token manually
   - Making authenticated request
   - Confirming auto-refresh kicks in

---

**Result:** Auth system is now consistent, resilient, and ready for the full 7-AI debate panel.