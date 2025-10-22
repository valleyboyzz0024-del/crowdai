import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import TierUpgrade from './TierUpgrade';

const UsageBar = () => {
  const { user } = useAuth();
  const [cooldownRemaining, setCooldownRemaining] = useState(null);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  useEffect(() => {
    if (!user?.cooldownUntil) {
      setCooldownRemaining(null);
      return;
    }

    const updateCooldown = () => {
      const now = new Date();
      const cooldownEnd = new Date(user.cooldownUntil);
      const remaining = cooldownEnd - now;

      if (remaining <= 0) {
        setCooldownRemaining(null);
      } else {
        const hours = Math.floor(remaining / (1000 * 60 * 60));
        const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
        setCooldownRemaining({ hours, minutes });
      }
    };

    updateCooldown();
    const interval = setInterval(updateCooldown, 60000); // Update every minute

    return () => clearInterval(interval);
  }, [user?.cooldownUntil]);

  if (!user) return null;

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
            ? ['claude', 'chatgpt', 'gemini', 'groq']
            : ['claude', 'chatgpt', 'gemini', 'llama', 'deepseek', 'grok', 'groq'])
  };

  const queriesUsed = user.queriesUsed || 0;
  const maxQueries = tierLimits.maxQueriesPerDay;
  const queriesRemaining = maxQueries === Infinity ? '∞' : maxQueries - queriesUsed;
  const usagePercentage = maxQueries === Infinity ? 0 : (queriesUsed / maxQueries) * 100;

  const getTierColor = () => {
    switch (user.tier) {
      case 'enterprise': return 'from-purple-500 to-pink-500';
      case 'pro': return 'from-blue-500 to-cyan-500';
      case 'standard': return 'from-green-500 to-emerald-500';
      case 'free': return 'from-gray-500 to-gray-600';
      default: return 'from-gray-500 to-gray-600';
    }
  };

  const getTierBadgeColor = () => {
    switch (user.tier) {
      case 'enterprise': return 'bg-gradient-to-r from-purple-600 to-pink-600';
      case 'pro': return 'bg-gradient-to-r from-blue-600 to-cyan-600';
      case 'standard': return 'bg-gradient-to-r from-green-600 to-emerald-600';
      case 'free': return 'bg-gray-600';
      default: return 'bg-gray-600';
    }
  };

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-lg p-2 space-y-2">
      {/* User Info and Tier Badge */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold text-sm">
            {user.username?.charAt(0).toUpperCase() || 'U'}
          </div>
          <div>
            <p className="text-white font-semibold text-sm">{user.username}</p>
            <p className="text-xs text-gray-400">{user.email}</p>
          </div>
        </div>
        <span className={`px-2 py-0.5 rounded-full text-xs font-bold text-white ${getTierBadgeColor()}`}>
          {user.tier.toUpperCase()}
        </span>
      </div>

      {/* Usage Progress Bar */}
      <div>
        <div className="flex justify-between items-center mb-1">
          <span className="text-xs text-gray-300">Daily Queries</span>
          <span className="text-xs font-semibold text-white">
            {queriesUsed} / {maxQueries === Infinity ? '∞' : maxQueries}
          </span>
        </div>
        <div className="w-full bg-gray-700 rounded-full h-1.5 overflow-hidden">
          <div
            className={`h-full bg-gradient-to-r ${getTierColor()} transition-all duration-300`}
            style={{ width: `${Math.min(usagePercentage, 100)}%` }}
          />
        </div>
        {maxQueries !== Infinity && queriesRemaining <= 5 && queriesRemaining > 0 && (
          <p className="text-xs text-yellow-400 mt-0.5">
            ⚠️ {queriesRemaining} left
          </p>
        )}
        {queriesRemaining <= 0 && maxQueries !== Infinity && (
          <p className="text-xs text-red-400 mt-0.5">
            ❌ Limit reached
          </p>
        )}
      </div>

      {/* Cooldown Warning (Standard Tier) */}
      {user.tier === 'standard' && cooldownRemaining && (
        <div className="bg-orange-900/30 border border-orange-700 rounded p-1.5">
          <p className="text-xs text-orange-300">
            ⏱️ Cooldown: {cooldownRemaining.hours}h {cooldownRemaining.minutes}m
          </p>
        </div>
      )}

      {/* Available AIs */}
      <div>
        <p className="text-xs text-gray-400 mb-1">Available AIs:</p>
        <div className="flex flex-wrap gap-1">
          {tierLimits.allowedAIs.map((ai) => (
            <span
              key={ai}
              className="px-1.5 py-0.5 bg-gray-700 text-xs text-gray-300 rounded"
            >
              {ai.charAt(0).toUpperCase() + ai.slice(1)}
            </span>
          ))}
        </div>
      </div>

      {/* Upgrade Prompt for Free/Standard Users */}
      {(user.tier === 'free' || user.tier === 'standard') && (
        <button
          onClick={() => setShowUpgradeModal(true)}
          className="w-full py-1.5 px-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white text-xs font-semibold rounded-lg transition-all"
        >
          {user.tier === 'free' ? '⚡ Upgrade' : '🚀 Upgrade'}
        </button>
      )}
      
      {/* Tier Upgrade Modal */}
      {showUpgradeModal && (
        <TierUpgrade
          currentTier={user.tier}
          onClose={() => setShowUpgradeModal(false)}
        />
      )}
    </div>
  );
};

// Helper function to calculate time until daily reset
const getTimeUntilReset = () => {
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);
  
  const diff = tomorrow - now;
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  
  return `${hours}h ${minutes}m`;
};

export default UsageBar;