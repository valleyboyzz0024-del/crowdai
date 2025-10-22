import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: true,
    minlength: 8
  },
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  isAdmin: {
    type: Boolean,
    default: false
  },
  tier: {
    type: String,
    enum: ['free', 'standard', 'pro', 'enterprise'],
    default: 'free'
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  lastLogin: {
    type: Date,
    default: Date.now
  },
  // Usage tracking
  usage: {
    queriesUsed: {
      type: Number,
      default: 0
    },
    lastResetDate: {
      type: Date,
      default: Date.now
    },
    cooldownUntil: {
      type: Date,
      default: null
    },
    sessionStartTime: {
      type: Date,
      default: null
    }
  },
  // Enabled AIs per user
  enabledAIs: {
    claude: { type: Boolean, default: true },
    chatgpt: { type: Boolean, default: false },
    gemini: { type: Boolean, default: true },
    llama: { type: Boolean, default: false },
    deepseek: { type: Boolean, default: false },
    grok: { type: Boolean, default: false },
    groq: { type: Boolean, default: false }
  },
  // User preferences
  preferences: {
    aiPersonas: {
      type: Object,
      default: {}
    },
    includePastChats: {
      type: Boolean,
      default: true
    },
    streamingEnabled: {
      type: Boolean,
      default: true
    },
    voiceEnabled: {
      type: Boolean,
      default: false
    }
  },
  // OAuth data
  oauthProvider: {
    type: String,
    enum: ['local', 'google', 'github'],
    default: 'local'
  },
  oauthId: {
    type: String,
    default: null
  },
  // Stripe subscription fields
  stripeCustomerId: {
    type: String,
    default: null
  },
  stripeSubscriptionId: {
    type: String,
    default: null
  },
  subscriptionStatus: {
    type: String,
    enum: ['active', 'canceled', 'past_due', 'unpaid', null],
    default: null
  },
  billingCycle: {
    type: String,
    enum: ['monthly', 'yearly', null],
    default: null
  },
  subscriptionStartDate: {
    type: Date,
    default: null
  },
  subscriptionEndDate: {
    type: Date,
    default: null
  },
  // Free trial fields
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
    enum: ['free', 'standard', 'pro', 'enterprise', null],
    default: null
  }
}, {
  timestamps: true
});

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Method to compare passwords
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Method to check if daily limit should be reset
userSchema.methods.shouldResetDailyLimit = function() {
  const now = new Date();
  const lastReset = new Date(this.usage.lastResetDate);
  
  // Reset if it's been more than 24 hours
  return (now - lastReset) > (24 * 60 * 60 * 1000);
};

// Method to check and handle trial expiration
userSchema.methods.checkTrialExpiration = function() {
  if (this.isOnTrial && this.trialEndDate) {
    const now = new Date();
    if (now > this.trialEndDate) {
      // Trial has expired, revert to original tier
      this.tier = this.originalTier || 'free';
      this.isOnTrial = false;
      this.trialEndDate = null;
      this.originalTier = null;
      return true; // Trial expired
    }
  }
  return false; // Trial still active or no trial
};

