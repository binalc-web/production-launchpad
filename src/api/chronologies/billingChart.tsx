import type { Moment } from 'moment';
import axiosInstance from '../axios';
import { getErrorMessage } from '../errorMessage';
import type { BillingChartResponse } from '@/pages/BillingChronology/types/BillingChronologyDetailsType';

export const getBillingChart = async ({
  id,
  startDate,
  endDate,
  duration,
}: {
  id: string;
  startDate: string | Moment | Date;
  endDate: string | Moment | Date;
  duration: 'all' | 'yearly';
}): Promise<BillingChartResponse> => {
  try {
    const response = await axiosInstance.get(
      '/api/v1/chronology/billing-chronology-graph',
      {
        params: {
          chronologyId: id,
          duration,
          ...(duration === 'all' ? { startDate, endDate } : {}),
        },
      }
    );
    return response.data.data.graph;
  } catch (error) {
    throw getErrorMessage(error);
  }
};
