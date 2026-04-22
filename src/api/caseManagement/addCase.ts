import type { AxiosResponse } from 'axios';
import { getErrorMessage } from '../errorMessage';
import axiosInstance from '../axios';
import type { FormData } from '@/pages/CaseManagement/types';
import type { FormPayload } from '@/pages/CaseManagement/types/case';

/**
 * Represents the data structure for case creation and updates
 * @interface AddCaseDataType
 * @extends FormData
 * @property {number} [caseId] - Unique identifier for the case (present for existing cases)
 * @property {string} firstName - Patient's first name
 * @property {string} lastName - Patient's last name
 * @property {string} email - Patient's email address
 * @property {string} contact - Patient's contact information
 * @property {string} title - Title of the case
 * @property {string} status - Current status of the case
 * @property {string} caseType - Type of the case
 * @property {string} startDate - Date when the case started
 * @property {string} assignee - Person assigned to the case
 * @property {string} authorizingPersonType - Type of person authorizing the case
 * @property {string} [authorizedGuardian] - Guardian information if applicable
 * @property {string} [authorizedAttorney] - Attorney information if applicable
 * @property {Array<string>} thirdPartyType - Types of third parties involved
 * @property {Array<string>} thirdPartyUsers - List of third party users involved
 * @property {Array<Object>} files - Files associated with the case
 */
export type AddCaseDataType = FormData & {
  caseId?: number;
  id?: string;
  _id?: string;
  patient: {
    _id?: string;
    firstName: string;
    lastName: string;
    email: string;
    contact: string;
  };
  title: string;
  status: string;
  caseType: string;
  startDate: string;
  assignee: {
    _id?: string;
  };
  authorizingPersonType: string;
  authorizedGuardian?: {
    _id?: string;
  };
  authorizedAttorney?: {
    _id?: string;
  };
  thirdPartyType: Array<string>;
  thirdPartyUsers: Array<{
    _id?: string;
  }>;
  files: Array<{
    fileSize: number;
    documentProcessStages: string;
    id?: string;
    _id?: string;
    fileName?: string;
    name?: string;
    type?: string;
    location?: string;
    newFileName?: string;
    key: string;
    mimeType: string;
    isQudefenseVerified?: boolean;
    s3Location?: string;
    createdAt?: string;
    size?: string;
    chip?: string;
  }>;
};

/**
 * Data structure for generating signed URLs for file uploads
 * @interface GenerateSignedUrlDataType
 * @property {string} filesFor - Entity type the files belong to (e.g., 'case')
 * @property {Array<Object>} files - Array of file information for URL generation
 * @property {string} files[].name - Original filename
 * @property {string} files[].mimeType - MIME type of the file
 */
type GenerateSignedUrlDataType = {
  filesFor: string;
  files: Array<{
    name: string;
    mimeType: string;
    documentProcessStages?: string;
  }>;
};

/**
 * Creates a new case with the provided data
 * @param {AddCaseDataType} data - The case data containing all details
 * @returns {Promise<AxiosResponse>} Promise resolving to the created case
 * @throws {Error} Error message from the API or request failure
 */
export const addCaseAPI = async (data: FormPayload): Promise<AxiosResponse> => {
  try {
    const response = await axiosInstance.post(
      '/api/v1/case/add-new-case',
      data
    );
    return response.data;
  } catch (error) {
    console.log(error);
    throw getErrorMessage(error);
  }
};

/**
 * Generates signed URLs for uploading files to cloud storage
 * @param {GenerateSignedUrlDataType} data - File information for URL generation
 * @returns {Promise<AxiosResponse>} Promise resolving to signed URLs for uploads
 * @throws {Error} Error message from the API or request failure
 */
export const uploadCaseFilesAPI = async (
  data: GenerateSignedUrlDataType
): Promise<AxiosResponse> => {
  try {
    const response = await axiosInstance.post(
      '/api/v1/files/generate-signed-url',
      data
    );
    return response.data;
  } catch (error) {
    throw getErrorMessage(error);
  }
};

/**
 * Retrieves a list of all cases
 * @returns {Promise<AxiosResponse>} Promise resolving to a list of cases
 * @throws {Error} Error message from the API or request failure
 */
export const getCaseList = async (): Promise<AxiosResponse> => {
  try {
    const response = await axiosInstance.get('/api/v1/case/get-all-cases');
    return response.data;
  } catch (error) {
    console.log(error);
    throw getErrorMessage(error);
  }
};

/**
 * Retrieves users that can be assigned to cases based on role and subrole
 * @param {string} role - Primary role filter
 * @param {string} subRole - Sub-role filter
 * @returns {Promise<AxiosResponse>} Promise resolving to a list of assignable users
 * @throws {Error} Error message from the API or request failure
 */
export const getAssignees = async (role: string): Promise<AxiosResponse> => {
  try {
    const response = await axiosInstance.get(
      `/api/v1/user/get-users-by-role?role=${role}`
    );
    return response.data;
  } catch (error) {
    console.log(error);
    throw getErrorMessage(error);
  }
};

