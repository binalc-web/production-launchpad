import type { AxiosResponse } from 'axios';
import axiosInstance from '../axios';
import { getErrorMessage } from '../errorMessage';

export const validateClearmeToken = async (
  email: string
): Promise<AxiosResponse> => {
  try {
    const response = await axiosInstance.post(
      `/api/v1/auth/validate-clearme-token`,
      {
        email,
      }
    );
    return response.data.data;
  } catch (error) {
    throw getErrorMessage(error);
  }
};
