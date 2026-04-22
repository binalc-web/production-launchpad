import axiosInstance from '../axios';
import { getErrorMessage } from '../errorMessage';
import type { ChronologyCaseObjectType } from '@/pages/MedicalChronology/types/MedicalChronologyDetailsType';

export const getMedicalCaseDetails = async ({
  id,
}: {
  id: string;
}): Promise<Array<ChronologyCaseObjectType>> => {
  try {
    const response = await axiosInstance.get(
      '/api/v1/chronology/case-details-medical-chronologies',
      {
        params: {
          chronologyId: id,
        },
      }
    );
    return response.data.data?.chronologies as Array<ChronologyCaseObjectType>;
  } catch (error) {
    throw getErrorMessage(error);
  }
};

export const getBillingCaseDetails = async ({
  id,
}: {
  id: string;
}): Promise<Array<ChronologyCaseObjectType>> => {
  try {
    const response = await axiosInstance.get(
      '/api/v1/chronology/case-details-billing-chronologies',
      {
        params: {
          chronologyId: id,
        },
      }
    );
    return response.data.data?.chronologies as Array<ChronologyCaseObjectType>;
  } catch (error) {
    throw getErrorMessage(error);
  }
};
