import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Avatar,
  Box,
  Button,
  Chip,
  Typography,
} from '@mui/material';
import { useEffect, useState, type FC } from 'react';
import TaskDetailPageTile from './TaskDetailPageTile';
import moment from 'moment';
import {
  TASKS_COLORS,
  TASKS_STATUS_COLORS,
  taskStatus,
} from '@/pages/CaseManagement/constants/options';
import { CaretDownIcon, XIcon } from '@phosphor-icons/react';
import {
  deleteCaseFile,
  uploadCaseFilesAPI,
  type AddCaseDataType,
} from '@/api/caseManagement/addCase';
import FileTile from './FileTile';
import NoDocumentFound from './NoDocumentFound';
import FileViewer from '@/components/FileViewer';
import type {
  Assignee,
  FileUploadMutationParameters,
  UploadedFile,
  UploadFilesResponse,
} from '../../taskform/types';
import { Dot } from '..';
import DocumentSection from '../../taskform/DocumentSection';
import { useDropzone } from 'react-dropzone';
import { PopUp } from '@/components/Popup';
import { useMutation } from '@tanstack/react-query';
import axios from 'axios';
import ToastAlert from '@/components/ToastAlert';
import { updateAssigneeFilesForTask } from '@/api/caseManagement/caseTasks';

type CaseData = {
  caseId: string;
  title: string;
};

export type Task = {
  _id: string;
  title: string;
  description: string;
  assignee: Assignee;
  caseId: string;
  priority: string;
  status: string;
  dueDate: string;
  taskReminderDate: number;
  files: AddCaseDataType['files'] | [];
  filesUploadedByAssignee: AddCaseDataType['files'] | [];
};

type TaskDetailsProps = {
  task: Task;
  caseData: CaseData;
  refetch: () => void;
  isCurrentUserAssignee: boolean;
};

