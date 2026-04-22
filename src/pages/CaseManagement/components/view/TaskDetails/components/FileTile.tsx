import { getFilePreview, type AddCaseDataType } from '@/api/caseManagement/addCase';
import { bytesToMB } from '@/utils/fileSize';
import { trackEvent } from '@/utils/mixPanel/mixpanel';
import { Avatar, Box, IconButton, Typography } from '@mui/material';
import { CalendarDotsIcon, DownloadSimpleIcon, EyeIcon, FileJpgIcon, FilePdfIcon, FilePngIcon, FileTextIcon, ShieldCheckIcon, ShieldSlashIcon } from '@phosphor-icons/react';
import { useQuery } from '@tanstack/react-query';
import moment from 'moment';
import type { FC, MouseEvent } from 'react';
import { Dot } from '..';

type FileTileProps = {
  file: AddCaseDataType['files'][number];
  isLastItem: boolean;
  handleViewFile: () => void;
};

const FileTile: FC<FileTileProps> = ({ file, isLastItem, handleViewFile }) => {
  const { refetch: refetchPreview } = useQuery({
    enabled: false,
    queryKey: ['selectedFile'],
    queryFn: () => getFilePreview(file.id || ''),
    staleTime: 5 * 60 * 1000,
    retry: 0,
  });

  /**
   * Handles downloading a document
   * @param {MouseEvent<HTMLButtonElement>} event - Click event object
   * @param {AddCaseDataType['files'][0]} file - File to be downloaded
   * @returns {void}
   */
  const handleDocumentDownload = (
    event: MouseEvent<HTMLButtonElement>
  ): void => {
    event.preventDefault();
    event.stopPropagation();
    void refetchPreview().then((response) => {
      if (response.status === 'success') {
        void trackEvent(`Document downloaded`);
        window.open(response.data.data, '_blank');
      }
    });
  };

  return (
    <Box
      sx={{
        backgroundColor: '#fff',
      }}
      mb={isLastItem ? 0 : 1}
      p={1.6}
      key={file.fileName}
      display="flex"
      flexDirection="row"
      justifyContent="space-between"
      border={1}
      borderRadius={1.6}
      borderColor="neutral.200"
    >
      <Box display="flex" flexDirection="row" gap={2.6}>
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
        <Box>
          <Typography fontWeight={500} fontSize={16} color="neutral.700">
            {file.fileName}
          </Typography>
          <Box mt={1}>
            <Box
              sx={{
                mt: 1.25,
                display: 'flex',
                alignItems: 'center',
              }}
            >
              <CalendarDotsIcon />
              <Typography ml={1} variant="body2" color="text.secondary">
                {file?.createdAt
                  ? moment(file?.createdAt).format('MM-DD-YYYY')
                  : 'date'}
              </Typography>
              <Box sx={{ mx: 1.5 }}>{Dot}</Box>
              <FileTextIcon />
              <Typography ml={0.5} variant="body2" color="text.secondary">
                {file?.fileSize ? bytesToMB(Number(file?.fileSize)) : '0 KB'}
              </Typography>
              {
                <>
                  {' '}
                  <Box sx={{ mx: 1.5 }}>{Dot}</Box>
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
                      <Typography fontSize={14} color="error.main">
                        <ShieldSlashIcon />
                        Unprotected
                      </Typography>
                    ) : (
                      <Typography fontSize={14} color="success.dark">
                        <ShieldCheckIcon />
                        Protected
                      </Typography>
                    )}
                  </Box>
                </>
              }
            </Box>
          </Box>
        </Box>
      </Box>
      <Box alignContent="center" gap={1.2}>
        <IconButton
          variant="soft"
          sx={{ p: 0.5 }}
          onClick={(event) => {
            void trackEvent(`Document download button clicked`, {
              fileName: file.fileName,
            });
            handleDocumentDownload(event);
          }}
        >
          <DownloadSimpleIcon size={24} color="#677284" />
        </IconButton>
        <IconButton
          variant="soft"
          sx={{ p: 0.5, color: '#677284' }}
          onClick={handleViewFile}
        >
          <EyeIcon size={24} />
        </IconButton>
      </Box>
    </Box>
  );
};

export default FileTile;
