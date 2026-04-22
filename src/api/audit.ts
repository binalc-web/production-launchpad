import axiosInstance from './axios';
import { getErrorMessage } from './errorMessage';
import type { AuditsAndReportsTableType } from '@/pages/AuditsAndReports/types/AuditsAndReportsTableType';
import type { pagination } from '@/pages/CaseManagement/types/pagination';

export type AuditListResponse = {
  audits: Array<AuditsAndReportsTableType> | [];
  pagination: pagination | undefined;
};

export type auditFilters = {
  page: number;
  limit: number;
  searchKeyWordString?: string;
};

export const getAllAudits = async (
  filters: auditFilters
): Promise<AuditListResponse> => {
  try {
    const parameters: Record<string, number | string> = {
      page: filters.page,
      limit: filters.limit,
    };

    if (filters.searchKeyWordString) {
      parameters.keyword = filters.searchKeyWordString;
    }

    const response = await axiosInstance.get('/api/v1/audit', {
      params: parameters,
    });
    return response.data.data;
  } catch (error) {
    throw getErrorMessage(error);
  }
};

export const exportAuditReport = async (): Promise<{
  success: boolean;
  message: string;
}> => {
  try {
    const response = await axiosInstance.get('/api/v1/audit/report');
    return response.data;
  } catch (error) {
    throw getErrorMessage(error);
  }
};
