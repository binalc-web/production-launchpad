import { type FC, useState, useEffect } from 'react';
import {
  Box,
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  Typography,
} from '@mui/material';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import { addTaskSchema } from '@/pages/CaseManagement/schema/taskValidationSchema';
import { XIcon } from '@phosphor-icons/react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  addTask,
  editTask,
  getTask,
  type TaskFormData,
} from '@/api/caseManagement/caseTasks';
import {
  deleteCaseFile,
  uploadCaseFilesAPI,
} from '@/api/caseManagement/addCase';
import axios from 'axios';
import { useDropzone } from 'react-dropzone';
import AppCustomLoader from '@/components/AppCustomLoader';
import { PopUp } from '@/components/Popup';

// Import sub-components
import TaskInfoSection from './TaskInfoSection';
import DocumentSection from './DocumentSection';
import FormActions from './FormActions';

// Import types and constants
import type {
  TaskFormProps,
  FileUploadMutationParameters,
  UploadFilesResponse,
  TaskSaveMutationParameters,
  UploadedFile,
} from './types';
import { trackEvent } from '@/utils/mixPanel/mixpanel';
import { useAuth } from '@/context/auth/useAuth';

/**
 * TaskForm component that handles both adding and editing tasks
 * @component
 * @description A modal dialog form for creating and editing tasks in the case management system.
 * Provides a complete interface for task management with these features:
 * - Creating new tasks with all required information
 * - Editing existing tasks
 * - Uploading and managing file attachments
 * - Form validation with yup schema
 * - Error handling and user feedback
 *
 * Uses smaller specialized components for different sections of the form:
 * - TaskInfoSection: For task title, description, priority, status, due date, etc.
 * - DocumentSection: For managing file attachments
 * - FormActions: For submit, cancel, and delete actions
 */
