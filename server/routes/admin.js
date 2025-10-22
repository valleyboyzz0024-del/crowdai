import express from 'express';
import User from '../models/User.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

// Middleware to check if user is admin
const requireAdmin = async (req, res, next) => {
  try {
    if (!req.user || !req.user.isAdmin) {
      return res.status(403).json({
        success: false,
        error: 'Admin access required'
      });
    }
    next();
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Authorization check failed'
    });
  }
};

/**
 * POST /api/admin/grant-subscription
 * Grant free Pro subscription to a user (Admin only)
 */
router.post('/grant-subscription', authenticate, requireAdmin, async (req, res) => {
  try {
    const { email, tier, duration } = req.body; // duration in months

    // Validation
    if (!email) {
      return res.status(400).json({
        success: false,
        error: 'User email is required'
      });
    }

    if (!['standard', 'pro', 'enterprise'].includes(tier)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid tier. Must be: standard, pro, or enterprise'
      });
    }

    // Find user
    const user = await User.findOne({ email: email.toLowerCase() });

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // Calculate subscription end date
    const now = new Date();
    const endDate = new Date(now);
    endDate.setMonth(endDate.getMonth() + (duration || 1)); // Default 1 month

    // Update user
    user.tier = tier;
    user.subscriptionStatus = 'active';
    user.subscriptionStartDate = now;
    user.subscriptionEndDate = endDate;
    user.billingCycle = 'monthly';
    
    // Reset usage if upgrading
    if (user.tier !== tier) {
      user.usage.queriesUsed = 0;
      user.usage.lastResetDate = now;
      user.usage.cooldownUntil = null;
    }

    await user.save();

    console.log(`🎁 Admin granted ${tier} tier to ${email} for ${duration || 1} month(s)`);

    res.json({
      success: true,
      message: `Successfully granted ${tier} tier to ${email} for ${duration || 1} month(s)`,
      user: {
        email: user.email,
        username: user.username,
        tier: user.tier,
        subscriptionEndDate: user.subscriptionEndDate
      }
    });
  } catch (error) {
    console.error('Grant subscription error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to grant subscription'
    });
  }
});

/**
 * POST /api/admin/grant-trial
 * Grant free trial (1 week or 1 month of Pro) to a user (Admin only)
 * This uses the trial system which automatically reverts to original tier when expired
 */
router.post('/grant-trial', authenticate, requireAdmin, async (req, res) => {
  try {
    const { email, tier = 'pro', duration = 1, durationType = 'month' } = req.body; // duration number, durationType: 'week' or 'month'

    // Validation
    if (!email) {
      return res.status(400).json({
        success: false,
        error: 'User email is required'
      });
    }

    if (!['standard', 'pro', 'enterprise'].includes(tier)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid tier. Must be: standard, pro, or enterprise'
      });
    }

    if (!['week', 'month'].includes(durationType)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid durationType. Must be: week or month'
      });
    }

    // Find user
    const user = await User.findOne({ email: email.toLowerCase() });

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // Check if user is already on trial
    if (user.isOnTrial) {
      return res.status(400).json({
        success: false,
        error: 'User is already on a trial. End existing trial first.'
      });
    }

    // Save original tier before trial
    user.originalTier = user.tier;

    // Calculate trial end date based on duration type
    const now = new Date();
    const endDate = new Date(now);
    
    if (durationType === 'week') {
      endDate.setDate(endDate.getDate() + (duration * 7));
    } else {
      endDate.setMonth(endDate.getMonth() + duration);
    }

    // Activate trial
    user.isOnTrial = true;
    user.trialEndDate = endDate;
    user.tier = tier;
    user.subscriptionStatus = 'trial';
    user.subscriptionStartDate = now;
    user.subscriptionEndDate = endDate;
    user.billingCycle = 'monthly';
    
    // Reset usage when starting trial
    user.usage.queriesUsed = 0;
    user.usage.lastResetDate = now;
    user.usage.cooldownUntil = null;

    await user.save();

    const durationText = durationType === 'week' ? `${duration}-week` : `${duration}-month`;
    console.log(`🎁 Admin granted ${durationText} ${tier} trial to ${email} (original tier: ${user.originalTier})`);

    res.json({
      success: true,
      message: `Successfully granted ${durationText} ${tier} trial to ${email}`,
      user: {
        email: user.email,
        username: user.username,
        tier: user.tier,
        originalTier: user.originalTier,
        isOnTrial: user.isOnTrial,
        trialEndDate: user.trialEndDate
      }
    });
  } catch (error) {
    console.error('Grant trial error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to grant trial'
    });
  }
});

/**
 * POST /api/admin/end-trial
 * Manually end a user's trial early (Admin only)
 */
router.post('/end-trial', authenticate, requireAdmin, async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        error: 'User email is required'
      });
    }

    const user = await User.findOne({ email: email.toLowerCase() });

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    if (!user.isOnTrial) {
      return res.status(400).json({
        success: false,
        error: 'User is not on a trial'
      });
    }

    // End trial and restore original tier
    await user.checkTrialExpiration();

    console.log(`🚫 Admin manually ended trial for ${email} (restored to ${user.tier})`);

    res.json({
      success: true,
      message: `Successfully ended trial for ${email}`,
      user: {
        email: user.email,
        username: user.username,
        tier: user.tier,
        isOnTrial: user.isOnTrial
      }
    });
  } catch (error) {
    console.error('End trial error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to end trial'
    });
  }
});

/**
 * GET /api/admin/users
 * Get all users (Admin only)
 */
