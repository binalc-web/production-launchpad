import {
  Avatar,
  Box,
  Grid,
  InputBase,
  InputLabel,
  MenuItem,
  Select,
  Typography,
} from '@mui/material';
import { useMemo, type FC } from 'react';
import {
  Controller,
  type Control,
  type FieldErrors,
  type FieldValues,
  type UseFormWatch,
} from 'react-hook-form';
import type { TaskFormData } from '@/api/caseManagement/caseTasks';
import { BuildingIcon } from '@phosphor-icons/react';
import { useQuery } from '@tanstack/react-query';
import type { organization } from '@/pages/OrganizationManagement/types/organization';
import { getAllOrganizationsWithoutLimit } from '@/api/OrganizationManagement/getAllOrganizationsWithoutLimit';
import { organizationTypes } from '@/pages/Register/steps/data';
import { SelectAvatar } from '../../CaseInfoSection';
import type { User } from '@/pages/userManagement/types/user';
import { getAllOrganizationUsersWithoutLimit } from '@/api/OrganizationManagement/getAllOrganizationUsersWithoutLimit';
import { emptySelectStyle } from '@/utils/placeholder';
import { useAuth } from '@/context/auth/useAuth';

type AssigneeTile = {
  avatarUrl?: string;
  title: string;
  subTitle: string;
};

const AssigneeTile: FC<AssigneeTile> = ({ avatarUrl, title, subTitle }) => {
  return (
    <Box
      display="flex"
      flexDirection="row"
      gap={2}
      px={0.4}
      py={1}
      sx={{
        cursor: 'pointer',
      }}
    >
      <Avatar
        src={`${import.meta.env.VITE_AVATAR_CLOUD_FRONT_DISTRIBUTION}${avatarUrl}`}
        sx={{ width: 24, height: 24, mt: 0.5 }}
      >
        <Typography fontSize={11}> {title[0] + subTitle[0]}</Typography>
      </Avatar>
      <Box>
        <Typography fontSize={14} color="neutral.700">
          {title}
        </Typography>
        <Typography fontSize={14} color="neutral.500">
          {subTitle}
        </Typography>
      </Box>
    </Box>
  );
};

type TaskAssigneeProps = {
  control: Control<TaskFormData, object, FieldValues>;
  errors: FieldErrors<TaskFormData>;
  watch: UseFormWatch<TaskFormData>;
  caseId: string;
};

