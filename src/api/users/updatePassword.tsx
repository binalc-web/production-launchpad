import axiosInstance from '../axios';
import { getErrorMessage } from '../errorMessage';

export const updatePassword = async (
  data: Partial<{
    password: string;
    newPassword: string;
    confirmNewPassword: string;
  }>
): Promise<Partial<{ email: string }>> => {
  try {
    const response = await axiosInstance.patch(
      '/api/v1/user/update-password',
      data
    );
    return response.data;
  } catch (error) {
    throw getErrorMessage(error);
  }
};
