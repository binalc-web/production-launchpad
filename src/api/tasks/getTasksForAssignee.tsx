import type { Task } from "@/pages/CaseManagement/components/view/TaskDetails/components/TaskDetails";
import type { AxiosResponse } from "axios";
import axiosInstance from "../axios";
import { getErrorMessage } from "../errorMessage";

/**
 * Retrieves all tasks associated with a specific case
 * @returns Promise resolving to an AxiosResponse containing task data
 * @throws Error message from the API or request failure
 */
export const getTasksForAssignee = async (
): Promise<AxiosResponse<Array<Task>>> => {
  try {
    const response = await axiosInstance.get(`/api/v1/tasks/for-assignee`);
    return response.data;
  } catch (error) {
    throw getErrorMessage(error);
  }
};