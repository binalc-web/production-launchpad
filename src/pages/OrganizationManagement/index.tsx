import { useEffect, useMemo, useState } from 'react';
import type { pagination } from '../CaseManagement/types/pagination';
import type { patientFilters } from '../userManagement/types/patientFilters';
import { trackEvent } from '@/utils/mixPanel/mixpanel';
import type { ColumnDef } from '@tanstack/react-table';
import UserProfileTile from '@/components/Table/UserProfileTile';
import { formatPhoneNumber } from '@/utils/phoneUtilities';

import {
  type SelectChangeEvent,
  Box,
  Button,
  IconButton,
  Switch,
  Typography,
} from '@mui/material';
import TableContainerComponent from '@/components/Table/TableContainerComponent';
import Breadcrumbs, { type BreadcrumbItem } from '@/components/Breadcrumbs';
import type {
  OrganizationAdmin,
  OrganizationDetails,
  OrganizationTableType,
} from './types/organizationTableType';
import {
  getAllOrganization,
  type organizationsListResponse,
} from '@/api/OrganizationManagement/getAllOrganization';
import { useMutation, useQuery } from '@tanstack/react-query';
import {
  EyeIcon,
  PencilSimpleIcon,
  PlusIcon,
  UsersFourIcon,
  XIcon,
} from '@phosphor-icons/react';
import { Link, useNavigate } from '@tanstack/react-router';
import { changeOrganizationActivationStatus } from '../../api/OrganizationManagement/changeOrganizationActivationStatus';
import ToastAlert from '@/components/ToastAlert';
import { PopUp } from '@/components/Popup';
import AddOrganization from './Components/AddOrganization';
import type { organization } from './types/organization';

const breadcrumbItems: Array<BreadcrumbItem> = [
  {
    title: 'Manage Organization',
  },
];

