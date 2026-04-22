import type { AxiosResponse } from 'axios';
import axiosInstance from '@/api/axios';
import { getErrorMessage } from '@/api/errorMessage';

/**
 * Data structure for user login requests
 * @interface LoginData
 * @property {string} token - Link verification token
 */
export type verifyLinkData = {
  token: string;
};

/**
 * Data structure for user login requests
 * @interface LoginData
 * @property {string} token - Link verification token
 */
export type verifyLinkResponseData = {
  email: string;
  role: string;
  firstName?: string;
  lastName?: string;
  organizationId?: string;
  organizationName?: string;
  organizationType?: string;
};

/**
 * Authenticates a link verification request
 * @param {verifyLinkData} data - Link verification token
 * @returns {Promise<AxiosResponse>} Promise resolving to Link verification token response data
 * @throws {Error} Error message from the API or request failure
 */
export const verifyLink = async (
  data: verifyLinkData
): Promise<AxiosResponse<verifyLinkResponseData>> => {
  try {
    const response = await axiosInstance.post('/api/v1/auth/verify-link', data);
    return response.data;
  } catch (error) {
    throw getErrorMessage(error);
  }
};
