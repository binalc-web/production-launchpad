import { createContext } from 'react';
import type { BasicUserDetails } from '@/pages/Login/steps/OTPVerification';

/**
 * Global logout function reference
 * Can be set from anywhere in the application to enable global logout functionality
 * Used primarily in the axios interceptor to handle authentication failures
 */
export let globalLogout: (() => void) | null = null;

/**
 * Sets the global logout function reference
 * @param {() => void} logoutFn - Logout function to be called on auth failures
 */
export const setGlobalLogout = (logoutFn: () => void): void => {
  globalLogout = logoutFn;
};

/**
 * Authentication context interface
 * @interface AuthContextType
 * @property {string|null} accessToken - JWT access token for API authentication
 * @property {string|null} refreshToken - JWT refresh token to obtain new access tokens
 * @property {BasicUserDetails|null} basicUserDetails - Basic user information
 * @property {Function} login - Function to authenticate a user and store tokens
 * @property {Function} logout - Function to log out a user and clear auth state
 * @property {Function} updateBasicDetails - Function to update user's basic information
 * @property {boolean} isAuthenticated - Flag indicating whether user is authenticated
 */
export interface AuthContextType {
  accessToken: string | null;
  refreshToken: string | null;
  basicUserDetails: BasicUserDetails | null;

  login: (
    accessToken: string,
    rememberMe: boolean,
    basicUserDetails: BasicUserDetails,
    refreshToken?: string
  ) => void;
  logout: () => void;
  updateBasicDetails: (
    firstName: string,
    lastName: string,
    email: string,
    role: string,
    avatar?: string
  ) => void;
  isAuthenticated: boolean;
}

/**
 * React context for authentication state management
 * Provides authentication state and functions to components throughout the application
 */
export const AuthContext = createContext<AuthContextType | undefined>(
  undefined
);
