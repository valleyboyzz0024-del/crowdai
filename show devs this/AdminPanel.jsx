import React, { useState, useEffect } from 'react';
import { X, Users, DollarSign, TrendingUp, Link2, Mail, Shield, Trash2, Crown, Copy, Check } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const AdminPanel = ({ onClose }) => {
  const { accessToken } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');
  const [siteStats, setSiteStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);
  const [trialLink, setTrialLink] = useState('');
  const [copiedLink, setCopiedLink] = useState(false);
  
  // Trial form state
  const [trialForm, setTrialForm] = useState({
    tier: 'pro',
    duration: 1,
    durationType: 'month'
  });

  useEffect(() => {
    if (activeTab === 'overview') {
      fetchSiteStats();
    } else if (activeTab === 'users') {
      fetchUsers();
    }
  }, [activeTab]);

  const fetchSiteStats = async () => {
    try {
      const response = await fetch('/api/admin/site-stats', {
        headers: { 'Authorization': `Bearer ${accessToken}` }
      });
      const data = await response.json();
      if (data.success) {
        setSiteStats(data.stats);
      }
    } catch (error) {
      console.error('Failed to fetch site stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const response = await fetch(`/api/admin/users?search=${searchQuery}`, {
        headers: { 'Authorization': `Bearer ${accessToken}` }
      });
      const data = await response.json();
      if (data.success) {
        setUsers(data.users);
      }
    } catch (error) {
      console.error('Failed to fetch users:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateTrialLink = async () => {
    try {
      const response = await fetch('/api/admin/generate-trial-link', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        },
        body: JSON.stringify(trialForm)
      });
      const data = await response.json();
      if (data.success) {
        setTrialLink(data.link);
      }
    } catch (error) {
      console.error('Failed to generate trial link:', error);
    }
  };

  const grantTrial = async (email) => {
    if (!window.confirm(`Grant ${trialForm.durationType === 'week' ? trialForm.duration + '-week' : trialForm.duration + '-month'} ${trialForm.tier} trial to ${email}?`)) {
      return;
    }

    try {
      const response = await fetch('/api/admin/grant-trial', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        },
        body: JSON.stringify({
          email,
          ...trialForm
        })
      });
      const data = await response.json();
      if (data.success) {
        alert(`✅ ${data.message}`);
        fetchUsers();
      } else {
        alert(`❌ ${data.error}`);
      }
    } catch (error) {
      alert('Failed to grant trial');
    }
  };

  const revokeSubscription = async (email) => {
    if (!window.confirm(`Revoke subscription from ${email}? They will be downgraded to Free tier.`)) {
      return;
    }

    try {
      const response = await fetch('/api/admin/revoke-subscription', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        },
        body: JSON.stringify({ email })
      });
      const data = await response.json();
      if (data.success) {
        alert(`✅ ${data.message}`);
        fetchUsers();
      } else {
        alert(`❌ ${data.error}`);
      }
    } catch (error) {
      alert('Failed to revoke subscription');
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-gray-900 rounded-xl shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden border border-gray-700 flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-gray-700 bg-gradient-to-r from-purple-900/50 to-blue-900/50">
          <div className="flex items-center gap-3">
            <Shield className="w-8 h-8 text-purple-400" />
            <div>
              <h2 className="text-2xl font-bold text-white">Admin Panel</h2>
              <p className="text-sm text-gray-400">System management & analytics</p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-700 bg-gray-800/50">
          <button
            onClick={() => setActiveTab('overview')}
            className={`flex-1 py-3 px-4 text-sm font-medium transition-colors ${
              activeTab === 'overview'
                ? 'bg-purple-600/20 text-purple-400 border-b-2 border-purple-400'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            <TrendingUp className="w-4 h-4 inline-block mr-2" />
            Overview
          </button>
          <button
            onClick={() => setActiveTab('users')}
            className={`flex-1 py-3 px-4 text-sm font-medium transition-colors ${
              activeTab === 'users'
                ? 'bg-purple-600/20 text-purple-400 border-b-2 border-purple-400'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            <Users className="w-4 h-4 inline-block mr-2" />
            Users
          </button>
          <button
            onClick={() => setActiveTab('trials')}
            className={`flex-1 py-3 px-4 text-sm font-medium transition-colors ${
              activeTab === 'trials'
                ? 'bg-purple-600/20 text-purple-400 border-b-2 border-purple-400'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            <Link2 className="w-4 h-4 inline-block mr-2" />
            Trial Links
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-400"></div>
            </div>
          ) : activeTab === 'overview' ? (
            <div className="space-y-6">
              {/* Stats Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-gradient-to-br from-blue-600/20 to-blue-800/20 border border-blue-500/30 rounded-lg p-6">
                  <div className="flex items-center justify-between mb-2">
                    <Users className="w-8 h-8 text-blue-400" />
                    <span className="text-xs text-blue-400 font-medium">TOTAL</span>
                  </div>
                  <div className="text-3xl font-bold text-white">{siteStats?.totalUsers || 0}</div>
                  <div className="text-sm text-gray-400">Registered Users</div>
                </div>

                <div className="bg-gradient-to-br from-green-600/20 to-green-800/20 border border-green-500/30 rounded-lg p-6">
                  <div className="flex items-center justify-between mb-2">
                    <DollarSign className="w-8 h-8 text-green-400" />
                    <span className="text-xs text-green-400 font-medium">REVENUE</span>
                  </div>
                  <div className="text-3xl font-bold text-white">${siteStats?.totalRevenue?.toFixed(2) || '0.00'}</div>
                  <div className="text-sm text-gray-400">Monthly Revenue</div>
                </div>

                <div className="bg-gradient-to-br from-purple-600/20 to-purple-800/20 border border-purple-500/30 rounded-lg p-6">
                  <div className="flex items-center justify-between mb-2">
                    <TrendingUp className="w-8 h-8 text-purple-400" />
                    <span className="text-xs text-purple-400 font-medium">QUERIES</span>
                  </div>
                  <div className="text-3xl font-bold text-white">{siteStats?.totalQueries?.toLocaleString() || 0}</div>
                  <div className="text-sm text-gray-400">Total Queries</div>
                </div>
              </div>

              {/* Site-wide API Costs */}
              <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
                <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                  <DollarSign className="w-5 h-5 text-yellow-400" />
                  Site-wide API Costs
                </h3>
                <div className="space-y-3">
                  {siteStats?.apiCosts && Object.entries(siteStats.apiCosts).map(([ai, cost]) => (
                    <div key={ai} className="flex justify-between items-center">
                      <span className="text-gray-300 capitalize">{ai}</span>
                      <span className="text-lg font-mono text-yellow-400">${cost.toFixed(4)}</span>
                    </div>
                  ))}
                  <div className="pt-3 border-t border-gray-700 flex justify-between items-center">
                    <span className="text-white font-bold">Total API Cost</span>
                    <span className="text-2xl font-mono font-bold text-yellow-400">
                      ${siteStats?.totalApiCost?.toFixed(4) || '0.0000'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Tier Distribution */}
              <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
                <h3 className="text-lg font-bold text-white mb-4">Tier Distribution</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {siteStats?.tierDistribution && Object.entries(siteStats.tierDistribution).map(([tier, count]) => (
                    <div key={tier} className="bg-gray-700/50 rounded-lg p-4 text-center">
                      <div className="text-2xl font-bold text-white">{count}</div>
                      <div className="text-sm text-gray-400 capitalize">{tier}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : activeTab === 'users' ? (
            <div className="space-y-4">
              {/* Search */}
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && fetchUsers()}
                placeholder="Search by email or username..."
                className="w-full px-4 py-2 bg-gray-800 border border-gray-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              />

              {/* Users Table */}
              <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
                <table className="w-full">
                  <thead className="bg-gray-700/50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">User</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Tier</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Queries</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-700">
                    {users.map((user) => (
                      <tr key={user.id || user._id} className="hover:bg-gray-700/30 transition-colors">
                        <td className="px-4 py-3">
                          <div>
                            <div className="text-sm font-medium text-white">{user.username}</div>
                            <div className="text-xs text-gray-400">{user.email}</div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                            user.tier === 'enterprise' ? 'bg-purple-600/20 text-purple-400' :
                            user.tier === 'pro' ? 'bg-blue-600/20 text-blue-400' :
                            user.tier === 'standard' ? 'bg-green-600/20 text-green-400' :
                            'bg-gray-600/20 text-gray-400'
                          }`}>
                            {user.tier.toUpperCase()}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-300">{user.queriesUsed || 0}</td>
                        <td className="px-4 py-3">
                          <div className="flex gap-2">
                            <button
                              onClick={() => grantTrial(user.email)}
                              className="px-3 py-1 bg-green-600/20 hover:bg-green-600/30 text-green-400 rounded text-xs font-medium transition-all border border-green-500/30"
                            >
                              <Crown className="w-3 h-3 inline-block mr-1" />
                              Grant Trial
                            </button>
                            {user.tier !== 'free' && (
                              <button
                                onClick={() => revokeSubscription(user.email)}
                                className="px-3 py-1 bg-red-600/20 hover:bg-red-600/30 text-red-400 rounded text-xs font-medium transition-all border border-red-500/30"
                              >
                                <Trash2 className="w-3 h-3 inline-block mr-1" />
                                Revoke
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Trial Link Generator */}
              <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
                <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                  <Link2 className="w-5 h-5 text-cyan-400" />
                  Generate Trial Link
                </h3>
                
                <div className="grid grid-cols-3 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">Tier</label>
                    <select
                      value={trialForm.tier}
                      onChange={(e) => setTrialForm({ ...trialForm, tier: e.target.value })}
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                    >
                      <option value="standard">Starter</option>
                      <option value="pro">Pro</option>
                      <option value="enterprise">Enterprise</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">Duration</label>
                    <input
                      type="number"
                      min="1"
                      max="12"
                      value={trialForm.duration}
                      onChange={(e) => setTrialForm({ ...trialForm, duration: parseInt(e.target.value) })}
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">Type</label>
                    <select
                      value={trialForm.durationType}
                      onChange={(e) => setTrialForm({ ...trialForm, durationType: e.target.value })}
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                    >
                      <option value="week">Week(s)</option>
                      <option value="month">Month(s)</option>
                    </select>
                  </div>
                </div>

                <button
                  onClick={generateTrialLink}
                  className="w-full py-3 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-bold rounded-lg transition-all"
                >
                  Generate Link
                </button>

                {trialLink && (
                  <div className="mt-4 p-4 bg-gray-700/50 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-400">Trial Link:</span>
                      <button
                        onClick={() => copyToClipboard(trialLink)}
                        className="px-3 py-1 bg-green-600/20 hover:bg-green-600/30 text-green-400 rounded text-xs font-medium transition-all border border-green-500/30"
                      >
                        {copiedLink ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                      </button>
                    </div>
                    <div className="p-3 bg-gray-900 rounded text-sm text-cyan-400 font-mono break-all">
                      {trialLink}
                    </div>
                    <p className="text-xs text-gray-400 mt-2">
                      Share this link with your friend. They'll get a {trialForm.duration} {trialForm.durationType} {trialForm.tier} trial when they sign up!
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminPanel;