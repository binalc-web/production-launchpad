import { Box, Typography } from '@mui/material';
import { FileXIcon } from '@phosphor-icons/react';
import type { FC } from 'react';

type NoDocumentFoundType = {
  isFilesUploadedByAssignee: boolean;
};

const NoDocumentFound: FC<NoDocumentFoundType> = ({
  isFilesUploadedByAssignee,
}) => (
  <Box
    display="flex"
    flexDirection="row"
    gap={1}
    mx={isFilesUploadedByAssignee ? 1 : 0}
  >
    <FileXIcon size={20} />
    <Typography fontSize={14} color="neutral.500">
      {isFilesUploadedByAssignee
        ? 'No Documents Uploaded by Assignee'
        : 'No reference documents shared'}
    </Typography>
  </Box>
);

export default NoDocumentFound;
