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
import UserProfileTile from '@/components/Table/UserProfileTile';
import TableContainerComponent from '@/components/Table/TableContainerComponent';
import type { MedicalChronologyTableType } from './types/MedicalChronologyTableType';

import {
  type tableFilter,
  type ChronologyListResponse,
  getAllMedicalChronologies,
} from '@/api/chronologies/table';
import { useQuery } from '@tanstack/react-query';
import moment from 'moment';
import { trackEvent } from '@/utils/mixPanel/mixpanel';
import ToastAlert from '@/components/ToastAlert';
import { exportMedicalChronologyList } from '@/api/chronologies/export';

const breadcrumbItems: Array<BreadcrumbItem> = [
  {
    title: 'Medical Chronology',
  },
];

/**
 * Medical Chronology Page Component
 *
 * This component renders the Medical Chronology page, including a table displaying
 * chronology records, filters, and actions for managing records. It uses Material-UI
 * components and integrates with the application's state and navigation.
 */

const MedicalChronology: React.FC = () => {
  const navigate = useNavigate();

  const [tableData, setTableData] = useState<
    ChronologyListResponse<MedicalChronologyTableType>
  >({
    chronologies: [],
    pagination: undefined,
  });

  /**
   * State for managing table filters.
   */
  const [filters, setFilters] = useState<tableFilter>({
    page: 1,
    limit: 10,
    keyword: '',
  });
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

  // api call for medical Chronology goes here

  const {
    data: medChronologies,
    isLoading,
    isError,
    refetch,
  }: {
    data: ChronologyListResponse<MedicalChronologyTableType> | undefined;
    isLoading: boolean;
    isError: boolean;
    refetch: () => void;
  } = useQuery({
    queryKey: ['medicalChronologies', filters],
    queryFn: async () => {
      const data = await getAllMedicalChronologies(filters);
      return data;
    },
    staleTime: Infinity,
    refetchOnWindowFocus: false,
  });

  // logic of data modification goes here
  useEffect(() => {
    setDataProcessing(true);

    const listData: Array<MedicalChronologyTableType> = [];

    if (medChronologies?.chronologies?.length) {
      medChronologies?.chronologies.forEach((element) => {
        const caseItem = {
          _id: element._id,
          case: element.case,
          fileId: element.fileId,
          createdAt: element.createdAt,
          recordRetrievalDate: element.createdAt,
          medicalRecordId: element.medicalRecordId || 'NA',
          patient: {
            firstName: element?.patient?.firstName,
            lastName: element?.patient?.lastName,
            email: element?.patient?.email,
            avatar: element?.patient?.avatar || '', // Optional field for patient avatar
          },
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
        keyword: searchValue,
      }));
    }, 500);

    return (): void => clearTimeout(handler);
  }, [searchValue]);

  /**
   * Refetch data when filters change.
   */
  useEffect(() => {
    // fetch data again when filters changes
    refetch();
  }, [filters, refetch]);

  useEffect(() => {
    // Track the page view event when the component mounts
    void trackEvent('Medical Chronology Page Viewed');
  }, []);

  /**
   * Table column definitions for the Medical Chronology table.
   */
  const columns = useMemo<Array<ColumnDef<MedicalChronologyTableType>>>(
    () => [
      {
        accessorKey: 'case',
        header: 'Case ID',
        cell: (info): React.ReactNode =>
          (info.getValue() as MedicalChronologyTableType['case']).caseId,
        enableColumnFilter: false,
      },
      {
        accessorKey: 'medicalRecordId',
        header: 'Request ID',
        cell: (info): React.ReactNode => String(info.getValue()),
        enableColumnFilter: false,
      },
      {
        accessorKey: 'patient',
        header: 'Patient Name',
        cell: (info): React.ReactNode => {
          const patient =
            info.getValue() as MedicalChronologyTableType['patient'];
          return (
            <UserProfileTile
              fullName={patient?.firstName + ' ' + patient?.lastName}
              email={patient?.email || 'johndoe@example.com'}
              imageUrl={patient?.avatar || ''}
            />
          );
        },
        enableColumnFilter: false,
        sortingFn: (rowA, rowB, columnId): number => {
          // Get values without type assertions
          const valueA = rowA.getValue(columnId);
          const valueB = rowB.getValue(columnId);

          // Helper function to safely extract firstName
          const extractFirstName = (value: unknown): string => {
            if (!value || typeof value !== 'object') {
              return '';
            }

            // Using type narrowing with Record to avoid any
            const objectValue = value as Record<string, unknown>;

            // Check if it has firstName property directly
            if (
              'firstName' in objectValue &&
              typeof objectValue?.firstName === 'string'
            ) {
              return objectValue?.firstName;
            }

            // Check if it has patient property with firstName
            if (
              'patient' in objectValue &&
              objectValue?.patient &&
              typeof objectValue?.patient === 'object'
            ) {
              const patientObject = objectValue?.patient as Record<
                string,
                unknown
              >;
              if (
                'firstName' in patientObject &&
                typeof patientObject?.firstName === 'string'
              ) {
                return patientObject?.firstName;
              }
            }

            return '';
          };

          const a = extractFirstName(valueA);
          const b = extractFirstName(valueB);

          return a.localeCompare(b);
        },
      },
      {
        accessorKey: 'createdAt',
        header: 'Record Retrieval Date',
        cell: (info): React.ReactNode => {
          return moment(
            info.getValue() as string,
            'MM-DD-YYYY, hh:mm A'
          ).format('MM-DD-YYYY');
        },
        enableColumnFilter: false,
      },
      {
        accessorKey: 'createdAt',
        header: 'Chronology Generation Date',
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
                to={`/medical-chronology/timeline/${row.original._id}`}
                onClick={(event) => event.stopPropagation()}
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

  const onRowClick = (MedicalChronology: MedicalChronologyTableType): void => {
    void navigate({
      to: `/medical-chronology/timeline/${MedicalChronology._id}`,
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
    setFilters({
      ...filters,
      keyword: value,
    });
  };

  const handleExport = (): void => {
    void exportMedicalChronologyList()
      .then((response) => {
        if (response?.success === true) {
          setShowAlert({
            showAlert: true,
            type: 'success',
            message: 'Medical Chronology report has been sent to your email',
          });
        } else {
          setShowAlert({
            showAlert: true,
            type: 'error',
            message: 'Failed to export Medical Chronology report',
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
          message: 'Failed to export Medical Chronology report',
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
          <Typography variant="h4">Medical Chronology</Typography>

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
        title="Chronology Summary Table"
        columns={columns}
        onRowClick={onRowClick}
        data={tableData.chronologies}
        isLoading={isLoading || dataProcessing}
        handlePageChange={handlePageChange}
        currentPage={tableData.pagination?.page ?? 1}
        rowsPerPage={tableData.pagination?.limit ?? 10}
        totalPages={tableData.pagination?.totalPages ?? 1}
        handleChangeRowsPerPage={handleChangeRowsPerPage}
        totalRecords={tableData.pagination?.total ?? 0}
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

export default MedicalChronology;
