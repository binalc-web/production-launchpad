import type { AxiosResponse } from 'axios';
import { getErrorMessage } from '../errorMessage';
import axiosInstance from '../axios';

/**
 * @returns {Promise<AxiosResponse>} Promise resolving to the invited patient
 * @throws {Error} Error message from the API or request failure
 */
export const deleteOrganization = async (
  organizationId: string
): Promise<AxiosResponse> => {
  try {
    const response = await axiosInstance.delete(
      `/api/v1/organization/${organizationId}`
    );
    return response.data;
  } catch (error) {
    console.log(error);
    throw getErrorMessage(error);
  }
};
