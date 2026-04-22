import axiosInstance from '../axios';
import { getErrorMessage } from '../errorMessage';
import type { User } from '@/pages/Settings/types/User';

export const updateUserDetails = async (
  data: Partial<User>
): Promise<Partial<User>> => {
  try {
    const response = await axiosInstance.patch('/api/v1/user/edit', data);
    return response.data.data;
  } catch (error) {
    throw getErrorMessage(error);
  }
};
