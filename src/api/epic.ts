import axiosInstance from './axios';
import { getErrorMessage } from './errorMessage';

/**
 * @description Exchanges an Epic authorization code for tokens
 * @param {object} data - Object containing the authorization code and token endpoint
 * @property {string} code - The Epic authorization code
 * @property {string} tokenEndpoint - The token endpoint URL from SMART configuration
 * @returns {Promise<{ success: true }>} Promise resolving to a success boolean
 * @throws {Error} Error message from the API or request failure
 */
export const postEpicCode = async (data: {
  code: string;
  tokenEndpoint: string;
}): Promise<{ success: true }> => {
  try {
    const response = await axiosInstance.post('/api/v1/epic/save-token', data);
    return response.data;
  } catch (error) {
    throw getErrorMessage(error);
  }
};

export const validateEpicToken = async (): Promise<{ success: boolean }> => {
  try {
    const response = await axiosInstance.get('/api/v1/epic/validate-token');
    return response.data;
  } catch (error) {
    throw getErrorMessage(error);
  }
};
