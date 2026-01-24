"use client";

import { createContext, useContext, useState, useEffect } from "react";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../convex/_generated/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sessionToken, setSessionToken] = useState(null);

  // Load session token and user data on mount
  useEffect(() => {
    const loadSession = async () => {
      try {
        // Get session token from localStorage
        const token = localStorage.getItem("waterman_session_token");
        
        if (!token) {
          setLoading(false);
          return;
        }

        setSessionToken(token);

        // Initialize Convex client
        const client = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL);

        // Verify session and get user data
        const userData = await client.query(api.auth.getCurrentUser, {
          sessionToken: token,
        });

        if (userData) {
          setUser(userData);
        } else {
          // Session invalid, clear it
          localStorage.removeItem("waterman_session_token");
          setSessionToken(null);
        }
      } catch (error) {
        console.error("Error loading session:", error);
        localStorage.removeItem("waterman_session_token");
        setSessionToken(null);
      } finally {
        setLoading(false);
      }
    };

    loadSession();
  }, []);

  // Login function - stores session token and loads user
  const login = async (token) => {
    try {
      localStorage.setItem("waterman_session_token", token);
      setSessionToken(token);

      // Initialize Convex client
      const client = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL);

      // Load user data
      const userData = await client.query(api.auth.getCurrentUser, {
        sessionToken: token,
      });

      if (userData) {
        setUser(userData);
        return { success: true, user: userData };
      } else {
        // Invalid token
        localStorage.removeItem("waterman_session_token");
        setSessionToken(null);
        return { success: false, error: "Invalid session" };
      }
    } catch (error) {
      console.error("Error during login:", error);
      return { success: false, error: error.message };
    }
  };

  // Logout function
  const logout = async () => {
    try {
      if (sessionToken) {
        // Initialize Convex client
        const client = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL);
        
        // Call logout mutation
        await client.mutation(api.auth.logout, {
          sessionToken,
        });
      }
    } catch (error) {
      console.error("Error during logout:", error);
    } finally {
      // Clear local state regardless of API call result
      localStorage.removeItem("waterman_session_token");
      setSessionToken(null);
      setUser(null);
    }
  };

  // Refresh user data
  const refreshUser = async () => {
    if (!sessionToken) return;

    try {
      // Initialize Convex client
      const client = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL);
      
      const userData = await client.query(api.auth.getCurrentUser, {
        sessionToken,
      });

      if (userData) {
        setUser(userData);
      } else {
        // Session expired
        localStorage.removeItem("waterman_session_token");
        setSessionToken(null);
        setUser(null);
      }
    } catch (error) {
      console.error("Error refreshing user:", error);
    }
  };

  const value = {
    user,
    loading,
    sessionToken,
    isAuthenticated: !!user,
    login,
    logout,
    refreshUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// Custom hook to use auth context
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

// Custom hook to get just the user
export function useUser() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useUser must be used within an AuthProvider");
  }
  return context.user;
}
