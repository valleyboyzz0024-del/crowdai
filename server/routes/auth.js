import express from 'express';
import User from '../models/User.js';
import { generateTokenPair, verifyToken } from '../utils/jwt.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

// Admin email address - gets unlimited access
const ADMIN_EMAIL = 'rhroofer98@gmail.com';

/**
 * POST /api/auth/register
 * Register a new user
 */
router.post('/register', async (req, res) => {
  try {
    const { email, password, username } = req.body;

    // Validation
    if (!email || !password || !username) {
      return res.status(400).json({
        success: false,
        error: 'Email, password, and username are required'
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        success: false,
        error: 'Password must be at least 8 characters'
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({
      $or: [{ email: email.toLowerCase() }, { username }]
    });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        error: existingUser.email === email.toLowerCase() 
          ? 'Email already registered' 
          : 'Username already taken'
      });
    }

    // Check if this is the admin email
    const isAdmin = email.toLowerCase() === ADMIN_EMAIL.toLowerCase();

    // Create new user
    const user = new User({
      email: email.toLowerCase(),
      password,
      username,
      tier: isAdmin ? 'enterprise' : 'free', // Admin gets enterprise tier
      isAdmin
    });

    await user.save();
    
    if (isAdmin) {
      console.log('🔥 ADMIN ACCOUNT CREATED:', email);
    }

    // Generate tokens
    const tokens = generateTokenPair(user._id);

    // Return user data (without password)
    const userData = {
      id: user._id,
      email: user.email,
      username: user.username,
      tier: user.tier,
      isAdmin: user.isAdmin || false,
      enabledAIs: user.enabledAIs,
      preferences: user.preferences,
      usage: {
        queriesUsed: user.usage.queriesUsed,
        queriesRemaining: user.getTierLimits().queriesPerDay
      }
    };

    console.log(`✅ New user registered: ${email} (${user.tier})${isAdmin ? ' [ADMIN]' : ''}`);

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      user: userData,
      ...tokens
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      success: false,
      error: 'Registration failed. Please try again.'
    });
  }
});

/**
 * POST /api/auth/login
 * Login existing user
 */
router.post('/login', async (req, res) => {
  try {
    console.log('[LOGIN] Request received');
    
    // Check if body exists
    if (!req.body) {
      console.error('[LOGIN] No request body');
      return res.status(400).json({
        success: false,
        error: 'Request body is required'
      });
    }
    
    const { email, password } = req.body;
    console.log('[LOGIN] Validating fields:', { hasEmail: !!email, hasPassword: !!password });

    // Validation
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Email and password are required'
      });
    }

    // Find user
    console.log('[LOGIN] Looking up user:', email.toLowerCase());
    const user = await User.findOne({ email: email.toLowerCase() });

    if (!user) {
      console.log('[LOGIN] User not found:', email);
      return res.status(401).json({
        success: false,
        error: 'Invalid email or password'
      });
    }

    console.log('[LOGIN] User found, checking password');
    
    // Check password
    const isPasswordValid = await user.comparePassword(password);

    if (!isPasswordValid) {
      console.log('[LOGIN] Password mismatch for:', email);
      return res.status(401).json({
        success: false,
        error: 'Invalid email or password'
      });
    }

    console.log('[LOGIN] Password valid, updating last login');
    
    // Update last login
    user.lastLogin = new Date();
    await user.save();

    console.log('[LOGIN] Generating tokens');
    
    // Generate tokens
    const tokens = generateTokenPair(user._id);

    // Return user data
    const userData = {
      id: user._id,
      email: user.email,
      username: user.username,
      tier: user.tier,
      isAdmin: user.isAdmin || false,
      enabledAIs: user.enabledAIs,
      preferences: user.preferences,
      usage: {
        queriesUsed: user.usage.queriesUsed,
        queriesRemaining: user.getTierLimits().queriesPerDay - user.usage.queriesUsed,
        lastResetDate: user.usage.lastResetDate
      },
      limits: user.getTierLimits()
    };

    console.log(`✅ [LOGIN] User logged in: ${email} (${user.tier})${user.isAdmin ? ' [ADMIN]' : ''}`);

    res.json({
      success: true,
      message: 'Login successful',
      user: userData,
      ...tokens
    });
  } catch (error) {
    console.error('❌ [LOGIN] Server error:', error.message);
    console.error('[LOGIN] Stack:', error.stack);
    res.status(500).json({
      success: false,
      error: 'Login failed. Please try again.',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * POST /api/auth/refresh
 * Refresh access token using refresh token
 */
router.post('/refresh', async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({
        success: false,
        error: 'Refresh token required'
      });
    }

    // Verify refresh token with correct type
    let decoded;
    try {
      decoded = verifyToken(refreshToken, 'refresh');
    } catch (error) {
      return res.status(401).json({
        success: false,
        error: 'Invalid or expired refresh token'
      });
    }

    // Check if it's actually a refresh token
    if (decoded.type !== 'refresh') {
      return res.status(401).json({
        success: false,
        error: 'Invalid token type'
      });
    }

    // Get user
    const user = await User.findById(decoded.userId);

    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'User not found'
      });
    }

    // Generate new tokens
    const tokens = generateTokenPair(user._id);

    res.json({
      success: true,
      message: 'Token refreshed successfully',
      ...tokens
    });
  } catch (error) {
    console.error('Token refresh error:', error);
    res.status(500).json({
      success: false,
      error: 'Token refresh failed'
    });
  }
});

