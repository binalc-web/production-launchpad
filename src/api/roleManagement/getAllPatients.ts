import type { pagination } from '@/pages/CaseManagement/types/pagination';
import axiosInstance from '../axios';
import { getErrorMessage } from '../errorMessage';
import type { patientFilters } from '@/pages/RoleManagement/types/patientFilters';
import type { Patient } from '@/pages/RoleManagement/types/patient';

export type patientListResponse = {
  patients: Array<Patient> | [];
  pagination: pagination;
};

export const getAllPatients = async (
  filters: patientFilters
): Promise<patientListResponse> => {
  try {
    const parameters: Record<string, number | string> = {
      page: filters.page,
      limit: filters.limit,
    };

    if (filters.searchKeyWordString) {
      parameters.keyword = filters.searchKeyWordString;
    }

    const response = await axiosInstance.get(
      '/api/v1/patient/get-all-patients',
      {
        params: parameters,
      }
    );
    return response.data.data;
  } catch (error) {
    throw getErrorMessage(error);
  }
};
