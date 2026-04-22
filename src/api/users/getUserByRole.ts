import axiosInstance from '../axios';
import { getErrorMessage } from '../errorMessage';
import type { patientDetailsType } from '@/pages/CaseManagement/types';

export const getUserDetails = async (
  role: string
): Promise<Array<patientDetailsType>> => {
  try {
    const response = await axiosInstance.get(
      `/api/v1/user/get-users-by-role?role=${role}`
    );
    return response.data.data;
  } catch (error) {
    throw getErrorMessage(error);
  }
};
