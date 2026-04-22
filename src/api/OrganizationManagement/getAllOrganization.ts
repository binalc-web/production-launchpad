import type { pagination } from '@/pages/CaseManagement/types/pagination';
import axiosInstance from '../axios';
import { getErrorMessage } from '../errorMessage';
import type { patientFilters } from '@/pages/RoleManagement/types/patientFilters';
import type { organization } from '@/pages/OrganizationManagement/types/organization';

export type organizationsListResponse = {
  organizations: Array<organization> | [];
  pagination: pagination;
};

export const getAllOrganization = async (
  filters: patientFilters
): Promise<organizationsListResponse> => {
  try {
    const parameters: Record<string, number | string> = {
      page: filters.page,
      limit: filters.limit,
    };

    if (filters.searchKeyWordString) {
      parameters.keyword = filters.searchKeyWordString;
    }

    const response = await axiosInstance.get('/api/v1/organization', {
      params: parameters,
    });
    return response.data.data;
  } catch (error) {
    throw getErrorMessage(error);
  }
};
