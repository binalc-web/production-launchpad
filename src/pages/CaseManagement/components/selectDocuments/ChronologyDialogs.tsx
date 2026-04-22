import { useState, type FC } from 'react';
import {
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  InputLabel,
  TextField,
  Typography,
} from '@mui/material';
import { PopUp } from '@/components/Popup';
import { generateMasterChronology } from '@/api/caseManagement/addCase';
import { type CaseFile, DocumentTypeEnum, getDocumentType } from './types';

type NameChronologyDialogProps = {
  open: boolean;
  onClose: () => void;
  onGenerate: () => void;
  chronologyName: string;
  onChronologyNameChange: (name: string) => void;
  selectedKeys: Set<string>;
  allFiles: Array<CaseFile>;
  caseId: string;
};

const NameChronologyDialog: FC<NameChronologyDialogProps> = ({
  open,
  onClose,
  onGenerate,
  chronologyName,
  onChronologyNameChange,
  selectedKeys,
  allFiles,
  caseId,
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedFiles = allFiles.filter((f) => selectedKeys.has(f.key));
  const billingCount = selectedFiles.filter(
    (file) => getDocumentType(file) === DocumentTypeEnum.BILLING
  ).length;
  const medicalCount = selectedFiles.filter(
    (file) => getDocumentType(file) === DocumentTypeEnum.MEDICAL
  ).length;

  // Collect file IDs: prefer _id, fall back to key
  const fileIds = selectedFiles.map((f) => f._id ?? f.key);

  const handleGenerate = async (): Promise<void> => {
    setError(null);
    setIsLoading(true);
    try {
      await generateMasterChronology({
        caseId,
        fileIds,
        chronologyName: chronologyName.trim(),
      });
      onGenerate();
    } catch (error_) {
      setError(
        typeof error_ === 'string'
          ? error_
          : 'Failed to generate chronology. Please try again.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth={false}
      PaperProps={{
        sx: {
          width: 550,
          height: error ? 460 : 400,
          borderRadius: '24px',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          transition: 'height 0.2s ease',
        },
      }}
    >
      <DialogContent
        sx={{
          flex: 1,
          px: 4,
          pt: 4,
          pb: 2,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        <Typography
          variant="h5"
          fontWeight={700}
          sx={{ mb: 0.75, color: 'text.primary', fontSize: 22 }}
        >
          Name &amp; Review Chronology
        </Typography>

        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Review documents and name the chronology before generating.
        </Typography>

        <InputLabel htmlFor="caseTitle">
          <Typography
            component="span"
            sx={{ color: 'error.main', fontSize: 12 }}
          >
            *
          </Typography>{' '}
          Chronology Name
        </InputLabel>

        <TextField
          fullWidth
          size="small"
          value={chronologyName}
          onChange={(event) => onChronologyNameChange(event.target.value)}
          placeholder="Enter chronology name"
          sx={{
            mb: 0.75,
            '& .MuiOutlinedInput-root': { borderRadius: '8px' },
            '& input': { fontSize: 14, py: 1.25 },
          }}
        />

        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ mb: 3, display: 'block', fontSize: 12 }}
        >
          This name can&apos;t be edited after generation.
        </Typography>

        <Typography
          variant="body1"
          fontWeight={500}
          sx={{ mb: 0.5, color: 'text.primary', fontSize: 16 }}
        >
          {selectedKeys.size} Document{selectedKeys.size !== 1 ? 's' : ''}{' '}
          Included
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {billingCount > 0 && `${billingCount} Billing`}
          {billingCount > 0 && medicalCount > 0 && '\u00a0\u00a0\u00a0\u00a0'}
          {medicalCount > 0 && `${medicalCount} Medical`}
        </Typography>

        {error && (
          <Typography
            variant="caption"
            color="error"
            sx={{ mt: 1.5, display: 'block' }}
          >
            {error}
          </Typography>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 4, pb: 4, pt: 0, gap: 2, flexShrink: 0 }}>
        <Button
          variant="contained"
          size="large"
          fullWidth
          disabled={!chronologyName.trim() || isLoading}
          onClick={() => void handleGenerate()}
          sx={{
            textTransform: 'none',
            fontWeight: 600,
            fontSize: 15,
            borderRadius: '10px',
            height: 48,
          }}
          startIcon={
            isLoading ? (
              <CircularProgress size={16} color="inherit" />
            ) : undefined
          }
        >
          {isLoading ? 'Generating…' : 'Generate Chronology'}
        </Button>
        <Button
          variant="outlined"
          size="large"
          fullWidth
          disabled={isLoading}
          onClick={onClose}
          sx={{
            textTransform: 'none',
            fontWeight: 500,
            fontSize: 15,
            borderRadius: '10px',
            height: 48,
            borderColor: 'divider',
            color: 'text.primary',
            '&:hover': { borderColor: 'text.primary', bgcolor: 'grey.50' },
          }}
        >
          Back to Selection
        </Button>
      </DialogActions>
    </Dialog>
  );
};

type GeneratingDialogProps = {
  open: boolean;
  onGoToChronologyListing: () => void;
  onBackToCase: () => void;
};

export const GeneratingDialog: FC<GeneratingDialogProps> = ({
  open,
  onGoToChronologyListing,
  onBackToCase,
}) => {
  if (!open) return null;

  return (
    <PopUp
      type="GENERATE_CHRONOLOGY"
      maxWidth="sm"
      title={
        <>
          <Typography fontWeight={600} fontSize={24} variant="h2">
            Chronology Generation Started
          </Typography>
          <Typography
            variant="body2"
            color="text.secondary"
            mt={2}
            sx={{ maxWidth: 300, mx: 'auto', textAlign: 'center' }}
          >
            AI is analyzing the selected documents. This may take a few minutes
            — refresh the listing page to check status.
          </Typography>
        </>
      }
      isOpen={open}
      description=""
      contentToRenderAtBottom={
        <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', mt: 1 }}>
          <Button
            variant="contained"
            size="large"
            onClick={onGoToChronologyListing}
            sx={{
              textTransform: 'none',
              fontWeight: 600,
              fontSize: 14,
              borderRadius: '10px',
              height: 48,
              px: 3,
              whiteSpace: 'nowrap',
            }}
          >
            Go to Chronology Listing
          </Button>
          <Button
            variant="outlined"
            size="large"
            onClick={onBackToCase}
            sx={{
              textTransform: 'none',
              fontWeight: 500,
              fontSize: 14,
              borderRadius: '10px',
              height: 48,
              px: 3,
              whiteSpace: 'nowrap',
              borderColor: 'divider',
              color: 'text.primary',
              '&:hover': { borderColor: 'text.primary', bgcolor: 'grey.50' },
            }}
          >
            Back to Case
          </Button>
        </Box>
      }
    />
  );
};

export default NameChronologyDialog;
