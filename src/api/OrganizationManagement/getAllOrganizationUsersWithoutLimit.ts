import axiosInstance from '../axios';
import { getErrorMessage } from '../errorMessage';
import type { User } from '@/pages/userManagement/types/user';

export const getAllOrganizationUsersWithoutLimit = async (
  caseId: string,
  organizationId?: string
): Promise<Array<User>> => {
  try {
    const response = await axiosInstance.get(
      organizationId
        ? `/api/v1/user/get-organization-users/${organizationId}?caseId=${caseId}`
        : `/api/v1/user/get-organization-users?caseId=${caseId}`
    );

    return response.data.data;
  } catch (error) {
    throw getErrorMessage(error);
  }
};
