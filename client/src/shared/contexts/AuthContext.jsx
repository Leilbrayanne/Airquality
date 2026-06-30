import React, { createContext, useContext, useState } from 'react';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const t = localStorage.getItem('token');
    if (t) {
      try {
        const parts = t.split('.');
        if (parts.length === 3) {
          const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
          const padded = base64.padEnd(base64.length + (4 - (base64.length % 4)) % 4, '=');
          const decoded = atob(padded);
          const payload = JSON.parse(decoded);
          
          // Check if token is expired
          if (payload.exp && payload.exp * 1000 < Date.now()) {
            localStorage.removeItem('token');
            return null;
          }
          return payload;
        }
      } catch (e) {
        console.error('Failed to decode token:', e);
      }
    }
    return null;
  });
  const [token, setToken] = useState(localStorage.getItem('token') || null);

  const login = (newToken, userData) => {
    setToken(newToken);
    setUser(userData);
    localStorage.setItem('token', newToken);
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('token');
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => useContext(AuthContext);
