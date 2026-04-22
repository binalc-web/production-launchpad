import { type FC, useState, useCallback, useRef } from 'react';
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Typography,
} from '@mui/material';
import { CheckIcon, XCircleIcon, XIcon } from '@phosphor-icons/react';
import type { AddDocumentsPopup } from './view/taskform/types';
import DocumentUploadSection from './DocumentUploadSection';
import { useDropzone } from 'react-dropzone';
import { trackEvent } from '@/utils/mixPanel/mixpanel';
import { useMutation } from '@tanstack/react-query';
import type {
  CaseSaveMutationParameters,
  FileUploadMutationParameters,
  UploadedFile,
  UploadFilesResponse,
} from '../AddCase';
import { editCase, uploadCaseFilesAPI } from '@/api/caseManagement/addCase';
import axios from 'axios';
import type { FormPayload } from '../types/case';
import { useNavigate } from '@tanstack/react-router';
import ToastAlert from '@/components/ToastAlert';

// Define FileWithSource interface to track file origin (local vs server)
interface FileWithSource extends File {
  documentProcessStages: string;
  fromServer?: boolean; // Flag indicating if this file exists on the server
  serverId?: string; // ID of the file on the server if it exists there
}

const AddDocumentsPopup: FC<AddDocumentsPopup> = (props) => {
  const { open, setOpen, oldFiles, caseData, refetch } = props;
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const isRetryingSubmission = useRef(false);
  const [showAlert, setShowAlert] = useState<boolean>(false);
  const [alertMessage, setAlertMessage] = useState<string>('');
  const navigate = useNavigate();
  const [showVerificationSuccessPopup, setShowVerificationSuccessPopup] =
    useState<boolean>(false);
  // Initialize file state from existing case data if in edit mode
  const [files, setFiles] = useState<Array<FileWithSource>>(
    oldFiles
      ? oldFiles.map((file) => {
          // Create a File object from server data
          const newFile = new File(
            [file.location as string],
            file.fileName as string,
            {
              type: file.mimeType,
            }
          ) as FileWithSource;

          newFile.documentProcessStages = file.documentProcessStages || 'other'; // Default to 'other' if not set

          // Add metadata to track this file's origin
          newFile.fromServer = true; // This file exists on server
          newFile.serverId = file.id; // Store the server ID for API calls

          return newFile;
        })
      : []
  );
  const handleClose = (): void => {
    setOpen(false);
    setShowAlert(false); // Close any alert when closing popup
    setAlertMessage(''); // Reset alert message
  };

  /**
   * Callback for react-dropzone when files are dropped
   * @function
   * @param {Array<File>} acceptedFiles - Files that passed validation
   */
  /**
   * Handles dropped files from react-dropzone
   * @function
   * @description Adds newly dropped files to the existing file array, marking them as local uploads
   * @param {Array<File>} acceptedFiles - Files accepted by react-dropzone
   */
  const onDrop = useCallback((acceptedFiles: Array<File>) => {
    // Mark all dropped files as local (not from server) and add them to the state
    const filesWithSource = acceptedFiles.map((file) => {
      const fileWithSource = file as FileWithSource;
      fileWithSource.fromServer = false; // New files are NOT from server
      fileWithSource.serverId = undefined; // No server ID for local files
      fileWithSource.documentProcessStages = 'other'; // Ensure the name is set correctly
      return fileWithSource;
    });
    setFiles((previousFiles) => [...previousFiles, ...filesWithSource]);
  }, []);

  const { getRootProps, getInputProps } = useDropzone({
    onDrop,
    maxSize: 50 * 1024 * 1024,
    accept: {
      'application/pdf': ['.pdf'],
      'image/jpeg': ['.jpeg', '.jpg'],
      'image/png': ['.png'],
    },
  });

  /**
   * Mutation for uploading files to the server
   * @description Handles the file upload process, including error handling
   */
  const uploadFilesMutation = useMutation<
    UploadFilesResponse,
    Error,
    Array<FileWithSource> // Array of FileWithSource
  >({
    mutationFn: async (files) => {
      setIsSubmitting(true);
      const uniqueFiles = caseData
        ? files.filter(
            (file) =>
              !caseData.files.find(
                (f) => file.fromServer && f.fileName === file.name // File already exists on server
              )
          )
        : files;
      const response = await uploadCaseFilesAPI({
        filesFor: 'cases',
        files: caseData
          ? uniqueFiles.map((file) => ({
              name: file.name,
              mimeType: file.type,
              documentProcessStages: file.documentProcessStages || 'other',
              fileSize: file.size,
            }))
          : files.map((file) => ({
              name: file.name,
              mimeType: file.type,
              documentProcessStages: file.documentProcessStages || 'other',
              fileSize: file.size,
            })),
      });

      await Promise.all(
        response.data.map(async (uploadedFile: UploadedFile) => {
          try {
            const fileToUpload = files.find(
              (f) => f.name === uploadedFile.fileName
            )!;

            /**
             * Reads the file as an array buffer
             * @function
             * @description Utilizes FileReader API to read the file as an array buffer
             * @param {File} fileToUpload - File to be read
             * @returns {Promise<ArrayBuffer>} Promise resolving to the file's array buffer
             */
            const fileData = await new Promise<ArrayBuffer>(
              (resolve, reject) => {
                const reader = new FileReader();
                reader.onload = (): void =>
                  resolve(reader.result as ArrayBuffer);
                reader.onerror = reject;
                reader.readAsArrayBuffer(fileToUpload);
              }
            );

            await axios.request({
              method: 'put',
              url: uploadedFile.signedUrl,
              headers: {
                'Content-Type': fileToUpload.type,
              },
              data: fileData,
            });
          } catch (error) {
            console.error('Failed to upload file:', error);
            throw error;
          }
        })
      );

      return response;
    },
  });

  /**
   * Mutation for saving case data to the server
   * @description Handles the case data submission process after files are uploaded
   */
  const saveCaseMutation = useMutation({
    mutationFn: ({ formData, uploadResponse }: CaseSaveMutationParameters) => {
      const apiToCall = editCase;

      const thirdPartyUsersData = caseData.thirdPartyUsers.map(
        (item) => item._id
      );

      const hasUniqueFiles =
        !caseData ||
        files.some((file) => {
          return !caseData.files.some(
            (existingFile) =>
              file.fromServer && // Only compare server files
              existingFile.fileName === file.name &&
              existingFile.mimeType === file.type
          );
        });

      const payload: FormPayload = {
        ...caseData,
        patient: caseData.patient._id,
        assignee: caseData.assignee._id,
        thirdPartyUsers: thirdPartyUsersData,
        ...(caseData.authorizingPersonType === 'guardian'
          ? {
              authorizedGuardian: caseData.authorizedGuardian
                ? caseData.authorizedGuardian._id
                : undefined,
              authorizedAttorney: undefined,
            } // If authorizing person is guardian
          : caseData.authorizingPersonType === 'power_of_attorney'
            ? {
                authorizedAttorney: caseData.authorizedAttorney
                  ? caseData.authorizedAttorney._id
                  : undefined,
                authorizedGuardian: undefined,
              } // If authorizing person is power of attorney
            : {
                authorizedAttorney: undefined,
                authorizedGuardian: undefined,
              }), // If authorizing person is self
        ...(caseData && !hasUniqueFiles
          ? {}
          : {
              files: uploadResponse.data.map((f) => ({
                name: f.fileName,
                newFileName: f.newFileName,
                key: f.key,
                fileSize: f.fileSize,
                documentProcessStages: f.documentProcessStages || 'other',
                mimeType: f.mimeType,
                location: 'https://google.com',
              })),
            }),
      } as unknown as FormPayload;

      return apiToCall(payload);
    },
    onSuccess: () => {
      void trackEvent(
        caseData ? 'Case Updated successfully' : `New case added successfully`
      );
      setShowVerificationSuccessPopup(true);
      setIsSubmitting(false);

      setTimeout(() => {
        setShowVerificationSuccessPopup(false);
        setOpen(false);

        if (refetch) {
          refetch();
        }
        void navigate({
          to: `/case-management/view/${caseData.caseId}`,
        });
      }, 2000);
    },
    onError: (error) => {
      // Prevent infinite retry loops
      if (isRetryingSubmission.current) {
        isRetryingSubmission.current = false;
        setAlertMessage(
          'Failed to save case after retrying. Please check your data and try again.'
        );
        setShowAlert(true);
        setIsSubmitting(false);
        return;
      }
      setShowAlert(true);

      if (error instanceof Error) {
        setAlertMessage(
          error.message === 'Validation Error'
            ? JSON.stringify(error.stack)
            : error.message
        );
      } else {
        setAlertMessage('Something went wrong!');
      }
    },
  });

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="md"
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
        <Typography variant="h4">Add new Documents</Typography>
        <IconButton variant="soft" onClick={handleClose} size="small">
          <XIcon size={18} />
        </IconButton>
      </DialogTitle>
      <DialogContent>
        <DocumentUploadSection
          files={files}
          isFromPopup
          setFiles={setFiles}
          caseData={caseData}
          refetch={refetch as () => void}
          getRootProps={getRootProps}
          getInputProps={getInputProps}
        />
      </DialogContent>
      <DialogActions
        sx={{
          p: 3,
          pt: 3,
          //   pb: showError ? 1 : 3,
          borderTop: '1px solid',
          borderColor: 'divider',
          justifyContent: 'space-between',
        }}
      >
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
          <Button
            type="submit"
            variant="contained"
            loading={isSubmitting}
            onClick={() => {
              uploadFilesMutation.mutate(files, {
                onSuccess: (uploadResponse) => {
                  saveCaseMutation.mutate({
                    formData: caseData,
                    uploadResponse,
                  });
                },
                onError: (error) => {
                  // Reset retry flag on file upload error
                  isRetryingSubmission.current = false;
                  setAlertMessage(
                    error instanceof Error
                      ? error.message
                      : 'Failed to upload files. Please try again.'
                  );
                  setShowAlert(true);
                  setIsSubmitting(false);
                },
              });
            }}
          >
            Add Documents
          </Button>
          <Button onClick={handleClose} variant="outlined" color="inherit">
            Cancel
          </Button>
        </Box>
      </DialogActions>
      <ToastAlert
        placement="right"
        severity="error"
        showAlert={showAlert}
        onClose={() => setShowAlert(false)}
        message={alertMessage}
        icon={<XCircleIcon weight="bold" />}
      />
      {showVerificationSuccessPopup ? (
        <ToastAlert
          placement="right"
          severity="success"
          showAlert={showVerificationSuccessPopup}
          onClose={() => setShowVerificationSuccessPopup(false)}
          message={caseData ? 'Case Updated!' : 'New Case Added!'}
          icon={<CheckIcon weight="bold" />}
        />
      ) : null}
    </Dialog>
  );
};

export default AddDocumentsPopup;
