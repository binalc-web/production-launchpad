import type { AxiosResponse } from 'axios';
import { getErrorMessage } from '../errorMessage';
import axiosInstance from '../axios';

export type DeleteUserApiType = {
  email: string;
  reason: string;
};

/**
 * Creates a new case with the provided data
 * @param {DeleteUserApiType} data - The invite patient data containing all details
 * @returns {Promise<AxiosResponse>} Promise resolving to the invited patient
 * @throws {Error} Error message from the API or request failure
 */
export const deleteUserApi = async (
  data: DeleteUserApiType
): Promise<AxiosResponse> => {
  try {
    const response = await axiosInstance.post(`/api/v1/user/delete`, data);
    return response.data;
  } catch (error) {
    console.log(error);
    throw getErrorMessage(error);
  }
};
