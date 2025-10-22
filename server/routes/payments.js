import express from 'express';
import Stripe from 'stripe';
import User from '../models/User.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

// Lazy initialize Stripe to ensure env vars are loaded
let stripe;
function getStripe() {
  if (!stripe && process.env.STRIPE_SECRET_KEY) {
    stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  }
  return stripe;
}

// Tier pricing configuration (in cents)
const TIER_PRICES = {
  standard: {
    monthly: 999, // $9.99/month
    yearly: 9999  // $99.99/year (2 months free)
  },
  pro: {
    monthly: 2999, // $29.99/month
    yearly: 29999  // $299.99/year (2 months free)
  },
  enterprise: {
    monthly: 9999, // $99.99/month
    yearly: 99999  // $999.99/year (2 months free)
  }
};

/**
 * GET /api/payments/config
 * Get Stripe publishable key
 */
router.get('/config', (req, res) => {
  res.json({
    publishableKey: process.env.STRIPE_PUBLISHABLE_KEY
  });
});

/**
 * POST /api/payments/create-checkout-session
 * Create a Stripe checkout session for tier upgrade
 */
router.post('/create-checkout-session', authenticate, async (req, res) => {
  try {
    const { tier, billingCycle } = req.body;
    
    // Validate tier
    if (!['standard', 'pro', 'enterprise'].includes(tier)) {
      return res.status(400).json({ error: 'Invalid tier' });
    }
    
    // Validate billing cycle
    if (!['monthly', 'yearly'].includes(billingCycle)) {
      return res.status(400).json({ error: 'Invalid billing cycle' });
    }
    
    // Check if user is trying to upgrade (not downgrade)
    const tierHierarchy = { free: 0, standard: 1, pro: 2, enterprise: 3 };
    if (tierHierarchy[req.user.tier] >= tierHierarchy[tier]) {
      return res.status(400).json({ 
        error: 'Cannot downgrade or purchase same tier. Please contact support.' 
      });
    }
    
    const price = TIER_PRICES[tier][billingCycle];
    
    // Create Stripe checkout session
    const session = await getStripe().checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: `CrowdAI ${tier.charAt(0).toUpperCase() + tier.slice(1)} Tier`,
              description: `${billingCycle === 'monthly' ? 'Monthly' : 'Annual'} subscription`,
            },
            unit_amount: price,
            recurring: {
              interval: billingCycle === 'monthly' ? 'month' : 'year'
            }
          },
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: `${req.headers.origin || 'http://localhost:5173'}?payment=success&tier=${tier}`,
      cancel_url: `${req.headers.origin || 'http://localhost:5173'}?payment=cancelled`,
      client_reference_id: req.user._id.toString(),
      metadata: {
        userId: req.user._id.toString(),
        tier: tier,
        billingCycle: billingCycle
      }
    });
    
    res.json({ sessionId: session.id, url: session.url });
  } catch (error) {
    console.error('Error creating checkout session:', error);
    res.status(500).json({ error: 'Failed to create checkout session' });
  }
});

/**
 * POST /api/payments/webhook
 * Handle Stripe webhook events
 */
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  
  let event;
  
  try {
    event = getStripe().webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }
  
  // Handle the event
  switch (event.type) {
    case 'checkout.session.completed':
      const session = event.data.object;
      await handleSuccessfulPayment(session);
      break;
      
    case 'customer.subscription.updated':
      const subscription = event.data.object;
      await handleSubscriptionUpdate(subscription);
      break;
      
    case 'customer.subscription.deleted':
      const canceledSubscription = event.data.object;
      await handleSubscriptionCancellation(canceledSubscription);
      break;
      
    case 'invoice.payment_failed':
      const failedInvoice = event.data.object;
      await handlePaymentFailure(failedInvoice);
      break;
      
    default:
      console.log(`Unhandled event type: ${event.type}`);
  }
  
  res.json({ received: true });
});

/**
 * Handle successful payment
 */
async function handleSuccessfulPayment(session) {
  try {
    const userId = session.metadata.userId;
    const tier = session.metadata.tier;
    const billingCycle = session.metadata.billingCycle;
    
    // Update user tier
    const user = await User.findByIdAndUpdate(
      userId,
      { 
        tier: tier,
        stripeCustomerId: session.customer,
        stripeSubscriptionId: session.subscription,
        subscriptionStatus: 'active',
        billingCycle: billingCycle,
        subscriptionStartDate: new Date()
      },
      { new: true }
    );
    
    console.log(`✅ User ${user.email} upgraded to ${tier} tier`);
  } catch (error) {
    console.error('Error handling successful payment:', error);
  }
}

/**
 * Handle subscription update
 */
