import axiosInstance from '../axios';
import { getErrorMessage } from '../errorMessage';
import type {
  MedicalChronologyDetailsType,
  MedicalChronologyTimelineType,
} from '@/pages/MedicalChronology/types/MedicalChronologyDetailsType';
import type { SaveChronologyEditsPayload } from '@/utils/chronologyEditPayload';
import type { BillingChronologyDetailsType } from '@/pages/BillingChronology/types/BillingChronologyDetailsType';
import type {
  MasterChronologyCaseDetailsType,
  MasterChronologyTimelineType,
} from '@/pages/MasterChronology/types/MasterChronologyDetailsType';

export const getMedicalChronologyDetails = async ({
  id,
  page,
  limit,
}: {
  id: string;
  page: number;
  limit: number;
}): Promise<MedicalChronologyDetailsType> => {
  try {
    const response = await axiosInstance.get(
      '/api/v1/chronology/aggregated-medical-chronologies',
      {
        params: {
          chronologyId: id,
          page,
          limit,
        },
      }
    );
    return response.data.data as MedicalChronologyDetailsType;
  } catch (error) {
    throw getErrorMessage(error);
  }
};

export const getBillingChronologyDetails = async ({
  id,
  page,
  limit,
}: {
  id: string;
  page: number;
  limit: number;
}): Promise<BillingChronologyDetailsType> => {
  try {
    const response = await axiosInstance.get(
      '/api/v1/chronology/aggregated-billing-chronologies',
      {
        params: {
          chronologyId: id,
          page,
          limit,
        },
      }
    );
    return response.data.data as BillingChronologyDetailsType;
  } catch (error) {
    throw getErrorMessage(error);
  }
};
export const getMasterChronologyCaseDetails = async ({
  id,
}: {
  id: string;
}): Promise<MasterChronologyCaseDetailsType> => {
  try {
    const response = await axiosInstance.get(
      '/api/v1/chronology/case-details-master-chronologies',
      {
        params: { chronologyId: id },
      }
    );
    return response.data.data as MasterChronologyCaseDetailsType;
  } catch (error) {
    throw getErrorMessage(error);
  }
};

export const getMasterChronologyTimeline = async ({
  chronologyId,
  page,
  limit,
  status,
  startDate,
  endDate,
  version,
  includePreviousSummary,
}: {
  chronologyId: string;
  page: number;
  limit: number;
  status?: string;
  startDate?: string;
  endDate?: string;
  version?: number;
  includePreviousSummary?: 'true' | 'false';
}): Promise<MasterChronologyTimelineType> => {
  try {
    const parameters: Record<string, string | number> = {
      chronologyId,
      page,
      limit,
    };
    if (status) parameters.status = status;
    if (startDate) parameters.startDate = startDate;
    if (endDate) parameters.endDate = endDate;
    // version=0 means original (no augmentation), omit to get latest
    if (version !== undefined) parameters.version = version;
    if (includePreviousSummary)
      parameters.includePreviousSummary = includePreviousSummary;

    const response = await axiosInstance.get(
      '/api/v1/chronology/master-chronology-details',
      { params: parameters }
    );
    return response.data.data as MasterChronologyTimelineType;
  } catch (error) {
    throw getErrorMessage(error);
  }
};

export const getMasterChronologyReport = async ({
  chronologyId,
  status,
  startDate,
  endDate,
  version,
}: {
  chronologyId: string;
  status?: string;
  startDate?: string;
  endDate?: string;
  version?: number;
}): Promise<unknown> => {
  try {
    const parameters: Record<string, string | number> = {
      chronologyId,
    };
    if (status) parameters.status = status;
    if (startDate) parameters.startDate = startDate;
    if (endDate) parameters.endDate = endDate;
    if (version !== undefined) parameters.version = version;

    const response = await axiosInstance.get(
      '/api/v1/chronology/master-chronology-report',
      { params: parameters }
    );
    return response.data;
  } catch (error) {
    throw getErrorMessage(error);
  }
};

