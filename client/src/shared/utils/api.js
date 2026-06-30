import { useMemo, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

const joinUrl = (base, endpoint) => {
  const b = (base || '').replace(/\/+$/g, '');
  const e = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  return `${b}${e}`;
};

/**
 * Custom hook for making authenticated API requests
 * @returns {Object} Object containing request functions
 */
export const useApi = () => {
  const { token } = useAuth();

  /**
   * Makes an API request with authentication
   * @param {string} endpoint - API endpoint
   * @param {Object} options - Fetch options
   * @returns {Promise<any>} Parsed JSON response
   */
  const request = useCallback(async (endpoint, options = {}) => {
    const url = joinUrl(API_BASE_URL, endpoint);

    const headers = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    // Add auth token if available
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const response = await fetch(url, {
      ...options,
      headers,
    });

    // Handle non-2xx responses
    if (!response.ok) {
      let errorMessage = `Request failed with status ${response.status}`;
      try {
        const errorData = await response.json();
        if (errorData?.message) {
          errorMessage = errorData.message;
        } else if (errorData?.error) {
          errorMessage = errorData.error;
          if (errorData.details && errorData.details.length > 0) {
            errorMessage += ': ' + errorData.details.map(d => d.message).join(', ');
          }
        }
      } catch {
        // If we can't parse JSON, use the status text
        errorMessage = response.statusText || errorMessage;
      }
      throw new Error(errorMessage);
    }

    if (response.status === 204) {
      return {};
    }
    return response.json();
  }, [token]);

  return useMemo(() => {
    const del = (endpoint, options = {}) => request(endpoint, { ...options, method: 'DELETE' });
    return {
      get: (endpoint, options = {}) => request(endpoint, { ...options, method: 'GET' }),
      post: (endpoint, data, options = {}) =>
        request(endpoint, {
          ...options,
          method: 'POST',
          body: JSON.stringify(data),
        }),
      put: (endpoint, data, options = {}) =>
        request(endpoint, {
          ...options,
          method: 'PUT',
          body: JSON.stringify(data),
        }),
      patch: (endpoint, data, options = {}) =>
        request(endpoint, {
          ...options,
          method: 'PATCH',
          body: JSON.stringify(data),
        }),
      delete: del,
      del,
      request,
    };
  }, [request]);
};

/**
 * Utility function for making API requests without hooks (for non-component usage)
 * Note: This reads token directly from localStorage
 * @param {string} endpoint - API endpoint
 * @param {Object} options - Fetch options
 * @returns {Promise<any>} Parsed JSON response
 */
export const fetchApi = async (endpoint, options = {}) => {
  const token = localStorage.getItem('token');
  const url = joinUrl(API_BASE_URL, endpoint);

  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (!response.ok) {
    let errorMessage = `Request failed with status ${response.status}`;
    try {
      const errorData = await response.json();
      if (errorData?.message) {
        errorMessage = errorData.message;
      } else if (errorData?.error) {
        errorMessage = errorData.error;
        if (errorData.details && errorData.details.length > 0) {
          errorMessage += ': ' + errorData.details.map(d => d.message).join(', ');
        }
      }
    } catch {
      errorMessage = response.statusText || errorMessage;
    }
    throw new Error(errorMessage);
  }

  if (response.status === 204) {
    return {};
  }
  return response.json();
};