async function handleSubscriptionUpdate(subscription) {
  try {
    const user = await User.findOne({ stripeSubscriptionId: subscription.id });
    
    if (user) {
      user.subscriptionStatus = subscription.status;
      await user.save();
      console.log(`📝 Subscription updated for user ${user.email}: ${subscription.status}`);
    }
  } catch (error) {
    console.error('Error handling subscription update:', error);
  }
}

/**
 * Handle subscription cancellation
 */
async function handleSubscriptionCancellation(subscription) {
  try {
    const user = await User.findOne({ stripeSubscriptionId: subscription.id });
    
    if (user) {
      // Downgrade to free tier
      user.tier = 'free';
      user.subscriptionStatus = 'canceled';
      user.subscriptionEndDate = new Date();
      await user.save();
      console.log(`❌ Subscription canceled for user ${user.email}, downgraded to free`);
    }
  } catch (error) {
    console.error('Error handling subscription cancellation:', error);
  }
}

/**
 * Handle payment failure
 */
async function handlePaymentFailure(invoice) {
  try {
    const user = await User.findOne({ stripeCustomerId: invoice.customer });
    
    if (user) {
      user.subscriptionStatus = 'past_due';
      await user.save();
      console.log(`⚠️ Payment failed for user ${user.email}`);
      // TODO: Send email notification to user
    }
  } catch (error) {
    console.error('Error handling payment failure:', error);
  }
}

/**
 * GET /api/payments/subscription
 * Get current user's subscription details
 */
router.get('/subscription', authenticate, async (req, res) => {
  try {
    if (!req.user.stripeSubscriptionId) {
      return res.json({ 
        hasSubscription: false,
        tier: req.user.tier
      });
    }
    
    const subscription = await getStripe().subscriptions.retrieve(req.user.stripeSubscriptionId);
    
    res.json({
      hasSubscription: true,
      tier: req.user.tier,
      status: subscription.status,
      currentPeriodEnd: new Date(subscription.current_period_end * 1000),
      cancelAtPeriodEnd: subscription.cancel_at_period_end
    });
  } catch (error) {
    console.error('Error fetching subscription:', error);
    res.status(500).json({ error: 'Failed to fetch subscription' });
  }
});

/**
 * POST /api/payments/cancel-subscription
 * Cancel user's subscription (at period end)
 */
router.post('/cancel-subscription', authenticate, async (req, res) => {
  try {
    if (!req.user.stripeSubscriptionId) {
      return res.status(400).json({ error: 'No active subscription' });
    }
    
    const subscription = await getStripe().subscriptions.update(
      req.user.stripeSubscriptionId,
      { cancel_at_period_end: true }
    );
    
    res.json({ 
      message: 'Subscription will be canceled at period end',
      cancelAt: new Date(subscription.current_period_end * 1000)
    });
  } catch (error) {
    console.error('Error canceling subscription:', error);
    res.status(500).json({ error: 'Failed to cancel subscription' });
  }
});

/**
 * POST /api/payments/reactivate-subscription
 * Reactivate a canceled subscription
 */
router.post('/reactivate-subscription', authenticate, async (req, res) => {
  try {
    if (!req.user.stripeSubscriptionId) {
      return res.status(400).json({ error: 'No subscription to reactivate' });
    }
    
    const subscription = await getStripe().subscriptions.update(
      req.user.stripeSubscriptionId,
      { cancel_at_period_end: false }
    );
    
    res.json({ 
      message: 'Subscription reactivated successfully',
      status: subscription.status
    });
  } catch (error) {
    console.error('Error reactivating subscription:', error);
    res.status(500).json({ error: 'Failed to reactivate subscription' });
  }
});

/**
 * POST /api/payments/manual-upgrade
 * Manual tier upgrade for testing (development only)
 * This bypasses Stripe and directly upgrades the user
 */
router.post('/manual-upgrade', authenticate, async (req, res) => {
  try {
    // Only allow in development
    if (process.env.NODE_ENV === 'production') {
      return res.status(403).json({ error: 'Not available in production' });
    }
    
    const { tier, billingCycle } = req.body;
    
    // Validate tier
    if (!['standard', 'pro', 'enterprise'].includes(tier)) {
      return res.status(400).json({ error: 'Invalid tier' });
    }
    
    // Update user
    const user = await User.findByIdAndUpdate(
      req.user._id,
      {
        tier: tier,
        subscriptionStatus: 'active',
        billingCycle: billingCycle || 'monthly',
        subscriptionStartDate: new Date(),
        subscriptionEndDate: null
      },
      { new: true }
    );
    
    console.log(`✅ [MANUAL] User ${user.email} upgraded to ${tier} tier`);
    
    res.json({
      success: true,
      message: `Upgraded to ${tier} tier`,
      user: {
        id: user._id,
        email: user.email,
        tier: user.tier,
        isAdmin: user.isAdmin || false
      }
    });
  } catch (error) {
    console.error('Error in manual upgrade:', error);
    res.status(500).json({ error: 'Failed to upgrade' });
  }
});

export default router;