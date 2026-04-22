import { Box, Chip, IconButton, type SelectChangeEvent } from '@mui/material';

import { DownloadSimpleIcon, EyeIcon } from '@phosphor-icons/react';
import { useEffect, useMemo, useState } from 'react';

import TableContainerComponent from '@/components/Table/TableContainerComponent';

import { getRecordColors } from '../MedicalRecords/ViewRecord';
import { getRecordStatus } from '@/utils/recordStatus';
import {
  getPatientDocuments,
  type PatientDocumentsResponse,
} from '@/api/patient/documents';
import { useQuery } from '@tanstack/react-query';
import type { ColumnDef } from '@tanstack/react-table';
import moment from 'moment';
import CaseTimelinePopover from './CaseTimelinePopover';
import FileViewer from '@/components/FileViewer';
import {
  getFilePreview,
  type AddCaseDataType,
} from '@/api/caseManagement/addCase';

export type RecordFileType = {
  createdAt: string;
};

export type PatientRecordTableType = {
  caseId: string;
  documentId: string;
  documentName: string;
  recordStatus: string;
  retrievalDate: string;
  timelineStatus: string;
  contentType: string;
  convertedFileMimeType: string | null;
  convertedFileName: string | null;
};

/**
 * Patient Dashboard Page Component
 *
 * This component renders the Patient Dashboard page, including a table displaying
 * patient records, filters, and actions for managing records. It uses Material-UI
 * components and integrates with the application's state and navigation.
 */

