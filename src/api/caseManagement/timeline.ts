import { getErrorMessage } from '../errorMessage';
import axiosInstance from '../axios';

export const markAsDone = async (
  caseId: number,
  caseStatus: string
): Promise<{ success: boolean; message: string }> => {
  try {
    const response = await axiosInstance.patch(
      `/api/v1/case/update-case-timeline`,
      {
        caseId,
        caseStatus,
      }
    );
    return response.data;
  } catch (error) {
    console.log(error);
    throw getErrorMessage(error);
  }
};