// Method to get tier limits
userSchema.methods.getTierLimits = function() {
  // Check trial expiration first
  this.checkTrialExpiration();
  
  // Admins get unlimited everything
  if (this.isAdmin) {
    return {
      queriesPerDay: Infinity,
      allowedAIs: ['claude', 'chatgpt', 'gemini', 'llama', 'deepseek', 'grok', 'groq'],
      fileUploads: true,
      imageGeneration: true,
      videoGeneration: true,
      codeExecution: true,
      sessionDuration: null,
      cooldownDuration: null,
      priority: true,
      admin: true
    };
  }

  const limits = {
    free: {
      queriesPerDay: 10,  // Reduced from 25 to 10
      allowedAIs: ['claude', 'gemini'],  // Match client-side: Claude + Gemini for free
      fileUploads: false,
      imageGeneration: false,
      videoGeneration: false,
      codeExecution: false,
      sessionDuration: null,
      cooldownDuration: null,
      features: {
        chatHistory: 3,  // Limited to 3 saved chats
        voiceInput: false,
        advancedFeatures: false
      }
    },
    standard: {
      queriesPerDay: 50,  // New tier - cheap AIs + Grok + Groq
      allowedAIs: ['claude', 'chatgpt', 'gemini', 'groq'],  // Match client-side: add Groq, include ChatGPT
      fileUploads: false,
      imageGeneration: true,
      videoGeneration: false,
      codeExecution: true,
      sessionDuration: null,
      cooldownDuration: null,
      features: {
        chatHistory: 'unlimited',
        voiceInput: true,
        advancedFeatures: true
      }
    },
    pro: {
      queriesPerDay: 200,  // Reduced from 500 to 200 for better margins
      allowedAIs: ['claude', 'chatgpt', 'gemini', 'llama', 'deepseek', 'grok', 'groq'],  // All AIs unlocked
      fileUploads: true,
      imageGeneration: true,
      videoGeneration: true,
      codeExecution: true,
      sessionDuration: null,
      cooldownDuration: null,
      features: {
        chatHistory: 'unlimited',
        voiceInput: true,
        advancedFeatures: true,
        prioritySupport: false
      }
    },
    enterprise: {
      queriesPerDay: 1000,  // High limit but not infinite for cost control
      allowedAIs: ['claude', 'chatgpt', 'gemini', 'llama', 'deepseek', 'grok', 'groq'],  // All AIs unlocked
      fileUploads: true,
      imageGeneration: true,
      videoGeneration: true,
      codeExecution: true,
      sessionDuration: null,
      cooldownDuration: null,
      priority: true,
      features: {
        chatHistory: 'unlimited',
        voiceInput: true,
        advancedFeatures: true,
        prioritySupport: true,
        apiAccess: true,
        teamFeatures: true
      }
    }
  };
  
  return limits[this.tier];
};

// Method to check if user can make a query
userSchema.methods.canMakeQuery = function() {
  // Admins always allowed
  if (this.isAdmin) {
    return { allowed: true };
  }

  // Reset daily limit if needed
  if (this.shouldResetDailyLimit()) {
    this.usage.queriesUsed = 0;
    this.usage.lastResetDate = new Date();
  }
  
  const limits = this.getTierLimits();
  
  // Check daily limit
  if (this.usage.queriesUsed >= limits.queriesPerDay) {
    return { allowed: false, reason: 'Daily query limit reached' };
  }
  
  // Check cooldown
  if (limits.cooldownDuration && this.usage.cooldownUntil) {
    const now = new Date();
    if (now < this.usage.cooldownUntil) {
      const minutesLeft = Math.ceil((this.usage.cooldownUntil - now) / (60 * 1000));
      return { allowed: false, reason: `Cooldown active. ${minutesLeft} minutes remaining` };
    }
  }
  
  return { allowed: true };
};

// Method to start a session (for Standard tier)
userSchema.methods.startSession = function() {
  const limits = this.getTierLimits();
  if (limits.sessionDuration) {
    this.usage.sessionStartTime = new Date();
  }
};

// Method to end a session and start cooldown (for Standard tier)
userSchema.methods.endSessionAndStartCooldown = function() {
  const limits = this.getTierLimits();
  if (limits.sessionDuration && limits.cooldownDuration) {
    const now = new Date();
    const sessionStart = new Date(this.usage.sessionStartTime);
    const sessionDuration = now - sessionStart;
    
    // If session exceeded 2 hours, start cooldown
    if (sessionDuration >= limits.sessionDuration) {
      this.usage.cooldownUntil = new Date(now.getTime() + limits.cooldownDuration);
      this.usage.sessionStartTime = null;
    }
  }
};

const User = mongoose.model('User', userSchema);

export default User;