import { getErrorMessage } from '../errorMessage';
import axiosInstance from '../axios';

export const exportCaseReport = async (
  caseId: string
): Promise<{ success: boolean; message: string }> => {
  try {
    const response = await axiosInstance.post(`/api/v1/case/report`, {
      caseId,
    });
    return response.data;
  } catch (error) {
    console.log(error);
    throw getErrorMessage(error);
  }
};
