import type { FC } from 'react';
import { Box, Checkbox, Typography } from '@mui/material';
import {
  CalendarBlankIcon,
  FileTextIcon,
  InvoiceIcon,
  ShieldCheckIcon,
  StethoscopeIcon,
} from '@phosphor-icons/react';
import moment from 'moment';
import {
  type CaseFile,
  DocumentTypeEnum,
  formatFileSize,
  getDocumentType,
  getFileName,
} from './types';

type DocumentCardProps = {
  file: CaseFile;
  isSelected: boolean;
  onToggle: (key: string) => void;
};

const DocumentCard: FC<DocumentCardProps> = ({
  file,
  isSelected,
  onToggle,
}) => {
  const documentType = getDocumentType(file);

  return (
    <Box
      onClick={() => onToggle(file.key)}
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1.5,
        p: 1.5,
        border: '1px solid',
        borderColor: isSelected ? 'primary.main' : 'divider',
        borderRadius: 2,
        cursor: 'pointer',
        bgcolor: isSelected ? 'primary.50' : 'background.paper',
        transition: 'all 0.2s ease',
        '&:hover': {
          borderColor: 'primary.main',
          bgcolor: 'primary.50',
        },
      }}
    >
      {/* File icon */}
      <Box
        sx={{
          width: 38,
          height: 38,
          borderRadius: 1.5,
          bgcolor: 'grey.100',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        <FileTextIcon size={20} color="#8B95A5" />
      </Box>

      {/* Info */}
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography
          variant="body2"
          fontWeight={500}
          noWrap
          title={getFileName(file)}
        >
          {getFileName(file)}
        </Typography>

        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 0.75,
            mt: 0.5,
            flexWrap: 'wrap',
          }}
        >
          {/* Doc type badge */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.4 }}>
            {documentType === DocumentTypeEnum.BILLING ? (
              <InvoiceIcon size={12} color="#16A34A" />
            ) : (
              <StethoscopeIcon size={12} color="#3045C5" />
            )}
            <Typography
              variant="caption"
              sx={{
                color:
                  documentType === DocumentTypeEnum.BILLING
                    ? '#16A34A'
                    : '#3045C5',
                fontWeight: 400,
                fontSize: 14,
              }}
            >
              {documentType}
            </Typography>
          </Box>

          <Typography variant="caption" color="text.disabled">
            •
          </Typography>

          {/* File size */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.4 }}>
            <FileTextIcon size={12} color="#8B95A5" />
            <Typography variant="caption" color="text.secondary">
              {formatFileSize(file.fileSize)}
            </Typography>
          </Box>

          {/* Date */}
          {file.createdAt && (
            <>
              <Typography variant="caption" color="text.disabled">
                •
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.4 }}>
                <CalendarBlankIcon size={12} color="#8B95A5" />
                <Typography variant="caption" color="text.secondary">
                  {moment(file.createdAt).format('MM-DD-YYYY')}
                </Typography>
              </Box>
            </>
          )}

          <Typography variant="caption" color="text.disabled">
            •
          </Typography>

          {/* Protected badge */}
          <Typography
            variant="caption"
            color="success.main"
            sx={{ display: 'flex', alignItems: 'center', gap: 0.3 }}
          >
            <ShieldCheckIcon size={12} />
            Protected
          </Typography>
        </Box>
      </Box>

      {/* Checkbox */}
      <Checkbox
        checked={isSelected}
        size="small"
        sx={{ p: 0, flexShrink: 0 }}
        onClick={(event) => event.stopPropagation()}
        onChange={() => onToggle(file.key)}
      />
    </Box>
  );
};

export default DocumentCard;