// Medical chronology timeline (matrix view)
export const getMedicalChronologyTimeline = async ({
  chronologyId,
  filter,
}: {
  chronologyId: string;
  filter: '5Y' | '2Y' | '1Y' | '6M' | '1M';
}): Promise<MedicalChronologyTimelineType> => {
  try {
    const response = await axiosInstance.get(
      '/api/v1/chronology/chronology-timeline',
      {
        params: { chronologyId, filter },
      }
    );
    // The backend wraps data under .data similar to other chronology APIs
    return response.data.data as MedicalChronologyTimelineType;
  } catch (error) {
    throw getErrorMessage(error);
  }
};

/**
 * Fetches the list of augmented chronologies for a specific chronology.
 * @param chronologyId The ID of the chronology.
 * @param category The category of the chronology.
 * @returns A promise that resolves to an array of augmented chronology versions.
 */
export const getAugmentedChronologyList = async ({
  chronologyId,
  category,
}: {
  chronologyId: string;
  category: string;
}): Promise<
  Array<{
    versionId: string;
    version: number;
    updatedBy: string;
    createdAt: string;
  }>
> => {
  try {
    const response = await axiosInstance.get(
      '/api/v1/chronology/augment/list',
      {
        params: { chronologyId, category },
      }
    );
    return response.data.data;
  } catch (error) {
    throw getErrorMessage(error);
  }
};

/**
 * Fetches the details of augmented chronologies for a specific chronology.
 * @param chronologyId The ID of the chronology.
 * @param category The category of the chronology.
 * @param version The version of the chronology. Pass 0 for original version.
 * @param page The page number.
 * @param limit The number of items per page.
 * @param includePreviousSummary Whether to include the previous summary.
 * @returns A promise that resolves to an object containing the augmented chronologies.
 */
export const getAugmentedChronologyDetails = async ({
  chronologyId,
  category,
  version,
  page,
  limit,
  includePreviousSummary,
}: {
  chronologyId: string;
  category: string;
  version?: string | number;
  page?: number;
  limit?: number;
  includePreviousSummary: string;
}): Promise<{
  chronologies: Array<unknown>;
  total: number;
  page: number;
  limit: number;
  versionId: string;
  version: number;
}> => {
  try {
    const parameters: Record<string, string | number> = {
      chronologyId,
      category,
    };
    if (version !== undefined) parameters.version = version;
    if (page !== undefined) parameters.page = page;
    if (limit !== undefined) parameters.limit = limit;
    if (includePreviousSummary !== undefined)
      parameters.includePreviousSummary = includePreviousSummary;

    const response = await axiosInstance.get('/api/v1/chronology/augment', {
      params: parameters,
    });
    return response.data.data;
  } catch (error) {
    throw getErrorMessage(error);
  }
};

/**
 * Saves edited chronology summaries as a new augmented version.
 * Works for both medical and billing categories.
 *
 * @param payload - The payload built by `buildChronologyEditPayload`.
 * @returns The newly created version metadata (versionId, version, updatedBy, createdAt).
 */
export const saveChronologyEdits = async (
  payload: SaveChronologyEditsPayload
): Promise<{
  versionId: string;
  version: number;
  updatedBy: string;
  createdAt: string;
}> => {
  try {
    const response = await axiosInstance.post(
      '/api/v1/chronology/augment',
      payload
    );
    return response.data.data;
  } catch (error) {
    throw getErrorMessage(error);
  }
};

export const saveMasterChronologyAugment = async (payload: {
  chronologyId: string;
  updates: Array<{
    _id: string;
    medicalSummary?: {
      _id?: string;
      translated_summary?: string;
    };
    billingSummary?: Array<{
      _id: string;
      translated_summary?: string;
    }>;
    combinedSummary?: string;
  }>;
}): Promise<{
  versionId: string;
  version: number;
  updatedBy: string;
  createdAt: string;
}> => {
  try {
    const response = await axiosInstance.post(
      '/api/v1/chronology/augment-master',
      payload
    );
    return response.data.data;
  } catch (error) {
    throw getErrorMessage(error);
  }
};
