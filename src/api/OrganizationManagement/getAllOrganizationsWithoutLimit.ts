
import axiosInstance from '../axios';
import { getErrorMessage } from '../errorMessage';
import type { organization } from '@/pages/OrganizationManagement/types/organization';

export const getAllOrganizationsWithoutLimit = async (): Promise<
  Array<organization>
> => {
  try {
    const response = await axiosInstance.get(
      '/api/v1/organization/get-all-organization-list'
    );
    return response.data.data;
  } catch (error) {
    throw getErrorMessage(error);
  }
};
