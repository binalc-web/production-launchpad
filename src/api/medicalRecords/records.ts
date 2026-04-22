import axiosInstance from '../axios';
import { getErrorMessage } from '../errorMessage';
import type { pagination } from '@/pages/CaseManagement/types/pagination';
import type { MedicalRecordTableType } from './../../pages/MedicalRecords/types/MedicalRecordTableType';

export type tableFilter = {
  page: number;
  limit: number;
  keyword: string;
  status: string;
  provider: string;
};

export type MedicalRecordListResponse = {
  medicalRecords: Array<MedicalRecordTableType> | [];
  pagination: pagination | undefined;
};

export const getMedicalRecords = async (
  filters: tableFilter
): Promise<MedicalRecordListResponse> => {
  try {
    const parameters: Record<string, number | string> = {
      page: filters.page,
      limit: filters.limit,
    };

    if (filters.keyword) {
      parameters.keyword = filters.keyword;
    }

    if (filters.status) {
      parameters.status = filters.status;
    }

    if (filters.provider) {
      parameters.provider = filters.provider;
    }

    const response = await axiosInstance.get('/api/v1/medical-record', {
      params: parameters,
    });
    return response.data.data;
  } catch (error) {
    throw getErrorMessage(error);
  }
};

export const getMedicalRecordsByCase = async (
  filters: tableFilter,
  caseId: string
): Promise<MedicalRecordListResponse> => {
  try {
    const parameters: Record<string, number | string> = {
      page: filters.page,
      limit: filters.limit,
    };

    if (filters.keyword) {
      parameters.keyword = filters.keyword;
    }

    if (filters.status) {
      parameters.status = filters.status;
    }

    if (filters.provider) {
      parameters.provider = filters.provider;
    }
    parameters.caseId = caseId;

    const response = await axiosInstance.get('/api/v1/medical-record/case', {
      params: parameters,
    });
    return response.data.data;
  } catch (error) {
    throw getErrorMessage(error);
  }
};
