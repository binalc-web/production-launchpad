import type { AxiosResponse } from 'axios';
import { getErrorMessage } from '../errorMessage';
import axiosInstance from '../axios';

export type changeOrganizationActivationStatusType = {
  organizationId: string;
  action: string;
};

/**
 * Creates a new case with the provided data
 * @param {DeletePatientType} data - The invite patient data containing all details
 * @returns {Promise<AxiosResponse>} Promise resolving to the invited patient
 * @throws {Error} Error message from the API or request failure
 */
export const changeOrganizationActivationStatus = async (
  data: changeOrganizationActivationStatusType
): Promise<AxiosResponse> => {
  try {
    const response = await axiosInstance.post(
      `/api/v1/organization/deactivate-activate-organization`,
      data
    );
    return response.data;
  } catch (error) {
    console.log(error);
    throw getErrorMessage(error);
  }
};
