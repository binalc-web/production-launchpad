import type { Case } from '@/pages/CaseManagement/types/case';
import type { caseFilters } from '@/pages/CaseManagement/types/caseFilters';
import type { pagination } from '@/pages/CaseManagement/types/pagination';
import axiosInstance from '../axios';
import { getErrorMessage } from '../errorMessage';

export type CaseListKeysType =
  | 'cases'
  | 'medical_chronology'
  | 'billing-chronology'
  | 'records';

export type caseListResponse = {
  [K in CaseListKeysType]: Array<Case>;
} & {
  pagination: pagination;
};

export const getAllCases = async (
  filters: caseFilters
): Promise<caseListResponse> => {
  try {
    const parameters: Record<string, number | string> = {
      page: filters.page,
      limit: filters.limit,
    };

    if (filters.searchKeyWordString) {
      parameters.keyword = filters.searchKeyWordString;
    }

    if (filters.status && filters.status.length > 0) {
      parameters.status = filters.status.join(',');
    }

    if (filters.assignees && filters.assignees.length > 0) {
      parameters.assignees = filters.assignees.join(',');
    }

    const response = await axiosInstance.get('/api/v1/case/get-all-cases', {
      params: parameters,
    });
    return response.data.data;
  } catch (error) {
    throw getErrorMessage(error);
  }
};
