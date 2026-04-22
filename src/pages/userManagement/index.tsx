import Breadcrumbs, { type BreadcrumbItem } from '@/components/Breadcrumbs';
import {
  Box,
  Chip,
  Switch,
  Typography,
  type SelectChangeEvent,
} from '@mui/material';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';
import type { patientFilters } from './types/patientFilters';
import type { ColumnDef } from '@tanstack/react-table';
import type { userDetails, UserTableType } from './types/userTableType';
import type { pagination } from '../CaseManagement/types/pagination';
import TableContainerComponent from '@/components/Table/TableContainerComponent';
import UserProfileTile from '@/components/Table/UserProfileTile';
import { formatPhoneNumber } from '@/utils/phoneUtilities';
import { PopUp } from '@/components/Popup';
import ToastAlert from '@/components/ToastAlert';
import { trackEvent } from '@/utils/mixPanel/mixpanel';
import {
  getAllUsers,
  type userListResponse,
} from '@/api/userManagement/getAllUsers';
import { XIcon } from '@phosphor-icons/react';
import { roles } from '../Register/steps/data';
import { changeActivationStatus } from '@/api/userManagement/changeActivationStatus';

const breadcrumbItems: Array<BreadcrumbItem> = [
  {
    title: 'Users Management',
  },
];

