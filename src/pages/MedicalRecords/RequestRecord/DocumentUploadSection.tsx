import { useState, type FC } from 'react';
import {
  Box,
  Typography,
  CardContent,
  Avatar,
  Tooltip,
  Dialog,
  DialogContent,
  DialogTitle,
  DialogActions,
  Button,
  Slide,
  FormHelperText,
  TextField,
  Select,
  MenuItem,
  type SelectChangeEvent,
} from '@mui/material';
import {
  InfoIcon,
  UploadSimpleIcon,
  TrashIcon,
  PaperclipIcon,
} from '@phosphor-icons/react';
import ToastAlert from '@/components/ToastAlert';
import { FILE_TYPE_OPTIONS } from '@/pages/CaseManagement/constants/options';
import { getFileType } from '@/utils/fileType';

interface FileWithSource extends File {
  fromServer?: boolean;
  serverId?: string;
  documentProcessStages: string;
}

type DocumentUploadSectionProps = {
  files: Array<FileWithSource>;
  getRootProps: <T extends Element>(
    props?: React.HTMLAttributes<T>
  ) => React.HTMLAttributes<T>;
  getInputProps: () => React.InputHTMLAttributes<HTMLInputElement>;
  setFiles: (files: Array<File>) => void;
  error?: boolean;
  errorMessage?: string;
};

const DocumentUploadSection: FC<DocumentUploadSectionProps> = ({
  files,
  getRootProps,
  getInputProps,
  setFiles,
  error = false,
  errorMessage,
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<boolean>(false);
  const [showAlert, setShowAlert] = useState<boolean>(false);
  const [alertMessage, setAlertMessage] = useState<string>('');
  const [alertType, setAlertType] = useState<'error' | 'success'>('error');

  const handleFileDelete = (file: File): void => {
    setSelectedFile(file);
    setShowDeleteConfirm(true);
  };

  const confirmDelete = (): void => {
    const handleRemoveFile = (): void => {
      setFiles(files.filter((f: File) => f.name !== selectedFile?.name));
      setShowDeleteConfirm(false);
      setSelectedFile(null);
    };
    handleRemoveFile();
    setAlertMessage('Document removed successfully');
    setShowAlert(true);
    setTimeout(() => {
      setShowAlert(false);
    }, 3000);
  };

  const cancelDelete = (): void => {
    setShowDeleteConfirm(false);
    setSelectedFile(null);
  };

  // Override the parent component's onDrop to add validation
  const validateAndProcessFiles = (acceptedFiles: Array<File>): void => {
    const isValid = acceptedFiles.every((file: File) => {
      // File size validation (maximum 50MB)
      const isValidSize = file.size <= 50 * 1024 * 1024;
      // File type validation
      const validTypes = [
        'application/pdf',
        'image/jpeg',
        'image/jpg',
        'image/png',
      ];
      const isValidType = validTypes.includes(file.type);

      if (!isValidSize) {
        setAlertType('error');
        setAlertMessage(
          `File ${file.name} exceeds the maximum size limit of 50MB.`
        );
        setShowAlert(true);
        return false;
      }

      if (!isValidType) {
        setAlertType('error');
        setAlertMessage(
          `File ${file.name} is not a supported file type. Please upload a PDF, JPEG, or PNG file.`
        );
        setShowAlert(true);
        return false;
      }

      return true;
    });

    if (isValid) {
      setFiles([...files, ...acceptedFiles]);
      setAlertType('success');
      setAlertMessage('Files uploaded successfully.');
      setShowAlert(true);
    }

    // Hide alert after 3 seconds
    setTimeout(() => {
      setShowAlert(false);
    }, 3000);
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
          <Typography variant="h6">Upload External Documents</Typography>
          <Tooltip
            arrow
            placement="right"
            title="Upload supporting documents for your medical record request"
          >
            <InfoIcon size={18} />
          </Tooltip>
        </Box>
        <Box
          {...getRootProps({
            // onDrop: (event: React.DragEvent<HTMLElement>): void => {
            //   event.preventDefault();
            //   const droppedFiles = event.dataTransfer?.files;
            //   if (droppedFiles) {
            //     validateAndProcessFiles(Array.from(droppedFiles));
            //   }
            // },
          })}
          sx={{
            p: 2,
            height: 180,
            maxWidth: 725,
            display: 'flex',
            borderRadius: 1,
            border: '1px dashed',
            alignItems: 'center',
            justifyContent: 'center',
            borderColor: error ? 'error.main' : 'neutral.300',
            bgcolor: error ? 'error.lighter' : 'background.paper',
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
                bgcolor: error ? 'error.lightest' : '#F1F5FD',
                '& svg': {
                  color: error ? 'error.dark' : 'info.dark',
                },
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
              sx={{ maxWidth: '80%', listStyle: 'none', p: 0, m: 0 }}
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
                            //setShowPopup(true);
                            handleFileDelete(file);
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
                          {FILE_TYPE_OPTIONS.map((option) => (
                            <MenuItem key={option.value} value={option.value}>
                              {option.label}
                            </MenuItem>
                          ))}
                        </Select>
                      )}
                    </Box>
                  </Box>
                </Slide>
              ))}
            </Box>
          </Box>
        )}
        {error && (
          <FormHelperText error sx={{ mt: 1, fontWeight: 600 }}>
            {errorMessage || 'At least one document is required'}
          </FormHelperText>
        )}
      </CardContent>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={showDeleteConfirm}
        onClose={cancelDelete}
        aria-labelledby="delete-dialog-title"
      >
        <DialogTitle id="delete-dialog-title">Remove Document</DialogTitle>
        <DialogContent>
          <Typography variant="body1">
            Are you sure you want to remove {selectedFile?.name}?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={cancelDelete} color="inherit">
            Cancel
          </Button>
          <Button onClick={confirmDelete} color="error" autoFocus>
            Remove
          </Button>
        </DialogActions>
      </Dialog>

      {/* Alert Toast */}
      {showAlert && (
        <Slide direction="up" in={showAlert} mountOnEnter unmountOnExit>
          <Box
            sx={{
              position: 'fixed',
              bottom: 24,
              right: 24,
              zIndex: 2000,
            }}
          >
            <ToastAlert
              severity={alertType}
              message={alertMessage}
              showAlert={showAlert}
              icon={null}
              onClose={() => setShowAlert(false)}
            />
          </Box>
        </Slide>
      )}
    </>
  );
};

export default DocumentUploadSection;
