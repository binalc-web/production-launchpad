import { type FC, useState, useCallback, useRef, useMemo } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { useNavigationGuard } from '@/hooks/useNavigationGuard';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { useQuery, useMutation } from '@tanstack/react-query';
import { yupResolver } from '@hookform/resolvers/yup';
import { getUserDetails } from '@/api/users/getUserByRole';
import { addCaseSchema } from './schema/validationSchema';
import type { FormData } from './types';
import { Typography, Box, Card } from '@mui/material';
import { useDropzone } from 'react-dropzone';
import { CheckIcon, XCircleIcon } from '@phosphor-icons/react';
import Breadcrumbs from '@/components/Breadcrumbs';
import ToastAlert from '@/components/ToastAlert';
import PatientInfoSection from './components/PatientInfoSection';
import CaseInfoSection, {
  type CaseInfoSectionProps,
} from './components/CaseInfoSection';
import DocumentUploadSection from './components/DocumentUploadSection';
import FormActions from './components/FormActions';
import {
  addCaseAPI,
  editCase,
  getAssignees,
  uploadCaseFilesAPI,
  type AddCaseDataType,
} from '@/api/caseManagement/addCase';

import axios from 'axios';
import moment from 'moment';
import { PopUp } from '@/components/Popup';

import type { FormPayload } from './types/case';
import { trackEvent } from '@/utils/mixPanel/mixpanel';
import InvitePatient from '../RoleManagement/Components/InvitePatient';

/**
 * Props for the AddCase component
 * @interface AddCaseProps
 * @property {number} [id] - Optional case ID for edit mode
 * @property {AddCaseDataType} [caseData] - Optional existing case data for edit mode
 * @property {() => void} [refetch] - Optional function to refetch data after successful submission
 */
type AddCaseProps = {
  id?: number;
  caseData?: AddCaseDataType;
  refetch?: () => void;
};

/**
 * Structure of an uploaded file response from the API
 * @interface UploadedFile
 * @property {string} fileName - Original name of the file
 * @property {string} signedUrl - URL for uploading to cloud storage
 * @property {string} newFileName - Generated name for the file in storage
 * @property {string} key - Unique key for the file in storage
 * @property {string} mimeType - MIME type of the file
 */
export type UploadedFile = {
  fileName: string;
  signedUrl: string;
  newFileName: string;
  key: string;
  mimeType: string;
  documentProcessStages: string;
  fileSize?: number;
};

/**
 * Response structure from file upload API
 * @interface UploadFilesResponse
 * @property {Array<UploadedFile>} data - Array of successfully uploaded files
 */
export type UploadFilesResponse = {
  data: Array<UploadedFile>;
};

/**
 * Parameters for file upload mutation
 * Simple array of File objects to be uploaded
 */
export type FileUploadMutationParameters = Array<File>;

/**
 * Parameters for case save mutation
 * @interface CaseSaveMutationParameters
 * @property {FormData} formData - Form data from user input
 * @property {UploadFilesResponse} uploadResponse - Response from file upload API
 */
export type CaseSaveMutationParameters = {
  formData: FormData;
  uploadResponse: UploadFilesResponse;
};

/**
 * AddCase component that handles creating and editing medical cases
 * @component
 * @description Orchestrates smaller, specialized components for a complete case form.
 * This component was refactored from a 1200+ line monolithic component into a
 * more maintainable orchestration layer that delegates functionality to specialized
 * components (PatientInfoSection, CaseInfoSection, etc.)
 *
 * Key responsibilities:
 * - Manages form state with react-hook-form
 * - Coordinates file uploads with react-dropzone
 * - Handles API interactions through React Query
 * - Orchestrates specialized components for different sections
 * - Provides form submission and cancellation logic
 *
 * @param {object} props - Component props
 * @param {number} [props.id] - Optional case ID for edit mode
 * @param {AddCaseDataType} [props.caseData] - Existing case data for edit mode
 * @param {() => void} [props.refetch] - Function to refresh data after submission
 * @returns {React.ReactElement} Rendered component
 */
