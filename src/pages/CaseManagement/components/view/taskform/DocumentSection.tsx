import type { FC } from 'react';
import {
  Avatar,
  Box,
  Typography,
  InputLabel,
  Tooltip,
  IconButton,
} from '@mui/material';
import {
  UploadSimpleIcon,
  PaperclipIcon,
  TrashIcon,
  InfoIcon,
} from '@phosphor-icons/react';
import type { DocumentSectionProps } from './types';

/**
 * DocumentSection component handles file uploads for task attachments
 * @component
 * @description Renders a file upload section with the following features:
 * - Drag-and-drop file upload functionality using react-dropzone
 * - Visual display of all uploaded files with delete capabilities
 * - Error state handling for required file uploads
 * - File preview with metadata display
 *
 * This component is part of the TaskForm and allows users to attach documents
 * to tasks for reference and documentation purposes.
 *
 * @param {object} props - Component props
 * @param {Array<File>} props.files - Array of currently uploaded files
 * @param {Function} props.getRootProps - Props getter for the root dropzone element
 * @param {Function} props.getInputProps - Props getter for the file input element
 * @param {Function} props.setSelectedFile - Function to set the currently selected file for operations
 * @param {Function} props.setShowFileDeletePopup - Function to control visibility of the delete confirmation dialog
 * @param {boolean} props.fileUploadError - Whether there is an error with the file upload (e.g., missing required files)
 */
const DocumentSection: FC<DocumentSectionProps> = ({
  files,
  getRootProps,
  getInputProps,
  setSelectedFile,
  setShowFileDeletePopup,
  fileUploadError,
  isFromDetailPage,
}) => {

  return (
    <Box
      sx={{
        p: isFromDetailPage ? 0 : 3,
        pb: 0,
        borderTop: !isFromDetailPage ? '1px solid' : 'none',
        borderColor: !isFromDetailPage ? 'divider' : 'none',
      }}
    >
      <Box display="flex" flexDirection="row" gap={0.5}>
        <InputLabel htmlFor="attachments">
          {isFromDetailPage ? 'Upload Documents' : 'Attachments'}
        </InputLabel>
        {!isFromDetailPage && (
          <Tooltip
            title="Supports .PDF, .JPEG/.JPG & .PNG files up to 50 MB size."
            arrow
            placement="right"
          >
            <Box
              sx={{
                cursor: 'pointer',
              }}
            >
              <InfoIcon size={18} color="#677284" />
            </Box>
          </Tooltip>
        )}
      </Box>
      <Box sx={{ pb: 2 }}>
        <Box
          {...getRootProps()}
          sx={{
            mb: 2,
            mt: 0.5,
            width: isFromDetailPage ? 555 : 140,
            height: 140,
            bgcolor: 'white',
            borderRadius: 1,
            cursor: 'pointer',
            textAlign: 'center',
            border: '1px dashed',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderColor: fileUploadError ? 'error.dark' : 'divider',
          }}
        >
          <Box component="input" {...getInputProps()} id="attachments" />
          <Box
            sx={{
              gap: 1,
              display: 'flex',
              alignItems: 'center',
              flexDirection: 'column',
              justifyContent: 'center',
            }}
          >
            <Avatar
              sx={{
                width: 48,
                height: 48,
                bgcolor: fileUploadError ? 'error.lightest' : '#F1F5FD',
                '& svg': {
                  color: fileUploadError ? 'error.dark' : 'info.dark',
                },
              }}
            >
              <UploadSimpleIcon />
            </Avatar>
            <Typography fontSize={12} color="text.secondary">
              {isFromDetailPage
                ? 'Drag & Drop or Click to upload'
                : 'Upload File'}
            </Typography>
            {isFromDetailPage && (
              <Typography fontSize={12} color="textSecondary">
                Supports .PDF, .JPEG/.JPG & .PNG files up to 50 MB size.
              </Typography>
            )}
          </Box>
        </Box>
        {fileUploadError && (
          <Typography
            variant="caption"
            color="error.main"
            fontWeight={600}
            sx={{ mt: -1, display: 'block' }}
          >
            Please Upload Files To Proceed
          </Typography>
        )}

        {files.length > 0 && (
          <Box sx={{ mt: 1.5 }}>
            {/* <Typography variant="subtitle2" sx={{ mb: 1 }}>
              Uploaded Files ({files.length})
            </Typography> */}
            <Box>
              {files.map((file, index) => (
                <Box
                  key={index}
                  component="li"
                  sx={{
                    gap: 1,
                    padding: 0.75,
                    display: 'flex',
                    borderRadius: 0.75,
                    alignItems: 'center',
                    width: isFromDetailPage ? 555 : '100%',
                    mt: index > 0 ? 1 : 0,
                    bgcolor: isFromDetailPage ? 'white' : 'neutral.50',
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
                  <Box>
                    {/* <Box
                      component={TrashIcon}
                      size={16}
                      
                      sx={{
                        cursor: 'pointer',
                        color: 'error.dark',
                      }}
                      onClick={() => {
                        setSelectedFile(file);
                        setShowFileDeletePopup(true);
                      }}
                    /> */}
                    <Tooltip
                      placement="right"
                      title={
                        isFromDetailPage && !file.path
                          ? 'Document once submitted cannot be deleted.'
                          : ''
                      }
                    >
                      <Box>
                        <IconButton
                          onClick={() => {
                            setSelectedFile(file);
                            setShowFileDeletePopup(true);
                          }}
                          variant="soft"
                          disabled={isFromDetailPage && !file.path}
                          sx={{
                            cursor: 'pointer',
                            color: 'error.dark',
                            '&:hover': {
                              backgroundColor: 'transparent', // optional (removes default hover bg)
                              color: 'error.dark', // keeps same color
                            },

                            // 🔹 Disabled state styling
                            '&.Mui-disabled': {
                              color: '#F9A8AB',
                              cursor: 'pointer',
                            },
                          }}
                        >
                          <TrashIcon size={16} />
                        </IconButton>
                      </Box>
                    </Tooltip>
                  </Box>
                </Box>
              ))}
            </Box>
          </Box>
        )}
      </Box>
    </Box>
  );
};

export default DocumentSection;
