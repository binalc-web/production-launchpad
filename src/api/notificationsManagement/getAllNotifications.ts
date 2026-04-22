import axiosInstance from '../axios';
import { getErrorMessage } from '../errorMessage';
import type { notification } from '@/types/notification';



export const getAllNotifications = async (): Promise<Array<notification>> => {
  try {
    const response = await axiosInstance.get('/api/v1/notification');
    return response.data.data;
  } catch (error) {
    throw getErrorMessage(error);
  }
};