const AddCase: FC<AddCaseProps> = ({ id, caseData, refetch }) => {
  // Flag to prevent infinite retry loops
  const isRetryingSubmission = useRef(false);
  const navigate = useNavigate();

  // Define FileWithSource interface to track file origin (local vs server)
  interface FileWithSource extends File {
    documentProcessStages: string;
    fromServer?: boolean; // Flag indicating if this file exists on the server
    serverId?: string; // ID of the file on the server if it exists there
  }

  // Initialize file state from existing case data if in edit mode
  const [files, setFiles] = useState<Array<FileWithSource>>(
    caseData?.files
      ? caseData.files.map((file) => {
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
  const [showAlert, setShowAlert] = useState<boolean>(false);
  const [alertMessage, setAlertMessage] = useState<string>('');
  const [showVerificationSuccessPopup, setShowVerificationSuccessPopup] =
    useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [showCancelPopup, setShowCancelPopup] = useState<boolean>(false);
  const [showInvitationModal, setShowInvitationModal] = useState(false);
  const [isSuccess, setIsSuccess] = useState<boolean>(false);

  const {
    control,
    handleSubmit,
    formState: { errors, dirtyFields },
    reset,
    watch,
    setValue,
    getValues,
  } = useForm<FormData>({
    // @ts-expect-error Type incompatibility between Yup's inferred types and our FormData type
    resolver: yupResolver(addCaseSchema),
    mode: 'onChange',
    defaultValues: caseData
      ? {
          patientId: caseData.patient._id,
          caseTitle: caseData.title,
          caseStatus: caseData.status,
          caseType: caseData.caseType,
          date: new Date(caseData.startDate),
          assigneeName: caseData.assignee?._id,
          authorizingPerson: caseData.authorizingPersonType,
          interestedThirdPartyType: caseData.thirdPartyType?.length
            ? caseData.thirdPartyType
            : '',
          interestedThirdPartyName: caseData.thirdPartyUsers.map(
            (user) => user?._id
          ),
          attorneyName:
            caseData.authorizedGuardian?._id ||
            caseData.authorizedAttorney?._id,
        }
      : {
          patientId: '',
          caseTitle: '',
          caseStatus: 'open',
          date: null,
          assigneeName: '',
          authorizingPerson: '',
          interestedThirdPartyType: '',
          interestedThirdPartyName: [],
        },
  });

  // Track initial file count to detect file changes
  const initialFileCount = useRef(caseData?.files?.length ?? 0);

  /**
   * Whether the form has unsaved changes
   * @description Checks dirtyFields (fields the user actually modified) and file changes.
   * Using dirtyFields instead of isDirty to avoid false positives from
   * controlled components (e.g., MUI selects/date pickers) that may fire
   * onChange on mount.
   * Also has `isSuccess` flag to bypass the navigation guard completely when the form is successfully submitted
   */
  const hasUnsavedChanges = useMemo((): boolean => {
    const isFormDirty = Object.keys(dirtyFields).length > 0;
    const filesChanged = files.length !== initialFileCount.current;
    return (isFormDirty || filesChanged) && !isSubmitting && !isSuccess;
  }, [dirtyFields, files.length, isSubmitting, isSuccess]);

  const {
    status: blockerStatus,
    proceed,
    reset: resetBlocker,
  } = useNavigationGuard({ shouldBlock: hasUnsavedChanges });

  const handleClose = (): void => {
    setShowInvitationModal(false);
  };

  const handleOpen = (): void => {
    void trackEvent('Invite User Button Clicked');
    setShowInvitationModal(true);
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
    FileUploadMutationParameters
  >({
    mutationFn: async (files) => {
      const uniqueFiles = caseData
        ? files.filter(
            (file) => !caseData.files.find((f) => f.fileName === file.name)
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
      const {
        patientId,
        caseType,
        assigneeName,
        attorneyName,
        interestedThirdPartyName,
        caseTitle,
        caseStatus,
        date,
        authorizingPerson,
        interestedThirdPartyType,
      } = formData;

      const apiToCall = caseData ? editCase : addCaseAPI;

      const hasUniqueFiles =
        !caseData ||
        files.some((file) => {
          return !caseData.files.some(
            (existingFile) =>
              existingFile.fileName === file.name &&
              existingFile.mimeType === file.type
          );
        });

      const authorizationData =
        authorizingPerson === 'power_of_attorney'
          ? { authorizedAttorney: attorneyName }
          : authorizingPerson === 'guardian'
            ? { authorizedGuardian: attorneyName }
            : {};

      const thirdPartyData = interestedThirdPartyType?.length
        ? {
            thirdPartyType: Array.isArray(interestedThirdPartyType)
              ? interestedThirdPartyType.filter(
                  (type) => type !== '' && type !== null
                )
              : interestedThirdPartyType
                  ?.split(',')
                  .filter((type) => type !== '' && type !== null),
            thirdPartyUsers: interestedThirdPartyName,
          }
        : {
            thirdPartyType: [],
            thirdPartyUsers: [],
          };

      const payload: FormPayload = {
        ...(caseData ? { caseId: caseData.caseId } : {}),
        patient: patientId,
        caseType,
        title: caseTitle,
        status: caseStatus,
        startDate: moment(date).format('YYYY-MM-DD'),
        assignee: assigneeName,
        authorizingPersonType: authorizingPerson,
        ...authorizationData,
        ...thirdPartyData,
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
      } as FormPayload;

      return apiToCall(payload);
    },
    onSuccess: () => {
      void trackEvent(
        caseData ? 'Case Updated successfully' : `New case added successfully`
      );
      setIsSuccess(true);
      setShowVerificationSuccessPopup(true);
      setIsSubmitting(false);

      setTimeout(() => {
        setShowVerificationSuccessPopup(false);
        if (refetch) {
          refetch();
        }
        void navigate({
          to: '/case-management',
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

      if (error instanceof Error) {
        setAlertMessage(
          error.message === 'Validation Error'
            ? JSON.stringify(error.stack)
            : error.message
        );
      } else {
        setAlertMessage('Something went wrong!');
      }

      // if (files.length === 0) {
      //   // setAlertMessage('Please Upload Files To Proceed');
      //   // setShowAlert(true);
      //   // setTimeout(() => setShowAlert(false), 3000);
      //   return;
      // }

      try {
        setIsSubmitting(true);

        // Get current form values
        const formValues = getValues();

        const hasUniqueFiles =
          !caseData ||
          files.some((file) => {
            return !caseData.files.some(
              (existingFile) =>
                existingFile.fileName === file.name &&
                existingFile.mimeType === file.type
            );
          });

        // Set retry flag before attempting resubmission
        isRetryingSubmission.current = true;

        if (caseData && !hasUniqueFiles) {
          const existingUploadResponse: UploadFilesResponse = {
            data: caseData.files.map((file) => ({
              fileName: file.fileName || '',
              newFileName: file.newFileName || '',
              key: file.key,
              fileSize: file.fileSize,
              documentProcessStages: file.documentProcessStages || 'other',
              mimeType: file.mimeType,
              signedUrl: file.location || '',
            })),
          };
          saveCaseMutation.mutate({
            formData: formValues,
            uploadResponse: existingUploadResponse,
          });
        } else {
          if (files.length) {
            uploadFilesMutation.mutate(files, {
              onSuccess: (uploadResponse) => {
                saveCaseMutation.mutate({
                  formData: formValues,
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
          } else {
            saveCaseMutation.mutate({
              formData: formValues,
              uploadResponse: { data: [] },
            });
          }
        }
      } catch (error) {
        // Reset retry flag on any caught error
        isRetryingSubmission.current = false;
        setAlertMessage(
          error instanceof Error ? error.message : 'Something went wrong!'
        );
        setShowAlert(true);
        setIsSubmitting(false);
      }
    },
  });

  /**
   * Handles form submission
   * @function
   * @description Processes form data and initiates file upload/case saving
   * @param {FormData} data - Form data from react-hook-form
   * @returns {void} This function doesn't return a value
   */
  const onSubmit: SubmitHandler<FormData> = (data): void => {
    // Reset retry flag on new submission
    isRetryingSubmission.current = false;
    // Strip formatting from phone number before submission

    // if (files.length === 0) {
    //   setAlertMessage('Please Upload Files To Proceed');
    //   setShowAlert(true);
    //   setTimeout(() => setShowAlert(false), 3000);
    //   return;
    // }

    try {
      setIsSubmitting(true);

      const hasUniqueFiles =
        !caseData ||
        files.some((file) => {
          return !caseData.files.some(
            (existingFile) =>
              existingFile.fileName === file.name &&
              existingFile.mimeType === file.type
          );
        });
      if (caseData && !hasUniqueFiles) {
        const existingUploadResponse: UploadFilesResponse = {
          data: caseData.files.map((file) => ({
            fileName: file.fileName || '',
            newFileName: file.newFileName || '',
            documentProcessStages: file.documentProcessStages || 'other',
            key: file.key,
            fileSize: file.fileSize || 0,
            mimeType: file.mimeType,
            signedUrl: file.location || '',
          })),
        };
        saveCaseMutation.mutate({
          formData: data,
          uploadResponse: existingUploadResponse,
        });
      } else {
        // Store data reference to ensure it's accessible in callbacks
        const formDataToSubmit = data;

        if (files.length) {
          uploadFilesMutation.mutate(files, {
            onSuccess: (uploadResponse) => {
              saveCaseMutation.mutate({
                formData: formDataToSubmit,
                uploadResponse,
              });
            },
            onError: (error) => {
              setAlertMessage(
                error instanceof Error
                  ? error.message
                  : 'Failed to upload files. Please try again.'
              );
              setShowAlert(true);
              setIsSubmitting(false);
            },
          });
        } else {
          saveCaseMutation.mutate({
            formData: formDataToSubmit,
            uploadResponse: { data: [] },
          });
        }
      }
    } catch (error) {
      setAlertMessage(
        error instanceof Error ? error.message : 'Something went wrong!'
      );
      setShowAlert(true);
      setIsSubmitting(false);
    }
  };

  /**
   * Query for fetching assignees data
   * @description Retrieves the list of legal users and attorneys for assignment
   */
  const {
    isLoading,
    isError,
    data: assigneesData,
  } = useQuery({
    queryKey: ['assignees'],
    queryFn: () => getAssignees('legal_user', 'attorney'),
    staleTime: 5 * 60 * 1000,
  });

  /**
   * Handles form cancellation
   * @function
   * @description Shows confirmation popup before canceling form
   */
  /**
   * Query for fetching patients data
   * @description Retrieves the list of users with patient role
   */
  const { data: patientUsers, isLoading: patientUsersLoading } = useQuery({
    queryKey: ['patientUsers'],
    queryFn: () => getUserDetails('patient'),

    staleTime: 5 * 60 * 1000,
  });

  const handleCancel = (): void => {
    if (caseData) {
      if (files?.length === 0) {
        setAlertMessage('Please Upload Files To Proceed');
        setShowAlert(true);
        setTimeout(() => setShowAlert(false), 3000);
      } else {
        setShowCancelPopup(true);
      }
    } else {
      setShowCancelPopup(true);
    }
  };

  return (
    <>
      <Box component="form" onSubmit={handleSubmit(onSubmit)}>
        <Breadcrumbs
          items={[
            {
              title: 'Case Management',
              url: '/case-management',
              onClick: (): void => {
                setShowCancelPopup(true);
              },
            },
            {
              title: caseData ? 'Edit Case' : 'Add New Case',
            },
          ]}
        />

        <Typography mt={1.25} variant="h4">
          {caseData ? 'Edit' : 'Add New'} Case
        </Typography>

        <Card sx={{ mt: 2.5 }}>
          <PatientInfoSection
            patients={patientUsers || []}
            isLoading={patientUsersLoading}
            control={control}
            errors={errors}
            id={id}
            handleOpen={handleOpen}
          />
          <CaseInfoSection
            id={id}
            control={control}
            errors={errors}
            watch={watch}
            setValue={setValue}
            data={assigneesData as CaseInfoSectionProps['data']}
            isError={isError}
            isLoading={isLoading}
          />
          <DocumentUploadSection
            files={files}
            setFiles={setFiles}
            caseData={caseData}
            refetch={refetch as () => void}
            getRootProps={getRootProps}
            getInputProps={getInputProps}
          />
          <FormActions
            id={id}
            isSubmitting={isSubmitting}
            onCancel={handleCancel}
          />
        </Card>
        <ToastAlert
          placement="right"
          severity="error"
          showAlert={showAlert}
          onClose={() => setShowAlert(false)}
          message={alertMessage}
          icon={<XCircleIcon weight="bold" />}
        />
      </Box>
      {!caseData && showVerificationSuccessPopup ? (
        <PopUp
          type="ADDCASE"
          title="New Case Added!"
          buttonText="Go To Case Management"
          isOpen={showVerificationSuccessPopup}
          description="Case has been added to your list successfully."
          onClick={() => {
            void navigate({
              to: '/case-management',
            });
            setShowVerificationSuccessPopup(false);
          }}
        />
      ) : null}
      {caseData && showVerificationSuccessPopup ? (
        <ToastAlert
          placement="right"
          severity="success"
          showAlert={showVerificationSuccessPopup}
          onClose={() => setShowVerificationSuccessPopup(false)}
          message={caseData ? 'Case Updated!' : 'New Case Added!'}
          icon={<CheckIcon weight="bold" />}
        />
      ) : null}

      <InvitePatient handleClose={handleClose} open={showInvitationModal} />

      {showCancelPopup && (
        <PopUp
          type="CANCELCASE"
          title={
            <Typography variant="h2">
              Are you sure you would like to cancel?
            </Typography>
          }
          buttonText="Yes, Cancel it!"
          isOpen={showCancelPopup}
          description="By canceling, your entered data will not be saved"
          onClick={() => {
            reset();
            void navigate({
              to: '/case-management',
            });
            setShowCancelPopup(false);
          }}
          onCancel={() => setShowCancelPopup(false)}
          cancelText="No, Return"
        />
      )}

      {blockerStatus === 'blocked' && (
        <PopUp
          type="CANCELCASE"
          title={<Typography variant="h2">You have unsaved changes</Typography>}
          buttonText="Leave Page"
          isOpen={blockerStatus === 'blocked'}
          description="Are you sure you want to leave? Any unsaved changes will be lost."
          onClick={() => {
            proceed();
          }}
          onCancel={() => {
            resetBlocker();
          }}
          cancelText="Stay on Page"
        />
      )}
    </>
  );
};

export default AddCase;
