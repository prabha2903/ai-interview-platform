import React, { createContext, useState, useEffect, useContext } from 'react';
import {
  loginUser,
  registerUser,
  getMe,
  logoutUser,
  logoutAllSessions,
} from '../services/authService';
import { updateProfile } from '../services/userService';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // There's no token in JS to check anymore — the only way to know if a
  // session is live is to ask the server, which validates the httpOnly
  // cookie. api.js will transparently try a refresh if the access token
  // has expired, so this single call covers "logged in with a fresh token",
  // "logged in but access token expired", and "not logged in at all".
  useEffect(() => {
    const initAuth = async () => {
      try {
        const data = await getMe();
        setUser(data.user);
      } catch (err) {
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    initAuth();
  }, []);

  const login = async (email, password) => {
    setError(null);
    try {
      const data = await loginUser(email, password);
      setUser(data.user);
      return data;
    } catch (err) {
      const message = err.response?.data?.message || 'Login failed. Please check credentials.';
      setError(message);
      throw new Error(message);
    }
  };

  const register = async (name, email, password) => {
    setError(null);
    try {
      const data = await registerUser(name, email, password);
      setUser(data.user);
      return data;
    } catch (err) {
      const message = err.response?.data?.message || 'Registration failed. Please try again.';
      setError(message);
      throw new Error(message);
    }
  };

  const logout = async () => {
    try {
      await logoutUser();
    } catch (err) {
      // Even if the server call fails (e.g. already-expired session), we
      // still want to clear local state so the UI reflects "logged out".
    } finally {
      setUser(null);
      setError(null);
    }
  };

  // Revokes every session for this account, not just the current tab/device.
  const logoutEverywhere = async () => {
    try {
      await logoutAllSessions();
    } finally {
      setUser(null);
      setError(null);
    }
  };

  const updateUserProfile = async (profileData) => {
    setError(null);
    try {
      const data = await updateProfile(profileData);
      setUser((prevUser) => ({
        ...prevUser,
        ...data.user,
      }));
      return data;
    } catch (err) {
      const message = err.response?.data?.message || 'Failed to update profile.';
      setError(message);
      throw new Error(message);
    }
  };

  const clearError = () => setError(null);

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        error,
        isAuthenticated: !!user,
        login,
        register,
        logout,
        logoutEverywhere,
        updateUserProfile,
        clearError,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;
