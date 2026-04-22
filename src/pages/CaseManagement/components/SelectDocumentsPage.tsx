import { useState, useMemo, type FC } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Box,
  Button,
  Checkbox,
  CircularProgress,
  Typography,
} from '@mui/material';
import { ArrowRightIcon } from '@phosphor-icons/react';
import moment from 'moment';
import { PopUp } from '@/components/Popup';
import { getCaseDocuments } from '@/api/caseManagement/addCase';

import {
  type CaseFile,
  type DocumentType as DocumentType,
  DocumentTypeEnum,
  getFileName,
} from './selectDocuments/types';
import DocumentFilters from './selectDocuments/DocumentFilters';
import DocumentCard from './selectDocuments/DocumentCard';
import NameChronologyDialog, {
  GeneratingDialog,
} from './selectDocuments/ChronologyDialogs';

type SelectDocumentsPageProps = {
  onCancel: () => void;
  onGoToChronologyListing?: () => void;
  files: Array<CaseFile>;
  caseId: string | number;
  caseDbId: string;
};

const SelectDocumentsPage: FC<SelectDocumentsPageProps> = ({
  onCancel,
  onGoToChronologyListing,
  files,
  caseId,
  caseDbId,
}) => {
  const [search, setSearch] = useState('');
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());
  const [typeFilter, setTypeFilter] = useState<DocumentType | ''>('');
  const [dateRange, setDateRange] = useState<[Date | null, Date | null]>([
    null,
    null,
  ]);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [showNameDialog, setShowNameDialog] = useState(false);
  const [showGeneratingDialog, setShowGeneratingDialog] = useState(false);
  const [chronologyName, setChronologyName] = useState(
    `Master Chronology – ${moment().format('DD MMM YYYY')}`
  );

  const [startDate, endDate] = dateRange;

  // Map UI filter → API documentType values
  const documentTypes = useMemo(() => {
    if (typeFilter === DocumentTypeEnum.MEDICAL) return ['ocr_medical'];
    if (typeFilter === DocumentTypeEnum.BILLING) return ['ocr_billing'];
    return ['ocr_medical', 'ocr_billing']; // 'Both' or no filter
  }, [typeFilter]);

  const {
    data: caseDocumentsData,
    isLoading: isDocumentsLoading,
    isError: isDocumentsError,
  } = useQuery({
    queryKey: [
      'caseDocuments',
      caseId,
      documentTypes,
      startDate ? moment(startDate).format('YYYY-MM-DD') : null,
      endDate ? moment(endDate).format('YYYY-MM-DD') : null,
    ],
    queryFn: () =>
      getCaseDocuments({
        caseId,
        documentTypes,
        page: 1,
        limit: 100,
        ...(startDate && { startDate: moment(startDate).format('YYYY-MM-DD') }),
        ...(endDate && { endDate: moment(endDate).format('YYYY-MM-DD') }),
      }),
    refetchOnWindowFocus: false,
  });

  // Response shape: { data: { data: { files: [...] }, total } }
  // Fall back to prop files only when query hasn't responded yet
  const apiFiles: Array<CaseFile> = useMemo(() => {
    if (caseDocumentsData === undefined) return files;
    const rawFiles = (
      caseDocumentsData as
        | { data?: { data?: { files?: Array<CaseFile> } } }
        | undefined
    )?.data?.data?.files;
    return rawFiles ?? [];
  }, [caseDocumentsData, files]);

  // Local search on top of API results
  const filteredFiles = useMemo(
    () =>
      apiFiles.filter((file) =>
        getFileName(file).toLowerCase().includes(search.toLowerCase())
      ),
    [apiFiles, search]
  );

  const allSelected =
    filteredFiles.length > 0 &&
    filteredFiles.every((f) => selectedKeys.has(f.key));
  const someSelected = filteredFiles.some((f) => selectedKeys.has(f.key));

  const handleSelectAll = (): void => {
    const next = new Set(selectedKeys);
    if (allSelected) {
      filteredFiles.forEach((f) => next.delete(f.key));
    } else {
      filteredFiles.forEach((f) => next.add(f.key));
    }
    setSelectedKeys(next);
  };

  const toggleFile = (key: string): void => {
    const next = new Set(selectedKeys);
    if (next.has(key)) {
      next.delete(key);
    } else {
      next.add(key);
    }
    setSelectedKeys(next);
  };

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        minHeight: 0,
      }}
    >
      {/* Header */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h5" fontWeight={600}>
          Select Documents to Generate Master Chronology
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
          Select medical and billing documents to include in the master
          chronology. Only selected records will be processed into the timeline.
        </Typography>
      </Box>

      {/* Filters */}
      <DocumentFilters
        search={search}
        onSearchChange={setSearch}
        dateRange={dateRange}
        onDateRangeChange={setDateRange}
        typeFilter={typeFilter}
        onTypeFilterChange={setTypeFilter}
      />

      {/* Select All row */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
        <Button
          size="small"
          variant="outlined"
          startIcon={
            <Checkbox
              size="small"
              checked={allSelected}
              indeterminate={!allSelected && someSelected}
              sx={{ p: 0, color: 'inherit' }}
              disableRipple
            />
          }
          onClick={handleSelectAll}
          sx={{
            textTransform: 'none',
            borderRadius: 1,
            height: 48,
            width: 150,
            fontWeight: 500,
            fontSize: 16,
            padding: 0,
          }}
        >
          Select All
        </Button>
        {selectedKeys.size > 0 && (
          <Typography variant="body2" color="text.secondary">
            {selectedKeys.size} Document{selectedKeys.size > 1 ? 's' : ''}{' '}
            Selected
          </Typography>
        )}
      </Box>

      {/* Document grid */}
      <Box sx={{ flex: 1, overflowY: 'auto', pb: 2 }}>
        {isDocumentsLoading ? (
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              minHeight: 200,
            }}
          >
            <CircularProgress size={32} />
          </Box>
        ) : isDocumentsError ? (
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              minHeight: 200,
              border: '1px dashed',
              borderColor: 'divider',
              borderRadius: 2,
            }}
          >
            <Typography variant="body2" color="error">
              Failed to load documents. Please try again.
            </Typography>
          </Box>
        ) : filteredFiles.length === 0 ? (
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              minHeight: 200,
              border: '1px dashed',
              borderColor: 'divider',
              borderRadius: 2,
            }}
          >
            <Typography variant="body2" color="text.secondary">
              No documents found.
            </Typography>
          </Box>
        ) : (
          <Box
            sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5 }}
          >
            {filteredFiles.map((file) => (
              <Box key={`${file.key}-${file.createdAt}`}>
                <DocumentCard
                  file={file}
                  isSelected={selectedKeys.has(file.key)}
                  onToggle={toggleFile}
                />
              </Box>
            ))}
          </Box>
        )}
      </Box>

      {/* Footer */}
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'flex-end',
          gap: 1.5,
          pt: 2,
          pb: 1,
          borderTop: '1px solid',
          borderColor: 'divider',
          bgcolor: 'background.default',
          position: 'sticky',
          bottom: 0,
          zIndex: 10,
        }}
      >
        <Button
          variant="outlined"
          size="large"
          onClick={() => {
            if (selectedKeys.size > 0) setShowCancelConfirm(true);
            else onCancel();
          }}
          sx={{ textTransform: 'none', fontWeight: 500, minWidth: 100 }}
        >
          Cancel
        </Button>
        <Button
          variant="contained"
          size="large"
          disabled={selectedKeys.size === 0}
          onClick={() => setShowNameDialog(true)}
          endIcon={<ArrowRightIcon />}
          sx={{ textTransform: 'none', fontWeight: 500, minWidth: 100 }}
        >
          Next
        </Button>
      </Box>

      {/* Cancel confirmation */}
      {showCancelConfirm && (
        <PopUp
          type="DELETETASK"
          cancelText="Keep Selecting"
          title={
            <>
              <Typography fontWeight={600} fontSize={24} variant="h2">
                Discard Selected Documents?
              </Typography>
              <Typography variant="body2" color="text.secondary">
                You have selected documents for the master chronology. Leaving
                this page will discard your current selection.
              </Typography>
            </>
          }
          buttonText="Discard & Exit"
          isOpen={showCancelConfirm}
          description=""
          onCancel={() => setShowCancelConfirm(false)}
          onClick={() => {
            setShowCancelConfirm(false);
            onCancel();
          }}
        />
      )}

      {/* Name & Review dialog */}
      <NameChronologyDialog
        open={showNameDialog}
        onClose={() => setShowNameDialog(false)}
        onGenerate={() => {
          setShowNameDialog(false);
          setShowGeneratingDialog(true);
        }}
        chronologyName={chronologyName}
        onChronologyNameChange={setChronologyName}
        selectedKeys={selectedKeys}
        allFiles={apiFiles}
        caseId={caseDbId}
      />

      {/* Generating dialog */}
      <GeneratingDialog
        open={showGeneratingDialog}
        onGoToChronologyListing={() => {
          setShowGeneratingDialog(false);
          if (onGoToChronologyListing) onGoToChronologyListing();
        }}
        onBackToCase={() => {
          setShowGeneratingDialog(false);
          onCancel();
        }}
      />
    </Box>
  );
};

export default SelectDocumentsPage;
