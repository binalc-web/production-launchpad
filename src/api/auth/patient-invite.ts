import type { AxiosResponse } from 'axios';
import axiosInstance from '@/api/axios';
import { getErrorMessage } from '@/api/errorMessage';

export type completeProfileType = {
  email: string;
  password: string;
  confirmPassword: string;
  subRole?: string;
  organizationId?: string;
  firstName?: string;
  lastName?: string;
  middleName?: string;
  dateOfBirth?:Date;
};

export const completeProfile = async (
  data: completeProfileType
): Promise<AxiosResponse> => {
  try {
    const response = await axiosInstance.patch(
      '/api/v1/patient/complete-profile',
      data
    );
    return response.data.data;
  } catch (error) {
    throw getErrorMessage(error);
  }
};
