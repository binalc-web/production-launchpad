/**
 * @module FileViewer
 * @fileoverview Provides a flexible file viewing component that can display various file types
 * including PDFs and images. Supports file navigation, zooming, and document management actions.
 */

import {
  type ReactNode,
  type FC,
  useEffect,
  useState,
  useCallback,
  type SyntheticEvent,
} from 'react';
import { useQuery } from '@tanstack/react-query';

import {
  Grid,
  Dialog,
  Box,
  Button,
  Typography,
  IconButton,
  TextField,
  Card,
  Snackbar,
  Alert,
} from '@mui/material';
import {
  ArrowLeftIcon,
  DownloadSimpleIcon,
  CaretLeftIcon,
  CaretRightIcon,
  MagnifyingGlassPlusIcon,
  MagnifyingGlassMinusIcon,
  LinkSimpleIcon,
} from '@phosphor-icons/react';

import Notes, { type NoteContent } from './Notes';
import Documents from './Documents';
import {
  getFilePreview,
  type AddCaseDataType,
} from '@/api/caseManagement/addCase';

import AppCustomLoader from '../AppCustomLoader';

import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/esm/Page/AnnotationLayer.css';
import 'react-pdf/dist/esm/Page/TextLayer.css';

import samplePdf from '@/assets/sample-report.pdf';
import moment from 'moment';
import { trackEvent } from '@/utils/mixPanel/mixpanel';
import axios from 'axios';

// Configure PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.mjs`;

/**
 * Props for the FileViewer component
 * @interface FileViewerProps
 * @property {boolean} open - Whether the file viewer is open/visible
 * @property {boolean} [showDummyFile] - Whether to show a sample PDF for demonstration
 * @property {boolean} [renderAsCard] - Whether to render as a card rather than dialog
 * @property {ReactNode} [customHeader] - Optional custom header component
 * @property {boolean} [hideRefetchAndLog] - Whether to hide refetch and log buttons
 * @property {function} setOpen - Function to control the viewer's open state
 * @property {Array<AddCaseDataType['files']>} files - Array of file objects to display
 * @property {AddCaseDataType['files'] | null} selectedFile - Currently selected file
 * @property {function} setSelectedFile - Function to update selected file
 */
type FileViewerProps = {
  footer?: React.ReactNode;
  notes?: Array<NoteContent>;
  open: boolean;
  showDummyFile?: boolean;
  renderAsCard?: boolean;
  hideDocuments?: boolean;
  customHeader?: ReactNode;
  customFileViewer?: ReactNode;
  hideRefetchAndLog?: boolean;
  setOpen: (open: boolean) => void;
  customDocuments?: React.ReactNode;
  files: AddCaseDataType['files'];
  selectedFile: AddCaseDataType['files'][0] | null;
  setSelectedFile: (file: AddCaseDataType['files'][0] | null) => void;
  meta?: {
    recordId?: string;
    fileId?: string;
    error?: string;
    isError?: boolean;
    isLoading?: boolean;
  };
  onDocumentClick?: (
    file: AddCaseDataType['files'][0],
    defaultEvents: () => void
  ) => void;
};

/**
 * FileViewer component that displays documents with preview and management capabilities
 * @param {FileViewerProps} props - Component properties
 * @returns React component that renders a file viewer with document list and preview panel
 */
