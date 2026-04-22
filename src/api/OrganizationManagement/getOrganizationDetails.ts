import axiosInstance from '../axios';
import { getErrorMessage } from '../errorMessage';
import type { organization } from '@/pages/OrganizationManagement/types/organization';

export const getOrganizationDetails = async (
  organizationId: string
): Promise<organization> => {
  try {
    const response = await axiosInstance.get(
      `api/v1/organization/${organizationId}`
    );
    return response.data.data;
  } catch (error) {
    throw getErrorMessage(error);
  }
};
