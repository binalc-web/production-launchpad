import type { Assignee } from '@/pages/CaseManagement/types/assignee';
import axiosInstance from '../axios';
import { getErrorMessage } from '../errorMessage';

export const getAllLegalUsers = async (): Promise<Array<Assignee>> => {
  try {
    const response = await axiosInstance.get('/api/v1/user/legal-users');
    return response.data.data;
  } catch (error) {
    throw getErrorMessage(error);
  }
};
