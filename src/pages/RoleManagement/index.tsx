import Breadcrumbs, { type BreadcrumbItem } from '@/components/Breadcrumbs';
import {
  Box,
  Button,
  Chip,
  IconButton,
  Typography,
  type SelectChangeEvent,
} from '@mui/material';
import {
  MinusCircleIcon,
  UserCirclePlusIcon,
  XIcon,
} from '@phosphor-icons/react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';
import type { patientFilters } from './types/patientFilters';
import {
  getAllPatients,
  type patientListResponse,
} from '@/api/roleManagement/getAllPatients';
import type { ColumnDef } from '@tanstack/react-table';
import type {
  patientDetails,
  PatientTableType,
} from './types/patientTableType';
import type { pagination } from '../CaseManagement/types/pagination';
import TableContainerComponent from '@/components/Table/TableContainerComponent';
import UserProfileTile from '@/components/Table/UserProfileTile';
import { formatPhoneNumber } from '@/utils/phoneUtilities';
import InvitePatient from './Components/InvitePatient';
import { PopUp } from '@/components/Popup';
import { deletePatientApi } from '@/api/roleManagement/deletePatient';
import ToastAlert from '@/components/ToastAlert';
import { trackEvent } from '@/utils/mixPanel/mixpanel';

const breadcrumbItems: Array<BreadcrumbItem> = [
  {
    title: 'Role Management',
  },
];

