import axiosInstance from '../axios';
import { getErrorMessage } from '../errorMessage';
import type { MedicalRecordDetailsType } from '@/pages/MedicalRecords/types/MedicalRecordDetailsType';

/**
 * Fetches detailed information for a specific medical record
 * @param id The unique identifier of the medical record to retrieve
 * @returns Promise resolving to the medical record details
 */
export const getMedicalRecordDetails = async (
  id: string
): Promise<MedicalRecordDetailsType> => {
  try {
    const response = await axiosInstance.get(`/api/v1/medical-record/${id}`);
    return response.data.data as MedicalRecordDetailsType;
  } catch (error) {
    throw getErrorMessage(error);
  }
};