const TaskAssignee: FC<TaskAssigneeProps> = ({
  control,
  errors,
  watch,
  caseId,
}) => {
  const { basicUserDetails } = useAuth();
  const selectedOrganizationId = watch('organizationId');

  const {
    data: organizationList,
    // isLoading,
    // isError,
    // refetch,
  }: {
    data: Array<organization> | undefined;
    isLoading: boolean;
    isError: boolean;
    refetch: () => void;
  } = useQuery({
    queryKey: [`task-organization-list`],
    queryFn: async () => {
      const data = await getAllOrganizationsWithoutLimit();
      return data;
    },
    staleTime: Infinity,
    refetchOnWindowFocus: false,
  });

  const {
    data: userList,
    // isLoading,
    // isError,
    // refetch,
  }: {
    data: Array<User> | undefined;
    isLoading: boolean;
    isError: boolean;
    refetch: () => void;
  } = useQuery({
    queryKey: [`user-list`, selectedOrganizationId],
    queryFn: async () => {
      if (!selectedOrganizationId) {
        return getAllOrganizationUsersWithoutLimit(caseId);
      }
      return getAllOrganizationUsersWithoutLimit(
        caseId,
        selectedOrganizationId
      );
    },
    staleTime: Infinity,
    refetchOnWindowFocus: false,
  });

  const isSelf = (user: User): boolean =>
    Boolean(basicUserDetails?.userId && user._id === basicUserDetails.userId);

  const orderedUserList = useMemo(() => {
    if (!userList?.length || !basicUserDetails?.userId) return userList ?? [];
    const selfId = basicUserDetails.userId;
    const selfIndex = userList.findIndex((u) => u._id === selfId);
    if (selfIndex <= 0) return userList;
    const next = [...userList];
    const [self] = next.splice(selfIndex, 1);
    return [self, ...next];
  }, [userList, basicUserDetails?.userId]);

  // const handleClose = (): void => {
  //   setShowInvitationModal(false);
  // };

  // const handleOpen = (): void => {
  //   void trackEvent('Invite User Button Clicked');
  //   setShowInvitationModal(true);
  // };

  return (
    <Grid size={{ xs: 12 }}>
      <InputLabel htmlFor="assignee">
        <Typography component="span" sx={{ color: 'error.main', fontSize: 12 }}>
          *
        </Typography>{' '}
        Assignee
      </InputLabel>

      <Box display="flex" flexDirection="row" width="100%" gap={1}>
        <Box
          width="100%"
          display="flex"
          border={1}
          borderColor="#b4bbc5"
          borderRadius={1}
        >
          {/* Organization Select */}
          <Controller
            name="organizationId"
            control={control}
            render={({ field }) => (
              <Select
                {...field}
                MenuProps={{
                  anchorOrigin: {
                    vertical: 'bottom',
                    horizontal: 'left',
                  },
                  transformOrigin: {
                    vertical: 'top',
                    horizontal: 'left',
                  },
                  PaperProps: {
                    sx: {
                      maxHeight: 300,
                      minWidth: 800,
                    },
                  },
                }}
                fullWidth
                displayEmpty
                input={
                  <InputBase
                    sx={{
                      width: '40%',
                      borderRight: '1px solid',
                      borderColor: 'divider',
                      px: 1.2,
                    }}
                  />
                }
                sx={{ width: '40%' }}
                renderValue={(value) => {
                  const selectedOrganization = organizationList?.find(
                    (item) => item._id === value
                  );

                  if (!value || !selectedOrganization) {
                    return (
                      <Box display="flex" alignItems="center" gap={1} px={1}>
                        <BuildingIcon size={20} />
                        <Typography color="neutral.700">
                          All Organization
                        </Typography>
                      </Box>
                    );
                  }

                  return (
                    <Box display="flex" alignItems="center" gap={1} px={1}>
                      <Avatar sx={{ height: 18, width: 18 }}>
                        <Typography fontSize={12}>
                          {selectedOrganization?.name?.slice(0, 2)}
                        </Typography>
                      </Avatar>

                      <Typography
                        sx={{
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {selectedOrganization?.name}
                      </Typography>
                    </Box>
                  );
                }}
              >
                <MenuItem value="">
                  <Box display="flex" gap={1} alignItems="center">
                    <BuildingIcon size={20} />
                    <Typography fontSize={14}>All Organization</Typography>
                  </Box>
                </MenuItem>

                {organizationList?.map((organization) => (
                  <MenuItem key={organization._id} value={organization._id}>
                    <AssigneeTile
                      title={organization.name}
                      avatarUrl=""
                      subTitle={
                        organizationTypes.find(
                          (organizationType) =>
                            organizationType.type ===
                            organization.organizationType
                        )!.title
                      }
                    />
                  </MenuItem>
                ))}
              </Select>
            )}
          />

          <Box sx={{ width: 1.2, mr: 1.2, backgroundColor: 'divider' }} />
          {/* Assignee Select */}
          <Controller
            name="assignee"
            control={control}
            render={({ field }) => {
              return (
                <Select
                  {...field}
                  fullWidth
                  displayEmpty
                  input={<InputBase sx={{ width: '60%', px: 1.2 }} />}
                  sx={{ width: '60%', ...emptySelectStyle(field.value) }}
                  renderValue={(value) => {
                    const user = userList?.find((user) => user._id === value);

                    if (!value || !user)
                      return (
                        <Typography color="neutral.400">
                          Select Assignee
                        </Typography>
                      );

                    return (
                      <SelectAvatar
                        firstName={
                          isSelf(user) ? 'Self' : (user?.firstName ?? '')
                        }
                        lastName={isSelf(user) ? '' : (user?.lastName ?? '')}
                        avatar={user?.avatar || ''}
                      />
                    );
                  }}
                >
                  <MenuItem
                    disabled
                    sx={{
                      '&.Mui-disabled': {
                        opacity: 1,
                        color: 'inherit',
                        pointerEvents: 'none', // keeps it non-clickable
                      },
                    }}
                  >
                    <Box display="flex" gap={0.5} px={1.5}>
                      <Typography color="neutral.500" fontSize={14}>
                        Showing Invitees For:
                      </Typography>
                      <Typography color="neutral.800" fontSize={14}>
                        {selectedOrganizationId
                          ? orderedUserList?.[0]?.organization?.name
                          : 'All Organization'}
                      </Typography>
                    </Box>
                  </MenuItem>
                  {orderedUserList?.map((user) => (
                    <MenuItem key={user._id} value={user._id}>
                      {selectedOrganizationId ? (
                        <SelectAvatar
                          firstName={isSelf(user) ? 'Self' : user.firstName}
                          lastName={isSelf(user) ? '' : user.lastName}
                          avatar={user.avatar || ''}
                        />
                      ) : (
                        <AssigneeTile
                          title={
                            isSelf(user)
                              ? 'Self'
                              : `${user.firstName}  ${user.lastName}`
                          }
                          subTitle={user.organization?.name ?? ''}
                          avatarUrl={user.avatar}
                        />
                      )}
                    </MenuItem>
                  ))}
                </Select>
              );
            }}
          />
        </Box>

        {/* {userList && userList?.length > 1 && (
          <Fab color="primary" aria-label="add" onClick={() => {}}>
            <PlusIcon />
          </Fab>
        )} */}
      </Box>

      {errors.assignee && (
        <Typography
          variant="caption"
          sx={{ color: 'error.main', ml: 1.75, mt: 0.5 }}
        >
          {errors.assignee.message}
        </Typography>
      )}
    </Grid>
  );
};

export default TaskAssignee;
