import { type FC, useState } from 'react';
import {
  Typography,
  Box,
  CardContent,
  Avatar,
  Tooltip,
  Slide,
  Divider,
  Dialog,
  DialogContent,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Button,
  type SelectChangeEvent,
} from '@mui/material';
import {
  UploadSimpleIcon,
  PaperclipIcon,
  TrashIcon,
  InfoIcon,
  CheckCircleIcon,
  XCircleIcon,
} from '@phosphor-icons/react';
import {
  deleteCaseFile,
  type AddCaseDataType,
} from '@/api/caseManagement/addCase';
import { useMutation } from '@tanstack/react-query';
import ToastAlert from '@/components/ToastAlert';
import { DELETE_REASONS, FILE_TYPE_OPTIONS } from '../constants/options';
import type { DropzoneState } from 'react-dropzone';
import { getFileType } from '@/utils/fileType';

/**
 * Props for the DocumentUploadSection component
 * @interface DocumentUploadSectionProps
 * @property {Array<File>} files - Array of files to be displayed and managed
 * @property {Function} getRootProps - Function from react-dropzone for dropzone root element
 * @property {Function} getInputProps - Function from react-dropzone for input element
 * @property {(files: Array<File>) => void} setFiles - State setter for files array
 * @property {AddCaseDataType} [caseData] - Optional data for existing case
 */
// Create a custom file type that can track if a file is from the server or local
interface FileWithSource extends File {
  fromServer?: boolean;
  serverId?: string;
  documentProcessStages: string;
}

interface DocumentUploadSectionProps {
  files: Array<FileWithSource>;
  refetch: () => void;
  getRootProps: DropzoneState['getRootProps'];
  getInputProps: () => React.InputHTMLAttributes<HTMLInputElement>;
  setFiles: (files: Array<FileWithSource>) => void;
  caseData?: AddCaseDataType;
  isFromPopup?: boolean;
}

/**
 * Component that handles document uploads for cases
 * @component
 * @description Provides a dropzone for file uploads and manages existing files.
 * Allows users to add and delete files with reason tracking. Part of the AddCase
 * component refactoring that breaks down a large form into smaller, focused components.
 *
 * @param {object} props - Component props
 * @param {Array<File>} props.files - Files to be displayed and managed
 * @param {Function} props.getRootProps - react-dropzone function for root element
 * @param {Function} props.getInputProps - react-dropzone function for input element
 * @param {Function} props.setFiles - Function to update files state
 * @param {AddCaseDataType} [props.caseData] - Optional data for existing case
 * @returns {React.ReactElement} Rendered component
 */