/**
 * Updates an existing case with new data
 * @param {AddCaseDataType} data - Updated case data (must include caseId)
 * @returns {Promise<AxiosResponse>} Promise resolving to the updated case
 * @throws {Error} Error message from the API or request failure
 */
export const editCase = async (data: FormPayload): Promise<AxiosResponse> => {
  try {
    const response = await axiosInstance.post(`/api/v1/case/edit-case`, data);
    return response.data;
  } catch (error) {
    console.log(error);
    throw getErrorMessage(error);
  }
};

/**
 * Retrieves a single case by its ID
 * @param {string} id - Unique identifier of the case to retrieve
 * @returns {Promise<AxiosResponse>} Promise resolving to the case data
 * @throws {Error} Error message from the API or request failure
 */
export const getCaseById = async (id: string): Promise<AxiosResponse> => {
  try {
    const response = await axiosInstance.get(
      `/api/v1/case/get-single-case?caseId=${id}`
    );
    return response.data;
  } catch (error) {
    console.log(error);
    throw getErrorMessage(error);
  }
};

/**
 * Deletes a file associated with a case
 * @param {Object} data - File deletion information
 * @param {string} data.entityId - ID of the entity (case) the file belongs to
 * @param {string} data.fileId - ID of the file to delete
 * @param {string} data.filesFor - Entity type the file belongs to
 * @returns {Promise<AxiosResponse>} Promise resolving to deletion confirmation
 * @throws {Error} Error message from the API or request failure
 */
export const deleteCaseFile = async (data: {
  entityId: string;
  fileId: string;
  filesFor: string;
  fileDeleteReason?: string;
}): Promise<AxiosResponse> => {
  try {
    const response = await axiosInstance.post(
      `/api/v1/files/delete-file`,
      data
    );
    return response.data;
  } catch (error) {
    console.log(error);
    throw getErrorMessage(error);
  }
};

/**
 * Generates a signed URL for viewing a file
 * @param {string} id - ID of the file to preview
 * @returns {Promise<AxiosResponse>} Promise resolving to signed URL for viewing
 * @throws {Error} Error message from the API or request failure
 */
export const getFilePreview = async (id: string): Promise<AxiosResponse> => {
  try {
    const response = await axiosInstance.post(
      '/api/v1/files/generate-signed-url-view',
      { fileId: id }
    );
    return response.data;
  } catch (error) {
    console.log(error);
    throw getErrorMessage(error);
  }
};

/**
 * Retrieves the access logs for a specific file
 * @param {string} id - ID of the file to retrieve logs for
 * @returns {Promise<AxiosResponse>} Promise resolving to file access logs
 * @throws {Error} Error message from the API or request failure
 */
export const getFileLog = async (id: string): Promise<AxiosResponse> => {
  try {
    const response = await axiosInstance.get(
      `/api/v1/files/file-access-logs/${id}`
    );
    return response.data;
  } catch (error) {
    throw getErrorMessage(error);
  }
};

export type GetCaseDocumentsParameters = {
  caseId: string | number;
  documentTypes?: Array<string>;
  page?: number;
  limit?: number;
  startDate?: string;
  endDate?: string;
};

/**
 * Fetches documents associated with a case, with optional filters
 * @param {GetCaseDocumentsParameters} params - Query params for filtering documents
 * @returns {Promise<AxiosResponse>} Promise resolving to the list of case documents
 */
export const getCaseDocuments = async (
  parameters: GetCaseDocumentsParameters
): Promise<AxiosResponse> => {
  try {
    const searchParameters = new URLSearchParams();
    searchParameters.append('caseId', String(parameters.caseId));

    if (parameters.documentTypes && parameters.documentTypes.length > 0) {
      parameters.documentTypes.forEach((dt) =>
        searchParameters.append('documentType', dt)
      );
    }

    searchParameters.append('page', String(parameters.page ?? 1));
    searchParameters.append('limit', String(parameters.limit ?? 100));

    if (parameters.startDate)
      searchParameters.append('startDate', parameters.startDate);
    if (parameters.endDate)
      searchParameters.append('endDate', parameters.endDate);

    const response = await axiosInstance.get(
      `/api/v1/case/get-case-documents?${searchParameters.toString()}`
    );
    return response.data;
  } catch (error) {
    throw getErrorMessage(error);
  }
};

export type GenerateMasterChronologyParameters = {
  caseId: string;
  fileIds: Array<string>;
  chronologyName: string;
};

/**
 * Generates a master chronology from the selected case documents
 * @param {GenerateMasterChronologyParameters} data - caseId, fileIds, and chronologyName
 * @returns {Promise<AxiosResponse>} Promise resolving to the generation response
 * @throws {Error} Error message from the API or request failure
 */
export const generateMasterChronology = async (
  data: GenerateMasterChronologyParameters
): Promise<AxiosResponse> => {
  try {
    const response = await axiosInstance.post(
      '/api/v1/chronology/generate-master-chronology',
      data
    );
    return response.data;
  } catch (error) {
    throw getErrorMessage(error);
  }
};
