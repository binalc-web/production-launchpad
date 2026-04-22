import { getErrorMessage } from '../errorMessage';
import axiosInstance from '../axios';
import type { organization } from '@/pages/OrganizationManagement/types/organization';

export type createOrganizationType = {
  name: string;
  email: string;
  address: string;
  contact: string;
  firstName: string;
  lastName: string;
  userEmail: string;
  userContact: string;
  organizationType: string;
};

/**
 * Creates a new case with the provided data
 * @param {DeletePatientType} data - The invite patient data containing all details
 * @returns {Promise<AxiosResponse>} Promise resolving to the invited patient
 * @throws {Error} Error message from the API or request failure
 */
export const createOrganization = async (
  data: createOrganizationType
): Promise<organization> => {
  try {
    const response = await axiosInstance.post(`/api/v1/organization`, data);
    return response.data;
  } catch (error) {
    console.log(error);
    throw getErrorMessage(error);
  }
};
