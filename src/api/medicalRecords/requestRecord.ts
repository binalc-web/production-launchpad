import axiosInstance from '../axios';
import type { AxiosResponse } from 'axios';
import { getErrorMessage } from '../errorMessage';
import type { FormData } from '@/pages/MedicalRecords/RequestRecord';

/**
 * Submits a request for a medical record
 * @param data Form data containing the medical record request details
 * @returns Promise resolving to the API response
 */
export const requestRecord = async (data: FormData): Promise<AxiosResponse> => {
  try {
    const response = await axiosInstance.post(
      '/api/v1/medical-record/request-record',
      data
    );
    return response.data;
  } catch (error) {
    throw getErrorMessage(error);
  }
};
