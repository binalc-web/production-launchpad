import axiosInstance from '../axios';
import { getErrorMessage } from '../errorMessage';
import type { ChronologyType } from '@/pages/MedicalChronology/types/MedicalChronologyDetailsType';

export const getCalendarEvents = async ({
  id,
  month,
  year,
}: {
  id: string;
  month: number;
  year: number;
}): Promise<Array<ChronologyType>> => {
  try {
    const response = await axiosInstance.get(
      '/api/v1/chronology/calender-based-medical-chronologies',
      {
        params: {
          chronologyId: id,
          month,
          year,
        },
      }
    );
    return response.data.data as Array<ChronologyType>;
  } catch (error) {
    throw getErrorMessage(error);
  }
};