const TaskDetails: FC<TaskDetailsProps> = ({
  caseData,
  task,
  isCurrentUserAssignee,
  refetch,
}) => {
  const [files, setFiles] = useState<Array<File>>([]);
  const [showAlert, setShowAlert] = useState<boolean>(false);
  const [alertMessage, setAlertMessage] = useState<string>('');
  const [alertSeverity, setAlertSeverity] = useState<'success' | 'error'>(
    'error'
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [fileUploadError] = useState<boolean>(false);
  const [selectedFileToUpload, setSelectedFileToUpload] = useState<File | null>(
    null
  );
  const [showFileDeletePopup, setShowFileDeletePopup] =
    useState<boolean>(false);

  const [selectedFile, setSelectedFile] = useState<
    AddCaseDataType['files'][0] | null
  >(null);

  const [filesForDocumentViewer, setFilesForDocumentViewer] = useState<
    AddCaseDataType['files'] | null
  >(task.filesUploadedByAssignee);
  const [openFileViewer, setOpenFileViewer] = useState(false);

  /**
   * Mutation for saving task
   */
  const saveTaskMutation = useMutation<
    unknown,
    Error,
    updateAssigneeFilesForTask
  >({
    mutationFn: async ({ filesUploadedByAssignee, taskId }) => {
      return updateAssigneeFilesForTask({ filesUploadedByAssignee, taskId });
    },
    onSuccess: () => {
      // Reset form data
      refetch();
      setFiles([]);
      // TODO refetch code for task
    },
    onError: (error) => {
      setShowAlert(true);
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
      const existingFiles = task?.files || [];
      const uniqueFiles = files.filter(
        (file) =>
          !existingFiles.some(
            (existing: AddCaseDataType['files'][number]) =>
              existing.fileName === file.name && existing.mimeType === file.type
          )
      );
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

  const handleViewFile = (
    index: number,
    isFileUploadedByAssignee: boolean
  ): void => {
    setFilesForDocumentViewer(
      isFileUploadedByAssignee ? task.filesUploadedByAssignee : task.files
    );
    setSelectedFile(
      isFileUploadedByAssignee
        ? task.filesUploadedByAssignee?.[index]
        : task.files?.[index] || null
    );
    setOpenFileViewer(true);
  };

  // code for file Upload and drop

  const onSubmit = (): void => {
    setIsSubmitting(true);

    const existingFiles = task.filesUploadedByAssignee ?? [];

    // For existing tasks, filter to only upload unique files
    // This is the key fix to prevent duplicate file uploads
    const uniqueFiles = files.filter(
      (file) =>
        !existingFiles.some(
          (existing: AddCaseDataType['files'][number]) =>
            existing.fileName === file.name && existing.mimeType === file.type
        )
    );

    if (uniqueFiles.length > 0) {
      uploadFilesMutation.mutate(uniqueFiles, {
        onSuccess: (uploadResponse) => {
          const newFiles = uploadResponse.data.map((file) => ({
            name: file.fileName,
            newFileName: file.newFileName,
            key: file.key,
            fileSize: file.fileSize,
            location: file.signedUrl,
            mimeType: file.mimeType,
          }));

          saveTaskMutation.mutate({
            taskId: task._id,
            filesUploadedByAssignee: newFiles,
          });
        },

        onError: (error: Error) => {
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

  /**
   * Updates task state after file changes
   * @function
   * @description Refetches task data when files are deleted to ensure UI is in sync
   */
  const handleStateUpdate = (): void => {
    setFiles((previousFiles: Array<File>) =>
      previousFiles.filter((f) => f.name !== selectedFileToUpload?.name)
    );
  };

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
   * Handles file deletion
   * @function
   * @description Handles the deletion of a file attachment from a task.
   * Makes API call to delete the file and updates the task state.
   */
  const handleDelete = (): void => {
    const isOnServer = task?.filesUploadedByAssignee?.find(
      (f: AddCaseDataType['files'][number]) =>
        f.fileName === selectedFileToUpload?.name
    );
    if (isOnServer) {
      deleteFileMutation.mutate(
        {
          entityId: task?._id || '',
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
            // void refetchTaskData().then(() => void refetch());
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
    // void refetchTaskData().then(() => void refetch());
    setSelectedFileToUpload(null);
    setShowFileDeletePopup(false);
  };

  useEffect(() => {
    setFiles(
      task.filesUploadedByAssignee.map(
        (file: AddCaseDataType['files'][number]) =>
          new File([file.s3Location || ''], file.fileName!, {
            type: file.mimeType,
          })
      )
    );
  }, [task]);

  return (
    <Box display="flex" flexDirection="column">
      <Box display="flex" flexDirection="row" gap={1} alignItems="center">
        <Typography fontSize={16} color="neutral.700">
          Case: {caseData?.caseId}
        </Typography>
        {Dot}
        <Typography fontSize={16} color="neutral.700">
          {caseData?.title}
        </Typography>
      </Box>

      <Typography color="neutral.800" fontSize={20} variant="h4" mt={1.2}>
        {task.title}
      </Typography>

      <Box mt={2} display="flex" flexDirection="row" gap={3}>
        <TaskDetailPageTile
          title="Assignee"
          component={
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                mt: 0.5,
              }}
            >
              <Avatar
                src={`${import.meta.env.VITE_AVATAR_CLOUD_FRONT_DISTRIBUTION}${task.assignee.avatar}`}
                sx={{ width: 20, height: 20 }}
              >
                <Typography fontSize={11}>
                  {task.assignee.firstName?.[0]} {task.assignee.lastName?.[0]}
                </Typography>
              </Avatar>
              <Typography fontSize={14} color="neutral.700" fontWeight={500}>
                {task.assignee.firstName} {task.assignee.lastName}
              </Typography>
            </Box>
          }
        />

        <TaskDetailPageTile
          title="Priority"
          component={
            <Chip
              sx={{
                ml: 0.5,
                textTransform: 'capitalize',
                color: TASKS_COLORS[task.priority].color,
                bgcolor: TASKS_COLORS[task.priority].bgcolor,
                border: `1px solid ${TASKS_COLORS[task.priority].borderColor}`,
              }}
              label={task.priority}
            />
          }
        />
        <TaskDetailPageTile
          title="Due Date"
          component={
            <Typography
              fontSize={14}
              mt={0.5}
              alignItems="center"
              color="neutral.700"
              fontWeight={500}
            >
              {moment(task.dueDate).format('MM-DD-YYYY')}
            </Typography>
          }
        />

        <TaskDetailPageTile
          title="Reminder"
          component={
            <Typography
              fontSize={14}
              mt={0.5}
              alignItems="center"
              color="neutral.700"
              fontWeight={500}
            >
              {task
                .taskReminderDate ?moment(task.taskReminderDate)
                .format('MM-DD-YYYY'):'-'}
            </Typography>
          }
        />

        <TaskDetailPageTile
          title="Status"
          component={
            <Chip
              sx={{
                ml: 0.5,
                textTransform: 'capitalize',
                color: TASKS_STATUS_COLORS[task.status].color,
                bgcolor: TASKS_STATUS_COLORS[task.status].bgcolor,
              }}
              label={taskStatus(task.status)}
            />
          }
        />
      </Box>

      {task.status === 'in_progress' && isCurrentUserAssignee ? (
        <Box
          sx={{
            bgcolor: 'neutral.50',
            borderRadius: 2,
            mt: 2.4,
            border: 1,
            borderColor: 'neutral.200',
            p: 2,
          }}
        >
          <DocumentSection
            files={files}
            setFiles={setFiles}
            getRootProps={getRootProps}
            getInputProps={getInputProps}
            selectedFile={selectedFileToUpload}
            setSelectedFile={setSelectedFileToUpload}
            setShowFileDeletePopup={setShowFileDeletePopup}
            fileUploadError={fileUploadError}
            isFromDetailPage
          />

          <Box display="flex" flexDirection="row" gap={1.2}>
            <Button
              variant="contained"
              onClick={onSubmit}
              loading={isSubmitting}
            >
              Submit
            </Button>
            <Button
              variant="outlined"
              onClick={() => {
                const existingFiles = task.filesUploadedByAssignee ?? [];

                // files that are NOT unique (i.e., already exist)
                const remainingFiles = files.filter((file) =>
                  existingFiles.some(
                    (existing: AddCaseDataType['files'][number]) =>
                      existing.fileName === file.name &&
                      existing.mimeType === file.type
                  )
                );

                // update state
                setFiles(remainingFiles);
                // setFiles([]);
              }}
            >
              Cancel
            </Button>
          </Box>
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

          <ToastAlert
            message={alertMessage}
            showAlert={showAlert}
            icon={<XIcon />}
            onClose={() => {}}
            severity={alertSeverity}
            placement="right"
          />
        </Box>
      ) : (
        <Accordion
          defaultExpanded
          disableGutters
          elevation={0}
          sx={{
            mt: 2.4,
            border: 1,
            borderColor: 'neutral.200',
            borderRadius: 1.6,
            backgroundColor: '#f6f7f9',
            '&:before': { display: 'none' },
          }}
        >
          <AccordionSummary
            sx={{
              minHeight: 0,
              pb: 0,
              '& .MuiAccordionSummary-content': {
                mb: 1,
              },
              '&.Mui-expanded': {
                minHeight: 0,
              },
              '& .MuiAccordionSummary-content.Mui-expanded': {
                mb: 0,
              },
            }}
            expandIcon={<CaretDownIcon size={24} />}
          >
            <Typography fontSize={16} fontWeight={600} color="neutral.700">
              {isCurrentUserAssignee
                ? 'Uploaded Documents'
                : 'Documents Provided by Assignee'}
            </Typography>
          </AccordionSummary>

          <AccordionDetails sx={{ p: 1.2 }}>
            <Box>
              {task.filesUploadedByAssignee.length > 0 ? (
                task.filesUploadedByAssignee.map(
                  (file: AddCaseDataType['files'][number], index: number) => (
                    <FileTile
                      handleViewFile={() => handleViewFile(index, true)}
                      file={file}
                      isLastItem={
                        index + 1 === task.filesUploadedByAssignee.length
                      }
                    />
                  )
                )
              ) : (
                <NoDocumentFound isFilesUploadedByAssignee />
              )}
            </Box>
          </AccordionDetails>
        </Accordion>
      )}

      <Typography
        mt={2.4}
        fontSize={16}
        fontWeight={600}
        variant="h6"
        color="neutral.700"
      >
        Description
      </Typography>
      <Typography fontSize={14} color="neutral.700">
        {task.description}
      </Typography>

      <Typography
        mt={2.4}
        fontSize={16}
        fontWeight={600}
        variant="h6"
        color="neutral.700"
      >
        Attachments Shared with {isCurrentUserAssignee ? 'Me' : 'Assignee'}
      </Typography>

      <Box mt={1.2}>
        {task.files.length > 0 ? (
          task.files.map(
            (file: AddCaseDataType['files'][number], index: number) => (
              <FileTile
                handleViewFile={() => handleViewFile(index, false)}
                file={file}
                isLastItem={index + 1 === task.files.length}
              />
            )
          )
        ) : (
          <NoDocumentFound isFilesUploadedByAssignee={false} />
        )}
      </Box>

      <FileViewer
        hideRefetchAndLog
        open={openFileViewer}
        setOpen={setOpenFileViewer}
        selectedFile={selectedFile}
        files={[...filesForDocumentViewer!]}
        setSelectedFile={setSelectedFile}
      />
    </Box>
  );
};

export default TaskDetails;
