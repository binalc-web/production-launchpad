import {
  type ReactNode,
  useEffect,
  useRef,
  useState,
  type ReactElement,
} from 'react';
import { useForm, type Resolver } from 'react-hook-form';
import { useMutation, useQuery } from '@tanstack/react-query';
import { yupResolver } from '@hookform/resolvers/yup';
import { useLocation, useNavigate, useRouter } from '@tanstack/react-router';
import axios from 'axios';
import * as yup from 'yup';
import { useDropzone } from 'react-dropzone';
import moment from 'moment';

import { Card, Box, Button, Divider, Typography } from '@mui/material';

import PatientInfoSection from './PatientInfoSection';
import RecordInfoSection from './RecordInfoSection';
import DocumentUploadSection from './DocumentUploadSection';
import ToastAlert from '@/components/ToastAlert';
import { PopUp } from '@/components/Popup';
import { CheckIcon, LockIcon, XCircleIcon } from '@phosphor-icons/react';
import { uploadCaseFilesAPI } from '@/api/caseManagement/addCase';
import axiosInstance from '@/api/axios';
import Breadcrumbs, { type BreadcrumbItem } from '@/components/Breadcrumbs';
import { validateClearmeToken } from '@/api/auth/validate-clearme-token';
import { useAuth } from '@/context/auth/useAuth';
import AppCustomLoader from '@/components/AppCustomLoader';
import { trackEvent } from '@/utils/mixPanel/mixpanel';
import { ClearMEURL } from '@/utils/clearme';
import { nameRegex } from '@/utils/regex';
import { handleEpicLogin } from '@/utils/epic';
import { validateEpicToken } from '@/api/epic';
import {
  getEndpoint,
  type GetEndpointResponse,
} from '@/api/medicalRecords/getEndpoint';

const breadcrumbItems: Array<BreadcrumbItem> = [
  {
    title: 'Request Record',
  },
];

export type FormData = {
  firstName: string;
  lastName: string;
  dateRange: Array<Date>;
  recordType: Array<string>;
  medicalRecordProvider: string;
  medicalFacilities: Array<string>;
  files?: Array<File>;
  additionalNotes?: string;
  caseId?: string;
  patientId?: string;
  subRole?: string; // Added back to maintain compatibility with PatientInfoSection
};
interface SubmitResponse {
  success: boolean;
  message: string;
}

const validationSchema = yup.object({
  firstName: yup
    .string()
    .required('First name is required')
    .min(3, 'First name must be at least 3 characters')
    .max(20, 'First name must be at most 20 characters')
    .matches(nameRegex, 'First name should not contain numbers'),
  lastName: yup
    .string()
    .required('Last name is required')
    .min(3, 'Last name must be at least 3 characters')
    .max(20, 'Last name must be at most 20 characters')
    .matches(nameRegex, 'Last name should not contain numbers'),
  // Additional notes validation (should be optional for all provider types)
  additionalNotes: yup.string().optional().nullable(),
  // Record Info validation
  dateRange: yup.array().when('medicalRecordProvider', {
    is: (value: string) => value === 'ehr',
    then: (schema) =>
      schema
        .of(yup.date().required('Date element is required'))
        .min(1, 'Date range is required')
        .required('Date range is required'),
    otherwise: (schema) => schema.optional().nullable(),
  }),
  recordType: yup.array().when('medicalRecordProvider', {
    is: (value: string) => value === 'ehr',
    then: (schema) =>
      schema
        .of(yup.string().required('Record type element is required'))
        .min(1, 'At least one record type must be selected')
        .required('Record type is required'),
    otherwise: (schema) => schema.optional().nullable(),
  }),
  // medicalRecordProvider: yup
  //   .string()
  //   .required('Medical record provider is required'),
  // // Medical facilities validation (only required for non-EHR providers)
  // medicalFacilities: yup.array().when('medicalRecordProvider', {
  //   is: (value: string) => value !== 'ehr',
  //   then: (schema) =>
  //     schema
  //       .of(yup.string())
  //       .min(1, 'At least one facility must be selected')
  //       .required('Medical facilities are required'),
  //   otherwise: (schema) => schema.optional().nullable(),
  // }),
  // File validation (only required for 'other' provider)
  files: yup.array().when('medicalRecordProvider', {
    is: (value: string) => value === 'self',
    then: (schema) =>
      schema
        .min(1, 'At least one document is required')
        .required('At least one document is required'),
    otherwise: (schema) => schema.optional().nullable(),
  }),
  caseId: yup.string().optional().nullable(),
  patientId: yup.string().optional().nullable(),
  subRole: yup.string().optional().nullable(),
});

