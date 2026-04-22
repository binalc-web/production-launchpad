/**
 * Medical Records Page Component
 *
 * This component renders the Medical Records page, including a table displaying
 * medical records, filters, and actions for managing records. It uses Material-UI
 * components and integrates with the application's state and navigation.
 */
import {
  Box,
  Chip,
  IconButton,
  type SelectChangeEvent,
  Typography,
} from '@mui/material';
import { Link, useNavigate } from '@tanstack/react-router';

import Breadcrumbs, { type BreadcrumbItem } from '@/components/Breadcrumbs';
import { EyeIcon } from '@phosphor-icons/react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import type { MedicalRecordTableType } from './types/MedicalRecordTableType';

import TableContainerComponent from '@/components/Table/TableContainerComponent';
import type { caseFilters } from '../CaseManagement/types/caseFilters';

import { useQuery } from '@tanstack/react-query';
import {
  getMedicalRecords,
  type tableFilter,
  type MedicalRecordListResponse,
} from '@/api/medicalRecords/records';
import TableStatusFilterPopover from '@/components/Table/TableStatusFilterPopover';
import { getRecordStatus } from '@/utils/recordStatus';

import UserProfileTile from '@/components/Table/UserProfileTile';
import { getColors } from '../CaseManagement/components/view/PatientInfo';
import moment from 'moment';
import { trackEvent } from '@/utils/mixPanel/mixpanel';

const breadcrumbItems: Array<BreadcrumbItem> = [
  {
    title: 'Medical Records',
  },
];

