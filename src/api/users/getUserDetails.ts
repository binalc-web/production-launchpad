import type { User } from '@/pages/Settings/types/User';
import axiosInstance from '../axios';
import { getErrorMessage } from '../errorMessage';

export const getUserDetails = async (userId: string): Promise<User> => {
  try {
    const response = await axiosInstance.get(
      `/api/v1/user/get-user-profile?userId=${userId}`
    );
    return response.data.data;
  } catch (error) {
    throw getErrorMessage(error);
  }
};
