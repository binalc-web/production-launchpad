import { type ReactNode, useEffect, useState, type FC } from 'react';
import { Link, useLocation, useNavigate } from '@tanstack/react-router';

import {
  Box,
  Button,
  FormHelperText,
  InputLabel,
  MenuItem,
  Select,
  Typography,
  type SelectChangeEvent,
} from '@mui/material';

import { roles, rolesForSignUp } from './data';
import { addRoleSubRole } from '@/api/auth/register';
import { authWrapperFlexStyles, authWrapperStyles } from '@/utils/commonStyles';
import { XCircleIcon } from '@phosphor-icons/react';
import ToastAlert from '@/components/ToastAlert';
import { useFormData } from '@/context/register/useFormData';
import { PopUp } from '@/components/Popup';
import type { organization } from '@/pages/OrganizationManagement/types/organization';
import { useQuery } from '@tanstack/react-query';
import { getAuthAllOrganization } from '@/api/auth/getAuthAllOrganization';

const RoleSelection: FC = () => {
  const location = useLocation();
  // const locationStateData = location.state as unknown as LocationState;
  const navigate = useNavigate();

  const [isLoading, setIsLoading] = useState(false);

  const [selectedRole, setSelectedRole] = useState<string>('');
  const [roleError, setRoleError] = useState<string | null>(null);

  const [selectedSubRole, setSelectedSubRole] = useState<string>('');
  const [selectSubRoleError, setSelectSubRoleError] = useState<string | null>(
    null
  );

  const [selectedOrganization, setSelectedOrganization] = useState<string>('');
  const [selectedOrganizationError, setSelectedOrganizationError] = useState<
    string | null
  >(null);

  const [errorAlert, setErrorAlert] = useState<string | null>(null);
  const [showVerificationSuccessPopup, setShowVerificationSuccessPopup] =
    useState<boolean>(false);

  const { formData, setFormData, clearFormData } = useFormData();

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
    queryKey: [`organization-auth-list`],
    queryFn: async () => {
      const data = await getAuthAllOrganization();
      //setDataProcessing(true);
      return data;
    },
    staleTime: Infinity,
    refetchOnWindowFocus: false,
  });

  useEffect(() => {
    if (!formData?.email) {
      void navigate({
        to: '/auth/register',
      });
    }
  }, [formData?.email, location.state, navigate]);

  const handleSubmit = async (event: React.FormEvent): Promise<void> => {
    event.preventDefault();
    if (!selectedRole) {
      setRoleError('Please select a role');
    } else if (selectedRole !== 'admin' && !selectedSubRole) {
      setSelectSubRoleError('Please select a sub role');
    } else if (!selectedOrganization) {
      setSelectedOrganizationError('Please select an organization');
    } else {
      const selectedIndex = roles.findIndex((r) => r.role === selectedRole);
      const role = roles[selectedIndex].role;

      const subRole = roles[selectedIndex].subRoles?.find(
        (r) => r.role === selectedSubRole
      )?.role;
      setIsLoading(true);

      try {
        await addRoleSubRole({
          email: formData.email!,
          role,
          subRole,
          organizationId: selectedOrganization,
        });
        setIsLoading(false);

        setFormData({
          ...formData,
          role,
          subRole,
          organizationId: selectedOrganization,
        });

        if (role === 'legal_user') {
          void navigate({
            to: '/auth/register/supervising-details',
          });
        } else {
          // void navigate({
          //   to: '/auth/login',
          // }).then(() => clearFormData());
          setShowVerificationSuccessPopup(true);
        }
      } catch (error: unknown) {
        setIsLoading(false);
        if (error instanceof Error) {
          setErrorAlert(error.message);
        } else {
          setErrorAlert('Something went wrong!');
        }
      }
    }
  };

  const handleRoleChange = (event: SelectChangeEvent): void => {
    setSelectedRole(event.target.value);
    setRoleError(null);
  };

  const handleSubRoleChange = (event: SelectChangeEvent): void => {
    setSelectedSubRole(event.target.value);
    setSelectSubRoleError(null);
  };

  const handleOrganizationChange = (event: SelectChangeEvent): void => {
    setSelectedOrganization(event.target.value);
    setSelectedOrganizationError(null);
  };

  return (
    <Box
      component="form"
      sx={{
        ...authWrapperFlexStyles(),
      }}
    >
      <Box
        sx={{
          width: '100%',
          ...authWrapperStyles(0, null, '100%'),
          '& .MuiInputBase-root': {
            bgcolor: 'common.white',
          },
        }}
      >
        <Box
          sx={{
            width: '100%',
            ...authWrapperStyles(4, 'center', '100%'),
          }}
        >
          <Typography variant="h2">Just A Few More Steps!</Typography>
          <Typography sx={{ mt: 1.25, color: 'text.secondary' }}>
            Select your preferred role.
          </Typography>
        </Box>
        <Box sx={{ mt: 4 }}>
          <InputLabel>
            <Typography component="span" sx={{ color: 'error.main' }}>
              *
            </Typography>{' '}
            Role
          </InputLabel>
          <Select
            fullWidth
            size="large"
            displayEmpty
            value={selectedRole}
            error={!!roleError}
            onChange={handleRoleChange}
          >
            <MenuItem value="" disabled>
              Select Role
            </MenuItem>
            {rolesForSignUp.map((role) => (
              <MenuItem key={role.role} value={role.role}>
                {role.title}
              </MenuItem>
            ))}
          </Select>
          {roleError && <FormHelperText>{roleError}</FormHelperText>}
        </Box>
        <Box sx={{ mt: 2 }}>
          <InputLabel>
            {' '}
            <Typography component="span" sx={{ color: 'error.main' }}>
              *
            </Typography>{' '}
            Sub-Role
          </InputLabel>
          <Select
            displayEmpty
            value={selectedSubRole}
            fullWidth
            size="large"
            error={!!selectSubRoleError}
            onChange={handleSubRoleChange}
            disabled={!selectedRole}
          >
            <MenuItem value="" disabled>
              Select Sub-Role
            </MenuItem>
            {selectedRole &&
              roles?.[
                roles.findIndex((role) => role.role === selectedRole)
              ]?.subRoles?.map(
                (role: { title: string; role: string }): ReactNode => (
                  <MenuItem key={role.role} value={role.role}>
                    {role.title}
                  </MenuItem>
                )
              )}
          </Select>
          {selectSubRoleError && (
            <FormHelperText>{selectSubRoleError}</FormHelperText>
          )}
        </Box>

        <Box sx={{ mt: 2 }}>
          <InputLabel>
            {' '}
            <Typography component="span" sx={{ color: 'error.main' }}>
              *
            </Typography>
            Organization
          </InputLabel>
          <Select
            displayEmpty
            value={selectedOrganization}
            fullWidth
            size="large"
            error={!!selectedOrganizationError}
            onChange={handleOrganizationChange}
            disabled={!organizationList || organizationList.length < 1}
          >
            <MenuItem value="" disabled>
              Select Organization
            </MenuItem>

            {organizationList?.map((organization) => {
              return (
                <MenuItem key={organization._id} value={organization._id}>
                  {organization.name}
                </MenuItem>
              );
            })}
          </Select>
          {selectedOrganizationError && (
            <FormHelperText>{selectedOrganizationError}</FormHelperText>
          )}
        </Box>
      </Box>

      <Box sx={{ width: '100%', ...authWrapperStyles(2, null, '100%') }}>
        <Button
          fullWidth
          type="submit"
          color="primary"
          variant="contained"
          loading={isLoading}
          onClick={handleSubmit}
        >
          {isLoading ? 'Submitting...' : 'Continue'}
        </Button>
        <Box sx={{ mt: 2, textAlign: 'center' }}>
          <Link to="/auth/register/business-details" state={location.state}>
            <Typography component="span" variant="link">
              Back
            </Typography>
          </Link>
        </Box>
      </Box>

      <ToastAlert
        showAlert={errorAlert !== null}
        onClose={() => setErrorAlert(null)}
        message="Something went wrong!"
        body={errorAlert ? errorAlert : ''}
        severity="error"
        icon={<XCircleIcon weight="fill" />}
      />

      {showVerificationSuccessPopup && (
        <PopUp
          title="Registration Successful!"
          description="Your registration process is complete. Log in to continue further."
          buttonText="Let’s Log In"
          isOpen={showVerificationSuccessPopup}
          type="SUCCESS"
          onClick={() => {
            void navigate({
              to: '/auth/login',
            });
            setTimeout(() => {
              clearFormData();
            }, 1000);
          }}
        />
      )}
    </Box>
  );
};

export default RoleSelection;
