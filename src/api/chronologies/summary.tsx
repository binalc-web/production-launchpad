import axiosInstance from '../axios';
import { getErrorMessage } from '../errorMessage';
import type { BillingSummaryType } from '@/pages/BillingChronology/types/BillingChronologyDetailsType';

export const getBillingSummary = async (
  id: string
): Promise<BillingSummaryType> => {
  try {
    const response = await axiosInstance.get(
      '/api/v1/chronology/total-billing-amount',
      {
        params: {
          chronologyId: id,
        },
      }
    );
    return response.data.data as BillingSummaryType;
  } catch (error) {
    throw getErrorMessage(error);
  }
};
