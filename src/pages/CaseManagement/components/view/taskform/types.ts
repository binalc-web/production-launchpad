import type { TaskFormData } from '@/api/caseManagement/caseTasks';
import type {
  Control,
  FieldErrors,
  FieldValues,
  UseFormWatch,
} from 'react-hook-form';
import type { DropzoneState } from 'react-dropzone';
import type { AddCaseDataType } from '@/api/caseManagement/addCase';
import type { Task } from '../TaskDetails/components/TaskDetails';

/**
 * Assignee type definition
 * @interface Assignee
 * @description Represents a user who can be assigned to a task.
 * Contains identifiers and basic user information.
 */
export type Assignee = {
  _id: string;
  id?: string;
  firstName: string;
  lastName: string;
  avatar?: string;
};

/**
 * Props for the main TaskForm component
 * @interface TaskFormProps
 * @description Defines the props required by the TaskForm component which handles
 * creating and editing tasks in the case management system.
 */
export type TaskFormProps = {
  open: boolean;
  setOpen: (open: boolean) => void;
  caseId: string;
  refetch: () => void;
  isLoadingAssignees: boolean;
  assigneesData: {
    data?: Array<Assignee>;
  };
  selectedTask: Task | null;
  handleShowDeletePopup: (id: string) => void;
  setSelectedTask?: (task: Task | null) => void;
};

/**
 * Props for the main AddDocumentsPopup component
 * @interface AddDocumentsPopup
 * @description Defines the props required by the TaskForm component which handles
 * creating and editing tasks in the case management system.
 */
export type AddDocumentsPopup = {
  open: boolean;
  setOpen: (open: boolean) => void;
  oldFiles: AddCaseDataType['files'];
  caseData: AddCaseDataType;
  refetch?: () => void;
};

/**
 * Structure for uploaded file data
 * @interface UploadedFile
 * @description Represents a file that has been uploaded to the server.
 * Contains metadata about the file including references to its storage location.
 */
export type UploadedFile = {
  fileName: string;
  signedUrl: string;
  newFileName: string;
  key: string;
  mimeType: string;
  s3Location: string;
  fileSize?: number;
};

/**
 * Response structure from file upload API
 * @interface UploadFilesResponse
 * @description The response format received from the server after a successful file upload.
 * Contains an array of uploaded file metadata.
 */
export type UploadFilesResponse = {
  data: Array<UploadedFile>;
};

/**
 * Type for file upload mutation parameters
 * @type FileUploadMutationParameters
 * @description Array of File objects to be uploaded to the server.
 * Used as the parameter type for the file upload mutation function.
 */
export type FileUploadMutationParameters = Array<File>;

/**
 * Parameters for task save mutation
 * @interface TaskSaveMutationParameters
 * @description Parameters required when saving a task after file uploads.
 * Combines the form data and the response from file uploads.
 */
export type TaskSaveMutationParameters = {
  formData: TaskFormData;
  uploadResponse: UploadFilesResponse;
};

/**
 * Props for TaskInfoSection component
 * @interface TaskInfoSectionProps
 * @description Props for the TaskInfoSection component which displays and manages
 * input fields for task details (title, description, priority, status, etc.)
 */
export type TaskInfoSectionProps = {
  control: Control<TaskFormData, object, FieldValues>;
  errors: FieldErrors<TaskFormData>;
  watch: UseFormWatch<TaskFormData>;
  isLoadingAssignees: boolean;
  assigneesData: {
    data?: Array<Assignee>;
  };
  dueDateValue: null | Date | string;
  caseId: string;
};

/**
 * Props for DocumentSection component
 * @interface DocumentSectionProps
 * @description Props for the DocumentSection component which manages file uploads
 * and displays the list of files attached to a task. Includes file management
 * functions and dropzone integration.
 */
export type DocumentSectionProps = {
  files: Array<File>;
  setFiles: React.Dispatch<React.SetStateAction<Array<File>>>;
  getRootProps: DropzoneState['getRootProps'];
  getInputProps: DropzoneState['getInputProps'];
  selectedFile: File | null;
  setSelectedFile: React.Dispatch<React.SetStateAction<File | null>>;
  setShowFileDeletePopup: React.Dispatch<React.SetStateAction<boolean>>;
  fileUploadError: boolean;
  isFromDetailPage?: boolean;
};

/**
 * Props for FormActions component
 * @interface FormActionsProps
 * @description Props for the FormActions component which displays action buttons
 * (save, cancel, delete) and error messages at the bottom of the task form.
 * Controls form submission and cancellation.
 */
export type FormActionsProps = {
  isSubmitting: boolean;
  handleClose: () => void;
  selectedTask: Task | null;
  setOpen: (open: boolean) => void;
  handleShowDeletePopup: (id: string) => void;
  showError: boolean;
  errorMessage: string;
  errorSeverity: 'success' | 'error';
  reset: () => void;
  setFiles: React.Dispatch<React.SetStateAction<Array<File>>>;
};
