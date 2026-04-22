import type { AxiosResponse } from 'axios';
import { getErrorMessage } from '../errorMessage';
import axiosInstance from '../axios';

export type InvitePatientType = {
  firstName: string;
  lastName: string;
  email: string;
  contact: string;
  role: string;
  organizationId?: string;
};

/**
 * Creates a new case with the provided data
 * @param {InvitePatientType} data - The invite patient data containing all details
 * @returns {Promise<AxiosResponse>} Promise resolving to the invited patient
 * @throws {Error} Error message from the API or request failure
 */
export const invitePatientApi = async (
  data: InvitePatientType
): Promise<AxiosResponse> => {
  try {
    const response = await axiosInstance.post(
      '/api/v1/patient/invite-patient',
      data
    );
    return response.data;
  } catch (error) {
    console.log(error);
    throw getErrorMessage(error);
  }
};