const RolesManagement: React.FC = () => {
  // Using useNavigate from @tanstack/react-router to handle navigation

  const [patientTableData, setPatientTableData] = useState<{
    patients: Array<PatientTableType>;
    pagination?: pagination;
  }>({
    patients: [],
    pagination: undefined,
  });

  const [filters, setFilters] = useState<patientFilters>({
    page: 1,
    limit: 10,
    searchKeyWordString: undefined,
  });
  const [searchValue, setSearchValue] = useState('');

  const [showDeletePatientPopup, setShowDeletePatientPopup] =
    useState<boolean>(false);
  const [selectedPatientToDelete, setSelectedPatientToDelete] = useState<
    string | null
  >();

  const [showInvitationModal, setShowInvitationModal] = useState(false);
  const [showError, setShowError] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [dataProcessing, setDataProcessing] = useState<boolean>(false);

  const handleClose = (): void => {
    setShowInvitationModal(false);
  };

  const handleOpen = (): void => {
    void trackEvent('Invite User Button Clicked');
    setShowInvitationModal(true);
  };

  const {
    data: patientList,
    isLoading,
    isError,
    refetch,
  }: {
    data: patientListResponse | undefined;
    isLoading: boolean;
    isError: boolean;
    refetch: () => void;
  } = useQuery({
    queryKey: ['patients'],
    queryFn: async () => {
      const data = await getAllPatients(filters);
      setDataProcessing(true);
      return data;
    },
    staleTime: Infinity,
    refetchOnWindowFocus: false,
  });

  const {
    mutate,
    isError: errorWhileDeletePatient,
    error,
    isSuccess,
  } = useMutation({
    mutationFn: async (email: string) => {
      // Call the API to delete the patient
      const response = await deletePatientApi({ email });
      return response;
    },
    onSuccess: () => {
      void trackEvent('Patient Deleted');
      refetch();
      //reset();
      //handleClose();
    },
    onError: (error) => {
      console.error('Error inviting patient:', error);
    },
  });

  useEffect(() => {
    if (isSuccess) {
      setShowSuccess(true);
      setTimeout(() => {
        setShowSuccess(false);
      }, 3000);
    }
    if (errorWhileDeletePatient) {
      setShowError(true);
      setTimeout(() => {
        setShowError(false);
      }, 3000);
    }
  }, [isSuccess, errorWhileDeletePatient]);

  useEffect(() => {
    void trackEvent('Role Management Page Viewed');
  }, []);

  const columns = useMemo<Array<ColumnDef<PatientTableType>>>(
    () => [
      {
        accessorKey: 'patientDetails',
        header: 'Patient Name',
        cell: ({ getValue }): React.ReactNode => {
          const patientDetails =
            getValue() as PatientTableType['patientDetails'];
          return (
            <UserProfileTile
              imageUrl={patientDetails?.avatar || ''}
              fullName={patientDetails.name}
              email={patientDetails.email}
            />
          );
        },
        enableColumnFilter: false,
        sortingFn: (rowA, rowB, columnId): number => {
          const patientDetailsA: patientDetails = rowA.getValue(columnId);
          const patientDetailsB: patientDetails = rowB.getValue(columnId);

          const a = patientDetailsA?.name ?? '';
          const b = patientDetailsB?.name ?? '';
          return a.localeCompare(b);
        },
      },
      {
        accessorKey: 'contact',
        header: 'Phone',
        cell: (info): React.ReactNode =>
          info.getValue() ? formatPhoneNumber(info.getValue() as string) : 'NA',
        enableColumnFilter: false,
      },
      {
        accessorKey: 'role',
        header: 'User Type',
        cell: (info): React.ReactNode => {
          const value = info.getValue() as string;
          const capitalized = value.charAt(0).toUpperCase() + value.slice(1);
          return (
            <Chip
              sx={{
                color: '#00A92A',
                backgroundColor: '#EEFFF1',
                borderColor: '#B2FFC4',
                border: `1px solid`,
                p: 1.5,
                fontWeight: 500,
                fontSize: '0.875rem',
                height: 24,
              }}
              label={capitalized}
            />
          );
        },
        enableColumnFilter: false,
        filterFn: 'includesString',
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
                onClick={() => {
                  const email = row.original.patientDetails.email;
                  setShowDeletePatientPopup(true);
                  setSelectedPatientToDelete(email);
                }}
              >
                <MinusCircleIcon />
              </IconButton>
            </Box>
          );
        },
      },
    ],
    []
  );

  useEffect(() => {
    setDataProcessing(true);
    const patientListData: Array<PatientTableType> = [];

    patientList?.patients?.forEach((element) => {
      const patient: PatientTableType = {
        patientDetails: {
          name: `${element.firstName} ${element.lastName}`,
          email: element.email,
          avatar: element.avatar || '',
        },
        contact: element.contact,
        role: element.role,
      };
      patientListData.push(patient);
    });

    setDataProcessing(false);
    setPatientTableData({
      patients: patientListData,
      pagination: patientList?.pagination,
    });
  }, [patientList, isLoading, isError]);

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
    const newRowsPerPage = parseInt(event.target.value.toString(), 10);
    setFilters({
      ...filters,
      page: 1,
      limit: newRowsPerPage,
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
          <Typography variant="h4">Role Management</Typography>
          <Box>
            <Button
              size="large"
              variant="contained"
              startIcon={<UserCirclePlusIcon />}
              onClick={handleOpen}
            >
              Invite User
            </Button>
          </Box>
        </Box>
      </Box>

      <TableContainerComponent
        title="User Summary Table"
        columns={columns}
        data={patientTableData.patients}
        isLoading={isLoading || dataProcessing}
        handlePageChange={handlePageChange}
        currentPage={
          patientTableData.pagination?.page
            ? patientTableData.pagination.page
            : 1
        }
        rowsPerPage={
          patientTableData.pagination?.limit
            ? patientTableData.pagination.limit
            : 10
        }
        totalPages={
          patientTableData.pagination?.totalPages
            ? patientTableData.pagination.totalPages
            : 1
        }
        handleChangeRowsPerPage={handleChangeRowsPerPage}
        totalRecords={
          patientTableData.pagination?.total
            ? patientTableData.pagination.total
            : 0
        }
        handleTableSearch={handleTableSearch}
        activeFilterColumn={null}
      />

      <InvitePatient handleClose={handleClose} open={showInvitationModal} />

      {showDeletePatientPopup ? (
        <PopUp
          type="DELETETASK"
          cancelText="No, Not yet"
          title={
            <Typography fontWeight={600} fontSize={24} variant="h2">
              Are you sure you want to remove invited user?
            </Typography>
          }
          buttonText="Yes, remove"
          isOpen={showDeletePatientPopup}
          description=""
          onCancel={() => {
            setShowDeletePatientPopup(false);
            setSelectedPatientToDelete(null);
          }}
          onClick={() => {
            setShowDeletePatientPopup(false);
            setSelectedPatientToDelete(null);
            mutate(selectedPatientToDelete as string);
          }}
        />
      ) : null}

      {showError ? (
        <ToastAlert
          placement="right"
          severity="error"
          showAlert={showError}
          onClose={() => {
            setShowError(false);
          }}
          message={
            error instanceof Error
              ? error.message
              : 'Failed to delete user. Please try again.'
          }
          icon={<XIcon weight="bold" />}
        />
      ) : null}

      {showSuccess ? (
        <ToastAlert
          placement="right"
          severity="success"
          showAlert={showSuccess}
          onClose={() => {
            setShowSuccess(false);
          }}
          message="User has been removed from the list successfully!"
          body="All changes have been saved and synced in the system."
          icon={<XIcon weight="bold" />}
        />
      ) : null}
    </>
  );
};

export default RolesManagement;