const Organization: React.FC = () => {
  const navigate = useNavigate();

  const [organizationTableData, setOrganizationTableData] = useState<{
    organizations: Array<OrganizationTableType>;
    pagination?: pagination;
  }>({
    organizations: [],
    pagination: undefined,
  });

  const [filters, setFilters] = useState<patientFilters>({
    page: 1,
    limit: 10,
    searchKeyWordString: undefined,
  });
  const [searchValue, setSearchValue] = useState('');
  const [dataProcessing, setDataProcessing] = useState<boolean>(false);

  const [showAddOrganizationModal, setShowAddOrganizationModal] =
    useState(false);

  const [
    showUpdateOrganizationActivationPopup,
    setShowUpdateOrganizationActivationPopup,
  ] = useState<boolean>(false);

  const [
    selectedOrganizationToUpdateActivationStatus,
    setSelectedOrganizationToUpdateActivationStatus,
  ] = useState<{
    organizationId: string;
    action: string;
  } | null>();

  const [showError, setShowError] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const [selectedOrganizationData, setSelectedOrganizationData] =
    useState<organization | null>(null);

  const {
    data: organizationList,
    isLoading,
    isError,
    refetch,
  }: {
    data: organizationsListResponse | undefined;
    isLoading: boolean;
    isError: boolean;
    refetch: () => void;
  } = useQuery({
    queryKey: ['organization-list'],
    queryFn: async () => {
      const data = await getAllOrganization(filters);
      setDataProcessing(true);
      return data;
    },
    staleTime: Infinity,
    refetchOnWindowFocus: false,
  });

  // const {
  //   mutate,
  //   isError: errorWhileUpdateUser,
  //   error,
  //   isSuccess,
  // } = useMutation({
  //   mutationFn: async ({
  //     userId,
  //     action,
  //   }: {
  //     userId: string;
  //     action: string;
  //   }) => {
  //     // Call the API to update activation status the user
  //     const response = await changeActivationStatus({ userId, action });
  //     return response;
  //   },
  //   onSuccess: () => {
  //     void trackEvent('User Activation Status Updated');
  //     refetch();
  //     //reset();
  //     //handleClose();
  //   },
  //   onError: (error) => {
  //     console.error('Error updating status:', error);
  //   },
  // });

  const {
    mutate: mutateOrganizationActivationStatus,
    isError: isErrorWhileUpdateOrganization,
    error: errorWhileUpdateOrganization,
    isSuccess,
  } = useMutation({
    mutationFn: async ({
      organizationId,
      action,
    }: {
      organizationId: string;
      action: string;
    }) => {
      // Call the API to update activation status the user
      const response = await changeOrganizationActivationStatus({
        organizationId,
        action,
      });
      return response;
    },
    onSuccess: () => {
      void trackEvent('Organization Activation Status Updated');
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
    if (isErrorWhileUpdateOrganization) {
      setShowError(true);
      setTimeout(() => {
        setShowError(false);
      }, 3000);
    }
  }, [isSuccess, isErrorWhileUpdateOrganization]);

  useEffect(() => {
    void trackEvent('Organization Management Page Viewed');
  }, []);

  const columns = useMemo<Array<ColumnDef<OrganizationTableType>>>(
    () => [
      {
        accessorKey: 'organizationId',
        header: 'Organization Id',
        cell: (info): React.ReactNode => {
          // console.log('info.getValue()', info.getValue());
          const value = info.getValue() as string | null | undefined;
          return value;
          // if (value) {
          //   const formattedPhone = formatPhoneNumber(info.getValue() as string);
          //   return formattedPhone;
          // }
          return '-';
        },
        enableColumnFilter: false,
      },
      {
        accessorKey: 'organizationDetails',
        header: 'Organization Details',
        cell: ({ getValue }): React.ReactNode => {
          const organizationDetails =
            getValue() as OrganizationTableType['organizationDetails'];
          return (
            <UserProfileTile
              fullName={organizationDetails.name}
              email={organizationDetails.email}
            />
          );
        },
        enableColumnFilter: false,
        sortingFn: (rowA, rowB, columnId): number => {
          const userDetailsA: OrganizationDetails = rowA.getValue(columnId);
          const userDetailsB: OrganizationDetails = rowB.getValue(columnId);

          const a = userDetailsA?.name ?? '';
          const b = userDetailsB?.name ?? '';
          return a.localeCompare(b);
        },
      },
      {
        accessorKey: 'contact',
        header: 'Phone',
        cell: (info): React.ReactNode => {
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
        accessorKey: 'organizationAdmin',
        header: 'Organization Admin',
        cell: ({ getValue }): React.ReactNode => {
          const organizationDetails =
            getValue() as OrganizationTableType['organizationAdmin'];
          return (
            <UserProfileTile
              fullName={organizationDetails.name}
              email={organizationDetails.email}
            />
          );
        },
        enableColumnFilter: false,
        sortingFn: (rowA, rowB, columnId): number => {
          const userDetailsA: OrganizationAdmin = rowA.getValue(columnId);
          const userDetailsB: OrganizationAdmin = rowB.getValue(columnId);

          const a = userDetailsA?.name ?? '';
          const b = userDetailsB?.name ?? '';
          return a.localeCompare(b);
        },
      },
      {
        id: 'actions',
        header: 'Actions',
        cell: ({ row }): React.ReactNode => {
          return (
            <Box display="flex" flexDirection="row" alignItems="center">
              <IconButton
                size="small"
                variant="soft"
                component={Link}
                to={`/organization/users/${row.original._id}?organizationType=${row.original.organizationType}`}
                onClick={(event) => event.stopPropagation()}
              >
                <EyeIcon size={24} />
              </IconButton>
              <IconButton
                size="small"
                variant="soft"
                onClick={(event) => {
                  event.stopPropagation();
                  console.log(row.index);
                  if (organizationList) {
                    setShowAddOrganizationModal(true);
                    setSelectedOrganizationData(
                      organizationList.organizations[row.index]
                    );
                  }
                }}
              >
                <PencilSimpleIcon size={24} />
              </IconButton>

              <Switch
                size="small"
                checked={row.original.isDeactivated === false}
                onClick={(event) => {
                  event.stopPropagation();
                }}
                onChange={(event): void => {
                  event.stopPropagation();
                  setSelectedOrganizationToUpdateActivationStatus({
                    organizationId: row.original._id,
                    action:
                      row.original.isDeactivated === false
                        ? 'deActivate'
                        : 'activate',
                  });
                  setShowUpdateOrganizationActivationPopup(true);
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
    const organizationsListData: Array<OrganizationTableType> = [];

    organizationList?.organizations?.forEach((element) => {
      const Organization: OrganizationTableType = {
        organizationDetails: {
          name: element.name,
          email: element.email,
        },
        organizationAdmin: {
          name: `${element.organizationAdmin.firstName} ${element.organizationAdmin.lastName}`,
          email: element.organizationAdmin.email,
          avatar: element.organizationAdmin.avatar || '',
        },
        organizationType: element.organizationType,
        contact: element.contact,
        organizationId: element.organizationId,
        isDeactivated: element.isDeactivated || false,
        isDeleted: element.isDeleted || false,
        _id: element._id,
      };
      organizationsListData.push(Organization);
    });

    setDataProcessing(false);
    setOrganizationTableData({
      organizations: organizationsListData,
      pagination: organizationList?.pagination,
    });
  }, [organizationList, isLoading, isError]);

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

  const onRowClick = (OrganizationData: OrganizationTableType): void => {
    void navigate({
      to: `/organization/users/${OrganizationData._id}?organizationType=${OrganizationData.organizationType}`,
      
    });
  };

  const handleClose = (): void => {
    setShowAddOrganizationModal(false);
    setSelectedOrganizationData(null);
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
          <Typography variant="h4">Organization</Typography>

          <Box display="flex" gap={2}>
            <Button
              size="large"
              variant="contained"
              startIcon={<UsersFourIcon />}
              onClick={(event) => {
                event.stopPropagation();
                void navigate({
                  to: '/organization/manage-all-users-approvals',
                });
              }}
            >
              Manage Approvals
            </Button>
            <Button
              size="large"
              variant="contained"
              startIcon={<PlusIcon />}
              onClick={() => setShowAddOrganizationModal(true)}
            >
              Add new organization
            </Button>
          </Box>
        </Box>
      </Box>

      <TableContainerComponent
        title="Organization"
        columns={columns}
        data={organizationTableData.organizations}
        isLoading={isLoading || dataProcessing}
        handlePageChange={handlePageChange}
        onRowClick={onRowClick}
        currentPage={
          organizationTableData.pagination?.page
            ? organizationTableData.pagination.page
            : 1
        }
        rowsPerPage={
          organizationTableData.pagination?.limit
            ? organizationTableData.pagination.limit
            : 10
        }
        totalPages={
          organizationTableData.pagination?.totalPages
            ? organizationTableData.pagination.totalPages
            : 1
        }
        handleChangeRowsPerPage={handleChangeRowsPerPage}
        totalRecords={
          organizationTableData.pagination?.total
            ? organizationTableData.pagination.total
            : 0
        }
        handleTableSearch={handleTableSearch}
        activeFilterColumn={null}
      />

      <AddOrganization
        open={showAddOrganizationModal}
        handleClose={handleClose}
        refetch={refetch}
        selectedOrganizationData={
          selectedOrganizationData ? selectedOrganizationData : undefined
        }
      />

      {showUpdateOrganizationActivationPopup ? (
        <PopUp
          type="DELETETASK"
          cancelText="No, Not yet"
          title={
            <Typography fontWeight={600} fontSize={24} variant="h2">
              {`Are you sure you want to ${selectedOrganizationToUpdateActivationStatus?.action === 'activate' ? 'reactivate' : 'deactivate'} organization and all its users? `}
            </Typography>
          }
          buttonText={`Yes, ${selectedOrganizationToUpdateActivationStatus?.action === 'activate' ? 'reactivate' : 'deactivate'}`}
          isOpen={showUpdateOrganizationActivationPopup}
          description=""
          onCancel={() => {
            setShowUpdateOrganizationActivationPopup(false);
            setSelectedOrganizationToUpdateActivationStatus(null);
          }}
          onClick={() => {
            mutateOrganizationActivationStatus(
              selectedOrganizationToUpdateActivationStatus as {
                organizationId: string;
                action: string;
              }
            );
            setShowUpdateOrganizationActivationPopup(false);
            setSelectedOrganizationToUpdateActivationStatus(null);
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
            errorWhileUpdateOrganization instanceof Error
              ? errorWhileUpdateOrganization.message
              : 'Failed to update activation status of organization. Please try again.'
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
          message="Organization activation status has been changed successfully!"
          body="All changes have been saved and synced in the system."
          icon={<XIcon weight="bold" />}
        />
      ) : null}
    </>
  );
};

export default Organization;
