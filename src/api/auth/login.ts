import type { AxiosResponse } from 'axios';
import axiosInstance from '@/api/axios';
import { getErrorMessage } from '@/api/errorMessage';
import type { resendVerificationData, verifyEmailData } from './register';

/**
 * Data structure for user login requests
 * @interface LoginData
 * @property {string} email - User's email address
 * @property {string} password - User's password
 * @property {boolean} [rememberMe] - Optional flag to keep user logged in
 */
export type LoginData = {
  email: string;
  password: string;
  rememberMe?: boolean;
};

/**
 * Authenticates a user with their email and password
 * @param {LoginData} data - User login credentials
 * @returns {Promise<AxiosResponse>} Promise resolving to login response data
 * @throws {Error} Error message from the API or request failure
 */
export const loginUser = async (data: LoginData): Promise<AxiosResponse> => {
  try {
    const response = await axiosInstance.post('/api/v1/auth/login', data);
    return response.data;
  } catch (error) {
    throw getErrorMessage(error);
  }
};

/**
 * Verifies a login attempt with verification code
 * @param {verifyEmailData} data - Verification data containing email and verification code
 * @returns {Promise<AxiosResponse>} Promise resolving to verification response
 * @throws {Error} Error message from the API or request failure
 */
export const verifyLogin = async (
  data: verifyEmailData
): Promise<AxiosResponse> => {
  try {
    const response = await axiosInstance.post('/api/v1/auth/verifyLogin', data);
    return response.data;
  } catch (error) {
    throw getErrorMessage(error);
  }
};

/**
 * Requests a new verification code for login
 * @param {resendVerificationData} email - Email address to send new verification code to
 * @returns {Promise<AxiosResponse>} Promise resolving to response data
 * @throws {Error} Error message from the API or request failure
 */
export const resendLoginVerificationCode = async (
  email: resendVerificationData
): Promise<AxiosResponse> => {
  try {
    const response = await axiosInstance.post(
      '/api/v1/auth/resend-login-code',
      {
        ...email,
      }
    );
    return response.data;
  } catch (error) {
    throw getErrorMessage(error);
  }
};
