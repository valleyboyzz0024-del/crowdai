import React, { createContext, useState, useContext, useEffect } from 'react';

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [accessToken, setAccessToken] = useState(null);
  const [refreshToken, setRefreshToken] = useState(null);
  const [loading, setLoading] = useState(true);

  // Load tokens from localStorage on mount
  useEffect(() => {
    const storedAccessToken = localStorage.getItem('crowdai_access_token');
    const storedRefreshToken = localStorage.getItem('crowdai_refresh_token');
    
    if (storedAccessToken) {
      setAccessToken(storedAccessToken);
      setRefreshToken(storedRefreshToken);
      // Fetch user data
      fetchUserData(storedAccessToken);
    } else {
      setLoading(false);
    }
  }, []);

  const fetchUserData = async (token) => {
    try {
      const response = await fetch('/api/auth/me', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setUser(data.user);
      } else {
        // Token might be expired, try to refresh
        await refreshAccessToken();
      }
    } catch (error) {
      console.error('Failed to fetch user data:', error);
    } finally {
      setLoading(false);
    }
  };

  const refreshAccessToken = async () => {
    try {
      const storedRefreshToken = localStorage.getItem('crowdai_refresh_token');
      if (!storedRefreshToken) {
        logout();
        return;
      }

      const response = await fetch('/api/auth/refresh', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ refreshToken: storedRefreshToken })
      });

      if (response.ok) {
        const data = await response.json();
        setAccessToken(data.accessToken);
        setRefreshToken(data.refreshToken);
        localStorage.setItem('crowdai_access_token', data.accessToken);
        localStorage.setItem('crowdai_refresh_token', data.refreshToken);
        
        // Fetch user data with new token
        await fetchUserData(data.accessToken);
      } else {
        logout();
      }
    } catch (error) {
      console.error('Failed to refresh token:', error);
      logout();
    }
  };

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

  const register = async (email, password, username) => {
    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, password, username })
      });

      const data = await response.json();

      if (response.ok) {
        setUser(data.user);
        setAccessToken(data.accessToken);
        setRefreshToken(data.refreshToken);
        localStorage.setItem('crowdai_access_token', data.accessToken);
        localStorage.setItem('crowdai_refresh_token', data.refreshToken);
        return { success: true };
      } else {
        return { success: false, error: data.error };
      }
    } catch (error) {
      return { success: false, error: 'Network error. Please try again.' };
    }
  };

  const login = async (email, password) => {
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, password })
      });

      const data = await response.json();

      if (response.ok) {
        setUser(data.user);
        setAccessToken(data.accessToken);
        setRefreshToken(data.refreshToken);
        localStorage.setItem('crowdai_access_token', data.accessToken);
        localStorage.setItem('crowdai_refresh_token', data.refreshToken);
        return { success: true };
      } else {
        return { success: false, error: data.error };
      }
    } catch (error) {
      return { success: false, error: 'Network error. Please try again.' };
    }
  };

  const logout = async () => {
    try {
      if (accessToken) {
        await fetch('/api/auth/logout', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`
          }
        });
      }
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setUser(null);
      setAccessToken(null);
      setRefreshToken(null);
      localStorage.removeItem('crowdai_access_token');
      localStorage.removeItem('crowdai_refresh_token');
    }
  };

  const updatePreferences = async (preferences) => {
    try {
      const response = await fetch('/api/auth/preferences', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        },
        body: JSON.stringify(preferences)
      });

      if (response.ok) {
        const data = await response.json();
        setUser(prev => ({ ...prev, preferences: data.preferences }));
        return { success: true };
      } else {
        return { success: false, error: 'Failed to update preferences' };
      }
    } catch (error) {
      return { success: false, error: 'Network error' };
    }
  };

  const updateProfile = async (profileData) => {
    try {
      const response = await fetch('/api/auth/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        },
        body: JSON.stringify(profileData)
      });

      const data = await response.json();

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
      } else {
        return { success: false, error: data.error };
      }
    } catch (error) {
      return { success: false, error: 'Network error' };
    }
  };

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
    authorizedFetch
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};