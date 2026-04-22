/**
 * Audits and Reports Page Component
 *
 * This component renders the Audits and Reports page, including a table displaying
 * audit and report records, filters, and actions for managing records. It uses Material-UI
 * components and integrates with the application's state and navigation.
 */

import { Box, Button, Typography } from '@mui/material';

import Breadcrumbs, { type BreadcrumbItem } from '@/components/Breadcrumbs';
import { CheckIcon, ExportIcon, XIcon } from '@phosphor-icons/react';
import { useEffect, useMemo, useState } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import type {
  AuditsAndReportsTableType,
  patientDetails,
} from './types/AuditsAndReportsTableType';
import UserProfileTile from '@/components/Table/UserProfileTile';
import TableContainerComponent from '@/components/Table/TableContainerComponent';
import type { caseFilters } from '../CaseManagement/types/caseFilters';

import { useQuery } from '@tanstack/react-query';
import {
  type AuditListResponse,
  exportAuditReport,
  getAllAudits,
} from '@/api/audit';
import moment from 'moment';
import { trackEvent } from '@/utils/mixPanel/mixpanel';
import ToastAlert from '@/components/ToastAlert';

const breadcrumbItems: Array<BreadcrumbItem> = [
  {
    title: 'Audit Reports',
  },
];

const AuditsAndReports: React.FC = () => {
  const [tableData, setTableData] = useState<AuditListResponse>({
    audits: [],
    pagination: undefined,
  });

  const [showAlert, setShowAlert] = useState<{
    showAlert: boolean;
    type: 'success' | 'error';
    message: string;
  }>({
    showAlert: false,
    type: 'success',
    message: '',
  });
  const [dataProcessing, setDataProcessing] = useState<boolean>(false);

  /**
   * State for managing table filters.
   */
  const [filters, setFilters] = useState<caseFilters>({
    page: 1,
    limit: 10,
    searchKeyWordString: undefined,
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

  useEffect(() => {
    void trackEvent('Audits and Reports Page Viewed');
  }, []);

  const {
    data: audiList,
    isLoading,
    isError,
    refetch,
  }: {
    data: AuditListResponse | undefined;
    isLoading: boolean;
    isError: boolean;
    refetch: () => void;
  } = useQuery({
    queryKey: ['audits'],
    queryFn: async () => {
      setDataProcessing(true);
      const data = await getAllAudits(filters);
      return data;
    },
    staleTime: Infinity,
    refetchOnWindowFocus: false,
  });

  useEffect(() => {
    setDataProcessing(true);
    const listData: Array<AuditsAndReportsTableType> = [];
    if (audiList?.audits?.length) {
      audiList?.audits.forEach((element) => {
        const caseItem: AuditsAndReportsTableType = {
          _id: element._id,
          auditId: element.auditId,
          case: element.case,
          patient: element.patient,
          actionPerformed: element.actionPerformed,
          createdAt: element.createdAt,
          actionOwner: element.actionOwner,
        };
        listData.push(caseItem);
      });
      setDataProcessing(false);

      setTableData({
        audits: listData,
        pagination: audiList?.pagination,
      });
    }
    setDataProcessing(false);
  }, [audiList, isLoading, isError]);

  /**
   * Refetch data when filters change.
   */
  useEffect(() => {
    // fetch data again when filters change
    refetch();
  }, [filters, refetch]);

  /**
   * Table column definitions for the Audits and Reports table.
   */
  const columns = useMemo<Array<ColumnDef<AuditsAndReportsTableType>>>(
    () => [
      {
        accessorKey: 'auditId',
        header: 'Audit ID',
        cell: (info): React.ReactNode => String(info.getValue()),
        enableColumnFilter: false,
      },
      {
        accessorKey: 'case',
        header: 'Case ID',
        cell: (info): React.ReactNode =>
          (info.getValue() as { caseId: string }).caseId,
        enableColumnFilter: false,
      },
      {
        accessorKey: 'actionOwner',
        header: 'Performed By',

        cell: ({ getValue }): React.ReactNode => {
          return (
            <UserProfileTile
              imageUrl={(getValue() as { avatar?: string })?.avatar || ''}
              fullName={`${(getValue() as { firstName: string; lastName: string }).firstName} ${(getValue() as { firstName: string; lastName: string }).lastName}`}
            />
          );
        },
        enableColumnFilter: false,
        sortingFn: (rowA, rowB, columnId): number => {
          const patientA: patientDetails = rowA.getValue(columnId);
          const patientB: patientDetails = rowB.getValue(columnId);

          const a = patientA.firstName ?? '';
          const b = patientB?.firstName ?? '';
          return a.localeCompare(b);
        },
      },
      {
        accessorKey: 'actionPerformed',
        header: 'Action Performed',
        cell: (info): React.ReactNode => String(info.getValue()),
        enableColumnFilter: false,
      },
      {
        accessorKey: 'createdAt',
        header: 'Date & Time',
        cell: (info): React.ReactNode =>
          moment.utc(info.getValue() as string).format('MM-DD-YYYY, h:mm A'),
        enableColumnFilter: false,
      },
      {
        accessorKey: 'patient',
        header: 'Performed For',
        cell: (info): React.ReactNode => {
          const patientDetails =
            info.getValue() as AuditsAndReportsTableType['patient'];
          const fullName = `${patientDetails.firstName} ${patientDetails.lastName}`;
          return (
            <UserProfileTile
              imageUrl={patientDetails.avatar}
              fullName={fullName}
              email={patientDetails.email}
            />
          );
        },
        enableColumnFilter: false,
        sortingFn: (rowA, rowB, columnId): number => {
          const patientA: patientDetails = rowA.getValue(columnId);
          const patientB: patientDetails = rowB.getValue(columnId);

          const a = patientA.firstName ?? '';
          const b = patientB?.firstName ?? '';
          return a.localeCompare(b);
        },
      },
    ],
    []
  );

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
   * @param {Event} event - The event object.
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
  const handleTableSearch = (value: string): void => {
    setSearchValue(value);
  };

  const handleExport = (): void => {
    void exportAuditReport()
      .then((response) => {
        if (response?.success === true) {
          setShowAlert({
            showAlert: true,
            type: 'success',
            message: 'Audit report has been sent to your email',
          });
        } else {
          setShowAlert({
            showAlert: true,
            type: 'error',
            message: 'Failed to export audit report',
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
          message: 'Failed to export audit report',
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
          <Typography variant="h4">Audit Reports</Typography>
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
        title="Audit Reports Table"
        columns={columns}
        data={tableData.audits}
        isLoading={isLoading || dataProcessing}
        handlePageChange={handlePageChange}
        currentPage={filters.page}
        rowsPerPage={filters.limit}
        totalPages={tableData.pagination?.totalPages ?? 0}
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

export default AuditsAndReports;