const MedicalRecords: React.FC = () => {
  const navigate = useNavigate();

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

  const [filterAnchorElement, setFilterAnchorElement] =
    useState<HTMLElement | null>(null);
  const [statusFilter, setStatusFilter] = useState<Array<string>>([]);
  const [searchValue, setSearchValue] = useState('');
  const [filterColumnId, setFilterColumnId] = useState<string | null>(null);
  const [activeFilterColumn, setActiveFilterColumn] =
    useState<Array<string> | null>(null);

  const [tableData, setTableData] = useState<MedicalRecordListResponse>({
    medicalRecords: [],
    pagination: undefined,
  });
  const [dataProcessing, setDataProcessing] = useState<boolean>(false);

  const open = Boolean(filterAnchorElement);

  // Medical records API call using React Query
  const {
    data: recordList,
    isLoading,
    isError,
    refetch,
  }: {
    data: MedicalRecordListResponse | undefined;
    isLoading: boolean;
    isError: boolean;
    refetch: () => void;
  } = useQuery({
    queryKey: ['medicalRecords', filters],
    queryFn: async () => {
      setDataProcessing(true);

      // Map filters to tableFilter type
      const mappedFilters: tableFilter = {
        page: filters.page,
        limit: filters.limit,
        keyword: filters.searchKeyWordString || '',
        status: filters.status
          ? Array.isArray(filters.status)
            ? filters.status.join(',')
            : filters.status
          : '',
        provider: '', // Add provider filter if needed
      };
      return getMedicalRecords(mappedFilters);
    },
    staleTime: 0,
    refetchOnWindowFocus: false,
  });

  useEffect(() => {
    setDataProcessing(true);

    const listData: Array<MedicalRecordTableType> = [];

    if (recordList?.medicalRecords?.length) {
      recordList?.medicalRecords.forEach((element: MedicalRecordTableType) => {
        const caseItem = {
          _id: element?._id || '',
          caseId: element?.caseNumber?.toString() || '',
          patientId: element?._id || '',
          requestId: element?.requestId || '',
          status: element?.status || '',
          provider: element?.provider || '',
          retrievedAt: element?.retrievedAt || '',
          createdAt: element?.createdAt || '',
          updatedAt: element?.updatedAt || '',
          caseNumber: element?.caseNumber || 0,
          patientDetails: element?.patientDetails || {
            firstName: '',
            lastName: '',
            email: '',
            avatar: '',
          },
          caseFirstName: element?.caseFirstName || '',
          caseLastName: element?.caseLastName || '',
        };
        listData.push(caseItem);
      });
      setDataProcessing(false);

      setTableData({
        medicalRecords: listData,
        pagination: recordList?.pagination,
      });
    } else {
      setDataProcessing(false);

      setTableData({
        medicalRecords: [],
        pagination: {
          page: 1,
          limit: 10,
          totalPages: 1,
          total: 0,
          hasNextPage: false,
          hasPrevPage: false,
        },
      });
    }
  }, [recordList, isLoading, isError]);

  // Refetch when filters change
  useEffect(() => {
    refetch();
  }, [filters, refetch]);

  useEffect(() => {
    const handler = setTimeout(() => {
      setFilters((previous) => ({
        ...previous,
        searchKeyWordString: searchValue,
      }));
    }, 500);

    return (): void => clearTimeout(handler);
  }, [searchValue]);

  useEffect(() => {
    // fetch data again when filters changes
    refetch();
  }, [filters, refetch]);

  /**
   * Updates the active filter column based on the selected column and status filter.
   *
   * @param {string} columnId - The ID of the column to update.
   */

  const updateActiveFilterColumn = useCallback(
    (columnId: string): void => {
      setActiveFilterColumn((previous) => {
        const shouldAdd =
          columnId === 'recordStatus' && statusFilter.length > 0;

        if (shouldAdd) {
          if (previous?.includes(columnId)) return previous;
          return previous ? [...previous, columnId] : [columnId];
        } else {
          return previous ? previous.filter((id) => id !== columnId) : null;
        }
      });
    },
    [statusFilter]
  );

  useEffect(() => {
    updateActiveFilterColumn('recordStatus');
  }, [statusFilter, updateActiveFilterColumn]);

  useEffect(() => {
    updateActiveFilterColumn('recordStatus');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter]);

  /**
   * Handles changes to the status filter.
   *
   * @param {string[]} values - The selected status values.
   */
  const handleStatusFilterChange = (values: Array<string>): void => {
    setStatusFilter(values);
    setFilters({
      ...filters,
      status: values,
    });
  };

  useEffect(() => {
    void trackEvent('Medical Records Page Viewed');
  }, []);

  /**
   * Table column definitions for the Medical Records table.
   */
  const columns = useMemo<Array<ColumnDef<MedicalRecordTableType>>>(
    () => [
      {
        accessorKey: 'caseId',
        header: 'Case ID',
        enableColumnFilter: false,
        cell: (info): React.ReactNode => String(info.getValue()),
      },
      {
        accessorKey: 'patientId',
        header: 'Request ID',
        enableColumnFilter: false,
        cell: (info): React.ReactNode => String(info.getValue()),
      },
      {
        accessorKey: 'patientDetails',
        header: 'Patient Name',
        enableColumnFilter: false,
        cell: (info): React.ReactNode => {
          const patientDetails = info.getValue() as {
            firstName: string;
            lastName: string;
            avatar?: string;
          };
          return (
            <UserProfileTile
              imageUrl={patientDetails?.avatar || ''}
              fullName={`${patientDetails.firstName || 'John'} ${patientDetails.lastName || 'Doe'}`}
            />
          );
        },
      },
      {
        accessorKey: 'status',
        header: 'Record Status',
        cell: (info): React.ReactNode => (
          <Chip
            sx={{
              ...getColors(info.getValue() as string),
              border: `1px solid`,
              p: 0.5,
              fontWeight: 500,
              fontSize: '0.875rem',
              height: 24,
            }}
            label={getRecordStatus((info.getValue() as string).toString())}
          />
        ),
      },
      {
        accessorKey: 'retrievedAt',
        header: 'Record Retrieval Date',
        enableColumnFilter: false,
        cell: (info): React.ReactNode =>
          moment(info.getValue() as string).format('MM-DD-YYYY'),
      },
      {
        accessorKey: 'provider',
        header: 'Record Provider',
        cell: (info): React.ReactNode => {
          const value = info.getValue() as string;
          return (
            <Chip
              label={value}
              sx={{
                textTransform: 'uppercase',
                borderRadius: 1,
                border: '1px solid',
                ...(value === 'ehr'
                  ? {
                      bgcolor: '#EEFFF1',
                      borderColor: '#B2FFC4',
                      color: 'success.dark',
                    }
                  : {
                      bgcolor: '#F0FDFA',
                      color: 'secondary.dark',
                    }),
              }}
            />
          );
        },
      },

      {
        accessorKey: 'patientId',
        header: 'Actions',
        enableColumnFilter: false,
        cell: ({ row }): React.ReactNode => (
          <Box sx={{ display: 'flex', gap: 1 }}>
            <IconButton
              size="small"
              variant="soft"
              component={Link}
              onClick={(event) => event.stopPropagation()}
              to={`/medical-records/view/${row.original._id}`}
            >
              <EyeIcon />
            </IconButton>
            {/* Add edit or other actions here if needed */}
          </Box>
        ),
      },
    ],
    []
  );

  const onRowClick = (medicalRecords: MedicalRecordTableType): void => {
    void navigate({ to: `/medical-records/view/${medicalRecords._id}` });
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
    const newRowsPerPage =
      typeof event.target.value === 'string'
        ? parseInt(event.target.value, 10)
        : event.target.value;

    setFilters({
      ...filters,
      page: 1,
      limit: newRowsPerPage,
    });
  };

  /**
   * Handles click on filter of table.
   *
   * @param {HTMLElement} anchorElement - The anchor element for the filter popover.
   * @param {string} columnId - The ID of the column to filter.
   */
  const handleFilterClick = (
    anchorElement: HTMLElement | null,
    columnId: string
  ): void => {
    setActiveFilterColumn((previous) => {
      if (previous === null) {
        return [columnId];
      }
      if (previous.includes(columnId)) {
        return previous;
      }
      return [...previous, columnId];
    });
    setFilterAnchorElement(anchorElement);
    setFilterColumnId(columnId);
  };

  /**
   * Handles search input in the table.
   *
   * @param {string} value - The search value.
   */
  const handleTableSearch = (value: string): void => {
    setSearchValue(value);
  };

  /**
   * Handles close the filter popover.
   *
   * @param {string} columnId - The ID of the column to close.
   */
  const handleCloseFilter = (columnId: string): void => {
    if (columnId === 'recordStatus' && statusFilter.length <= 0) {
      setActiveFilterColumn((previous) =>
        previous ? previous.filter((id) => id !== columnId) : null
      );
    }
    setFilterAnchorElement(null);
    setFilterColumnId(null);
  };

  return (
    <>
      <Box mb={3}>
        <Breadcrumbs items={breadcrumbItems} />
        <Box
          sx={{
            mt: 1.25,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <Typography variant="h4">Medical Records</Typography>
        </Box>
      </Box>

      <TableContainerComponent
        title="Records Summary Table"
        columns={columns}
        onRowClick={onRowClick}
        data={tableData?.medicalRecords || []}
        isLoading={isLoading || dataProcessing}
        handlePageChange={handlePageChange}
        currentPage={tableData?.pagination?.page || 1}
        rowsPerPage={tableData?.pagination?.limit || 10}
        totalPages={tableData?.pagination?.totalPages || 1}
        handleChangeRowsPerPage={handleChangeRowsPerPage}
        totalRecords={tableData?.pagination?.total || 0}
        onFilterClick={handleFilterClick}
        handleTableSearch={handleTableSearch}
        activeFilterColumn={activeFilterColumn}
      />

      {open && filterColumnId === 'status' && (
        <TableStatusFilterPopover
          open
          anchorEl={filterAnchorElement}
          id={filterColumnId}
          handleClose={handleCloseFilter}
          selectedStatuses={statusFilter}
          onStatusChange={handleStatusFilterChange}
          isCaseFilter={false}
        />
      )}
    </>
  );
};

export default MedicalRecords;
