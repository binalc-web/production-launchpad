import type { AxiosResponse } from 'axios';
import { getErrorMessage } from '../errorMessage';
import axiosInstance from '../axios';

export type DeletePatientType = {
  email: string;
};

/**
 * Creates a new case with the provided data
 * @param {DeletePatientType} data - The invite patient data containing all details
 * @returns {Promise<AxiosResponse>} Promise resolving to the invited patient
 * @throws {Error} Error message from the API or request failure
 */
export const deletePatientApi = async (
  data: DeletePatientType
): Promise<AxiosResponse> => {
  try {
    const response = await axiosInstance.delete(
      `/api/v1/patient/${data.email}`
    );
    return response.data;
  } catch (error) {
    console.log(error);
    throw getErrorMessage(error);
  }
};
