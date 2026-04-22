import axiosInstance from '../axios';
import { getErrorMessage } from '../errorMessage';
import type { AxiosResponse } from 'axios';

/**
 * Deletes a Medical Record Document by its ID
 * @param fileId ID of the file to delete
 * @returns Promise resolving to the updated array of notes
 */
export const deleteRecordDocument = async (
  fileId: string
): Promise<AxiosResponse> => {
  try {
    const response = await axiosInstance.delete(
      `/api/v1/medical-record/${fileId}`
    );
    return response.data.data;
  } catch (error) {
    throw getErrorMessage(error);
  }
};
