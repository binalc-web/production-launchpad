/**
 * Billing Chronology Page Component
 *
 * This component renders the Billing Chronology page, including a table displaying
 * billing records, filters, and actions for managing records. It uses Material-UI
 * components and integrates with the application's state and navigation.
 */

import {
  Box,
  Button,
  IconButton,
  type SelectChangeEvent,
  Typography,
} from '@mui/material';
import { Link, useNavigate } from '@tanstack/react-router';
import Breadcrumbs, { type BreadcrumbItem } from '@/components/Breadcrumbs';
import { CheckIcon, ExportIcon, EyeIcon, XIcon } from '@phosphor-icons/react';
import { useEffect, useMemo, useState } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import type { BillingChronologyTableType } from './types/BillingChronologyTableType';
import UserProfileTile from '@/components/Table/UserProfileTile';
import TableContainerComponent from '@/components/Table/TableContainerComponent';
import moment from 'moment';
import {
  type tableFilter,
  type ChronologyListResponse,
  getAllBillingChronologies,
} from '@/api/chronologies/table';
import { useQuery } from '@tanstack/react-query';
import { trackEvent } from '@/utils/mixPanel/mixpanel';
import ToastAlert from '@/components/ToastAlert';
import { exportBillingChronologyList } from '@/api/chronologies/export';

const breadcrumbItems: Array<BreadcrumbItem> = [
  {
    title: 'Billing Chronology',
  },
];

