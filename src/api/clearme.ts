import axiosInstance from './axios';
import { getErrorMessage } from './errorMessage';

export const postClearMeCode = async (data: {
  code: string;
  email: string;
}): Promise<{ success: true }> => {
  try {
    const response = await axiosInstance.post(
      '/api/v1/auth/store-clearme-token',
      data
    );
    return response.data;
  } catch (error) {
    throw getErrorMessage(error);
  }
};
