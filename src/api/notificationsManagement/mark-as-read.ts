import axiosInstance from '../axios';
import { getErrorMessage } from '../errorMessage';

export const markNotificationAsRead = async (
  notificationId: string
): Promise<void> => {
  try {
    await axiosInstance.patch(
      `/api/v1/notification/mark-as-read/${notificationId}`
    );
  } catch (error) {
    throw getErrorMessage(error);
  }
};
