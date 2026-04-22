import {
  Box,
  IconButton,
  type SelectChangeEvent,
  Typography,
} from '@mui/material';
import { useNavigate } from '@tanstack/react-router';
import Breadcrumbs, { type BreadcrumbItem } from '@/components/Breadcrumbs';
import { CheckIcon, EyeIcon, FilesIcon, XIcon } from '@phosphor-icons/react';
import { useEffect, useMemo, useState } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import UserProfileTile from '@/components/Table/UserProfileTile';
import TableContainerComponent from '@/components/Table/TableContainerComponent';
import type { MasterChronologyTableType } from './types/MasterChronologyTableType';
import {
  type tableFilter,
  type ChronologyListResponse,
  getAllMasterChronologies,
} from '@/api/chronologies/table';
import { useQuery } from '@tanstack/react-query';
import moment from 'moment';
import ToastAlert from '@/components/ToastAlert';

const breadcrumbItems: Array<BreadcrumbItem> = [
  {
    title: 'Master Chronology',
  },
];

/**
 * Converts a snake_case string to Title Case.
 * e.g. "insurance_claim" → "Insurance Claim"
 */
const formatCaseType = (caseType: string): string =>
  caseType
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

/**
 * Master Chronology Page Component
 *
 * Renders the Master Chronology listing page with a summary table showing
 * chronology name, case ID & type, patient, generation date, document count, and actions.
 */