const BillingChronology: React.FC = () => {
  const navigate = useNavigate();

  /**
   * State for managing table filters.
   */
  const [filters, setFilters] = useState<tableFilter>({
    page: 1,
    limit: 10,
    keyword: '',
  });

  const [tableData, setTableData] = useState<
    ChronologyListResponse<BillingChronologyTableType>
  >({
    chronologies: [],
    pagination: undefined,
  });

  /**
   * State for managing the search input value.
   */
  const [searchValue, setSearchValue] = useState('');

  const [dataProcessing, setDataProcessing] = useState<boolean>(false);

  const [showAlert, setShowAlert] = useState<{
    showAlert: boolean;
    type: 'success' | 'error';
    message: string;
  }>({
    showAlert: false,
    type: 'success',
    message: '',
  });

  const {
    data: medChronologies,
    isLoading,
    isError,
    refetch,
  }: {
    data: ChronologyListResponse<BillingChronologyTableType> | undefined;
    isLoading: boolean;
    isError: boolean;
    refetch: () => void;
  } = useQuery({
    queryKey: ['billingChronologies', filters],
    queryFn: async () => {
      setDataProcessing(true);
      const data = await getAllBillingChronologies(filters);
      return data;
    },
    staleTime: Infinity,
    refetchOnWindowFocus: false,
  });

  // logic of data modification goes here
  useEffect(() => {
    setDataProcessing(true);
    const listData: Array<BillingChronologyTableType> = [];

    if (medChronologies?.chronologies?.length) {
      medChronologies?.chronologies.forEach((element) => {
        const caseItem: BillingChronologyTableType = {
          invoice_number: element?.invoice_number || '-',
          patient: element?.patient || '-',
          createdAt: element?.createdAt || '-',
          _id: element?._id,
          case: element?.case || { caseId: '-' },
        };
        listData.push(caseItem);
      });

      setDataProcessing(false);
      setTableData({
        chronologies: listData,
        pagination: medChronologies?.pagination,
      });
    }
    setDataProcessing(false);
  }, [medChronologies, isLoading, isError]);

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

  /**
   * Refetch data when filters change.
   */
  useEffect(() => {
    // fetch data again when filters change
    refetch();
  }, [filters, refetch]);

  useEffect(() => {
    // Track the event when the component mounts
    void trackEvent('Billing Chronology Page Viewed');
  }, []);

  /**
   * Table column definitions for the Billing Chronology table.
   */
  const columns = useMemo<Array<ColumnDef<BillingChronologyTableType>>>(
    () => [
      {
        accessorKey: 'invoice_number',
        header: 'Invoice Number',
        cell: (info): React.ReactNode => String(info.getValue()),
        enableColumnFilter: false,
      },
      {
        accessorKey: 'case',
        header: 'Case ID',
        cell: (info): React.ReactNode => {
          const caseDetails =
            info.getValue() as BillingChronologyTableType['case'];
          return String(caseDetails?.caseId || '-');
        },
        enableColumnFilter: false,
      },
      {
        accessorKey: 'patient',
        header: 'Patient Name',
        cell: (info): React.ReactNode => {
          const patientDetails =
            info.getValue() as BillingChronologyTableType['patient'];
          const fullName = `${patientDetails.firstName} ${patientDetails.lastName}`;
          return (
            <UserProfileTile
              imageUrl={patientDetails?.avatar || ''}
              fullName={fullName}
              email={patientDetails.email}
            />
          );
        },
        enableColumnFilter: false,
        sortingFn: (rowA, rowB, columnId) => {
          const a = rowA.getValue(columnId)?.firstName;
          const b = rowB.getValue(columnId)?.firstName;
          return a.localeCompare(b);
        },
      },
      {
        accessorKey: 'createdAt',
        header: 'Date of Service',
        cell: (info): React.ReactNode =>
          moment(info.getValue() as string, 'MM-DD-YYYY, hh:mm A').format(
            'MM-DD-YYYY'
          ),
        enableColumnFilter: false,
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
                onClick={(event) => event.stopPropagation()}
                to={`/billing-chronology/timeline/${row.original._id}`}
              >
                <EyeIcon />
              </IconButton>
            </Box>
          );
        },
      },
    ],
    []
  );

  const onRowClick = (billingChronology: BillingChronologyTableType): void => {
    void navigate({
      to: `/billing-chronology/timeline/${billingChronology._id}`,
    });
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
    const newRowsPerPage = parseInt(event.target.value as string, 10);
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
    setFilters({
      ...filters,
      keyword: value,
    });
  };

  const handleExport = (): void => {
    void exportBillingChronologyList()
      .then((response) => {
        if (response?.success === true) {
          setShowAlert({
            showAlert: true,
            type: 'success',
            message: 'Billing Chronology report has been sent to your email',
          });
        } else {
          setShowAlert({
            showAlert: true,
            type: 'error',
            message: 'Failed to export Billing Chronology report',
          });
        }

        setTimeout(() => {
          setShowAlert({
            showAlert: false,
            type: 'success',
            message: '',
          });
        }, 3000);
      })
      .catch(() => {
        setShowAlert({
          showAlert: true,
          type: 'error',
          message: 'Failed to export Billing Chronology report',
        });

        setTimeout(() => {
          setShowAlert({
            showAlert: false,
            type: 'error',
            message: '',
          });
        }, 3000);
      });
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
          <Typography variant="h4">Billing Chronology</Typography>
          <Box>
            <Button
              size="large"
              variant="contained"
              startIcon={<ExportIcon />}
              onClick={handleExport}
            >
              Export Report
            </Button>
          </Box>
        </Box>
      </Box>

      <TableContainerComponent
        title="Billing Summary Table"
        columns={columns}
        onRowClick={onRowClick}
        data={tableData.chronologies}
        isLoading={isLoading || dataProcessing}
        handlePageChange={handlePageChange}
        currentPage={tableData.pagination?.page || 1}
        rowsPerPage={tableData.pagination?.limit || 10}
        totalPages={tableData.pagination?.totalPages || 1}
        handleChangeRowsPerPage={handleChangeRowsPerPage}
        totalRecords={tableData.pagination?.total || 0}
        handleTableSearch={handleTableSearch}
        activeFilterColumn={null}
      />

      <ToastAlert
        placement="right"
        severity={showAlert.type}
        showAlert={showAlert.showAlert}
        onClose={() =>
          setShowAlert({ showAlert: false, type: 'success', message: '' })
        }
        message={showAlert.message}
        icon={
          showAlert.type === 'success' ? (
            <CheckIcon weight="bold" />
          ) : (
            <XIcon weight="bold" />
          )
        }
      />
    </>
  );
};

export default BillingChronology;
