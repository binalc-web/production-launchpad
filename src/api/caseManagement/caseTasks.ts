import type { AxiosResponse } from 'axios';
import { getErrorMessage } from '../errorMessage';
import axiosInstance from '../axios';
import type { CaseFilesType } from '@/pages/CaseManagement/types';
import type { Task } from '@/pages/CaseManagement/components/view/TaskDetails/components/TaskDetails';

/**
 * Retrieves all tasks associated with a specific case
 * @param caseId - The unique identifier of the case to fetch tasks for
 * @returns Promise resolving to an AxiosResponse containing task data
 * @throws Error message from the API or request failure
 */
export const getTasks = async (
  caseId: string
): Promise<AxiosResponse<Array<Task>>> => {
  try {
    const response = await axiosInstance.get(`/api/v1/tasks?caseId=${caseId}`);
    return response.data;
  } catch (error) {
    throw getErrorMessage(error);
  }
};

/**
 * Represents the data structure for task creation and updates
 * @property title - The title of the task
 * @property description - Optional detailed description of the task
 * @property priority - Priority level of the task
 * @property status - Current status of the task
 * @property dueDate - The deadline for task completion
 * @property taskReminderDate - Optional reminder setting for the task
 * @property assignee - Person assigned to complete the task
 * @property attachments - Optional files attached to the task
 * @property caseId - The case ID this task belongs to
 * @property _id - Optional unique identifier (present for existing tasks)
 */
export type TaskFormData = {
  title: string;
  caseId: string;
  description: string;
  priority: string;
  status: string;
  dueDate: Date | null;
  taskReminderDate: Date | null;
  assignee: string;
  files: Array<CaseFilesType>;
  _id?: string;
  organizationId?: string;
};

/**
 * Retrieves a single task by its ID
 * @param id - The unique identifier of the task to retrieve
 * @returns Promise resolving to an AxiosResponse containing the task data
 * @throws Error message from the API or request failure
 */
export const getTask = async (id: string): Promise<AxiosResponse> => {
  try {
    const response = await axiosInstance.get(`/api/v1/tasks/${id}`);
    return response.data;
  } catch (error) {
    throw getErrorMessage(error);
  }
};

/**
 * Creates a new task with the provided data
 * @param data - The task form data containing all task details
 * @returns Promise resolving to an AxiosResponse containing the created task
 * @throws Error message from the API or request failure
 */
export const addTask = async (data: TaskFormData): Promise<AxiosResponse> => {
  try {
    const response = await axiosInstance.post('/api/v1/tasks/add', data);
    return response.data;
  } catch (error) {
    throw getErrorMessage(error);
  }
};

/**
 * Updates an existing task with new data
 * @param data - The task form data containing updated task details (must include _id)
 * @returns Promise resolving to an AxiosResponse containing the updated task
 * @throws Error message from the API or request failure
 */
export const editTask = async (data: TaskFormData): Promise<AxiosResponse> => {
  try {
    const response = await axiosInstance.patch(
      `/api/v1/tasks/${data._id}`,
      data
    );
    return response.data;
  } catch (error) {
    throw getErrorMessage(error);
  }
};

/**
 * Deletes a task by its ID
 * @param id - The unique identifier of the task to delete
 * @returns Promise resolving to an AxiosResponse containing the deletion result
 * @throws Error message from the API or request failure
 */
export const deleteTask = async (id: string): Promise<AxiosResponse> => {
  try {
    const response = await axiosInstance.delete(`/api/v1/tasks/${id}`);
    return response.data;
  } catch (error) {
    throw getErrorMessage(error);
  }
};

export type updateAssigneeFilesForTask = {
  taskId: string;
  filesUploadedByAssignee: Array<CaseFilesType>;
};

/**
 * Updates an existing task with new data
 * @param data - The task form data containing updated task details (must include _id)
 * @returns Promise resolving to an AxiosResponse containing the updated task
 * @throws Error message from the API or request failure
 */
export const updateAssigneeFilesForTask = async (
  data: updateAssigneeFilesForTask
): Promise<AxiosResponse> => {
  try {
    const response = await axiosInstance.post(
      `/api/v1/tasks/assignee-file-upload`,
      data
    );
    return response.data;
  } catch (error) {
    throw getErrorMessage(error);
  }
};