const PatientRecords: React.FC = () => {

  const [tableData, setTableData] = useState<Array<PatientRecordTableType>>([]);
  const [openPreview, setOpenPreview] = useState(false);
  const [selectedFile, setSelectedFile] = useState<
    AddCaseDataType['files'][0] | null
  >(null);

  const [currentCaseStatus, setCurrentCaseStatus] = useState<string | null>(
    null
  );
  const [dialogOpen, setDialogOpen] = useState(false);

  // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
  const handleOpenTimeline = (step: string) => {
    setCurrentCaseStatus(step);
    setDialogOpen(true);
  };

  // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
  const handleClose = () => {
    setDialogOpen(false);
    setCurrentCaseStatus(null);
  };

  /**
   * State for managing table filters.
   */
  const [filters, setFilters] = useState<{
    page: number;
    limit: number;
    searchKeyWordString?: string;
  }>({
    page: 1,
    limit: 10,
    searchKeyWordString: '',
  });

  /**
   * State for managing the search input value.
   */
  const [searchValue, setSearchValue] = useState('');

  /**
   * Updates the filters when the search value changes.
   */
  useEffect(() => {
    const handler = setTimeout(() => {
      setFilters((previous) => ({
        ...previous,
        searchKeyWordString: searchValue,
      }));
    }, 500);

    return (): void => clearTimeout(handler);
  }, [searchValue]);

  //  api call for medical Chronology goes here

  const {
    data: patientRecords,
    isLoading,
    isError,
    refetch,
  }: {
    data: PatientDocumentsResponse | undefined;
    isLoading: boolean;
    isError: boolean;
    refetch: () => void;
  } = useQuery({
    queryKey: ['patientRecords', filters],
    queryFn: async () => {
      const data = await getPatientDocuments(filters);
      return data;
    },
    staleTime: Infinity,
    refetchOnWindowFocus: false,
  });

  useEffect(() => {
    const listData: Array<PatientRecordTableType> = [];
    if (patientRecords?.medicalRecords?.length) {
      patientRecords?.medicalRecords.forEach((element) => {
        const record: PatientRecordTableType = {
          caseId: element.caseNumber.toString(),
          documentId: element.document.fileId,
          documentName: `${element.document.category}-${element.document.author}`,
          recordStatus: 'completed',
          retrievalDate: element.updatedAt,
          timelineStatus: element.timelineStatus,
          contentType: element.document.contentType,
          convertedFileMimeType: element.file?.convertedFileMimeType??null,
          convertedFileName: element.file?.convertedFileName??null,
        };

        listData.push(record);
      });

      setTableData(listData);
    }
  }, [patientRecords, isLoading, isError]);

  /**
   * Refetch data when filters change.
   */
  useEffect(() => {
    //fetch data again when filters changes
    refetch();
  }, [filters, refetch]);

  const { refetch: refetchPreview } = useQuery({
    enabled: false,
    queryKey: ['selectedFile'],
    queryFn: () => getFilePreview(selectedFile?.id || ''),
    staleTime: 5 * 60 * 1000,
    retry: 0,
  });

  /**
   * Table column definitions for the Medical Chronology table.
   */
  const columns = useMemo<Array<ColumnDef<PatientRecordTableType>>>(
    () => [
      {
        accessorKey: 'caseId',
        header: 'Case ID',
        cell: (info): React.ReactNode => String(info.getValue()),

        enableColumnFilter: false,
      },
      {
        accessorKey: 'documentId',
        header: 'Document ID',
        cell: (info): React.ReactNode => String(info.getValue()),

        enableColumnFilter: false,
      },
      {
        accessorKey: 'documentName',
        header: 'Document Name',
        cell: (info): React.ReactNode => String(info.getValue()),
        enableColumnFilter: false,
      },
      {
        accessorKey: 'recordStatus',
        header: 'Record Retrieval Status',
        cell: (info): React.ReactNode => {
          const value = info.getValue();
          return (
            <Chip
              sx={{
                ...getRecordColors(value as string),
                p: 0.5,
                border: `1px solid`,
                fontWeight: 500,
                fontSize: '0.875rem',
                height: 24,
              }}
              label={getRecordStatus((value as string).toString())}
            />
          );
        },
        enableColumnFilter: false,
        filterFn: 'includesString',
      },
      {
        accessorKey: 'retrievalDate',
        header: 'Retrieval Date',
        cell: (info): React.ReactNode =>
          moment(info.getValue() as string).format('MM-DD-YYYY, h:mm A'),
        enableColumnFilter: false,
      },
      {
        id: 'actions',
        header: 'Actions',
        cell: ({ row }): React.ReactNode => {
          const rowFile = {
            fileSize: 0,
            id: row.original.documentId,
            fileName: row.original.documentName,
            name: row.original.documentName,
            documentProcessStages: row.original.timelineStatus,
            key: row.original.documentId,
            mimeType: row.original.convertedFileMimeType
              ? row.original.convertedFileMimeType
              : row.original.contentType,
            createdAt: row.original.retrievalDate,
          };
          return (
            <Box
              sx={{
                gap: 1,
                display: 'flex',
                alignItems: 'center',
              }}
            >
              <IconButton
                size="small"
                variant="soft"
                disabled={rowFile.mimeType.includes('xml')}
                onClick={(event) => {
                  event.stopPropagation();
                  setSelectedFile(rowFile);
                  setOpenPreview(true);
                }}
              >
                <EyeIcon />
              </IconButton>
              <IconButton
                size="small"
                variant="soft"
                disabled={rowFile.mimeType.includes('xml')}
                onClick={(event) => {
                  event.stopPropagation();
                  void new Promise<void>((resolve) => {
                    setSelectedFile(rowFile);
                    setOpenPreview(false);
                    resolve();
                  }).then(() => {
                    void refetchPreview().then((response) => {
                      if (response.status === 'success') {
                        window.open(response.data.data, '_blank');
                      }
                    });
                  });
                }}
              >
                <DownloadSimpleIcon />
              </IconButton>
              <IconButton
                size="small"
                variant="soft"
                onClick={(event) => {
                  event.stopPropagation();
                  handleOpenTimeline(row.original.timelineStatus);
                }}
              >
                <Box
                  component="svg"
                  width="24px"
                  height="24px"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <Box
                    component="path"
                    d="M3 3V6"
                    stroke="#677284"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <Box
                    component="path"
                    d="M3 9.75L3 14.25"
                    stroke="#677284"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <Box
                    component="path"
                    d="M3 18V21"
                    stroke="#677284"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <Box
                    component="path"
                    d="M18 6C18 5.58579 17.6642 5.25 17.25 5.25H12.75H8.25C7.83579 5.25 7.5 5.58579 7.5 6V9C7.5 9.41421 7.83579 9.75 8.25 9.75H17.25C17.6642 9.75 18 9.41421 18 9V6Z"
                    stroke="#677284"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <Box
                    component="path"
                    d="M21 14.25H8.25C7.83579 14.25 7.5 14.5858 7.5 15V18C7.5 18.4142 7.83579 18.75 8.25 18.75H21C21.4142 18.75 21.75 18.4142 21.75 18V15C21.75 14.5858 21.4142 14.25 21 14.25Z"
                    stroke="#677284"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <Box
                    component="path"
                    d="M3 9C3.82843 9 4.5 8.32843 4.5 7.5C4.5 6.67157 3.82843 6 3 6C2.17157 6 1.5 6.67157 1.5 7.5C1.5 8.32843 2.17157 9 3 9Z"
                    stroke="#677284"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <Box
                    component="path"
                    d="M3 18C3.82843 18 4.5 17.3284 4.5 16.5C4.5 15.6716 3.82843 15 3 15C2.17157 15 1.5 15.6716 1.5 16.5C1.5 17.3284 2.17157 18 3 18Z"
                    stroke="#677284"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </Box>
              </IconButton>
            </Box>
          );
        },
      },
    ],
    []
  );

  const onRowClick = (patientRecord: PatientRecordTableType): void => {
    const rowFile = {
      fileSize: 0,
      id: patientRecord.documentId,
      fileName: patientRecord.documentName,
      name: patientRecord.documentName,
      documentProcessStages: patientRecord.timelineStatus,
      key: patientRecord.documentId,
      mimeType: patientRecord.contentType,
      createdAt: patientRecord.retrievalDate,
    };
    if (!patientRecord.contentType.includes('xml')) {
      setSelectedFile(rowFile);
      setOpenPreview(true);
    }
  };

  /**
   * Handles page change in the table.
   *
   * @param {unknown} _event - The event object.
   * @param {number} newPage - The new page number.
   */
  const handlePageChange = (_event: unknown, newPage: number): void => {
    setFilters({
      ...filters,
      page: newPage,
    });
  };

  /**
   * Handles changes to the number of rows per page.
   *
   * @param {SelectChangeEvent<number>} event - The event object.
   */
  const handleChangeRowsPerPage = (event: SelectChangeEvent<number>): void => {
    const newRowsPerPage = parseInt(event.target.value.toString(), 10);
    setFilters({
      ...filters,
      page: 1,
      limit: newRowsPerPage,
    });
  };

  /**
   * Handles search input in the table.
   *
   * @param {string} value - The search value.
   */
  const handleTableSearch = (value: string): void => {
    setSearchValue(value);
  };

  return (
    <Box sx={{ mt: 2 }}>
      <TableContainerComponent
        title="Retrieved Records"
        columns={columns}
        data={tableData}
        onRowClick={onRowClick}
        isLoading={isLoading}
        handlePageChange={handlePageChange}
        currentPage={patientRecords?.pagination?.page || 1}
        rowsPerPage={patientRecords?.pagination?.limit || 10}
        totalPages={patientRecords?.pagination?.totalPages || 1}
        handleChangeRowsPerPage={handleChangeRowsPerPage}
        totalRecords={patientRecords?.pagination?.total || 1}
        handleTableSearch={handleTableSearch}
        activeFilterColumn={null}
      />

      {currentCaseStatus !== null && (
        <CaseTimelinePopover
          open={dialogOpen}
          onClose={handleClose}
          caseStatus={currentCaseStatus}
        />
      )}

      <FileViewer
        hideDocuments
        open={openPreview}
        setOpen={setOpenPreview}
        selectedFile={selectedFile}
        files={
          tableData?.map((item) => ({
            fileSize: 0,
            documentProcessStages: item.timelineStatus,
            id: item.documentId,
            fileName: item.documentName,
            name: item.documentName,
            key: item.documentId,
            mimeType: item.contentType,
            createdAt: item.retrievalDate,
          })) || []
        }
        setSelectedFile={setSelectedFile}
      />
    </Box>
  );
};

export default PatientRecords;