const MasterChronology: React.FC = () => {
  const navigate = useNavigate();

  const [tableData, setTableData] = useState<
    ChronologyListResponse<MasterChronologyTableType>
  >({
    chronologies: [],
    pagination: undefined,
  });

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

  const {
    data: masterChronologies,
    isLoading,
    isError,
    refetch,
  }: {
    data: ChronologyListResponse<MasterChronologyTableType> | undefined;
    isLoading: boolean;
    isError: boolean;
    refetch: () => void;
  } = useQuery({
    queryKey: ['masterChronologies', filters],
    queryFn: async () => {
      const data = await getAllMasterChronologies(filters);
      return data;
    },
    staleTime: Infinity,
    refetchOnWindowFocus: false,
  });

  useEffect(() => {
    setDataProcessing(true);

    const listData: Array<MasterChronologyTableType> = [];

    if (masterChronologies?.chronologies?.length) {
      masterChronologies.chronologies.forEach((element) => {
        listData.push({
          _id: element._id,
          name: element.name,
          createdAt: element.createdAt,
          case: {
            _id: element.case?._id,
            caseId: element.case?.caseId,
            title: element.case?.title,
            caseType: element.case?.caseType,
          },
          patient: {
            _id: element.patient?._id,
            firstName: element.patient?.firstName,
            lastName: element.patient?.lastName,
            email: element.patient?.email,
            contact: element.patient?.contact,
            avatar: element.patient?.avatar,
          },
          sourceDocumentCount: element.sourceDocumentCount ?? 0,
        });
      });

      setTableData({
        chronologies: listData,
        pagination: masterChronologies.pagination,
      });
    } else if (masterChronologies) {
      // API responded but returned an empty array — clear the table
      setTableData({
        chronologies: [],
        pagination: masterChronologies.pagination,
      });
    }

    setDataProcessing(false);
  }, [masterChronologies, isLoading, isError]);

  const [searchValue, setSearchValue] = useState('');

  useEffect(() => {
    const handler = setTimeout(() => {
      setFilters((previous) => ({
        ...previous,
        keyword: searchValue,
        page: 1, // reset to first page on every new search
      }));
    }, 500);

    return (): void => clearTimeout(handler);
  }, [searchValue]);

  useEffect(() => {
    refetch();
  }, [filters, refetch]);

  const columns = useMemo<Array<ColumnDef<MasterChronologyTableType>>>(
    () => [
      {
        accessorKey: 'name',
        header: 'Chronology Name',
        cell: (info): React.ReactNode => (
          <Typography variant="body2" fontWeight={500}>
            {String(info.getValue())}
          </Typography>
        ),
        enableColumnFilter: false,
      },
      {
        accessorKey: 'case',
        header: 'Case ID & Type',
        cell: (info): React.ReactNode => {
          const caseData = info.getValue() as MasterChronologyTableType['case'];
          return (
            <Box>
              <Typography variant="body2" fontWeight={600}>
                {caseData?.caseId}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {formatCaseType(caseData?.caseType ?? '')}
              </Typography>
            </Box>
          );
        },
        enableColumnFilter: false,
      },
      {
        accessorKey: 'patient',
        header: 'Patient',
        cell: (info): React.ReactNode => {
          const patient =
            info.getValue() as MasterChronologyTableType['patient'];
          return (
            <UserProfileTile
              fullName={`${patient?.firstName} ${patient?.lastName}`}
              email={patient?.email || ''}
              imageUrl={patient?.avatar || ''}
            />
          );
        },
        enableColumnFilter: false,
        sortingFn: (rowA, rowB, columnId): number => {
          const extractFirstName = (value: unknown): string => {
            if (!value || typeof value !== 'object') return '';
            const object = value as Record<string, unknown>;
            if ('firstName' in object && typeof object.firstName === 'string') {
              return object.firstName;
            }
            return '';
          };
          return extractFirstName(rowA.getValue(columnId)).localeCompare(
            extractFirstName(rowB.getValue(columnId))
          );
        },
      },
      {
        accessorKey: 'createdAt',
        header: 'Chronology Generated On',
        cell: (info): React.ReactNode =>
          moment(info.getValue() as string, 'MM-DD-YYYY, hh:mm A').format(
            'MM-DD-YYYY'
          ),
        enableColumnFilter: false,
      },
      {
        accessorKey: 'sourceDocumentCount',
        header: 'Documents',
        cell: (info): React.ReactNode => {
          const count = info.getValue() as number;
          return (
            <Box
              display="inline-flex"
              alignItems="center"
              gap={0.75}
              sx={{
                px: 1.25,
                py: 0.5,
                border: '1px solid',
                borderColor: 'divider',
                borderRadius: 1,
                backgroundColor: '#EDEEF1',
              }}
            >
              <FilesIcon size={20} />
              <Typography variant="body2" fontWeight={500}>
                {count}
              </Typography>
            </Box>
          );
        },
        enableColumnFilter: false,
      },
      {
        id: 'actions',
        header: 'Actions',
        cell: ({ row }): React.ReactNode => {
          const mongoId = row.original._id;
          return (
            <Box>
              <IconButton
                size="medium"
                variant="soft"
                onClick={(event: React.MouseEvent) => {
                  event.stopPropagation();
                  void navigate({
                    to: `/master-chronology/timeline/${mongoId}`,
                  });
                }}
              >
                <EyeIcon />
              </IconButton>
            </Box>
          );
        },
      },
    ],
    [filters]
  );

  const onRowClick = (row: MasterChronologyTableType): void => {
    const mongoId = row._id;
    void navigate({
      to: `/master-chronology/timeline/${mongoId}`,
    });
  };

  const handlePageChange = (_event: unknown, newPage: number): void => {
    setFilters({ ...filters, page: newPage });
  };

  const handleChangeRowsPerPage = (event: SelectChangeEvent<number>): void => {
    const newRowsPerPage = parseInt(event.target.value.toString(), 10);
    setFilters({ ...filters, page: 1, limit: newRowsPerPage });
  };

  const handleTableSearch = (value: string): void => {
    setSearchValue(value);
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
          <Typography variant="h4">Master Chronology</Typography>
          {/* TODO: Add export button later when we have the export functionality */}
          {/* <Box>
            <Button
              size="large"
              variant="contained"
              startIcon={<ExportIcon />}
              onClick={() => console.log('export called')}
            >
              Export Report
            </Button>
          </Box> */}
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

export default MasterChronology;