const FileViewer: FC<FileViewerProps> = (props) => {
  const {
    files,
    open,
    meta,
    renderAsCard,
    notes,
    setOpen,
    customHeader,
    selectedFile,
    setSelectedFile,
    showDummyFile,
    hideDocuments,
    onDocumentClick,
    customDocuments,
    footer,
    customFileViewer,
  } = props;

  // State for managing the share link toast notification
  const [shareToast, setShareToast] = useState<boolean>(false);
  // State for storing rendered markdown content
  const [markdownContent, setMarkdownContent] = useState<string | null>(null);
  // State for tracking markdown loading state
  const [loadingMarkdown, setLoadingMarkdown] = useState<boolean>(false);

  /**
   * Handles closing the file viewer dialog or panel
   * @returns {void}
   */
  const handleClose = (): void => {
    setOpen(false);
    setSelectedFile(null);
  };

  const {
    isLoading,
    isError,
    data,
    error: fileError,
    isRefetching,
    refetch,
  } = useQuery({
    enabled: Boolean(selectedFile),
    queryKey: ['selectedFile'],
    queryFn: () => getFilePreview(selectedFile?.id || ''),
    retry: 0,
    staleTime: 5 * 60 * 1000,
  });

  useEffect(() => {
    if (selectedFile) {
      void refetch();
    }
  }, [selectedFile, refetch]);

  useEffect(() => {
    if (open && selectedFile) {
      void trackEvent(`Document viewed`, {
        fileName: selectedFile.fileName,
      });
    }
  }, [open, selectedFile]);

  const [numberPages, setNumberPages] = useState<number>(0);
  const [pageNumber, setPageNumber] = useState<number>(1);
  const [scale, setScale] = useState<number>(1.0);

  /**
   * Callback executed when a PDF document loads successfully
   * @param {Object} params - Parameters from the PDF load event
   * @param {number} params.numPages - Total number of pages in the loaded PDF
   * @returns {void}
   */
  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }): void => {
    setNumberPages(numPages);
    setPageNumber(1);
  };

  /**
   * Changes the currently displayed PDF page by a specified offset
   * @param {number} offset - The number of pages to move (positive or negative)
   * @returns {void}
   */
  const changePage = (offset: number): void => {
    setPageNumber((previousPageNumber) => {
      const newPageNumber = previousPageNumber + offset;
      return Math.max(1, Math.min(newPageNumber, numberPages));
    });
  };

  /**
   * Navigates to the previous page in the PDF document
   * @returns {void}
   */
  const previousPage = (): void => {
    changePage(-1);
  };

  /**
   * Navigates to the next page in the PDF document
   * @returns {void}
   */
  const nextPage = (): void => {
    changePage(1);
  };

  /**
   * Increases the zoom level of the PDF document
   * @returns {void}
   */
  const zoomIn = (): void => {
    setScale((previousScale) => Math.min(previousScale + 0.2, 3.0));
  };

  /**
   * Decreases the zoom level of the PDF document
   * @returns {void}
   */
  const zoomOut = (): void => {
    setScale((previousScale) => Math.max(previousScale - 0.2, 0.5));
  };

  const renderMarkdown = useCallback(async (): Promise<void> => {
    try {
      setLoadingMarkdown(true);
      const fileContent = await axios.get(data?.data);

      setMarkdownContent(fileContent.data);
    } catch (error) {
      console.error('Error fetching markdown content:', error);
      setMarkdownContent(null);
    } finally {
      setLoadingMarkdown(false);
    }
  }, [data?.data, selectedFile]);

  // Effect to load markdown content when a markdown file is selected
  useEffect(() => {
    if (
      (selectedFile?.mimeType === 'text/markdown' && data?.data) ||
      (selectedFile?.mimeType === 'text/xml' && data?.data)
    ) {
      void renderMarkdown();
    }
  }, [selectedFile, data?.data, renderMarkdown]);

  /**
   * Renders the appropriate file preview based on file type
   * @returns {null|ReactNode} The rendered file preview component or null if no file is selected
   */
  const renderFile = (): null | ReactNode => {
    if (showDummyFile) {
      return (
        <Box
          sx={{
            mt: notes ? -0 : -14,
            width: '100%',
            height: '100%',
            display: 'flex',
            overflow: 'auto',
            alignItems: 'center',
            flexDirection: 'column',
            maxHeight: notes ? 'calc(100vh - 5rem)' : 'calc(100vh - 14rem)',
          }}
        >
          <Document file={samplePdf} onLoadSuccess={onDocumentLoadSuccess}>
            <Page pageNumber={pageNumber} scale={scale} />
          </Document>

          <Box
            sx={{
              p: 1,
              zIndex: 2,
              bottom: 50,
              width: 450,
              left: notes ? '22%' : '60%',
              display: 'flex',
              position: 'fixed',
              borderRadius: 1.25,
              flexDirection: 'row',
              alignItems: 'center',
              bgcolor: 'neutral.900',
              justifyContent: 'space-between',
              '& .MuiIconButton-root': {
                color: 'common.white',
                '&.Mui-disabled': {
                  color: 'neutral.500',
                },
                '&:hover, &:focus': {
                  bgcolor: 'neutral.600',
                  color: 'common.white',
                },
              },
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <IconButton variant="soft" onClick={zoomOut} size="small">
                <MagnifyingGlassMinusIcon size={16} />
              </IconButton>

              <IconButton variant="soft" onClick={zoomIn} size="small">
                <MagnifyingGlassPlusIcon size={16} />
              </IconButton>
            </Box>

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <IconButton
                variant="soft"
                onClick={previousPage}
                disabled={pageNumber <= 1}
                size="small"
              >
                <CaretLeftIcon size={16} />
              </IconButton>
              <TextField
                size="small"
                type="number"
                value={pageNumber}
                onChange={(event: SyntheticEvent) =>
                  setPageNumber(
                    Number((event.target as HTMLInputElement).value)
                  )
                }
                sx={{
                  width: 55,
                  '& .MuiOutlinedInput-root .MuiInputBase-input': {
                    py: 1,
                    color: 'common.white',
                    '&::-webkit-outer-spin-button, &::-webkit-inner-spin-button':
                      {
                        '-webkit-appearance': 'none',
                        margin: 0,
                      },
                    '&[type=number]': {
                      '-moz-appearance': 'textfield',
                    },
                  },
                  '& fieldset': {
                    borderColor: 'common.white',
                  },
                }}
              />
              <Typography
                variant="caption"
                sx={{ color: 'common.white' }}
                noWrap
              >
                / {numberPages} pages
              </Typography>
              <IconButton
                variant="soft"
                onClick={nextPage}
                disabled={pageNumber >= numberPages}
                size="small"
              >
                <CaretRightIcon size={16} />
              </IconButton>
            </Box>
          </Box>
        </Box>
      );
    }

    if (!selectedFile || !data?.data) return null;

    const mimeType = selectedFile?.mimeType || '';

    if (mimeType === 'text/markdown' || mimeType === 'text/xml') {
      return markdownContent ? (
        <Box
          sx={{
            p: 4,
            mx: 2,
            width: '100%',
            height: '100%',
            borderRadius: 2,
            overflowY: 'auto',
            bgcolor: 'common.white',
            '& table': {
              p: 1,
              minWidth: notes ? 1500 : 1000,
              borderRadius: 1,
              border: '1px solid',
              borderColor: 'divider',
              '& thead th': {
                pb: 1,
                textAlign: 'left',
                borderBottom: '1px solid',
                borderColor: 'divider',
              },
              '& tbody td': {
                py: 1,
              },
            },
          }}
        >
          <Box sx={{ overflowY: 'auto', maxHeight: 'calc(100vh - 16rem)' }}>
            <Markdown remarkPlugins={[remarkGfm]}>
              {`#\n${markdownContent}`}
            </Markdown>
          </Box>
        </Box>
      ) : (
        <Typography variant="body1">No markdown content available</Typography>
      );
    }

    if (mimeType === 'application/pdf') {
      return (
        <Box
          sx={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            flexDirection: 'column',
            overflow: 'auto',
            mt: renderAsCard ? -14 : 0,
            maxHeight: renderAsCard ? 'calc(100vh - 14rem)' : 'auto',
          }}
        >
          <Document file={data.data} onLoadSuccess={onDocumentLoadSuccess}>
            <Page pageNumber={pageNumber} scale={scale} />
          </Document>

          <Box
            sx={{
              p: 1,
              zIndex: 2,
              bottom: 50,
              width: 450,
              left:
                hideDocuments && notes
                  ? '23%'
                  : hideDocuments
                    ? '35%'
                    : notes
                      ? '22%'
                      : renderAsCard
                        ? '60%'
                        : '50%',
              display: 'flex',
              position: 'fixed',
              borderRadius: 1.25,
              flexDirection: 'row',
              alignItems: 'center',
              bgcolor: 'neutral.900',

              justifyContent: 'space-between',
              '& .MuiIconButton-root': {
                color: 'common.white',
                '&.Mui-disabled': {
                  color: 'neutral.500',
                },
                '&:hover, &:focus': {
                  bgcolor: 'neutral.600',
                  color: 'common.white',
                },
              },
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <IconButton variant="soft" onClick={zoomOut} size="small">
                <MagnifyingGlassMinusIcon size={16} />
              </IconButton>

              <IconButton variant="soft" onClick={zoomIn} size="small">
                <MagnifyingGlassPlusIcon size={16} />
              </IconButton>
            </Box>

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <IconButton
                variant="soft"
                onClick={previousPage}
                disabled={pageNumber <= 1}
                size="small"
              >
                <CaretLeftIcon size={16} />
              </IconButton>
              <TextField
                size="small"
                type="number"
                value={pageNumber}
                onChange={(event: SyntheticEvent) =>
                  setPageNumber(
                    Number((event.target as HTMLInputElement).value)
                  )
                }
                sx={{
                  width: 55,
                  '& .MuiOutlinedInput-root .MuiInputBase-input': {
                    py: 1,
                    color: 'common.white',
                    '&::-webkit-outer-spin-button, &::-webkit-inner-spin-button':
                      {
                        '-webkit-appearance': 'none',
                        margin: 0,
                      },
                    '&[type=number]': {
                      '-moz-appearance': 'textfield',
                    },
                  },
                  '& fieldset': {
                    borderColor: 'common.white',
                  },
                }}
              />
              <Typography
                variant="caption"
                sx={{ color: 'common.white' }}
                noWrap
              >
                / {numberPages} pages
              </Typography>
              <IconButton
                variant="soft"
                onClick={nextPage}
                disabled={pageNumber >= numberPages}
                size="small"
              >
                <CaretRightIcon size={16} />
              </IconButton>
            </Box>
          </Box>
        </Box>
      );
    }

    if (mimeType.startsWith('image/')) {
      return (
        <Box
          component="img"
          src={data.data}
          alt={selectedFile?.fileName || selectedFile?.name || 'File'}
          sx={{ maxWidth: '100%', maxHeight: '80vh', objectFit: 'contain' }}
        />
      );
    }

    return <Typography>Unsupported file type</Typography>;
  };

  const ParentElement = renderAsCard ? Card : Dialog;
  const parentProps = renderAsCard
    ? {
        sx: {
          maxHeight: 'calc(100vh - 8rem)',
          bgcolor: 'neutral.100',
        },
      }
    : {
        open,
        fullWidth: true,
        onClose: handleClose,
        slotProps: {
          paper: {
            sx: {
              ml: 7,
              mr: 'auto',
              height: '90vh',
              maxWidth: notes ? '68vw' : '95vw',
              bgcolor: 'neutral.100',
            },
          },
        },
      };

  return (
    <>
      {/* @ts-expect-error ts(2322) */}
      <ParentElement {...parentProps}>
        {customHeader ? (
          customHeader
        ) : (
          <Box
            sx={{
              p: 2,
              display: 'flex',
              border: '1px solid',
              alignItems: 'center',
              borderColor: 'divider',
              bgcolor: 'common.white',
              justifyContent: 'space-between',
            }}
          >
            <Box
              sx={{
                gap: 2.5,
                display: 'flex',
                alignItems: 'center',
              }}
            >
              <Button
                variant="tertiary"
                onClick={handleClose}
                startIcon={<ArrowLeftIcon size={16} />}
              >
                Back
              </Button>
              {notes ? (
                <Box>
                  <Typography variant="h5">{selectedFile?.fileName}</Typography>
                  <Typography variant="caption">
                    Uploaded on{' '}
                    {moment(selectedFile?.createdAt).format('MM-DD-YYYY')}
                  </Typography>
                </Box>
              ) : (
                <Typography variant="h5">All Documents</Typography>
              )}
            </Box>
            <Box
              sx={{
                gap: 1,
                display: 'flex',
                alignItems: 'center',
              }}
            >
              {notes ? (
                <Box
                  sx={{
                    gap: 1,
                    display: 'flex',
                    alignItems: 'center',
                  }}
                >
                  <Button
                    variant="tertiary"
                    startIcon={<LinkSimpleIcon size={16} />}
                    onClick={() => {
                      void navigator.clipboard.writeText(data?.data || '');
                      setShareToast(true);
                    }}
                    sx={{
                      whiteSpace: 'nowrap',
                    }}
                  >
                    Share Link
                  </Button>
                  <Button
                    download
                    component="a"
                    target="_blank"
                    href={data?.data}
                    variant="contained"
                    startIcon={<DownloadSimpleIcon size={16} />}
                  >
                    Download
                  </Button>
                </Box>
              ) : (
                <Button
                  download
                  component="a"
                  target="_blank"
                  href={data?.data}
                  variant="contained"
                  startIcon={<DownloadSimpleIcon size={16} />}
                >
                  Download
                </Button>
              )}
            </Box>
          </Box>
        )}
        <Grid container spacing={customFileViewer ? 0 : 1}>
          {hideDocuments ? null : customDocuments ? (
            <Grid size={{ lg: renderAsCard ? 4.5 : 4 }}>{customDocuments}</Grid>
          ) : (
            <Grid size={{ lg: renderAsCard ? 5 : 4 }}>
              <Documents
                files={files}
                hasParent
                setSelectedFile={setSelectedFile}
                renderAsCard={renderAsCard}
                onDocumentClick={onDocumentClick}
                footer={footer}
              />
            </Grid>
          )}
          <Grid
            size={{ lg: hideDocuments ? 12 : renderAsCard ? 7.5 : 8 }}
            sx={{
              position: 'relative',
            }}
          >
            {customFileViewer ? (
              customFileViewer
            ) : isLoading || isRefetching || loadingMarkdown ? (
              <Box
                sx={{
                  ml: notes || hideDocuments ? 0 : 8,
                  mt: notes || hideDocuments ? -12 : -8,
                  height: notes || hideDocuments ? '100vh' : '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <AppCustomLoader height="200px" />
              </Box>
            ) : isError ? (
              <Box
                sx={{
                  ml: 8,
                  mt: notes || hideDocuments ? -12 : -8,
                  height: notes || hideDocuments ? '100vh' : '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexDirection: 'column',
                }}
              >
                <Typography
                  sx={{
                    mt: 2,
                    fontSize: 18,
                    fontWeight: 600,
                    textAlign: 'center',
                    color: 'error.main',
                  }}
                >
                  {fileError?.message ||
                    'Failed to load file preview. Please try again later.'}
                </Typography>
                <Button
                  sx={{ mt: 1 }}
                  variant="contained"
                  onClick={() => void refetch()}
                >
                  Retry
                </Button>
              </Box>
            ) : (
              <Box
                sx={{
                  py: 2,
                  display: 'flex',
                  height: '100%',
                  overflow: 'auto',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {renderFile()}
              </Box>
            )}
          </Grid>
        </Grid>
      </ParentElement>

      {notes ? (
        <Dialog
          fullWidth
          open={open}
          hideBackdrop
          onClose={handleClose}
          sx={{
            ml: 'auto',
            maxWidth: 430,
          }}
          slotProps={{
            paper: {
              sx: {
                ml: 'auto',
                height: '90vh',
                maxWidth: '25vw',
                bgcolor: 'neutral.100',
              },
            },
          }}
        >
          <Notes notes={notes} meta={meta} />
        </Dialog>
      ) : null}

      {/* Toast notification for link sharing */}
      <Snackbar
        open={shareToast}
        autoHideDuration={2000}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
        onClose={() => setShareToast(false)}
      >
        <Alert severity="success" sx={{ width: '100%' }}>
          Link copied to clipboard
        </Alert>
      </Snackbar>
    </>
  );
};

export default FileViewer;