/**
 * Structure of an uploaded file response from the API (mocked)
 */
export type UploadedFile = {
  fileName: string;
  signedUrl: string; // In a real scenario, this would be used to upload
  newFileName: string;
  key: string; // Key to identify the file in storage
  mimeType: string;
  documentProcessStages: string; // Stages of the document processing
};

/**
 * Response structure from file upload API (mocked)
 */
export type UploadFilesResponse = {
  data: Array<UploadedFile>;
};

// Prepare files for upload and get signed URLs
const prepareFilesForUpload = async (
  filesToUpload: Array<FileWithSource>
): Promise<UploadFilesResponse> => {
  // Create request data for uploadCaseFilesAPI
  const uploadData = {
    filesFor: 'medical-record', // Specifying these are for medical records
    files: filesToUpload.map((file) => ({
      name: file.name,
      mimeType: file.type,
      documentProcessStages: file.documentProcessStages || 'other', // Default to 'other' if not set
    })),
  };

  // Call the real API to get signed URLs
  const response = await uploadCaseFilesAPI(uploadData);

  // Define a type for the API response item
  type ApiResponseItem = {
    fileName: string;
    signedUrl: string;
    newFileName: string;
    key: string;
    mimeType: string;
    documentProcessStages: string;
  };

  // Transform the response to match our expected format
  return {
    data: response.data.map((item: ApiResponseItem) => ({
      fileName: item.fileName,
      signedUrl: item.signedUrl,
      newFileName: item.newFileName,
      key: item.key,
      mimeType: item.mimeType,
      documentProcessStages: item.documentProcessStages || 'other', // Default to 'other' if not set
      location: 'https://location2.com', // Using the location format from the example
    })),
  };
};

// Define a type for the record request payload - this matches what the API expects
export type ManualRecordRequestPayload = {
  caseId: string;
  files?: Array<{
    name: string;
    newFileName: string;
    key: string;
    mimeType: string;
    location: string;
    fileSize: number;
    documentProcessStages: string;
  }>;
};

// Define a type for the record request payload - this matches what the API expects
export type RecordRequestPayload = {
  caseId?: string;
  patientId?: string;
  status: string;
  provider: string;
  recordDateRange: {
    startDate: string;
    endDate: string;
  };
  startDate: string;
  endDate: string;
  // TODO: Update API to support multiple record types in the future
  recordType: string; // Will be Array<string> in future versions
  medicalTreatmentFacilities?: Array<string>;
  files?: Array<{
    name: string;
    newFileName: string;
    key: string;
    mimeType: string;
    location: string;
  }>;
  additionalNotes?: string;
};

// Define a type for file details returned from the upload API
type FileDetail = {
  fileName: string;
  key: string; // Will be mapped to fileKey when sending to the API
  mimeType: string; // Will be mapped to fileType when sending to the API
  newFileName: string;
  signedUrl: string;
  documentProcessStages: string; // Stages of the document processing
  fileSize?: number; // Add the fileSize property
  location?: string; // Add the location property
  size?: number; // Original file size property
};

