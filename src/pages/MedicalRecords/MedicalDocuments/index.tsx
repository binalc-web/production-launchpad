import { type FC, useMemo, useState } from 'react';
import TableContainerComponent from '@/components/Table/TableContainerComponent';

import type { caseFilters } from '@/pages/CaseManagement/types/caseFilters';
import type { ColumnDef } from '@tanstack/react-table';

import { Box, IconButton } from '@mui/material';
import { useParams } from '@tanstack/react-router';
import {
  CheckCircleIcon,
  EyeIcon,
  TrashIcon,
  XCircleIcon,
} from '@phosphor-icons/react';
import FileViewer from '@/components/FileViewer';
import type { AddCaseDataType } from '@/api/caseManagement/addCase';
import { deleteRecordDocument } from '@/api/medicalRecords/deleteRecordDocument';
import { useQuery } from '@tanstack/react-query';
import { getNotes } from '@/api/medicalRecords/notes';
import moment from 'moment';
import { PopUp } from '@/components/Popup';
import ToastAlert from '@/components/ToastAlert';

type MedicalDocumentsProps = {
  files: AddCaseDataType['files']; // Array of file objects, not array of arrays
  refetch: () => void;
};

const MedicalDocuments: FC<MedicalDocumentsProps> = ({ files, refetch }) => {
  /**
   * State for managing table filters.
   */
  const [filters, setFilters] = useState<caseFilters>({
    page: 1,
    limit: 10,
    searchKeyWordString: undefined,
    status: undefined,
    assignees: undefined,
  });

  // const [searchValue, setSearchValue] = useState('');
  const [openFileViewer, setOpenFileViewer] = useState(false);
  const [openDeletePopup, setOpenDeletePopup] = useState(false);
  const [selectedFile, setSelectedFile] = useState<
    AddCaseDataType['files'][0] | null
  >(null);
  const [fileToDelete, setFileToDelete] = useState<string | null>(null);
  const [alertData, setAlertData] = useState({
    open: false,
    type: 'success',
    message: '',
    subtitle: '',
    icon: <CheckCircleIcon size={20} />,
  });

  const { id: recordId } = useParams({
    from: '/_app/medical-records/view/$id',
  });

  /**
   * Table column definitions for the Medical Records table.
   */
  const columns = useMemo<Array<ColumnDef<AddCaseDataType['files'][0]>>>(
    () => [
      {
        accessorKey: 'id',
        header: 'Document ID',
        cell: (info): React.ReactNode => String(info.getValue()),
        enableColumnFilter: false,
      },
      {
        accessorKey: 'fileName',
        header: 'Document Name',
        cell: (info): React.ReactNode => String(info.getValue()),
        enableColumnFilter: false,
      },
      {
        accessorKey: 'createdAt',
        header: 'Uploaded Date',
        cell: (info): string =>
          moment(info.getValue() as string).format('MM-DD-YYYY'),
        enableColumnFilter: false,
      },

      {
        id: 'actions',
        header: 'Actions',
        cell: (data): React.ReactNode => {
          return (
            <Box>
              <IconButton
                size="small"
                variant="soft"
                disabled={!data.row.original.id}
                onClick={(event) => {
                  event.stopPropagation();
                  setSelectedFile(data.row.original);
                  setOpenFileViewer(true);
                }}
              >
                <EyeIcon />
              </IconButton>
              <IconButton
                size="small"
                variant="soft"
                disabled={!data.row.original.id}
                onClick={(event) => {
                  event.stopPropagation();
                  setFileToDelete(data.row.original.id as string);
                  setOpenDeletePopup(true);
                }}
              >
                <TrashIcon />
              </IconButton>
            </Box>
          );
        },
      },
    ],
    []
  );

  const onRowClick = (
    medicalRecordDocuments: AddCaseDataType['files'][0]
  ): void => {
    setSelectedFile(medicalRecordDocuments);
    setOpenFileViewer(true);
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
   * @param {SelectChangeEvent} event - The event object.
   */
  const handleChangeRowsPerPage = (event: {
    target: { value: string | number };
  }): void => {
    const valueAsNumber =
      typeof event.target.value === 'string'
        ? parseInt(event.target.value, 10)
        : event.target.value;

    setFilters({
      ...filters,
      page: 1,
      limit: valueAsNumber,
    });
  };

  /**
   * Handles search input in the table.
   *
   * @param {string} value - The search value.
   */
  // const handleTableSearch = (value: string): void => {
  //   setSearchValue(value);
  // };

  const {
    data: notes,
    error: notesError,
    isError: isNotesError,
    isLoading: isNotesLoading,
  } = useQuery({
    enabled: !!selectedFile,
    queryKey: ['notes', recordId, selectedFile?.id],
    queryFn: () => getNotes(recordId, selectedFile?.id as string),
  });

  const handleFileDelete = (): void => {
    void deleteRecordDocument(fileToDelete as string)
      .then(() => {
        setOpenDeletePopup(false);
        setAlertData({
          ...alertData,
          open: true,
          type: 'success',
          message: 'Document deleted successfully',
          subtitle: 'Document deleted from the list',
        });

        setTimeout(() => {
          setAlertData({ ...alertData, open: false });
          refetch();
        }, 3000);
      })
      .catch((error) => {
        setOpenDeletePopup(false);
        setAlertData({
          ...alertData,
          open: true,
          type: 'error',
          message: 'Failed to delete document',
          subtitle: error.message,
          icon: <XCircleIcon />,
        });
        setTimeout(() => {
          setAlertData({ ...alertData, open: false });
        }, 3000);
      });
  };

  return (
    <>
      <TableContainerComponent
        title="All Documents"
        columns={columns}
        data={files}
        onRowClick={onRowClick}
        isLoading={false}
        handlePageChange={handlePageChange}
        currentPage={filters.page}
        rowsPerPage={filters.limit}
        totalPages={1}
        handleChangeRowsPerPage={handleChangeRowsPerPage}
        totalRecords={files.length}
        handleTableSearch={() => {}}
        activeFilterColumn={null}
      />
      <FileViewer
        open={openFileViewer}
        setOpen={setOpenFileViewer}
        files={files}
        selectedFile={selectedFile}
        hideDocuments
        hideRefetchAndLog
        setSelectedFile={setSelectedFile}
        notes={notes || []}
        meta={{
          recordId,
          fileId: selectedFile?.id,
          error: notesError?.message as string,
          isError: isNotesError,
          isLoading: isNotesLoading,
        }}
      />
      {openDeletePopup && (
        <PopUp
          type="DELETE_RECORD"
          title="Are you sure you want to delete this record?"
          buttonText="Yes, Sure"
          isOpen={openDeletePopup}
          description=""
          cancelText="No, Not Yet"
          onCancel={() => {
            setOpenDeletePopup(false);
            setFileToDelete(null);
          }}
          onClick={handleFileDelete}
        />
      )}
      <ToastAlert
        message={alertData.message}
        body={alertData.subtitle}
        showAlert={alertData.open}
        onClose={() => setAlertData({ ...alertData, open: false })}
        icon={alertData.icon}
        placement="right"
        severity={alertData.type as 'error' | 'success'}
      />
    </>
  );
};
export default MedicalDocuments;