const DocumentUploadSection: FC<DocumentUploadSectionProps> = ({
  files,
  getRootProps,
  getInputProps,
  setFiles,
  caseData,
  refetch,
  isFromPopup,
}) => {
  const [selectedFile, setSelectedFile] = useState<FileWithSource | null>(null);
  const [showPopup, setShowPopup] = useState<boolean>(false);
  const [showAlert, setShowAlert] = useState<boolean>(false);
  const [alertMessage, setAlertMessage] = useState<string>('');
  const [selectedReason, setSelectedReason] = useState<string>(
    DELETE_REASONS[0]
  );
  const [alertType, setAlertType] = useState<'error' | 'success'>('error');
  const [otherReason, setOtherReason] = useState<string>('');

  /**
   * Mutation hook for deleting files from the server
   * @description Handles API calls and error states for file deletion
   */
  const deleteFileMutation = useMutation<
    unknown,
    Error,
    {
      entityId: string;
      fileId: string;
      filesFor: string;
      fileDeleteReason?: string;
    }
  >({
    mutationFn: async (data) => {
      const response = await deleteCaseFile(data);
      return response;
    },
  });

  /**
   * Updates the files state by removing the selected file
   * @description Filters out the selected file from the files array
   */
  /**
   * Updates the files state by removing the selected file
   * @description Filters out the selected file from the files array
   */
  const handleStateUpdate = (): void => {
    if (!selectedFile) return;

    // Remove the selected file from the array (using === for direct object reference comparison)
    const newFiles = files.filter((file) => file !== selectedFile);
    setFiles(newFiles);
  };

  /**
   * Handles file deletion process
   * @description Checks if file exists on server and uses API if needed.
   * Updates local state and shows success/error messages.
   * Uses both file name and lastModified timestamp to uniquely identify files.
   */
  const handleDelete = (): void => {
    if (!selectedFile) {
      setShowPopup(false);
      return;
    }

    // Only use the API if the file has the fromServer flag and a serverId
    if (selectedFile.fromServer && selectedFile.serverId && caseData?.caseId) {
      // File exists on server, call API to delete it
      deleteFileMutation.mutate(
        {
          entityId: String(caseData.id || caseData._id),
          fileId: selectedFile.serverId || '',
          filesFor: 'case',
          fileDeleteReason:
            selectedReason?.length > 0 ? selectedReason : otherReason,
        },
        {
          onSuccess: () => {
            handleStateUpdate();
            setAlertType('success');
            setAlertMessage('Attachment Deleted Successfully.');
            setShowAlert(true);
            refetch();
            setTimeout(() => {
              setShowAlert(false);
            }, 3000);
          },
          onError: (error) => {
            setAlertType('error');
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
      // File only exists locally, just update state
      handleStateUpdate();
    }

    setShowPopup(false);
    setSelectedFile(null);
  };

  /**
   * Closes the delete confirmation dialog and resets related state
   */
  const handleClose = (): void => {
    setShowPopup(false);
    setSelectedFile(null);
    setSelectedReason(DELETE_REASONS[0]);
    setOtherReason('');
  };

  /**
   * Updates the status of a file in the files array
   * @param {FileWithSource} file - The file to update
   * @param {string} newStatus - The new status to set for the file
   */
  const updateFileStatus = (file: FileWithSource, newStatus: string): void => {
    // Update the documentProcessStages for the specific file
    for (const f of files) {
      if (f === file) {
        f.documentProcessStages = newStatus;
      }
    }
    setFiles(files);
  };

  return (
    <>
      <CardContent>
        <Box
          sx={{
            mb: 2,
            gap: 1,
            display: 'flex',
            alignItems: 'center',
          }}
        >
          <InputLabel htmlFor="uploadDocument">Upload Document</InputLabel>
          <Tooltip
            arrow
            placement="right"
            title="Upload documents like Patient/Client Consent & Authorization Forms, Power of Attorney Documents, Affidavits, Digitized Billing Records, etc."
          >
            <InfoIcon size={18} />
          </Tooltip>
        </Box>
        <Box
          {...getRootProps()}
          sx={{
            p: 2,
            height: 180,
            maxWidth: 725,
            display: 'flex',
            borderRadius: 1,
            border: '1px dashed',
            alignItems: 'center',
            justifyContent: 'center',
            borderColor: 'neutral.300',
          }}
        >
          <Box component="input" {...getInputProps()} />
          <Box
            sx={{
              gap: 0.75,
              textAlign: 'center',
              display: 'flex',
              alignItems: 'center',
              flexDirection: 'column',
              '& svg': { color: 'info.dark' },
            }}
          >
            <Avatar
              sx={{
                width: 48,
                height: 48,
                bgcolor: '#F1F5FD',
              }}
            >
              <UploadSimpleIcon />
            </Avatar>
            <Typography mt={0.5} fontSize={14} fontWeight={500}>
              Click here to upload
            </Typography>
            <Typography fontSize={12} color="textSecondary">
              Supports .PDF, .JPEG/.JPG & .PNG files up to 50 MB size.
            </Typography>
          </Box>
        </Box>
        {files.length > 0 && (
          <Box sx={{ mt: 2 }}>
            <Box
              component="ul"
              sx={{
                maxWidth: isFromPopup ? '88.5%' : '80%',
                listStyle: 'none',
                p: 0,
                m: 0,
              }}
            >
              {files.map((file, index: number) => (
                <Slide in direction="up">
                  <Box
                    component="li"
                    sx={{
                      gap: 2,
                      display: 'flex',
                    }}
                  >
                    <Box
                      sx={{
                        padding: 0.75,
                        width: '78%',
                        display: 'flex',
                        borderRadius: 0.75,
                        alignItems: 'center',
                        mt: index > 0 ? 1 : 0,
                        bgcolor: 'neutral.50',
                        justifyContent: 'space-between',
                      }}
                    >
                      <Box
                        sx={{
                          gap: 0.75,
                          display: 'flex',
                          alignItems: 'center',
                        }}
                      >
                        <Box
                          component={PaperclipIcon}
                          size={16}
                          sx={{
                            color: 'neutral.500',
                          }}
                        />
                        <Typography>{file.name}</Typography>
                      </Box>
                      <Box display="flex" justifyContent="center">
                        <Box
                          component={TrashIcon}
                          size={16}
                          sx={{
                            cursor: 'pointer',
                            color: 'error.dark',
                          }}
                          onClick={() => {
                            setShowPopup(true);
                            setSelectedFile(file);
                          }}
                        />
                      </Box>
                    </Box>
                    <Box display="flex" alignItems="center" width="20%">
                      {file.fromServer && file.serverId ? (
                        <TextField
                          fullWidth
                          disabled
                          id="caseID"
                          type="text"
                          value={getFileType(
                            file.documentProcessStages || 'other'
                          )}
                        />
                      ) : (
                        <Select
                          fullWidth
                          defaultValue="other"
                          onChange={(event: SelectChangeEvent<string>) => {
                            updateFileStatus(file, event.target.value);
                          }}
                        >
                          {FILE_TYPE_OPTIONS.map(
                            (option) => (
                              // option.value !== 'ocr_medical' ? (
                              <MenuItem key={option.value} value={option.value}>
                                {option.label}
                              </MenuItem>
                            )
                            // ) : null
                          )}
                        </Select>
                      )}
                    </Box>
                  </Box>
                </Slide>
              ))}
            </Box>
          </Box>
        )}
      </CardContent>
      {!isFromPopup && <Divider sx={{ mt: 1 }} />}
      <ToastAlert
        placement="right"
        severity={alertType}
        showAlert={showAlert}
        onClose={() => setShowAlert(false)}
        message={alertMessage}
        body={
          alertType === 'success'
            ? 'Your file has been deleted & your preferred reason submited.'
            : ''
        }
        icon={
          alertType === 'success' ? (
            <CheckCircleIcon weight="bold" />
          ) : (
            <XCircleIcon weight="bold" />
          )
        }
      />

      <Dialog open={showPopup} onClose={handleClose}>
        <DialogContent>
          <Typography variant="h2">
            Do you want to delete an attachment?
          </Typography>
          <Typography mt={2} fontSize={18} color="text.secondary">
            Tell us a reason from below to help us better understand and improve
            your experience.
          </Typography>
          <Box mt={4}>
            <Box>
              <InputLabel htmlFor="reason">Select Reason</InputLabel>
              <Select
                fullWidth
                id="reason"
                value={selectedReason}
                onChange={(event: SelectChangeEvent<string>) =>
                  setSelectedReason(event.target.value)
                }
              >
                {DELETE_REASONS.map((option) => (
                  <MenuItem key={option} value={option}>
                    {option}
                  </MenuItem>
                ))}
              </Select>
            </Box>
            {selectedReason === 'Other reason' ? (
              <Box mt={2}>
                <InputLabel htmlFor="otherReason">Other Reason</InputLabel>
                <TextField
                  fullWidth
                  multiline
                  rows={2}
                  id="otherReason"
                  value={otherReason}
                  placeholder="Enter your reason"
                  onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                    setOtherReason(event.target.value)
                  }
                  sx={{
                    '& .MuiInputBase-input::placeholder': {
                      color: 'natural.500', // You can use theme colors or hex codes here
                      opacity: 1, // Optional: prevents opacity from reducing placeholder visibility
                    },
                  }}
                />
              </Box>
            ) : null}
          </Box>
        </DialogContent>
        <Divider />

        <DialogContent>
          <Box gap={1} display="flex" alignItems="center">
            <Button variant="contained" onClick={handleDelete}>
              Submit & Delete Attachment
            </Button>
            <Button color="inherit" variant="outlined" onClick={handleClose}>
              Cancel
            </Button>
          </Box>
        </DialogContent>
      </Dialog>

      {/* {showPopup && (
        <PopUp
          title="Are you sure you would like to delete?"
          description=""
          buttonText="Yes, Delete it!"
          onClick={handleDelete}
          isOpen={showPopup}
          type="DELETE"
          cancelText="No, Return"
          onCancel={() => {
            setShowPopup(false);
            setSelectedFile(null);
          }}
        />
      )} */}
    </>
  );
};

export default DocumentUploadSection;