router.get('/users', authenticate, requireAdmin, async (req, res) => {
  try {
    const { page = 1, limit = 50, search = '' } = req.query;
    
    const query = search
      ? {
          $or: [
            { email: { $regex: search, $options: 'i' } },
            { username: { $regex: search, $options: 'i' } }
          ]
        }
      : {};

    const users = await User.find(query)
      .select('-password')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit));

    const total = await User.countDocuments(query);

    res.json({
      success: true,
      users: users.map(user => ({
        id: user._id,
        email: user.email,
        username: user.username,
        tier: user.tier,
        isAdmin: user.isAdmin,
        queriesUsed: user.usage.queriesUsed,
        subscriptionStatus: user.subscriptionStatus,
        subscriptionEndDate: user.subscriptionEndDate,
        createdAt: user.createdAt,
        lastLogin: user.lastLogin
      })),
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get users'
    });
  }
});

/**
 * POST /api/admin/send-trial-email
 * Send trial email to user (Admin only)
 * This is a placeholder - you'll need to integrate with email service
 */
router.post('/send-trial-email', authenticate, requireAdmin, async (req, res) => {
  try {
    const { email, tier = 'pro', duration = 1 } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        error: 'Email is required'
      });
    }

    // First grant the subscription
    const user = await User.findOne({ email: email.toLowerCase() });

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // Grant subscription
    const now = new Date();
    const endDate = new Date(now);
    endDate.setMonth(endDate.getMonth() + duration);

    user.tier = tier;
    user.subscriptionStatus = 'active';
    user.subscriptionStartDate = now;
    user.subscriptionEndDate = endDate;
    user.billingCycle = 'monthly';
    user.usage.queriesUsed = 0;
    user.usage.lastResetDate = now;

    await user.save();

    // TODO: Integrate with email service (SendGrid, AWS SES, etc.)
    // For now, just return success
    console.log(`📧 Trial email would be sent to: ${email}`);
    console.log(`   Tier: ${tier} | Duration: ${duration} month(s)`);

    res.json({
      success: true,
      message: `Free ${duration}-month ${tier} subscription granted to ${email}`,
      note: 'Email notification not yet implemented. User can login to access their upgraded account.'
    });
  } catch (error) {
    console.error('Send trial email error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to send trial email'
    });
  }
});

/**
 * DELETE /api/admin/revoke-subscription
 * Revoke subscription from user (Admin only)
 */
router.delete('/revoke-subscription', authenticate, requireAdmin, async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        error: 'User email is required'
      });
    }

    const user = await User.findOne({ email: email.toLowerCase() });

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // Downgrade to free
    user.tier = 'free';
    user.subscriptionStatus = null;
    user.subscriptionStartDate = null;
    user.subscriptionEndDate = null;
    user.billingCycle = null;
    user.stripeSubscriptionId = null;

    await user.save();

    console.log(`🚫 Admin revoked subscription from ${email}`);

    res.json({
      success: true,
      message: `Successfully revoked subscription from ${email}`
    });
  } catch (error) {
    console.error('Revoke subscription error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to revoke subscription'
    });
  }
});

/**
 * GET /api/admin/site-stats
 * Get site-wide statistics (Admin only)
 */
router.get('/site-stats', authenticate, requireAdmin, async (req, res) => {
  try {
    const Chat = (await import('../models/Chat.js')).default;
    
    // Total users
    const totalUsers = await User.countDocuments();
    
    // Tier distribution
    const tierDistribution = await User.aggregate([
      { $group: { _id: '$tier', count: { $sum: 1 } } }
    ]);
    
    const tierDist = {};
    tierDistribution.forEach(t => {
      tierDist[t._id] = t.count;
    });
    
    // Total queries
    const totalQueries = await User.aggregate([
      { $group: { _id: null, total: { $sum: '$usage.queriesUsed' } } }
    ]);
    
    // API costs per AI
    const apiCosts = await Chat.aggregate([
      { $group: { _id: '$ai', totalCost: { $sum: '$apiCost' } } }
    ]);
    
    const apiCostsMap = {};
    let totalApiCost = 0;
    apiCosts.forEach(a => {
      apiCostsMap[a._id] = a.totalCost || 0;
      totalApiCost += a.totalCost || 0;
    });
    
    // Revenue (based on active subscriptions)
    const activeSubs = await User.find({
      subscriptionStatus: { $in: ['active', 'trial'] },
      tier: { $ne: 'free' }
    });
    
    let totalRevenue = 0;
    activeSubs.forEach(user => {
      if (user.tier === 'standard') totalRevenue += 9;
      else if (user.tier === 'pro') totalRevenue += 19;
      else if (user.tier === 'enterprise') totalRevenue += 49;
    });
    
    res.json({
      success: true,
      stats: {
        totalUsers,
        totalQueries: totalQueries[0]?.total || 0,
        totalRevenue,
        tierDistribution: tierDist,
        apiCosts: apiCostsMap,
        totalApiCost
      }
    });
  } catch (error) {
    console.error('Get site stats error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get site statistics'
    });
  }
});

/**
 * POST /api/admin/generate-trial-link
 * Generate a trial link (Admin only)
 */
router.post('/generate-trial-link', authenticate, requireAdmin, async (req, res) => {
  try {
    const { tier = 'pro', duration = 1, durationType = 'month' } = req.body;
    
    // Create a token with trial info
    const crypto = await import('crypto');
    const token = crypto.randomBytes(32).toString('hex');
    
    // Store trial info in memory or Redis (for now, just create the link)
    const baseUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const trialLink = `${baseUrl}/signup?trial=${token}&tier=${tier}&duration=${duration}&type=${durationType}`;
    
    res.json({
      success: true,
      link: trialLink,
      details: {
        tier,
        duration,
        durationType
      }
    });
  } catch (error) {
    console.error('Generate trial link error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate trial link'
    });
  }
});

export default router;