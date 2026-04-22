import type { AxiosResponse } from 'axios';
import { getErrorMessage } from '../errorMessage';
import axiosInstance from '../axios';
import type { TaskComment } from '@/pages/CaseManagement/components/view/TaskDetails';

type AddCommentData = {
  taskId: string;
  comment: string;
};

/**
 * Retrieves all tasks associated with a specific case
 * @param taskId - The unique identifier of the case to fetch tasks for
 * @returns Promise resolving to an AxiosResponse containing task data
 * @throws Error message from the API or request failure
 */
export const getComments = async (
  taskId: string
): Promise<AxiosResponse<Array<TaskComment>>> => {
  try {
    const response = await axiosInstance.get(
      `/api/v1/comments?taskId=${taskId}`
    );
    return response.data;
  } catch (error) {
    throw getErrorMessage(error);
  }
};

/**
 * Creates a new note for a medical record file
 * @param data Object containing recordId, fileId, and content
 * @returns Promise resolving to the updated array of notes
 */
export const addComment = async (
  data: AddCommentData
): Promise<TaskComment> => {
  try {
    const response = await axiosInstance.post(`/api/v1/comments/add`, data);
    return response.data.data as TaskComment;
  } catch (error) {
    throw getErrorMessage(error);
  }
};