/**
 * GET /api/auth/me
 * Get current user info (requires authentication)
 */
router.get('/me', authenticate, async (req, res) => {
  try {
    const user = req.user;

    // Reset daily limit if needed
    if (user.shouldResetDailyLimit()) {
      user.usage.queriesUsed = 0;
      user.usage.lastResetDate = new Date();
      await user.save();
    }

    const userData = {
      id: user._id,
      email: user.email,
      username: user.username,
      tier: user.tier,
      isAdmin: user.isAdmin || false,
      enabledAIs: user.enabledAIs,
      preferences: user.preferences,
      usage: {
        queriesUsed: user.usage.queriesUsed,
        queriesRemaining: user.getTierLimits().queriesPerDay - user.usage.queriesUsed,
        lastResetDate: user.usage.lastResetDate,
        cooldownUntil: user.usage.cooldownUntil
      },
      limits: user.getTierLimits(),
      createdAt: user.createdAt,
      lastLogin: user.lastLogin
    };

    res.json({
      success: true,
      user: userData
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get user data'
    });
  }
});

/**
 * PUT /api/auth/preferences
 * Update user preferences (requires authentication)
 */
router.put('/preferences', authenticate, async (req, res) => {
  try {
    const { aiPersonas, includePastChats, streamingEnabled, voiceEnabled } = req.body;

    const updates = {};
    if (aiPersonas !== undefined) updates['preferences.aiPersonas'] = aiPersonas;
    if (includePastChats !== undefined) updates['preferences.includePastChats'] = includePastChats;
    if (streamingEnabled !== undefined) updates['preferences.streamingEnabled'] = streamingEnabled;
    if (voiceEnabled !== undefined) updates['preferences.voiceEnabled'] = voiceEnabled;

    const user = await User.findByIdAndUpdate(
      req.userId,
      { $set: updates },
      { new: true }
    ).select('-password');

    res.json({
      success: true,
      message: 'Preferences updated',
      preferences: user.preferences
    });
  } catch (error) {
    console.error('Update preferences error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update preferences'
    });
  }
});

/**
 * POST /api/auth/logout
 * Logout user (client-side will handle token deletion)
 */
router.post('/logout', authenticate, async (req, res) => {
  try {
    // In a more complex system, you might want to blacklist the token
    // For now, we just return success and let the client delete the token

    res.json({
      success: true,
      message: 'Logged out successfully'
    });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({
      success: false,
      error: 'Logout failed'
    });
  }
});

/**
 * PUT /api/auth/profile
 * Update user profile (username, etc.)
 */
router.put('/profile', authenticate, async (req, res) => {
  try {
    const { username } = req.body;
    
    // Validate username
    if (username) {
      if (username.length < 3) {
        return res.status(400).json({ error: 'Username must be at least 3 characters' });
      }
      if (username.length > 30) {
        return res.status(400).json({ error: 'Username must be less than 30 characters' });
      }
      if (!/^[a-zA-Z0-9_-]+$/.test(username)) {
        return res.status(400).json({ error: 'Username can only contain letters, numbers, hyphens, and underscores' });
      }
      
      // Check if username is already taken
      const existingUser = await User.findOne({ username, _id: { $ne: req.user._id } });
      if (existingUser) {
        return res.status(400).json({ error: 'Username already taken' });
      }
    }
    
    // Update user
    const updatedUser = await User.findByIdAndUpdate(
      req.user._id,
      { username },
      { new: true }
    ).select('-password');
    
    // Generate new token with updated info
    const tokens = generateTokenPair(updatedUser._id);
    
    console.log(`✅ Profile updated: ${updatedUser.email} -> username: ${username}`);
    
    res.json({
      success: true,
      message: 'Profile updated successfully',
      user: {
        id: updatedUser._id,
        email: updatedUser.email,
        username: updatedUser.username,
        tier: updatedUser.tier,
        isAdmin: updatedUser.isAdmin || false
      },
      ...tokens
    });
  } catch (error) {
    console.error('Profile update error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update profile'
    });
  }
});

export default router;