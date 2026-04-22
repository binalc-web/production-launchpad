import type { pagination } from '@/pages/CaseManagement/types/pagination';
import axiosInstance from '../axios';
import { getErrorMessage } from '../errorMessage';
import type { patientFilters } from '@/pages/RoleManagement/types/patientFilters';
import type { User } from '@/pages/userManagement/types/user';

export type userListResponse = {
  users: Array<User> | [];
  pagination: pagination;
};

export const getAllUsers = async (
  filters: patientFilters
): Promise<userListResponse> => {
  try {
    const parameters: Record<string, number | string> = {
      page: filters.page,
      limit: filters.limit,
    };

    if (filters.searchKeyWordString) {
      parameters.keyword = filters.searchKeyWordString;
    }

    const response = await axiosInstance.get('/api/v1/user/get-all-users', {
      params: parameters,
    });
    return response.data.data;
  } catch (error) {
    throw getErrorMessage(error);
  }
};
