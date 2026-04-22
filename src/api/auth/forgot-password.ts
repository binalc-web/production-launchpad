import type { AxiosResponse } from 'axios';
import { getErrorMessage } from '../errorMessage';
import axiosInstance from '../axios';

type ResetPasswordData = {
  email: string;
  password: string;
  confirmPassword: string;
};

export const resetPassword = async (
  data: ResetPasswordData
): Promise<AxiosResponse> => {
  try {
    const response = await axiosInstance.post(
      '/api/v1/auth/reset-password',
      data
    );
    return response.data;
  } catch (error) {
    throw getErrorMessage(error);
  }
};
