import type { caseFilters } from '@/pages/CaseManagement/types/caseFilters';
import type {
  CaseListKeysType,
  caseListResponse,
} from '../caseManagement/getAllCases';
import axiosInstance from '../axios';
import { getErrorMessage } from '../errorMessage';

// Re-export the caseListResponse type from getAllCases
export type { caseListResponse, CaseListKeysType };

export const getAllSearchResults = async (
  filters: caseFilters
): Promise<caseListResponse> => {
  try {
    const parameters: Record<string, string | number> = {
      page: filters.page,
      limit: filters.limit,
    };

    if (filters.searchKeyWordString) {
      parameters.keyword = filters.searchKeyWordString;
    }

    if (filters.category) {
      parameters.category = filters.category;
    }

    const response = await axiosInstance.get('/api/v1/search/global', {
      params: parameters,
    });
    return response.data.data;
  } catch (error) {
    throw getErrorMessage(error);
  }
};
