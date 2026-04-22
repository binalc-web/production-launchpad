import { type FC, useCallback, useEffect, useMemo, useState } from 'react';
import TableAssigneePopover from '@/components/Table/TableAssigneePopover';
import TableContainerComponent from '@/components/Table/TableContainerComponent';
import TableStatusFilterPopover from '@/components/Table/TableStatusFilterPopover';
import type { ColumnDef } from '@tanstack/react-table';
import UserProfileTile from '@/components/Table/UserProfileTile';
import { Box, Chip, IconButton, type SelectChangeEvent } from '@mui/material';
import { EyeIcon, PencilSimpleIcon } from '@phosphor-icons/react';
import { useQuery } from '@tanstack/react-query';
import type { pagination } from '../types/pagination';
import type {
  caseAssigneeDetails,
  casePatientDetails,
  CaseTableType,
} from '../types/caseTableType';
import type { caseFilters } from '../types/caseFilters';
import {
  type caseListResponse,
  getAllCases,
} from '@/api/caseManagement/getAllCases';
import moment from 'moment';
import { Link, useNavigate } from '@tanstack/react-router';
import { getCaseType } from '@/utils/caseType';
import { formatPhoneNumber } from '@/utils/phoneUtilities';
import { getColors } from './view/PatientInfo';
import { trackEvent } from '@/utils/mixPanel/mixpanel';
import { useAuth } from '@/context/auth/useAuth';

/**
 * Case List component that displays a table of medical cases with filtering and pagination
 * @component
 * @description Renders a data table that shows case information including patient details,
 * case status, assignee information, and action buttons. Provides functionality for:
 * - Pagination and rows per page selection
 * - Filtering by case status and assignee
 * - Searching across case data
 * - Sorting by different columns
 *
 *
 * Uses TanStack Table for table rendering and management
 * @returns {React.ReactElement} The rendered CaseList component
 */