const submitManualRecordRequestAPI = async (
  payload: ManualRecordRequestPayload
): Promise<SubmitResponse> => {
  try {
    // Make the API call directly with our properly structured payload
    // This ensures that all required fields are included

    const response = await axiosInstance.post(
      '/api/v1/medical-record/request-record-self',
      payload
    );

    // Check the response status and data
    // Return the response in the expected format
    return {
      success: true,
      message: response.data?.message || 'Request submitted successfully!',
    };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'An unknown error occurred';
    return {
      success: false,
      message: errorMessage,
    };
  }
};

/**
 * Submits the medical record request to the backend API
 * Handles formatting the payload and processing the response
 * @param payload - The record request data
 * @returns A response object with success status and message
 */
const submitRecordRequestAPI = async (
  payload: RecordRequestPayload
): Promise<SubmitResponse> => {
  try {
    // Retrieve the Epic Base URL from localStorage
    const epicBaseUrl = localStorage.getItem('epicBaseUrl');
    if (!epicBaseUrl) {
      throw new Error('Epic Base URL not found');
    }
    // Instead of using FormData, let's create a direct object payload to send to the API
    // This ensures all fields are properly formatted as the API expects
    const apiPayload: Record<string, unknown> = {
      caseId: payload.caseId || '',
      patientId: payload.patientId || '',
      status: payload.status,
      provider: payload.provider,
      recordType: payload.recordType,
      recordDateRange: payload.recordDateRange,
      medicalTreatmentFacilities: payload.medicalTreatmentFacilities || [],
      files: payload.files || [],
      startDate: payload.startDate,
      endDate: payload.endDate,
      epicBaseUrl,
    };

    // Add additional notes if present
    if (payload.additionalNotes) {
      apiPayload.additionalNotes = payload.additionalNotes;
    }

    // Make the API call directly with our properly structured payload
    // This ensures that all required fields are included
    const response = await axiosInstance.post(
      '/api/v1/medical-record/request-record',
      apiPayload
    );

    // Check the response status and data

    // Return the response in the expected format
    return {
      success: true,
      message: response.data?.message || 'Request submitted successfully!',
    };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'An unknown error occurred';
    return {
      success: false,
      message: errorMessage,
    };
  }
};

interface FileWithSource extends File {
  documentProcessStages: string;
  fromServer?: boolean; // Flag indicating if this file exists on the server
  serverId?: string; // ID of the file on the server if it exists there
}

const AuthenticateLinkCard = ({
  link,
  showAutoCloseAlert,
}: {
  link: GetEndpointResponse['data'][number];
  showAutoCloseAlert: (message: string, severity: 'success' | 'error') => void;
}): ReactNode => {
  const [loading, setLoading] = useState(false);
  return (
    <Box
      key={link.reference}
      display="flex"
      flexDirection="row"
      justifyContent="space-between"
      alignItems="center"
      mb={2}
      p={2}
      sx={{
        border: '1px solid #e0e0e0',
        borderRadius: '8px',
        '&:hover': {
          backgroundColor: '#f5f5f5',
        },
      }}
    >
      <Typography sx={{ width: '100px', wordBreak: 'break-word' }}>
        {link.display}
      </Typography>
      <Button
        variant="outlined"
        onClick={async () => {
          try {
            setLoading(true);
            await handleEpicLogin(link.address);
          } catch (error) {
            if (error instanceof Error) {
              showAutoCloseAlert(error.message, 'error');
            } else {
              showAutoCloseAlert('An unknown error occurred', 'error');
            }
          } finally {
            setLoading(false);
          }
        }}
        disabled={loading}
        loading={loading}
        sx={{
          display: 'flex',
          flexDirection: 'row',
          gap: 1,
          alignItems: 'center',
        }}
      >
        <LockIcon size={16} />
        Authenticate
      </Button>
    </Box>
  );
};

