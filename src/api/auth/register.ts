import type { AxiosResponse } from 'axios';
import axiosInstance from '../axios';
import { getErrorMessage } from '../errorMessage';

/**
 * Data structure for user registration
 * @interface RegisterData
 * @property {string} email - User's email address
 * @property {string|undefined} subRole - User's optional sub-role
 * @property {string} lastName - User's last name
 * @property {string} password - User's password
 * @property {string} firstName - User's first name
 * @property {string} confirmPassword - Password confirmation for validation
 */
export type RegisterData = {
  email: string;
  lastName: string;
  password: string;
  firstName: string;
  confirmPassword: string;
};

/**
 * Data structure for email verification
 * @interface verifyEmailData
 * @property {string} email - Email address to verify
 * @property {string} [verificationCode] - Optional verification code sent to the email
 */
export type verifyEmailData = {
  email: string;
  verificationCode?: string;
};

/**
 * Data structure for adding business details during registration
 * @interface addBusinessDetailsData
 * @property {string} email - User's email address
 * @property {object} businessDetails - Business information
 * @property {string} businessDetails.name - Name of the business
 * @property {string} businessDetails.email - Business email address
 * @property {string} businessDetails.contact - Business contact number
 */
export type addBusinessDetailsData = {
  email: string;
  businessDetails: {
    name: string;
    email: string;
    contact: string;
  };
};

/**
 * Data structure for adding sub-role and partner details during registration
 * @interface addSubRoleAndPartnerDetailsData
 * @property {string} email - User's email address
 * @property {object} subRoleDetails - Information about the sub-role
 * @property {string} subRoleDetails.name - Name associated with the sub-role
 * @property {string} subRoleDetails.email - Email associated with the sub-role
 * @property {string} subRoleDetails.contact - Contact for the sub-role
 * @property {object} [partnerDetails] - Optional partner information
 * @property {string} [partnerDetails.name] - Partner name
 * @property {string} [partnerDetails.email] - Partner email
 * @property {string} [partnerDetails.contact] - Partner contact
 */
export type addSubRoleAndPartnerDetailsData = {
  email: string;
  subRoleDetails: {
    name: string;
    email: string;
    contact: string;
  };
  partnerDetails?: {
    name?: string;
    email?: string;
    contact?: string;
  };
};

/**
 * Data structure for adding role and sub role during registration
 * @interface addRoleSubRoleData
 * @property {string} email - User's email address
 * @property {string} role - User's role in the system
 * @property {string | undefined} subRole - Optional sub-role associated with the user
 **/
export type addRoleSubRoleData = {
  email: string;
  role: string;
  subRole: string | undefined;
  organizationId: string;
};

/**
 * Data structure for requesting a new verification code
 * @interface resendVerificationData
 * @property {string} email - Email address to send the verification code to
 * @property {boolean} [isForForgetPassword] - Flag indicating if the code is for password reset
 */
export type resendVerificationData = {
  email: string;
  isForForgetPassword?: boolean;
};

/**
 * Registers a new user in the system
 * @param {RegisterData} data - User registration information
 * @returns {Promise<AxiosResponse<{ data: unknown; message: string }>>} Promise resolving to registration response
 * @throws {Error} Error message from the API or request failure
 */
export const registerUser = async (
  data: RegisterData
): Promise<AxiosResponse<{ data: unknown; message: string }>> => {
  try {
    const response = await axiosInstance.post('/api/v1/auth/signup', data);
    return response.data;
  } catch (error) {
    throw getErrorMessage(error);
  }
};

/**
 * Adds business details for a registered user
 * @param {addBusinessDetailsData} data - Business details information
 * @returns {Promise<AxiosResponse<{ data: unknown; message: string }>>} Promise resolving to API response
 * @throws {Error} Error message from the API or request failure
 */
export const addBusinessDetails = async (
  data: addBusinessDetailsData
): Promise<AxiosResponse<{ data: unknown; message: string }>> => {
  try {
    const response = await axiosInstance.post(
      '/api/v1/auth/add-business-details',
      data
    );
    return response.data;
  } catch (error) {
    throw getErrorMessage(error);
  }
};

/**
 * Adds supervising partner details for a registered user
 * @param {addSubRoleAndPartnerDetailsData} data - Sub-role and partner details
 * @returns {Promise<AxiosResponse<{ data: unknown; message: string }>>} Promise resolving to API response
 * @throws {Error} Error message from the API or request failure
 */
export const addSupervisingDetails = async (
  data: addSubRoleAndPartnerDetailsData
): Promise<AxiosResponse<{ data: unknown; message: string }>> => {
  try {
    const response = await axiosInstance.post(
      '/api/v1/auth/add-sub-role-and-partner-details',
      data
    );
    return response.data;
  } catch (error) {
    throw getErrorMessage(error);
  }
};

/**
 * Adds supervising partner details for a registered user
 * @param {addRoleSubRoleData} data - Sub-role and partner details
 * @returns {Promise<AxiosResponse<{ data: unknown; message: string }>>} Promise resolving to API response
 * @throws {Error} Error message from the API or request failure
 */
export const addRoleSubRole = async (
  data: addRoleSubRoleData
): Promise<AxiosResponse<{ data: unknown; message: string }>> => {
  try {
    const response = await axiosInstance.post(
      '/api/v1/auth/add-role-sub-role',
      data
    );
    return response.data;
  } catch (error) {
    throw getErrorMessage(error);
  }
};

/**
 * Verifies a user's email address with a verification code
 * @param {verifyEmailData} data - Email and verification code information
 * @returns {Promise<AxiosResponse<{ data: unknown; message: string }>>} Promise resolving to verification response
 * @throws {Error} Error message from the API or request failure
 */
export const verifyEmail = async (
  data: verifyEmailData
): Promise<AxiosResponse<{ data: unknown; message: string }>> => {
  try {
    const response = await axiosInstance.post(
      '/api/v1/auth/verify-email',
      data
    );
    return response.data;
  } catch (error) {
    throw getErrorMessage(error);
  }
};

/**
 * Requests a new verification code to be sent to the user's email
 * @param {resendVerificationData} data - Email information for code resend
 * @returns {Promise<AxiosResponse<{ data: unknown; message: string }>>} Promise resolving to API response
 * @throws {Error} Error message from the API or request failure
 */
export const resendVerificationCode = async (
  data: resendVerificationData
): Promise<AxiosResponse<{ data: unknown; message: string }>> => {
  try {
    const response = await axiosInstance.post(
      '/api/v1/auth/resend-verification-code',
      data
    );
    return response.data;
  } catch (error) {
    throw getErrorMessage(error);
  }
};