const CaseList: FC = () => {
  const navigate = useNavigate();

  const [caseTableData, setCaseTableData] = useState<{
    cases: Array<CaseTableType>;
    pagination?: pagination;
  }>({
    cases: [],
    pagination: undefined,
  });

  const [filters, setFilters] = useState<caseFilters>({
    page: 1,
    limit: 10,
    searchKeyWordString: undefined,
    status: undefined,
    assignees: undefined,
  });

  const [filterAnchorElement, setFilterAnchorElement] =
    useState<HTMLElement | null>(null);
  const [filterColumnId, setFilterColumnId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<Array<string>>([]);
  const [assigneeFilter, setAssigneeFilter] = useState<Array<string>>([]);
  const [searchValue, setSearchValue] = useState('');
  const [dataProcessing, setDataProcessing] = useState<boolean>(false);

  const { basicUserDetails } = useAuth();
  const role = basicUserDetails?.role || 'legal_user';

  const [activeFilterColumn, setActiveFilterColumn] =
    useState<Array<string> | null>(null);
  const open = Boolean(filterAnchorElement);

  useEffect(() => {
    void trackEvent(`Case list page loaded`);
  }, []);

  const columns = useMemo<Array<ColumnDef<CaseTableType>>>(
    () => [
      {
        accessorKey: 'caseId',
        header: 'Case ID',
        cell: (info): React.ReactNode => String(info.getValue()),
        enableColumnFilter: false,
      },
      {
        accessorKey: 'patient',
        header: 'Patient Name',
        cell: ({ getValue }): React.ReactNode => {
          const patientDetails = getValue() as CaseTableType['patient'];
          return (
            <UserProfileTile
              imageUrl={patientDetails?.avatar || undefined}
              fullName={`${patientDetails?.firstName} ${patientDetails?.lastName}`}
              email={patientDetails.email}
            />
          );
        },
        enableColumnFilter: false,
        sortingFn: (rowA, rowB, columnId): number => {
          const patientA: casePatientDetails = rowA.getValue(columnId);
          const patientB: casePatientDetails = rowB.getValue(columnId);
          const a = `${patientA.firstName} ${patientA.lastName}`;
          const b = `${patientB.firstName} ${patientB.lastName}`;
          return a.localeCompare(b);
        },
      },
      {
        accessorKey: 'patient',
        header: 'Phone',
        cell: (info): React.ReactNode =>
          (info.getValue() as casePatientDetails).contact
            ? formatPhoneNumber((info.getValue() as casePatientDetails).contact)
            : 'NA',
        enableColumnFilter: false,
      },
      {
        accessorKey: 'caseStatus',
        header: 'Case Status',
        cell: (info): React.ReactNode => {
          const value = info.getValue();
          return (
            <Chip
              sx={{
                ...getColors(value as string),
                border: `1px solid`,
                p: 0.5,
                fontWeight: 500,
                fontSize: '0.875rem',
                height: 24,
              }}
              label={getCaseType((value as string).toString())}
            />
          );
        },
        enableColumnFilter: true,
        filterFn: 'includesString',
      },
      {
        accessorKey: 'caseStartEndDate',
        header: 'Case Start - End Date',
        cell: (info): React.ReactNode =>
          info.getValue() as string | number | null,
        enableColumnFilter: false,
      },
      {
        accessorKey: 'assigneeDetails',
        header: 'Assignee',
        cell: ({ getValue }): React.ReactNode => {
          const assigneeDetails =
            getValue() as CaseTableType['assigneeDetails'];
          return (
            <UserProfileTile
              fullName={assigneeDetails?.assigneeName}
              imageUrl={assigneeDetails?.assigneeAvatar}
            />
          );
        },
        filterFn: 'includesString',
        sortingFn: (rowA, rowB, columnId): number => {
          const assigneeA: caseAssigneeDetails = rowA.getValue(columnId);
          const assigneeB: caseAssigneeDetails = rowB.getValue(columnId);
          const a = assigneeA.assigneeName ?? '';
          const b = assigneeB?.assigneeName ?? '';
          return a.localeCompare(b);

          return a.localeCompare(b);
        },
      },
      {
        id: 'actions',
        header: 'Actions',
        cell: ({ row }): React.ReactNode => {
          return (
            <Box>
              <IconButton
                size="small"
                variant="soft"
                component={Link}
                to={`/case-management/view/${row.original.caseId}`}
                onClick={(event) => event.stopPropagation()}
              >
                <EyeIcon size={24} />
              </IconButton>
              {role === 'legal_user' && (
                <IconButton
                  size="small"
                  variant="soft"
                  component={Link}
                  to={`/case-management/edit/${row.original.caseId}`}
                  onClick={(event) => event.stopPropagation()}
                >
                  <PencilSimpleIcon size={24} />
                </IconButton>
              )}
            </Box>
          );
        },
      },
    ],
    []
  );

  const {
    data: caseList,
    isLoading,
    isError,
    refetch,
  }: {
    data: caseListResponse | undefined;
    isLoading: boolean;
    isError: boolean;
    refetch: () => void;
  } = useQuery({
    queryKey: ['cases'],
    queryFn: async () => {
      const data = await getAllCases(filters);
      return data;
    },
    staleTime: Infinity,
    refetchOnWindowFocus: false,
  });

  useEffect(() => {
    setDataProcessing(true);
    const caseListData: Array<CaseTableType> = [];

    caseList?.cases?.forEach((element) => {
      const caseItem: CaseTableType = {
        caseId: element.caseId,
        patient: {
          firstName: element?.patient?.firstName,
          lastName: element?.patient?.lastName,
          email: element?.patient?.email,
          contact: element?.patient?.contact,
          avatar: element?.patient?.avatar,
        },
        caseStatus: element.status,
        assigneeDetails: {
          assigneeName: `${element.assignee?.firstName} ${element.assignee?.lastName}`,
          assigneeEmail: element.assignee?.email,
          assigneeAvatar: element.assignee?.avatar,
        },
        caseStartEndDate: `${moment(element.startDate).format('YYYY-MM-DD')} - ${element.endDate ? moment(element.endDate).format('YYYY-MM-DD') : 'N/A'}`,
      };
      caseListData.push(caseItem);
      setDataProcessing(false);
    });
    setDataProcessing(false);

    setCaseTableData({
      cases: caseListData,
      pagination: caseList?.pagination,
    });
  }, [caseList, isLoading, isError]);

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
    refetch();
  }, [filters, refetch]);

  /**
   * Updates the active filter column state based on filter values
   * @function
   * @description Manages which columns have active filters applied to them
   * This affects the UI indication of active filters in the table header
   * @param {string} columnId - ID of the column to update filter status for
   */
  const updateActiveFilterColumn = useCallback(
    (columnId: string): void => {
      setActiveFilterColumn((previous) => {
        const shouldAdd =
          (columnId === 'caseStatus' && statusFilter.length > 0) ||
          (columnId === 'assigneeDetails' && assigneeFilter.length > 0);

        if (shouldAdd) {
          if (previous?.includes(columnId)) return previous;
          return previous ? [...previous, columnId] : [columnId];
        } else {
          return previous ? previous.filter((id) => id !== columnId) : null;
        }
      });
    },
    [statusFilter, assigneeFilter, setActiveFilterColumn]
  );

  const onRowClick = (caseData: CaseTableType): void => {
    void navigate({ to: `/case-management/view/${caseData.caseId}` });
  };

  useEffect(() => {
    updateActiveFilterColumn('caseStatus');
  }, [statusFilter, updateActiveFilterColumn]);

  useEffect(() => {
    updateActiveFilterColumn('assigneeDetails');
  }, [assigneeFilter, updateActiveFilterColumn]);

  /**
   * Handles pagination page changes
   * @function
   * @description Updates the filters state with the new page number
   * @param {unknown} _event - The event object (unused)
   * @param {number} newPage - The new page number to navigate to
   */
  const handlePageChange = (_event: unknown, newPage: number): void => {
    setFilters({
      ...filters,
      page: newPage,
    });
  };

  /**
   * Handles changes to the number of rows displayed per page
   * @function
   * @description Updates the filters with the new rows per page value and resets to page 1
   * @param {SelectChangeEvent<number>} event - The select change event
   */
  const handleChangeRowsPerPage = (event: SelectChangeEvent<number>): void => {
    const newRowsPerPage = parseInt(event.target.value as string, 10);
    setFilters({
      ...filters,
      page: 1,
      limit: newRowsPerPage,
    });
  };

  /**
   * Handles clicking on a column filter button
   * @function
   * @description Opens the filter popover for the selected column and updates active filter state
   * @param {HTMLElement | null} anchorEl - The element to anchor the popover to
   * @param {string} columnId - ID of the column being filtered
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
   * Handles closing a filter popover
   * @function
   * @description Closes the filter popover and updates active filter state if necessary
   * @param {string} columnId - ID of the column whose filter is being closed
   */
  const handleCloseFilter = (columnId: string): void => {
    if (
      (columnId === 'caseStatus' && statusFilter.length <= 0) ||
      (columnId === 'assigneeDetails' && assigneeFilter.length <= 0)
    ) {
      setActiveFilterColumn((previous) =>
        previous ? previous.filter((id) => id !== columnId) : null
      );
    }
    setFilterAnchorElement(null);
    setFilterColumnId(null);
  };

  /**
   * Handles changes to case status filter selection
   * @function
   * @description Updates the status filter state and applies it to the data filters
   * @param {string[]} values - Array of selected status values
   */
  const handleStatusFilterChange = (values: Array<string>): void => {
    setStatusFilter(values);
    setFilters({
      ...filters,
      status: values,
    });
  };

  /**
   * Handles changes to assignee filter selection
   * @function
   * @description Updates the assignee filter state and applies it to the data filters
   * @param {string[]} values - Array of selected assignee IDs
   */
  const handleAssigneeFilterChange = (values: Array<string>): void => {
    setAssigneeFilter(values);
    setFilters({
      ...filters,
      assignees: values,
    });
  };

  /**
   * Handles search input changes
   * @function
   * @description Updates the search value state which will trigger a search after debounce
   * @param {string} value - The search query string
   */
  const handleTableSearch = (value: string): void => {
    setSearchValue(value);
  };

  return (
    <>
      <TableContainerComponent
        title="Case Summary Table"
        onRowClick={onRowClick}
        columns={columns}
        data={caseTableData.cases}
        isLoading={isLoading || dataProcessing}
        handlePageChange={handlePageChange}
        currentPage={caseTableData.pagination?.page ?? 1}
        rowsPerPage={caseTableData.pagination?.limit ?? 10}
        totalPages={caseTableData.pagination?.totalPages ?? 1}
        handleChangeRowsPerPage={handleChangeRowsPerPage}
        totalRecords={caseTableData.pagination?.total ?? 0}
        onFilterClick={handleFilterClick}
        handleTableSearch={handleTableSearch}
        activeFilterColumn={activeFilterColumn}
      />
      {open && filterColumnId === 'caseStatus' && (
        <TableStatusFilterPopover
          open
          anchorEl={filterAnchorElement}
          id={filterColumnId}
          handleClose={handleCloseFilter}
          selectedStatuses={statusFilter}
          onStatusChange={handleStatusFilterChange}
          isCaseFilter
        />
      )}
      {open && filterColumnId === 'assigneeDetails' && (
        <TableAssigneePopover
          open
          anchorEl={filterAnchorElement}
          id={filterColumnId}
          handleClose={handleCloseFilter}
          onAssigneeChange={handleAssigneeFilterChange}
          selectedAssignees={assigneeFilter}
        />
      )}
    </>
  );
};

export default CaseList;
