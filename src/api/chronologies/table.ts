import axiosInstance from '../axios';
import { getErrorMessage } from '../errorMessage';
import type { pagination } from '@/pages/CaseManagement/types/pagination';
import type { MedicalChronologyTableType } from '@/pages/MedicalChronology/types/MedicalChronologyTableType';
import type { BillingChronologyTableType } from '@/pages/BillingChronology/types/BillingChronologyTableType';
import type { MasterChronologyTableType } from '@/pages/MasterChronology/types/MasterChronologyTableType';

export type tableFilter = {
  page: number;
  limit: number;

  keyword?: string;
};

export type ChronologyListResponse<T> = {
  chronologies: Array<T> | [];
  pagination: pagination | undefined;
};

export const getAllMedicalChronologies = async (
  filters: tableFilter
): Promise<ChronologyListResponse<MedicalChronologyTableType>> => {
  try {
    const parameters: Record<string, number | string> = {
      page: filters.page,
      limit: filters.limit,
    };

    if (filters.keyword) {
      parameters.keyword = filters.keyword;
    }

    const response = await axiosInstance.get(
      '/api/v1/chronology/all-medical-chronology',
      {
        params: parameters,
      }
    );
    return response.data.data;
  } catch (error) {
    throw getErrorMessage(error);
  }
};

export const getAllBillingChronologies = async (
  filters: tableFilter
): Promise<ChronologyListResponse<BillingChronologyTableType>> => {
  try {
    const parameters: Record<string, number | string> = {
      page: filters.page,
      limit: filters.limit,
    };

    if (filters.keyword) {
      parameters.keyword = filters.keyword;
    }

    const response = await axiosInstance.get(
      '/api/v1/chronology/all-billing-chronology',
      {
        params: parameters,
      }
    );
    return response.data.data;
  } catch (error) {
    throw getErrorMessage(error);
  }
};

export const getAllMasterChronologies = async (
  filters: tableFilter
): Promise<ChronologyListResponse<MasterChronologyTableType>> => {
  try {
    const parameters: Record<string, number | string> = {
      page: filters.page,
      limit: filters.limit,
    };

    if (filters.keyword) {
      parameters.keyword = filters.keyword;
    }

    const response = await axiosInstance.get(
      '/api/v1/chronology/all-master-chronology',
      {
        params: parameters,
      }
    );
    return response.data.data;
  } catch (error) {
    throw getErrorMessage(error);
  }
};
