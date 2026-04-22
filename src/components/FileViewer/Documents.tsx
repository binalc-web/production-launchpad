/**
 * @module FileViewer
 * @fileoverview Document list component for displaying and managing file listings
 * This component provides the document list view with file metadata, status indicators,
 * and action options for use within the FileViewer component.
 */

import { type SyntheticEvent, type FC, type MouseEvent, useState } from 'react';

import {
  Avatar,
  Box,
  Card,
  CardContent,
  Divider,
  IconButton,
  Typography,
  Menu,
  MenuItem,
  Chip,
  Dialog,
  Button,
} from '@mui/material';

import {
  FilePdfIcon,
  FilePngIcon,
  FileJpgIcon,
  CalendarDotsIcon,
  FileTextIcon,
  ShieldCheckIcon,
  ShieldSlashIcon,
  EyeIcon,
  DownloadSimpleIcon,
  DotsThreeVerticalIcon,
  ClockCounterClockwiseIcon,
  XIcon,
  PlusIcon,
} from '@phosphor-icons/react';

import { GreyDot } from '@/pages/CaseManagement/components/view/PatientInfo';
import {
  getFileLog,
  getFilePreview,
  type AddCaseDataType,
} from '@/api/caseManagement/addCase';
import moment from 'moment';
import { useQuery } from '@tanstack/react-query';
import { colors } from '@/pages/MedicalChronology/timeline/data';
import AppCustomLoader from '../AppCustomLoader';
import { trackEvent } from '@/utils/mixPanel/mixpanel';
import { bytesToMB } from '@/utils/fileSize';
import AddDocumentsPopup from '@/pages/CaseManagement/components/AddDocumentsPopup';
import { useAuth } from '@/context/auth/useAuth';

/**
 * Props for the Documents component
 * @interface DocumentProps
 * @property {boolean} [hasParent] - Whether the component is being rendered inside a parent container
 * @property {boolean} [renderAsCard] - Whether to render the component as a standalone card
 * @property {function} [setOpenPreview] - Function to control preview panel visibility
 * @property {Array<AddCaseDataType['files'][0]>} files - Array of file objects to display
 * @property {AddCaseDataType['files'][0] | null} [selectedFile] - Currently selected file
 * @property {function} [setSelectedFile] - Function to update selected file
 * @property {function} [refetch] - Function to refresh file data
 */
type DocumentProps = {
  hasParent?: boolean;
  renderAsCard?: boolean;
  setOpenPreview?: (open: boolean) => void;
  files: AddCaseDataType['files'];
  selectedFile?: AddCaseDataType['files'][0] | null;
  setSelectedFile?: (file: AddCaseDataType['files'][0] | null) => void;
  refetch?: () => void;
  onDocumentClick?: (
    file: AddCaseDataType['files'][0],
    defaultEvents: () => void
  ) => void;
  footer?: React.ReactNode;
  caseData?: AddCaseDataType;
};

/**
 * Type for file log item
 * @interface FileLogItemType
 * @property {string} createdAt - Timestamp of the file log creation
 * @property {string} fingerprintVerifyResult - Result of fingerprint verification
 * @property {Object} tags - Tags associated with the file log
 * @property {string} tags.userId - User ID associated with the file log
 * @property {Object} user - User information associated with the file log
 * @property {string} user._id - User ID
 * @property {string} user.firstName - User's first name
 * @property {string} user.lastName - User's last name
 * @property {string} user.email - User's email address
 */