const TaskForm: FC<TaskFormProps> = (props) => {
  const {
    open,
    refetch,
    setOpen,
    caseId,
    assigneesData,
    selectedTask,
    setSelectedTask,
    isLoadingAssignees,
    handleShowDeletePopup,
  } = props;

  const [files, setFiles] = useState<Array<File>>([]);
  const [showAlert, setShowAlert] = useState<boolean>(false);
  const [alertMessage, setAlertMessage] = useState<string>('');
  const [alertSeverity, setAlertSeverity] = useState<'success' | 'error'>(
    'error'
  );
  const [fileUploadError] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [showFileDeletePopup, setShowFileDeletePopup] =
    useState<boolean>(false);

  const queryClient = useQueryClient();

  const { basicUserDetails } = useAuth();
  /**
   * Setup form with validation and default values
   * @description Initializes the form with react-hook-form, adds validation schema,
   * and sets default empty values for all form fields
   */
  const {
    control,
    handleSubmit,
    formState: { errors },
    watch,
    trigger,
    reset,
  } = useForm({
    resolver: yupResolver(addTaskSchema),
    context: {
      currentUserId: basicUserDetails?.userId,
    },
    mode: 'onChange',
    defaultValues: {
      title: '',
      description: '',
      priority: '',
      status: '',
      dueDate: null,
      taskReminderDate: null,
      assignee: '',
      organizationId: '',
      caseId,
    },
  });

  /**
   * Query to fetch task data when editing an existing task
   * @description Uses React Query to fetch task details by ID when in edit mode.
   * Only enabled when a task ID is available and the form is open.
   */
  const {
    isLoading: isLoadingTask,
    data: taskData,
    refetch: refetchTaskData,
    isRefetching,
  } = useQuery({
    queryKey: ['task', caseId, selectedTask?._id],
    queryFn: () => getTask(selectedTask?._id as string),
    retry: 2,
    staleTime: 5 * 60 * 1000,
    enabled: !!selectedTask?._id && !!open,
  });

  useEffect(() => {
    if (open && selectedTask?._id) {
      void refetchTaskData();
    } else {
      reset();
      setFiles([]);
    }
  }, [open, refetchTaskData, selectedTask?._id]);

  const selectedAssigneeId = watch('assignee');

  useEffect(() => {
    if (selectedAssigneeId) {
      void trigger('status'); // 🔥 revalidate status when assignee changes
    }
  }, [selectedAssigneeId, trigger]);

  /**
   * Reset form with task data when editing
   * @description Watches for changes to taskData and updates the form fields with
   * values from the selected task. Also loads existing files attached to the task.
   */
  useEffect(() => {
    reset(
      // @ts-expect-error ts(2345)
      taskData?.data
        ? {
            title: taskData?.data?.task?.title || '',
            description:
              taskData?.data?.task?.description ||
              taskData?.data?.task?.desc ||
              '',
            priority: taskData?.data?.task?.priority || '',
            status: taskData?.data?.task?.status || '',
            dueDate: taskData?.data?.task?.dueDate
              ? new Date(taskData?.data?.task?.dueDate)
              : null,
            taskReminderDate: taskData?.data?.task?.taskReminderDate
              ? new Date(taskData?.data?.task?.dueDate)
              : null,
            assignee: taskData?.data?.task?.assignee?._id || '',
            caseId,
          }
        : {
            title: '',
            description: '',
            priority: '',
            status: '',
            dueDate: null,
            taskReminderDate: null,
            assignee: '',
            caseId,
          }
    );

    // Load existing files if available
    if (taskData?.data && open) {
      if (taskData?.data?.task?.files?.length) {
        setFiles(
          taskData.data.task.files.map(
            (file: {
              s3Location?: string;
              fileName: string;
              mimeType: string;
            }) =>
              new File([file.s3Location || ''], file.fileName, {
                type: file.mimeType,
              })
          )
        );
      } else {
        setFiles([]);
      }
    }
  }, [
    open,
    taskData?.data,
    reset,
    caseId,
    taskData?.data?.task?.assignee?._id,
    taskData?.data?.task?.status,
  ]);

  /**
   * Reset fileUploadError when files are added or removed
   */
  // useEffect(() => {
  //   if (files.length > 0) {
  //     setFileUploadError(false);
  //   }
  // }, [files]);

  useEffect(() => {
    if (!open && !files?.length) {
      void refetch();
    }
  }, [open, refetch, files?.length]);

  useEffect(() => {
    if (!open && setSelectedTask) {
      setSelectedTask(null);
    }
  }, [open]);

  /**
   * File drop handler for file uploads
   * @function
   * @description Handles files dropped or selected in the dropzone.
   * Adds new files to the existing files array and resets file upload errors.
   * @param {Array<File>} acceptedFiles - Files that passed validation criteria
   */
  const onDrop = (acceptedFiles: Array<File>): void => {
    setFiles([...files, ...acceptedFiles]);
  };

  /**
   * Setup dropzone for file uploads
   */
  const { getRootProps, getInputProps } = useDropzone({
    onDrop,
    maxSize: 50 * 1024 * 1024,
    accept: {
      'application/pdf': ['.pdf'],
      'image/jpeg': ['.jpeg', '.jpg'],
      'image/png': ['.png'],
    },
    /**
     * Handles rejected file uploads
     * @function
     * @description Sets error state and message when files are rejected by the dropzone
     * (e.g., due to size or file type restrictions)
     * @param {FileRejection[]} fileRejections - Information about the rejected files
     */
    onDropRejected: (fileRejections): void => {
      const error = fileRejections[0]?.errors?.[0];
      setShowAlert(true);
      setAlertSeverity('error');
      setAlertMessage(
        error?.message || 'File upload failed. Please check file type and size.'
      );
    },
  });

  /**
   * Handler for closing the dialog
   * @function
   * @description Resets form state, clears files, and closes the dialog.
   * If in edit mode, also clears the selected task.
   */
  const handleClose = (): void => {
    setOpen(false);
    setSelectedTask(null);
    setFiles([]);
    reset({
      title: '',
      description: '',
      priority: '',
      status: '',
      dueDate: null,
      taskReminderDate: null,
      assignee: '',
      caseId,
    });

    // Reset all alert and error states completely
    setShowAlert(false);
    setAlertMessage('');
    setAlertSeverity('error'); // Reset back to default state
    // setFileUploadError(false);
    setIsSubmitting(false); // Reset submission state as well
  };

  /**
   * Mutation for uploading files
   */
  const uploadFilesMutation = useMutation<
    UploadFilesResponse,
    Error,
    FileUploadMutationParameters
  >({
    mutationFn: async (files) => {
      if (!files?.length) {
        return { data: [] };
      }
      const existingFiles = taskData?.data?.task?.files || [];
      const uniqueFiles = selectedTask
        ? files.filter(
            (file) =>
              !existingFiles.some(
                (existing: UploadedFile) =>
                  existing.fileName === file.name &&
                  existing.mimeType === file.type
              )
          )
        : files;
      // Get signed URLs from the API
      const response = await uploadCaseFilesAPI({
        filesFor: 'tasks',
        files: uniqueFiles.map((file) => ({
          name: file.name,
          mimeType: file.type,
          fileSize: file.size,
        })),
      });

      // Upload files to the signed URLs
      await Promise.all(
        response.data.map(async (uploadedFile: UploadedFile): Promise<void> => {
          const fileToUpload = files.find(
            (f) => f.name === uploadedFile.fileName
          );

          if (!fileToUpload) {
            throw new Error(`File ${uploadedFile.fileName} not found`);
          }

          const fileData = await new Promise<ArrayBuffer>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (): void => resolve(reader.result as ArrayBuffer);
            reader.onerror = reject;
            reader.readAsArrayBuffer(fileToUpload);
          });

          await axios.request({
            method: 'put',
            url: uploadedFile.signedUrl,
            headers: {
              'Content-Type': fileToUpload.type,
            },
            data: fileData,
          });
        })
      );

      return response;
    },
  });

  /**
   * Mutation for deleting files
   */
  const deleteFileMutation = useMutation<
    unknown,
    Error,
    { entityId: string; fileId: string; filesFor: string }
  >({
    mutationFn: async (data) => {
      const response = await deleteCaseFile(data);
      return response;
    },
  });

  /**
   * Updates task state after file changes
   * @function
   * @description Refetches task data when files are deleted to ensure UI is in sync
   */
  const handleStateUpdate = (): void => {
    setFiles((previousFiles: Array<File>) =>
      previousFiles.filter((f) => f.name !== selectedFile?.name)
    );
  };

  /**
   * Handles file deletion
   * @function
   * @description Handles the deletion of a file attachment from a task.
   * Makes API call to delete the file and updates the task state.
   */
  const handleDelete = (): void => {
    const isOnServer = taskData?.data?.task?.files?.find(
      (f: UploadedFile) => f.fileName === selectedFile?.name
    );
    if (isOnServer) {
      deleteFileMutation.mutate(
        {
          entityId: selectedTask?._id || '',
          fileId: isOnServer._id || '',
          filesFor: 'task',
        },
        {
          onSuccess: () => {
            handleStateUpdate();
            setAlertSeverity('success');
            setAlertMessage('Attachment Deleted Successfully.');
            setShowAlert(true);
            setTimeout(() => {
              setShowAlert(false);
            }, 3000);
            void refetchTaskData().then(() => void refetch());
          },
          onError: (error) => {
            setAlertSeverity('error');
            setAlertMessage(
              error instanceof Error
                ? error.message
                : 'Failed to delete file. Please try again.'
            );
            setShowAlert(true);
            setTimeout(() => {
              setShowAlert(false);
            }, 3000);
          },
        }
      );
    } else {
      handleStateUpdate();
    }
    void refetchTaskData().then(() => void refetch());
    setSelectedFile(null);
    setShowFileDeletePopup(false);
  };

  /**
   * Mutation for saving task
   */
  const saveTaskMutation = useMutation<
    unknown,
    Error,
    TaskSaveMutationParameters
  >({
    mutationFn: async ({ formData, uploadResponse }) => {
      const existingFiles =
        taskData?.data?.task?.files ?? selectedTask?.files ?? [];

      const uniqueFiles = selectedTask
        ? uploadResponse.data.filter(
            (file) =>
              !existingFiles.some(
                (existing: UploadedFile) =>
                  existing.fileName === file.fileName &&
                  existing.mimeType === file.mimeType
              )
          )
        : uploadResponse.data;

      // Match the format used in AddTask.tsx
      const taskDataToSend = {
        title: formData.title,
        caseId: formData.caseId,
        description: formData.description,
        priority: formData.priority,
        status: formData.status,
        dueDate: formData.dueDate,

        assignee: formData.assignee,
        files: uniqueFiles.map((file) => ({
          name: file.fileName,
          newFileName: file.newFileName,
          key: file.key,
          fileSize: file.fileSize,
          location: file.signedUrl,
          mimeType: file.mimeType,
        })),
        ...(selectedTask && { _id: selectedTask._id }),
        ...(formData.taskReminderDate
          ? { taskReminderDate: formData.taskReminderDate }
          : {}),
      };

      const apiToCall = selectedTask ? editTask : addTask;
      return apiToCall(taskDataToSend);
    },
    onSuccess: () => {
      // Don't show success alerts in the dialog
      void trackEvent(`Task ${selectedTask ? 'Updated' : 'Created'}`, {
        caseId,
      });
      setAlertSeverity('success');
      // Reset form data
      setFiles([]);
      setIsSubmitting(false);
      setOpen(false);

      reset({
        title: '',
        description: '',
        priority: '',
        status: '',
        dueDate: null,
        taskReminderDate: null,
        assignee: '',
        caseId,
      });

      // Invalidate and refetch relevant queries
      void queryClient.invalidateQueries({
        queryKey: ['tasks', caseId],
      });

      // If we're editing a task, also invalidate and refetch the task data
      if (selectedTask) {
        void queryClient.invalidateQueries({
          queryKey: ['task', caseId, selectedTask._id],
        });
      }

      void refetch();
    },
    onError: (error) => {
      setAlertSeverity('error');
      setAlertMessage(
        error instanceof Error
          ? error.message
          : 'Failed to save task. Please try again.'
      );
      setShowAlert(true);
      setIsSubmitting(false);
    },
  });

  /**
   * Form submission handler
   * @function
   * @description Processes form submission for both new and edited tasks.
   * - For new tasks: Uploads all files and creates the task
   * - For edited tasks: Only uploads new files and maintains existing ones
   * - Handles validation and error states
   *
   * @param {TaskFormData} formData - Form data from react-hook-form
   */

  const onSubmit = (formData: TaskFormData): void => {
    // Check if at least one file is uploaded for both new and existing tasks
    // if ((!selectedTask && files.length === 0) || files.length === 0) {
    //   setFileUploadError(true);
    //   setIsSubmitting(false);
    //   return;
    // }
    // setFileUploadError(false);
    setIsSubmitting(true);

    // Get existing files from task data, matching AddTask.tsx's approach
    const existingFiles =
      taskData?.data?.task?.files ?? selectedTask?.files ?? [];

    // For existing tasks, filter to only upload unique files
    // This is the key fix to prevent duplicate file uploads
    const uniqueFiles = selectedTask
      ? files.filter(
          (file) =>
            !existingFiles.some(
              (existing: UploadedFile) =>
                existing.fileName === file.name &&
                existing.mimeType === file.type
            )
        )
      : files;

    // Check if there are any unique files (for existing tasks)
    const hasUniqueFiles = selectedTask ? uniqueFiles.length > 0 : true;

    if (selectedTask && !hasUniqueFiles) {
      // No new unique files to upload, just use existing files
      const existingUploadResponse: UploadFilesResponse = {
        data: existingFiles.map((file: UploadedFile) => ({
          fileName: file.fileName,
          newFileName: file.key,
          key: file.key,
          fileSize: file.fileSize,
          mimeType: file.mimeType,
          signedUrl: file.s3Location,
        })),
      };
      saveTaskMutation.mutate({
        formData,
        uploadResponse: existingUploadResponse,
      });
    } else {
      // We have unique files to upload - IMPORTANT: Only upload the unique ones
      uploadFilesMutation.mutate(uniqueFiles, {
        onSuccess: (uploadResponse) => {
          if (selectedTask && existingFiles.length > 0) {
            // For editing tasks, combine existing files with newly uploaded ones
            const existingFilesFormatted = existingFiles.map(
              (file: UploadedFile) => ({
                fileName: file.fileName,
                newFileName: file.key,
                key: file.key,
                fileSize: file.fileSize,
                mimeType: file.mimeType,
                signedUrl: file.s3Location,
              })
            );

            // Create combined response with both existing and new files
            const combinedResponse = {
              data: [...existingFilesFormatted, ...uploadResponse.data],
            };

            saveTaskMutation.mutate({
              formData,
              uploadResponse: combinedResponse,
            });
          } else {
            // For new tasks or tasks with no existing files
            saveTaskMutation.mutate({ formData, uploadResponse });
          }
        },
        onError: (error) => {
          setAlertSeverity('error');
          setAlertMessage(
            error instanceof Error
              ? error.message
              : 'Failed to upload files. Please try again.'
          );
          setShowAlert(true);
          setIsSubmitting(false);
        },
      });
    }
  };

  const dueDateValue = watch('dueDate');

  return (
    <>
      <Dialog
        open={open}
        onClose={handleClose}
        maxWidth="sm"
        fullWidth
        scroll="body"
        slotProps={{
          paper: {
            sx: {
              maxHeight: '90vh',
              overflow: 'scroll',
            },
          },
        }}
      >
        <Box component="form" onSubmit={handleSubmit(onSubmit)}>
          <DialogTitle
            component="div"
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              borderBottom: 1,
              borderColor: 'divider',
            }}
          >
            <Typography variant="h4">
              {selectedTask ? 'Edit' : 'Add New'} Task
            </Typography>
            <IconButton variant="soft" onClick={handleClose} size="small">
              <XIcon size={18} />
            </IconButton>
          </DialogTitle>

          {isLoadingTask || isRefetching ? (
            <Box px={3} py={6}>
              <AppCustomLoader height={100} />
            </Box>
          ) : (
            <>
              <DialogContent
                sx={{
                  p: 0,
                  '& .MuiSelect-select': {
                    height: '24px !important',
                  },
                }}
              >
                <TaskInfoSection
                  control={control}
                  errors={errors}
                  dueDateValue={dueDateValue}
                  isLoadingAssignees={isLoadingAssignees}
                  assigneesData={assigneesData}
                  watch={watch}
                  caseId={caseId}
                />

                <DocumentSection
                  files={files}
                  setFiles={setFiles}
                  getRootProps={getRootProps}
                  getInputProps={getInputProps}
                  selectedFile={selectedFile}
                  setSelectedFile={setSelectedFile}
                  setShowFileDeletePopup={setShowFileDeletePopup}
                  fileUploadError={fileUploadError}
                />
              </DialogContent>

              <FormActions
                isSubmitting={isSubmitting}
                handleClose={handleClose}
                selectedTask={selectedTask}
                setOpen={setOpen}
                handleShowDeletePopup={handleShowDeletePopup}
                showError={showAlert}
                errorMessage={alertMessage}
                errorSeverity={alertSeverity}
                reset={reset}
                setFiles={setFiles}
              />
            </>
          )}
        </Box>
      </Dialog>

      {showFileDeletePopup ? (
        <PopUp
          type="DELETETASK"
          title="Are you sure you want to delete this file?"
          buttonText="Yes, Sure"
          cancelText="No, Not yet"
          isOpen={showFileDeletePopup}
          description=""
          onClick={() => {
            void handleDelete();
          }}
          onCancel={() => setShowFileDeletePopup(false)}
        />
      ) : null}
    </>
  );
};

export default TaskForm;