// Main component for requesting medical records
const RequestRecord = (): ReactElement => {
  const [files, setFiles] = useState<Array<FileWithSource>>([]);
  const navigate = useNavigate();
  // Abort controller to cancel any on flight requests when the component unmounts
  const abortControllerRef = useRef<AbortController | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showAlert, setShowAlert] = useState(false);
  const [alertMessage, setAlertMessage] = useState<string>('');
  const [alertSeverity, setAlertSeverity] = useState<'success' | 'error'>(
    'error'
  );
  const [showSuccessPopup, setShowSuccessPopup] = useState(false);
  const [showVerificationPopup, setShowVerificationPopup] = useState(false);

  // TODO: We have made a single selection for EHR, so this state is not required
  // const [showVerificationPopupForEpic, setShowVerificationPopupForEpic] =
  //   useState(false);
  const [isAutoFetching, setIsAutoFetching] = useState(false);
  const [showLinkPopup, setShowLinkPopup] = useState<{
    open: boolean;
    links: GetEndpointResponse['data'];
  }>({
    open: false,
    links: [],
  });
  const { basicUserDetails } = useAuth();

  const location = useLocation();
  const router = useRouter();

  /**
   * Displays an alert with the given message and severity, then auto-closes it after 3 seconds
   */
  const showAutoCloseAlert = (
    message: string,
    severity: 'success' | 'error'
  ): void => {
    setAlertMessage(message);
    setAlertSeverity(severity);
    setShowAlert(true);

    // Auto-close the alert after 3 seconds
    setTimeout(() => {
      setShowAlert(false);
    }, 3000);
  };

  const searchParameters = new URLSearchParams(location.search as string);
  const urlCaseId = searchParameters.get('caseId');
  const id = searchParameters.get('id');
  const ehr = searchParameters.get('ehr');

  const {
    reset,
    control,
    handleSubmit,
    setError,
    setValue,
    watch,
    trigger,
    formState: { errors },
  } = useForm<FormData>({
    resolver: yupResolver(validationSchema) as unknown as Resolver<FormData>, // Type assertion to resolve compatibility issue
    defaultValues: {
      firstName: basicUserDetails?.firstName || 'John',
      lastName: basicUserDetails?.lastName || 'Doe',
      dateRange: [] as Array<Date>,
      recordType: [] as Array<string>,
      medicalRecordProvider: ehr || 'self',
      medicalFacilities: undefined,
      additionalNotes: undefined,
      files: undefined,
      caseId: id || '',
      patientId: basicUserDetails?.userId || '67fe14da8a934cd4f8029bc3',
      subRole: basicUserDetails?.subRole || 'self',
    },
  });
  // removed user validation check
  const { refetch: validateClearme, isLoading: isUserValidatedLoading } =
    useQuery({
      queryKey: ['validate-clearme-token'],
      queryFn: () => validateClearmeToken(basicUserDetails?.email as string),
      enabled: false,
      retry: false,
      refetchOnMount: false,
      refetchOnWindowFocus: false,
    });

  const { refetch: validateEpic, isLoading: isEpicUserValidatedLoading } =
    useQuery({
      queryKey: ['validate-epic-token'],
      queryFn: () => validateEpicToken(),
      enabled: false,
      retry: false,
      refetchOnMount: false,
      refetchOnWindowFocus: false,
    });

  useEffect(() => {
    void Promise.all([validateClearme(), validateEpic()]).then(
      ([clearmeResult, epicResult]) => {
        if (clearmeResult.status === 'error') {
          setShowVerificationPopup(true);
        }
        if (epicResult.status === 'error') {
          // setShowVerificationPopupForEpic(true);
        }
      }
    );
  }, []);

  useEffect(() => {
    // Track the page view event when the component mounts
    void trackEvent('Request Record Page Viewed', {
      userId: basicUserDetails?.userId,
      email: basicUserDetails?.email,
      caseId: urlCaseId,
    });
  }, [basicUserDetails, urlCaseId]);
  /**
   * Handles file drop events for the document upload section
   * Updates both the local files state and the form state
   */
  const onDrop = (acceptedFiles: Array<FileWithSource>): void => {
    if (!acceptedFiles.length) return;

    setFiles((previousFiles) => {
      const updatedFiles = [...previousFiles, ...acceptedFiles];
      setValue('files', updatedFiles);
      void trigger('files');
      return updatedFiles;
    });
  };

  // Mutation for submitting the record request
  const submitRecordRequestMutation = useMutation<
    SubmitResponse,
    Error,
    ManualRecordRequestPayload
  >({
    mutationFn: (payload) => {
      payload.caseId = urlCaseId ?? '';
      return submitManualRecordRequestAPI(payload);
    },
    onSuccess: (response) => {
      if (response.success) {
        // Reset the form and files on success

        // Show success popup instead of just an alert
        setShowSuccessPopup(true);
      } else {
        showAutoCloseAlert(
          response.message || 'Failed to submit record request',
          'error'
        );
      }
      setIsSubmitting(false);
    },
    onError: (error) => {
      showAutoCloseAlert(`Error: ${error.message}`, 'error');
      setIsSubmitting(false);
    },
  });

  // Mutation for uploading files (getting signed URLs)
  const uploadFilesMutation = useMutation<
    UploadFilesResponse,
    Error,
    Array<FileWithSource>
  >({
    mutationFn: prepareFilesForUpload,
    onSuccess: async (uploadResponse, files) => {
      try {
        const uploadedFileDetails = uploadResponse.data.map(
          (file: FileDetail, index: number) => {
            const originalFile = files[index];

            return {
              name: file.fileName,
              newFileName: file.newFileName,
              key: file.key,
              mimeType: file.mimeType,
              location: file.location || '',
              fileSize: originalFile.size || 0,
              documentProcessStages: file.documentProcessStages || '',
            };
          }
        );

        // Upload all files to their signed URLs in parallel for better performance
        // This avoids the ESLint warning about await in loops
        const uploadPromises = files.map(async (file, index) => {
          const signedUrl = uploadResponse.data[index].signedUrl;
          try {
            await axios.put(signedUrl, file, {
              headers: {
                'Content-Type': file.type,
              },
            });

            return { success: true, file };
          } catch (error) {
            return { success: false, file, error };
          }
        });

        // Wait for all uploads to complete
        const results = await Promise.all(uploadPromises);

        // Check if any uploads failed
        const failedUploads = results.filter((result) => !result.success);
        if (failedUploads.length > 0) {
          // Use the setError function from react-hook-form to display errors
          const firstFailure = failedUploads[0];
          setValue('files', [] as unknown as Array<File>, {
            shouldValidate: true,
          });
          setError('files', {
            type: 'manual',
            message: `Failed to upload file: ${firstFailure.file.name}`,
          });
          return; // Exit early if any file upload fails
        }

        // Get the current form values
        const formData = control._formValues as FormData;

        console.log('Uploaded file details:', uploadedFileDetails);
        // Create the payload for the record request API
        const payload: ManualRecordRequestPayload = {
          caseId: formData.caseId ?? '',
          files: uploadedFileDetails,
        };
        submitRecordRequestMutation.mutate(payload);
      } catch (error) {
        const errorMessage =
          error instanceof Error
            ? error.message
            : 'An unknown error occurred during file upload to storage.';
        setAlertMessage(errorMessage);
        setAlertSeverity('error');
        setShowAlert(true);
        setIsSubmitting(false);
      }
    },
    onError: (error) => {
      setAlertMessage(error.message || 'Failed to prepare files for upload.');
      setAlertSeverity('error');
      setShowAlert(true);
      setIsSubmitting(false);
    },
  });
  /** Mutation for manually triggering the endpoint submission.
   * Refactored the query to mutation to avoid caching issues
   * @see {@link GetEndpointResponse} for the expected return shape.
   */
  const { mutate: submitEndpointMutation, isPending: isEndpointLoading } =
    useMutation<GetEndpointResponse, Error, void>({
      mutationFn: () => {
        // Added Abort controller to cancel any on flight requests when the component unmounts
        const controller = new AbortController();
        abortControllerRef.current = controller;
        return getEndpoint(controller.signal);
      },
      onSuccess: (data): void => {
        // Success handler to open the popup when we get the data
        if (data?.success) {
          // Always open the link popup if the request is successful.
          // The popup UI will handle cases where the links array is empty.
          setShowLinkPopup({
            open: true,
            links: data.data || [],
          });
          setIsSubmitting(false);
        } else if (data && !data.success) {
          showAutoCloseAlert(
            data.message || 'Failed to get redirect links',
            'error'
          );
          setIsSubmitting(false);
        }
      },
      onError: (error): void => {
        // Error handler to show the error message
        showAutoCloseAlert(
          `Error: ${error.message || 'Failed to call endpoint'}`,
          'error'
        );
        setIsSubmitting(false);
      },
    });

  useEffect((): (() => void) => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      setIsSubmitting(false);
      setShowLinkPopup({
        open: false,
        links: [],
      });
    };
  }, []);

  /**
   * Auto-fetch when redirected from Epic callback when `ehr=epic`
   */
  const fetchRecords = async (): Promise<void> => {
    try {
      setIsAutoFetching(true);
      setIsSubmitting(true);
      const storedDateRange = localStorage.getItem('requestRecordDateRange');
      const storedRecordType = localStorage.getItem('requestRecordType');
      if (!storedDateRange || !storedRecordType) {
        setShowAlert(true);
        setAlertMessage(
          !storedDateRange
            ? 'No date range selected'
            : 'No record type selected'
        );
        setAlertSeverity('error');
        setIsSubmitting(false);
        return;
      }
      const dateRange = JSON.parse(storedDateRange);
      const recordType = JSON.parse(storedRecordType);
      const startDate = moment(dateRange[0]).format('YYYY-MM-DD');
      const endDate = moment(dateRange[1]).format('YYYY-MM-DD');
      // Call the request record API
      const result = await submitRecordRequestAPI({
        caseId: urlCaseId!,
        files: [],
        recordDateRange: {
          startDate,
          endDate,
        },
        provider: 'ehr',
        status: 'in_progress',
        startDate,
        endDate,
        recordType,
      });

      // Check if the API call was successful
      if (result.success) {
        // Show success popup instead of just an alert
        setShowSuccessPopup(true);
      } else {
        showAutoCloseAlert(
          result.message || 'Failed to submit record request',
          'error'
        );
        setIsSubmitting(false);
        return; // Exit early on error
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsAutoFetching(false);
      setIsSubmitting(false);
    }
  };
  const hasHandledEhrRedirect = useRef(false);

  useEffect(() => {
    // Note: Check if we have already handled this redirect to prevent loops
    if (hasHandledEhrRedirect.current) return;

    if (ehr === 'epic' && !isAutoFetching) {
      hasHandledEhrRedirect.current = true;
      void fetchRecords();
    }
    if (ehr === 'clearme') {
      hasHandledEhrRedirect.current = true;
      showAutoCloseAlert(
        'ClearMe verification completed successfully, please continue to submit your request.',
        'success'
      );
      setValue('medicalRecordProvider', 'ehr');
    }
  }, [ehr, isAutoFetching, urlCaseId]);

  // Configure dropzone for file uploads
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { getRootProps, getInputProps } = (useDropzone as any)({
    onDrop,
    maxSize: 50 * 1024 * 1024,
    accept: {
      'application/pdf': ['.pdf'],
      'image/jpeg': ['.jpeg', '.jpg'],
      'image/png': ['.png'],
    },
  });

  /**
   * Handles form submission with validation and API integration
   * Processes different submission flows based on the selected provider
   * @param data - The validated form data
   */
  const onSubmit = async (data: FormData): Promise<void> => {
    try {
      // setIsSubmitting(true);
      setShowAlert(false);

      if (data.medicalRecordProvider !== 'self') {
        // Note: Store the caseId so that EpicCallback can use it properly
        const caseId = localStorage.getItem('caseId');
        if (!caseId || (caseId === 'null' && urlCaseId)) {
          localStorage.setItem('caseId', urlCaseId || '');
        }
        // Store dateRange to localStorage so that we can use the date and record type during auto-fetch
        if (data.dateRange && data.dateRange.length > 0) {
          localStorage.setItem(
            'requestRecordDateRange',
            JSON.stringify(data.dateRange)
          );
        }

        // Store recordType to localStorage
        if (data.recordType && data.recordType.length > 0) {
          localStorage.setItem(
            'requestRecordType',
            JSON.stringify(data.recordType)
          );
        }

        submitEndpointMutation();
      } else {
        // For other providers, we need to upload files first
        if (files.length === 0) {
          setError('files', {
            type: 'manual',
            message: 'Please upload at least one file',
          });
          showAutoCloseAlert('Please upload at least one file', 'error');
          setIsSubmitting(false);
          return;
        }

        // First, get signed URLs for the files
        await uploadFilesMutation.mutateAsync(files);
        // The actual file upload and record request submission happens in the mutation callbacks
      }
    } catch (error) {
      // Provide a user-friendly error message
      let errorMessage = 'An unexpected error occurred';

      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (typeof error === 'string') {
        errorMessage = error;
      }

      showAutoCloseAlert(
        `Failed to submit record request: ${errorMessage}`,
        'error'
      );
      setIsSubmitting(false);
    }
  };

  const handleSetFiles = (newFiles: Array<File>): void => {
    // Convert File[] to FileWithSource[] with required fields
    const filesWithSource = newFiles.map((file) => {
      // Check if it's already a FileWithSource
      const fileWithSource = file as Partial<FileWithSource>;

      // Ensure it has the required documentProcessStages property
      if (!fileWithSource.documentProcessStages) {
        fileWithSource.documentProcessStages = 'other';
      }

      return fileWithSource as FileWithSource;
    });

    setFiles(filesWithSource);
  };
  // Return the complete JSX for the component
  return (
    <>
      <Breadcrumbs items={breadcrumbItems} />
      <Typography mt={1.25} variant="h4">
        Request Record
      </Typography>
      <Box>
        {isUserValidatedLoading ||
        isEpicUserValidatedLoading ||
        isAutoFetching ? (
          <AppCustomLoader height={200} />
        ) : (
          <Card
            component="form"
            onSubmit={handleSubmit(onSubmit)}
            sx={{
              mt: 1.5,
              '& .MuiSelect-select': {
                height: '24px !important',
              },
            }}
          >
            <PatientInfoSection control={control} errors={errors} />

            <Divider />

            <RecordInfoSection
              control={control}
              errors={errors}
              watch={watch}
            />
            <Divider />
            {/* Only show file upload for providers other than EHR */}
            {watch('medicalRecordProvider') === 'self' && (
              <>
                <DocumentUploadSection
                  files={files}
                  getRootProps={getRootProps}
                  getInputProps={getInputProps}
                  setFiles={handleSetFiles}
                  error={!!errors.files}
                  errorMessage={errors.files?.message}
                />
                <Divider />
              </>
            )}

            <Box sx={{ p: 3, gap: 1, display: 'flex' }}>
              <Button
                type="submit"
                loading={
                  isSubmitting ||
                  isEndpointLoading ||
                  uploadFilesMutation.isPending ||
                  submitRecordRequestMutation.isPending
                }
                variant="contained"
                disabled={
                  isSubmitting ||
                  isUserValidatedLoading ||
                  isEndpointLoading ||
                  uploadFilesMutation.isPending ||
                  submitRecordRequestMutation.isPending
                }
              >
                Submit Request
              </Button>
              <Button
                variant="outlined"
                color="inherit"
                onClick={() => {
                  void router.history.back();
                }}
              >
                Cancel
              </Button>
            </Box>
          </Card>
        )}
      </Box>
      {showAlert && (
        <ToastAlert
          placement="right"
          severity={alertSeverity}
          showAlert={showAlert}
          onClose={() => setShowAlert(false)}
          message={alertMessage}
          icon={
            alertSeverity === 'success' ? (
              <CheckIcon weight="bold" />
            ) : (
              <XCircleIcon weight="bold" />
            )
          }
        />
      )}

      {/* Success Popup */}
      {showSuccessPopup && (
        <PopUp
          type="REQUEST_RECORD"
          title="Your Request Submitted!"
          buttonText="Okay, understood"
          isOpen={showSuccessPopup}
          description="The request you've made for Medical Records has been successfully submitted."
          onClick={() => {
            reset(); // Reset the form
            setFiles([]); // Clear any uploaded files
            void trackEvent('Record Request Submitted', {
              caseId: urlCaseId,
              patientId: basicUserDetails?.userId,
            });
            void navigate({
              to: '/dashboard',
            });
            setShowSuccessPopup(false);
          }}
        />
      )}
      {showVerificationPopup && watch('medicalRecordProvider') === 'ehr' && (
        <PopUp
          type="ADDCASE"
          title="Please Complete Your ClearME verification"
          buttonText="Verify"
          isOpen={showVerificationPopup}
          description=""
          onClick={() => {
            setShowVerificationPopup(false);
            localStorage.setItem(
              'tempPatientEmail',
              basicUserDetails?.email as string
            );
            localStorage.setItem('isFromRequestRecord', 'true');
            localStorage.setItem('caseId', urlCaseId || '');
            localStorage.setItem('id', id || '');
            void trackEvent('Patient Initiated ClearMe flow', {
              caseId: urlCaseId,
              email: basicUserDetails?.email,
            });

            window.open(ClearMEURL, '_self');
          }}
        />
      )}
      {/* {showVerificationPopupForEpic &&
        watch('medicalRecordProvider') === 'epic' && (
          <PopUp
            type="ADDCASE"
            title="Please Login to Epic to Continue"
            buttonText="Login to Epic"
            isOpen={showVerificationPopupForEpic}
            description=""
            onClick={() => {
              setShowVerificationPopupForEpic(false);
              localStorage.setItem(
                'tempPatientEmail',
                basicUserDetails?.email as string
              );
              localStorage.setItem('isFromRequestRecord', 'true');
              localStorage.setItem('caseId', urlCaseId || '');
              localStorage.setItem('id', id || '');
              void trackEvent('Patient Initiated Epic Login', {
                caseId: urlCaseId,
                email: basicUserDetails?.email,
              });
              void handleEpicLogin();
            }}
          />
        )} */}
      {showLinkPopup.open && (
        <PopUp
          // Dynamic title based on whether links are available
          title={
            showLinkPopup.links.length > 0 ? 'Select a link' : 'No links found'
          }
          // Dynamic description based on whether links are available
          description={
            showLinkPopup.links.length > 0
              ? 'Please select a link to authenticate'
              : 'We were unable to find any authentication links at this time.'
          }
          isOpen={showLinkPopup.open}
          maxWidth="lg"
          cancelText="Cancel"
          onCancel={() => setShowLinkPopup({ open: false, links: [] })}
          type="OTHER"
          content={
            // Note: Added width to the box so that it takes the available space and does not shrink
            <Box width={'300px'}>
              <Box
                sx={{
                  maxHeight: '250px',
                  overflowY: 'auto',
                  pr: 1,
                }}
              >
                {showLinkPopup.links.length > 0 ? (
                  showLinkPopup.links.map((link) => (
                    // Individual link selection card
                    <AuthenticateLinkCard
                      link={link}
                      showAutoCloseAlert={showAutoCloseAlert}
                    />
                  ))
                ) : (
                  // Empty state when no links are found
                  <Box
                    display="flex"
                    justifyContent="center"
                    alignItems="center"
                    py={4}
                  >
                    <Typography variant="body1" color="text.secondary">
                      No authentication links found
                    </Typography>
                  </Box>
                )}
              </Box>
            </Box>
          }
        />
      )}
    </>
  );
};

export default RequestRecord;
