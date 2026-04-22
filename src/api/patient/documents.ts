import axiosInstance from '../axios';
// Make sure the path is correct; adjust as needed if the file is elsewhere
import { getErrorMessage } from '../errorMessage';
import type { pagination } from '@/pages/CaseManagement/types/pagination';

export type Document = {
  author: string;
  category: string;
  id: string;
  contentType: string;
  status: string;
  fileId: string;
  isDeleted: boolean;
};

export type File = {
  _id: string;
  fileName: string;
  key: string;
  mimeType: string;
  createdAt: string;
  convertedFileMimeType: string | null;
  convertedFileName: string | null;
};

export type PatientDocument = {
  patientId: string;
  document: Document;
  file: File;
  caseId: string;
  caseNumber: number;
  timelineStatus: string;
  updatedAt: string;
};

export type PatientDocumentsResponse = {
  medicalRecords: Array<PatientDocument> | [];
  pagination: pagination | undefined;
};

export type PatientDocumentsFilters = {
  page: number;
  limit: number;
  searchKeyWordString?: string;
};

export const getPatientDocuments = async (
  filters: PatientDocumentsFilters
): Promise<PatientDocumentsResponse> => {
  try {
    const parameters: Record<string, number | string> = {
      page: filters.page,
      limit: filters.limit,
    };

    if (filters.searchKeyWordString) {
      parameters.keyword = filters.searchKeyWordString;
    }

    const response = await axiosInstance.get(
      '/api/v1/medical-record/patient-documents',
      {
        params: parameters,
      }
    );
    return response.data.data;
  } catch (error) {
    throw getErrorMessage(error);
  }
};
