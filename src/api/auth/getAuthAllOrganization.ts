import axiosInstance from '../axios';
import { getErrorMessage } from '../errorMessage';
import type { organization } from '@/pages/OrganizationManagement/types/organization';

export const getAuthAllOrganization = async (): Promise<
  Array<organization>
> => {
  try {
    const response = await axiosInstance.get(
      '/api/v1/auth/get-all-organization-list'
    );
    return response.data.data;
  } catch (error) {
    throw getErrorMessage(error);
  }
};