type FileLogItemType = {
  created_at: string;
  fingerprintVerifyResult: string;
  tags: {
    userId: string;
  };
  user: {
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
};

/**
 * Documents component that displays a list of files with metadata and actions
 * @param {DocumentProps} props - Component properties
 * @returns React component that renders a list of documents with actions and status indicators
 */
const Documents: FC<DocumentProps> = (props) => {
  const {
    files,
    caseData,
    setOpenPreview,
    hasParent,
    selectedFile,
    setSelectedFile,
    renderAsCard,
    onDocumentClick,
    footer,
    refetch,
  } = props;

  const { basicUserDetails } = useAuth();

  const [menuFile, setMenuFile] = useState<AddCaseDataType['files'][0] | null>(
    null
  );
  const [anchorElement, setAnchorElement] = useState<null | HTMLElement>(null);
  const [openFileLog, setOpenFileLog] = useState(false);
  const [fileLog, setFileLog] = useState<Array<FileLogItemType>>([]);
  const [openAddDocumentsDialog, setOpenAddDocumentsDialog] = useState(false);

  const open = Boolean(anchorElement);

  const { refetch: refetchPreview } = useQuery({
    enabled: false,
    queryKey: ['selectedFile'],
    queryFn: () => getFilePreview(menuFile?.id || ''),
    staleTime: 5 * 60 * 1000,
    retry: 0,
  });

  const {
    refetch: refetchFileLog,
    isRefetching: isRefetchingFileLog,
    isLoading: isLoadingFileLog,
    isError: isErrorFileLog,
    error: errorFileLog,
  } = useQuery({
    enabled: false,
    queryKey: ['selectedFileLog'],
    queryFn: () => getFileLog(menuFile?.id || ''),
    retry: 0,
    staleTime: 5 * 60 * 1000,
  });

  /**
   * Handles closing the file log dialog or panel
   * @returns {void}
   */
  const handleCloseFileLog = (): void => {
    setOpenFileLog(false);
  };

  /**
   * Handles click on the add task button
   * @function
   * @description Opens the task form dialog in create mode by resetting selected task
   * and setting the dialog open state to true
   */
  const handleAddDocumentsClick = (): void => {
    void trackEvent(`Add Documents Button clicked`, {});
    setOpenAddDocumentsDialog(true);
  };

  /**
   * Handles the click event on the file action menu button
   * @param {MouseEvent<HTMLButtonElement>} event - Click event object
   * @param {AddCaseDataType['files'][0]} file - File object associated with the clicked menu
   * @returns {void}
   */
  const handleClick = (
    event: MouseEvent<HTMLButtonElement>,
    file: AddCaseDataType['files'][0]
  ): void => {
    event.preventDefault();
    event.stopPropagation();
    setAnchorElement(event.currentTarget);
    setMenuFile(file);
  };
  /**
   * Handles closing the file action menu
   * @param {SyntheticEvent} event - Click event object
   * @returns {void}
   */
  const handleClose = (event: SyntheticEvent): void => {
    event.preventDefault();
    event.stopPropagation();
    setAnchorElement(null);
    setMenuFile(null);
  };

  /**
   * Handles selecting a file from the document list
   * @param {AddCaseDataType['files'][0]} file - File to be selected
   * @returns {void}
   */
  const handleFileClick = (file: AddCaseDataType['files'][0]): void => {
    if (onDocumentClick) {
      onDocumentClick(file, () => {
        if (file && setSelectedFile) {
          setSelectedFile(file);
          setMenuFile(file);

          if (setOpenPreview) {
            setOpenPreview(true);
          }
        }
      });
    } else {
      if (file && setSelectedFile) {
        setSelectedFile(file);
        setMenuFile(file);

        if (setOpenPreview) {
          setOpenPreview(true);
        }
      }
    }
  };

  /**
   * Handles opening a file in the preview panel
   * @param {SyntheticEvent} event - Click event object
   * @returns {void}
   */
  const handleViewFile = (event: SyntheticEvent): void => {
    event.preventDefault();
    event.stopPropagation();
    if (menuFile) {
      void trackEvent(`Document View button clicked`);
      handleFileClick(menuFile);
    }
  };

  const handleViewFileLog = (event: SyntheticEvent): void => {
    event.preventDefault();
    event.stopPropagation();
    void trackEvent(`Document View logs button clicked`);
    setOpenFileLog(true);
    setAnchorElement(null);
    if (menuFile) {
      void refetchFileLog().then((response) => {
        if (response.data) {
          setFileLog(response.data.data);
        }
      });
    }
  };

  /**
   * Handles downloading a document
   * @param {MouseEvent<HTMLButtonElement>} event - Click event object
   * @param {AddCaseDataType['files'][0]} file - File to be downloaded
   * @returns {void}
   */
  const handleDocumentDownload = (
    event: MouseEvent<HTMLButtonElement>,
    file: AddCaseDataType['files'][0]
  ): void => {
    event.preventDefault();
    event.stopPropagation();
    void new Promise<void>((resolve) => {
      setMenuFile(file);
      resolve();
    }).then(() => {
      void refetchPreview().then((response) => {
        if (response.status === 'success') {
          void trackEvent(`Document downloaded`);
          window.open(response.data.data, '_blank');
        }
      });
    });
  };

  return (
    <>
      <Card
        sx={{
          ...(hasParent
            ? {
                border: 0,
                height: '100%',
                borderRadius: 0,
                minHeight: '90vh',
              }
            : {}),
        }}
      >
        {hasParent ? null : (
          <>
            <CardContent>
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <Typography variant="h6">All Documents</Typography>
                {basicUserDetails?.role !== 'patient' && (<Button
                  color="secondary"
                  variant="contained"
                  startIcon={<PlusIcon size={16} />}
                  onClick={handleAddDocumentsClick}
                >
                  Add Document
                </Button>)}
              </Box>
            </CardContent>
            <Divider />
          </>
        )}

        <Box
          sx={{
            py: 3,
            px: 1,
            display: 'flex',
            overflowY: 'auto',
            flexDirection: 'column',
            maxHeight: renderAsCard ? 600 : 400,
          }}
        >
          {files?.length ? (
            files.map((file: AddCaseDataType['files'][0], index: number) => {
              return (
                <Box
                  key={file.fileName}
                  onClick={() => handleFileClick(file)}
                  sx={{
                    p: 2,
                    gap: 1,
                    display: 'flex',
                    flexWrap: 'wrap',
                    cursor: 'pointer',
                    alignItems: 'center',
                    borderRadius: hasParent ? 0 : 2,
                    justifyContent: 'space-between',
                    bgcolor:
                      hasParent &&
                      (selectedFile?.id === file.id || menuFile?.id === file.id)
                        ? 'neutral.50'
                        : 'transparent',
                    '&:hover': {
                      bgcolor: 'neutral.50',
                      '& .MuiAvatar-root': {
                        bgcolor: 'common.white',
                      },
                    },
                    ...(hasParent && index > 0
                      ? { borderTop: '1px solid', borderColor: 'divider' }
                      : {}),
                  }}
                >
                  <Box>
                    <Box
                      sx={{
                        gap: 1,
                        display: 'flex',
                        alignItems: 'center',
                      }}
                    >
                      {hasParent ? null : (
                        <Avatar
                          sx={{
                            width: 56,
                            height: 56,
                            bgcolor: 'neutral.50',
                            color: 'text.primary',
                          }}
                        >
                          {file.fileName?.includes('pdf') ? (
                            <FilePdfIcon size={24} />
                          ) : file.fileName?.includes('png') ? (
                            <FilePngIcon size={24} />
                          ) : (
                            <FileJpgIcon size={24} />
                          )}
                        </Avatar>
                      )}
                      <Box>
                        <Box
                          sx={{
                            gap: 1,
                            display: 'flex',
                            alignItems: 'center',
                          }}
                        >
                          <Typography
                            fontWeight={500}
                            maxWidth={
                              renderAsCard ? 400 : hasParent ? 500 : 260
                            }
                            noWrap
                            title={file.fileName}
                          >
                            {file.fileName}
                          </Typography>
                          {file.chip ? (
                            <Chip
                              label={file.chip}
                              sx={{
                                bgcolor: colors[file.key]?.bgcolor,
                                color: colors[file.key]?.color,
                              }}
                            />
                          ) : null}
                        </Box>
                        <Box>
                          {renderAsCard ? (
                            <Typography variant="body2" color="text.secondary">
                              {file?.location || ''}
                            </Typography>
                          ) : (
                            <Box
                              sx={{
                                mt: 1.25,
                                display: 'flex',
                                alignItems: 'center',
                              }}
                            >
                              <CalendarDotsIcon />
                              <Typography
                                ml={1}
                                variant="body2"
                                color="text.secondary"
                              >
                                {file?.createdAt
                                  ? moment(file?.createdAt).format('MM-DD-YYYY')
                                  : 'date'}
                              </Typography>
                              <Box sx={{ mx: 1.5 }}>{GreyDot}</Box>
                              <FileTextIcon />
                              <Typography
                                ml={0.5}
                                variant="body2"
                                color="text.secondary"
                              >
                                {file?.fileSize
                                  ? bytesToMB(Number(file?.fileSize))
                                  : '0 KB'}
                              </Typography>
                              {hasParent ? null : (
                                <>
                                  {' '}
                                  <Box sx={{ mx: 1.5 }}>{GreyDot}</Box>
                                  <Box
                                    sx={{
                                      '& svg': {
                                        mr: 0.5,
                                        top: 2,
                                        position: 'relative',
                                      },
                                    }}
                                  >
                                    {!file.isQudefenseVerified ? (
                                      <Typography
                                        fontSize={14}
                                        color="error.main"
                                      >
                                        <ShieldSlashIcon />
                                        Unprotected
                                      </Typography>
                                    ) : (
                                      <Typography
                                        fontSize={14}
                                        color="success.dark"
                                      >
                                        <ShieldCheckIcon />
                                        Protected
                                      </Typography>
                                    )}
                                  </Box>
                                </>
                              )}
                            </Box>
                          )}
                        </Box>
                      </Box>
                    </Box>
                  </Box>
                  {hasParent ? null : (
                    <Box
                      sx={{
                        gap: 0.5,
                        display: 'flex',
                        alignItems: 'center',
                      }}
                    >
                      <IconButton
                        variant="soft"
                        sx={{ p: 0.5 }}
                        onClick={(event) => {
                          void trackEvent(`Document download button clicked`, {
                            fileName: file.fileName,
                          });
                          handleDocumentDownload(event, file);
                        }}
                      >
                        <DownloadSimpleIcon size={18} />
                      </IconButton>
                      <IconButton
                        variant="soft"
                        sx={{ p: 0.5 }}
                        onClick={(event) => handleClick(event, file)}
                      >
                        <DotsThreeVerticalIcon />
                      </IconButton>
                      <Menu
                        open={open}
                        anchorEl={anchorElement}
                        onClose={handleClose}
                        anchorOrigin={{
                          vertical: 'bottom',
                          horizontal: 'right',
                        }}
                        transformOrigin={{
                          vertical: 'top',
                          horizontal: 'right',
                        }}
                        slotProps={{
                          paper: {
                            sx: {
                              boxShadow: 'none',
                              border: '1px solid',
                              borderColor: 'neutral.200',
                            },
                          },
                        }}
                      >
                        <MenuItem onClick={handleViewFile}>
                          <EyeIcon size={18} />
                          <Typography ml={1}>View</Typography>
                        </MenuItem>

                        <MenuItem onClick={handleViewFileLog}>
                          <ClockCounterClockwiseIcon size={18} />
                          <Typography ml={1}>View File Log</Typography>
                        </MenuItem>
                      </Menu>
                    </Box>
                  )}
                </Box>
              );
            })
          ) : (
            <Typography variant="body2" color="text.secondary">
              No documents available
            </Typography>
          )}
        </Box>
        {footer ? footer : null}
      </Card>

      <Dialog
        fullWidth
        open={openFileLog}
        onClose={handleCloseFileLog}
        slotProps={{
          paper: {
            sx: {
              borderRadius: 2,
            },
          },
        }}
      >
        <Box
          sx={{
            py: 2,
            px: 3,
            display: 'flex',
            borderBottom: '1px solid',
            alignItems: 'center',
            borderColor: 'divider',
            bgcolor: 'common.white',
            justifyContent: 'space-between',
          }}
        >
          <Typography variant="h4">File Log</Typography>
          <IconButton variant="soft" onClick={handleCloseFileLog}>
            <XIcon size={18} />
          </IconButton>
        </Box>
        {isRefetchingFileLog || isLoadingFileLog ? (
          <AppCustomLoader height={200} />
        ) : isErrorFileLog ? (
          <Typography variant="body2" color="error.main" textAlign="center">
            {errorFileLog?.message || 'Error fetching file log'}
          </Typography>
        ) : (
          <Box
            sx={{
              px: 3,
            }}
          >
            {fileLog && fileLog.length ? (
              <Box
                sx={{
                  display: 'flex',
                  flexDirection: 'column',
                }}
              >
                {fileLog.map((fileLogItem, index) => {
                  const { created_at: createdAt, user } = fileLogItem;
                  return (
                    <Box
                      key={createdAt}
                      sx={{
                        py: 2,
                        ...(index > 0
                          ? {
                              borderTop: '1px solid',
                              borderColor: 'divider',
                            }
                          : {}),
                      }}
                    >
                      <Typography variant="h5">
                        {moment(createdAt).format('MM-DD-YYYY, h:mm A')}
                      </Typography>
                      {user ? (
                        <Typography sx={{ mt: 1, color: 'neutral.500' }}>
                          {user?.firstName} {user?.lastName}
                        </Typography>
                      ) : null}
                    </Box>
                  );
                })}
              </Box>
            ) : (
              <Typography
                variant="h5"
                sx={{
                  py: 2,
                }}
              >
                No file log available
              </Typography>
            )}
          </Box>
        )}
      </Dialog>

      <AddDocumentsPopup
        open={openAddDocumentsDialog}
        setOpen={setOpenAddDocumentsDialog}
        oldFiles={files}
        caseData={caseData!}
        refetch={refetch as () => void}
      />
    </>
  );
};

export default Documents;
