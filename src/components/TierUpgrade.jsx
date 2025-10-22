import React, { useState } from 'react';
import { Check, X, Zap, Crown, Building2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const TierUpgrade = ({ currentTier, onClose }) => {
  const { accessToken, refreshAccessToken } = useAuth();
  const [selectedTier, setSelectedTier] = useState(null);
  const [billingCycle, setBillingCycle] = useState('monthly');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const tiers = {
    standard: {
      name: 'Starter',
      icon: <Zap className="w-8 h-8" />,
      color: 'from-green-500 to-emerald-500',
      price: { monthly: 8.99, yearly: 89.99 },
      features: [
        '50 queries/day',
        'Fast AIs: Gemini, Llama, DeepSeek, Grok, Groq',
        'Code execution',
        'Image generation',
        'Unlimited chat history',
        'Voice input'
      ],
      badge: '90% MARGIN ✨',
      savings: 'Save $73/mo in API costs'
    },
    pro: {
      name: 'Pro',
      icon: <Crown className="w-8 h-8" />,
      color: 'from-blue-500 to-cyan-500',
      price: { monthly: 28.99, yearly: 289.99 },
      features: [
        '200 queries/day',
        'ALL 7 AIs: Claude, ChatGPT, Gemini, Llama, DeepSeek, Grok, Groq',
        'File uploads',
        'Advanced features',
        'Priority support',
        'No cooldowns'
      ],
      badge: 'MOST POPULAR ⭐',
      savings: 'Unlock premium AIs'
    },
    enterprise: {
      name: 'Enterprise',
      icon: <Building2 className="w-8 h-8" />,
      color: 'from-purple-500 to-pink-500',
      price: { monthly: 98.99, yearly: 989.99 },
      features: [
        '1000 queries/day',
        'All 7 AI models (Claude, ChatGPT, Gemini, Llama, DeepSeek, Grok, Groq)',
        'Priority processing',
        'API access',
        'Team features',
        'Dedicated support',
        '24/7 phone support',
        'Custom integrations'
      ],
      badge: 'BEST VALUE 🚀',
      savings: 'For power users & teams'
    }
  };

  const canUpgradeTo = (tier) => {
    const hierarchy = { free: 0, standard: 1, pro: 2, enterprise: 3 };
    return hierarchy[currentTier] < hierarchy[tier];
  };

  const handleUpgrade = async (tier) => {
    if (!canUpgradeTo(tier)) {
      setError('You cannot downgrade or purchase the same tier');
      return;
    }

    setSelectedTier(tier);
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/payments/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        },
        body: JSON.stringify({
          tier,
          billingCycle
        })
      });

      const data = await response.json();

      if (response.ok && data.url) {
        // Redirect to Stripe Checkout
        window.location.href = data.url;
      } else {
        setError(data.error || 'Failed to create checkout session');
        setLoading(false);
      }
    } catch (error) {
      setError('Network error. Please try again.');
      setLoading(false);
    }
  };


  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-2">
      <div className="bg-gray-900 rounded-lg shadow-2xl w-full max-w-xl border border-gray-700 max-h-[85vh] overflow-y-auto">
        {/* Header */}
        <div className="flex justify-between items-center p-3 border-b border-gray-700 bg-gray-900 sticky top-0 z-10">
          <div>
            <h2 className="text-lg font-bold text-white">Upgrade</h2>
            <p className="text-gray-400 text-xs">Select a plan</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mx-3 mt-2 bg-red-900/50 border border-red-700 text-red-200 px-2 py-1.5 rounded text-xs">
            {error}
          </div>
        )}

        {/* Cards */}
        <div className="p-3 space-y-2">
          {Object.entries(tiers).map(([tierKey, tier]) => {
            const isCurrentTier = currentTier === tierKey;
            const canUpgrade = canUpgradeTo(tierKey);
            const price = tier.price.monthly;

            return (
              <div
                key={tierKey}
                className={`bg-gray-800 rounded-lg p-3 border ${
                  isCurrentTier ? 'border-green-500' : canUpgrade ? 'border-gray-700' : 'border-gray-800 opacity-60'
                } relative overflow-hidden`}
              >
                {/* Badge */}
                {tier.badge && canUpgrade && (
                  <div className="absolute top-2 right-2 bg-gradient-to-r from-yellow-500 to-orange-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                    {tier.badge}
                  </div>
                )}
                
                <div className="flex items-center justify-between gap-3">
                  {/* Left */}
                  <div className="flex items-center gap-2.5">
                    <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${tier.color} flex items-center justify-center flex-shrink-0`}>
                      {React.cloneElement(tier.icon, { className: "w-5 h-5 text-white" })}
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-white">{tier.name}</h3>
                      <p className="text-lg font-bold text-green-400">${price}<span className="text-xs text-gray-400">/mo</span></p>
                      {tier.savings && (
                        <p className="text-xs text-cyan-400">{tier.savings}</p>
                      )}
                    </div>
                  </div>

                  {/* Button */}
                  <button
                    onClick={() => handleUpgrade(tierKey)}
                    disabled={!canUpgrade || loading}
                    className={`px-3 py-1.5 rounded text-xs font-bold transition-all flex-shrink-0 ${
                      isCurrentTier
                        ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
                        : canUpgrade
                        ? `bg-gradient-to-r ${tier.color} hover:opacity-90 text-white`
                        : 'bg-gray-700 text-gray-500 cursor-not-allowed'
                    }`}
                  >
                    {loading && selectedTier === tierKey ? (
                      <span className="flex items-center gap-1">
                        <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        Wait
                      </span>
                    ) : isCurrentTier ? (
                      'Current'
                    ) : canUpgrade ? (
                      'Select'
                    ) : (
                      'N/A'
                    )}
                  </button>
                </div>

                {/* Features */}
                <div className="mt-2 grid grid-cols-2 gap-1">
                  {tier.features.slice(0, 4).map((feature, index) => (
                    <div key={index} className="flex items-start gap-1">
                      <Check className="w-3 h-3 text-green-400 flex-shrink-0 mt-0.5" />
                      <span className="text-xs text-gray-300 leading-tight">{feature}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="p-2 border-t border-gray-700 text-center text-xs text-gray-400">
          <p>Cancel anytime</p>
        </div>
      </div>
    </div>
  );
};

export default TierUpgrade;