const UserManagement: React.FC = () => {
  // Using useNavigate from @tanstack/react-router to handle navigation

  const [usersTableData, setUsersTableData] = useState<{
    users: Array<UserTableType>;
    pagination?: pagination;
  }>({
    users: [],
    pagination: undefined,
  });

  const [filters, setFilters] = useState<patientFilters>({
    page: 1,
    limit: 10,
    searchKeyWordString: undefined,
  });
  const [searchValue, setSearchValue] = useState('');

  const [showUpdateUserActivationPopup, setShowUpdateUserActivationPopup] =
    useState<boolean>(false);
  const [
    selectedUserToUpdateActivationStatus,
    setSelectedUserToUpdateActivationStatus,
  ] = useState<{
    userId: string;
    action: string;
  } | null>();

  // const [showInvitationModal, setShowInvitationModal] = useState(false);
  const [showError, setShowError] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [dataProcessing, setDataProcessing] = useState<boolean>(false);

  // const handleClose = (): void => {
  //   setShowInvitationModal(false);
  // };

  // const handleOpen = (): void => {
  //   void trackEvent('Invite User Button Clicked');
  //   setShowInvitationModal(true);
  // };

  const {
    data: userList,
    isLoading,
    isError,
    refetch,
  }: {
    data: userListResponse | undefined;
    isLoading: boolean;
    isError: boolean;
    refetch: () => void;
  } = useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      const data = await getAllUsers(filters);
      setDataProcessing(true);
      return data;
    },
    staleTime: Infinity,
    refetchOnWindowFocus: false,
  });

  const {
    mutate,
    isError: errorWhileUpdateUser,
    error,
    isSuccess,
  } = useMutation({
    mutationFn: async ({
      userId,
      action,
    }: {
      userId: string;
      action: string;
    }) => {
      // Call the API to update activation status the user
      const response = await changeActivationStatus({ userId, action });
      return response;
    },
    onSuccess: () => {
      void trackEvent('User Activation Status Updated');
      refetch();
      //reset();
      //handleClose();
    },
    onError: (error) => {
      console.error('Error updating status:', error);
    },
  });

  useEffect(() => {
    if (isSuccess) {
      setShowSuccess(true);
      setTimeout(() => {
        setShowSuccess(false);
      }, 3000);
    }
    if (errorWhileUpdateUser) {
      setShowError(true);
      setTimeout(() => {
        setShowError(false);
      }, 3000);
    }
  }, [isSuccess, errorWhileUpdateUser]);

  useEffect(() => {
    void trackEvent('User Management Page Viewed');
  }, []);

  const columns = useMemo<Array<ColumnDef<UserTableType>>>(
    () => [
      {
        accessorKey: 'userDetails',
        header: 'User Name',
        cell: ({ getValue }): React.ReactNode => {
          const userDetails = getValue() as UserTableType['userDetails'];
          return (
            <UserProfileTile
              imageUrl={userDetails?.avatar || ''}
              fullName={userDetails.name}
              email={userDetails.email}
            />
          );
        },
        enableColumnFilter: false,
        sortingFn: (rowA, rowB, columnId): number => {
          const userDetailsA: userDetails = rowA.getValue(columnId);
          const userDetailsB: userDetails = rowB.getValue(columnId);

          const a = userDetailsA?.name ?? '';
          const b = userDetailsB?.name ?? '';
          return a.localeCompare(b);
        },
      },
      {
        accessorKey: 'contact',
        header: 'Phone',
        cell: (info): React.ReactNode => {
          // console.log('info.getValue()', info.getValue());
          const value = info.getValue() as string | null | undefined;
          if (value) {
            const formattedPhone = formatPhoneNumber(info.getValue() as string);
            return formattedPhone;
          }
          return '-';
        },
        enableColumnFilter: false,
      },
      {
        accessorKey: 'role',
        header: 'User Type',
        cell: (info): React.ReactNode => {
          const value = info.getValue() as string;
          const role = roles.find((r) => r.role === value)?.title ?? '';

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
              label={role || 'N/A'}
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
              <Switch
                size="small"
                checked={row.original.isDeactivated === false}
                onChange={(event): void => {
                  event.stopPropagation();
                  setSelectedUserToUpdateActivationStatus({
                    userId: row.original.userId,
                    action:
                      row.original.isDeactivated === false
                        ? 'deActivate'
                        : 'activate',
                  });
                  setShowUpdateUserActivationPopup(true);
                  // const temporaryUsers = usersTableData.users;
                  // temporaryUsers[row.index].isDeactivated =
                  //   row.original.isDeactivated === false ? true : false;

                  // setUsersTableData({
                  //   ...usersTableData,
                  //   users: [...temporaryUsers],
                  // });
                }}
              />
            </Box>
          );
        },
      },
    ],
    []
  );

  useEffect(() => {
    setDataProcessing(true);
    const userListData: Array<UserTableType> = [];

    userList?.users?.forEach((element) => {
      const user: UserTableType = {
        userDetails: {
          name: `${element.firstName} ${element.lastName}`,
          email: element.email,
          avatar: element.avatar || '',
        },
        contact: element.contact,
        role: element.role,
        userId: element._id,
        isDeactivated: element.isDeactivated || false,
      };
      userListData.push(user);
    });

    setDataProcessing(false);
    setUsersTableData({
      users: userListData,
      pagination: userList?.pagination,
    });
  }, [userList, isLoading, isError]);

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
          <Typography variant="h4">Users Management</Typography>
        </Box>
      </Box>

      <TableContainerComponent
        title="User Summary Table"
        columns={columns}
        data={usersTableData.users}
        isLoading={isLoading || dataProcessing}
        handlePageChange={handlePageChange}
        currentPage={
          usersTableData.pagination?.page ? usersTableData.pagination.page : 1
        }
        rowsPerPage={
          usersTableData.pagination?.limit
            ? usersTableData.pagination.limit
            : 10
        }
        totalPages={
          usersTableData.pagination?.totalPages
            ? usersTableData.pagination.totalPages
            : 1
        }
        handleChangeRowsPerPage={handleChangeRowsPerPage}
        totalRecords={
          usersTableData.pagination?.total ? usersTableData.pagination.total : 0
        }
        handleTableSearch={handleTableSearch}
        activeFilterColumn={null}
      />

      {showUpdateUserActivationPopup ? (
        <PopUp
          type="DELETETASK"
          cancelText="No, Not yet"
          title={
            <Typography fontWeight={600} fontSize={24} variant="h2">
              {`Are you sure you want ${selectedUserToUpdateActivationStatus?.action === 'activate' ? 'reactivate' : 'deactivate'} to user?`}
            </Typography>
          }
          buttonText={`Yes, ${selectedUserToUpdateActivationStatus?.action === 'activate' ? 'reactivate' : 'deactivate'}`}
          isOpen={showUpdateUserActivationPopup}
          description=""
          onCancel={() => {
            setShowUpdateUserActivationPopup(false);
            setSelectedUserToUpdateActivationStatus(null);
          }}
          onClick={() => {
            mutate(
              selectedUserToUpdateActivationStatus as {
                userId: string;
                action: string;
              }
            );
            setShowUpdateUserActivationPopup(false);
            setSelectedUserToUpdateActivationStatus(null);
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
              : 'Failed to update activation status of user. Please try again.'
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
          message="User activation status has been changed successfully!"
          body="All changes have been saved and synced in the system."
          icon={<XIcon weight="bold" />}
        />
      ) : null}
    </>
  );
};

export default UserManagement;
