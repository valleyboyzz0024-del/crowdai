import { verifyToken, extractTokenFromHeader } from '../utils/jwt.js';
import User from '../models/User.js';

/**
 * Middleware to authenticate requests with JWT
 */
export const authenticate = async (req, res, next) => {
  try {
    // DEV MODE: Bypass authentication for testing
    if (process.env.DEV_MODE === 'true') {
      console.log('🔓 [DEV MODE] Authentication bypassed - using mock Pro tier user');
      req.user = {
        _id: 'dev-user-123',
        email: 'dev@test.com',
        username: 'DevUser',
        tier: 'pro',
        isAdmin: false,
        enabledAIs: ['claude', 'chatgpt', 'gemini', 'llama', 'deepseek', 'grok', 'groq'],
        preferences: {
          aiPersonas: true,
          includePastChats: true,
          streamingEnabled: true,
          voiceEnabled: false
        },
        usage: {
          queriesUsed: 0,
          lastResetDate: new Date(),
          cooldownUntil: null
        },
        createdAt: new Date(),
        lastLogin: new Date(),
        getTierLimits: () => ({
          queriesPerDay: 200,
          allowedAIs: ['claude', 'chatgpt', 'gemini', 'llama', 'deepseek', 'grok', 'groq'],
          codeExecution: true,
          apiAccess: true,
          prioritySupport: true
        }),
        canMakeQuery: () => ({ allowed: true }),
        shouldResetDailyLimit: () => false, // DEV_MODE never resets
        save: async () => {}
      };
      req.userId = 'dev-user-123';
      return next();
    }
    
    // Extract token from Authorization header
    const token = extractTokenFromHeader(req.headers.authorization);
    
    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'No authentication token provided'
      });
    }

    // Verify token
    let decoded;
    try {
      decoded = verifyToken(token);
    } catch (error) {
      return res.status(401).json({
        success: false,
        error: error.message
      });
    }

    // Get user from database
    const user = await User.findById(decoded.userId).select('-password');
    
    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'User not found'
      });
    }

    // Attach user to request object
    req.user = user;
    req.userId = user._id;
    
    next();
  } catch (error) {
    console.error('Authentication error:', error);
    return res.status(500).json({
      success: false,
      error: 'Authentication failed'
    });
  }
};

/**
 * Middleware to check if user has permission for specific tier
 */
export const requireTier = (...allowedTiers) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    if (!allowedTiers.includes(req.user.tier)) {
      return res.status(403).json({
        success: false,
        error: `This feature requires ${allowedTiers.join(' or ')} tier`,
        currentTier: req.user.tier
      });
    }

    next();
  };
};

/**
 * Middleware to check if user can make a query (rate limiting)
 */
export const checkQueryLimit = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    // DEV MODE: Skip query limit checks
    if (process.env.DEV_MODE === 'true') {
      console.log('🔓 [DEV MODE] Query limit check bypassed');
      req.usage = {
        queriesUsed: 0,
        queriesRemaining: 200
      };
      return next();
    }

    // Check if user can make a query
    const canQuery = req.user.canMakeQuery();
    
    if (!canQuery.allowed) {
      return res.status(429).json({
        success: false,
        error: canQuery.reason,
        limits: req.user.getTierLimits(),
        usage: {
          queriesUsed: req.user.usage.queriesUsed,
          queriesRemaining: req.user.getTierLimits().queriesPerDay - req.user.usage.queriesUsed,
          resetsAt: req.user.usage.lastResetDate
        }
      });
    }

    // Increment query count
    req.user.usage.queriesUsed += 1;
    await req.user.save();

    // Attach usage info to request
    req.usage = {
      queriesUsed: req.user.usage.queriesUsed,
      queriesRemaining: req.user.getTierLimits().queriesPerDay - req.user.usage.queriesUsed
    };

    next();
  } catch (error) {
    console.error('Query limit check error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to check query limit'
    });
  }
};

/**
 * Middleware to check if user can access specific AI
 */
export const checkAIAccess = (aiId) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    // DEV MODE: Allow all AI access
    if (process.env.DEV_MODE === 'true') {
      console.log(`🔓 [DEV MODE] AI access check bypassed for ${aiId}`);
      return next();
    }

    const limits = req.user.getTierLimits();
    
    if (!limits.allowedAIs.includes(aiId)) {
      return res.status(403).json({
        success: false,
        error: `${aiId} is not available on your current tier (${req.user.tier})`,
        allowedAIs: limits.allowedAIs,
        upgradeRequired: true
      });
    }

    next();
  };
};

/**
 * Optional authentication - doesn't fail if no token
 */
export const optionalAuth = async (req, res, next) => {
  try {
    const token = extractTokenFromHeader(req.headers.authorization);
    
    if (token) {
      const decoded = verifyToken(token);
      const user = await User.findById(decoded.userId).select('-password');
      if (user) {
        req.user = user;
        req.userId = user._id;
      }
    }
    
    next();
  } catch (error) {
    // Continue without authentication
    next();
  }
};