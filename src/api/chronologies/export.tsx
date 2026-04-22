import axiosInstance from '../axios';
import { getErrorMessage } from '../errorMessage';
import type { ChronologyCategory } from './constants';

export type ChronologySummaryReportParameters = {
  chronologyId: string;
  category: ChronologyCategory;
  /** MM-DD-YYYY format, required for billing category only */
  startDate?: string;
  /** MM-DD-YYYY format, required for billing category only */
  endDate?: string;
  /** Version of the chronology */
  version?: number;
};

export const getChronologySummaryReport = async (
  parameters: ChronologySummaryReportParameters
): Promise<unknown> => {
  try {
    const response = await axiosInstance.get(
      '/api/v1/chronology/chronology-summary-report',
      {
        params: {
          chronologyId: parameters.chronologyId,
          category: parameters.category,
          ...(parameters.startDate && { startDate: parameters.startDate }),
          ...(parameters.endDate && { endDate: parameters.endDate }),
          ...(parameters.version != null && { version: parameters.version }),
        },
      }
    );
    return response.data;
  } catch (error) {
    throw getErrorMessage(error);
  }
};

export const exportBillingChronology = async ({
  id,
}: {
  id: string;
}): Promise<{ success: boolean; message: string }> => {
  try {
    const response = await axiosInstance.post(
      '/api/v1/chronology/billing-chronology-report',
      {
        chronologyId: id,
      }
    );
    return response.data;
  } catch (error) {
    throw getErrorMessage(error);
  }
};

export const exportBillingChronologyList = async (): Promise<{
  success: boolean;
  message: string;
}> => {
  try {
    const response = await axiosInstance.get(
      '/api/v1/chronology/billing-chronology-list-report'
    );
    return response.data;
  } catch (error) {
    throw getErrorMessage(error);
  }
};

export const exportMedicalChronologyList = async (): Promise<{
  success: boolean;
  message: string;
}> => {
  try {
    const response = await axiosInstance.get(
      '/api/v1/chronology/medical-chronology-list-report'
    );
    return response.data;
  } catch (error) {
    throw getErrorMessage(error);
  }
};
