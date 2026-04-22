import { type FC, useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import {
  Box,
  Button,
  Checkbox,
  FormControlLabel,
  FormHelperText,
  InputAdornment,
  InputLabel,
  MenuItem,
  Select,
  TextField,
  Typography,
} from '@mui/material';
import { EyeIcon, EyeSlashIcon, XCircleIcon } from '@phosphor-icons/react';
import { authWrapperFlexStyles, authWrapperStyles } from '@/utils/commonStyles';
import { passwordRegex } from '@/utils/regex';
import { Link, useLocation, useNavigate } from '@tanstack/react-router';
import { completeProfile } from '@/api/auth/patient-invite';
import ToastAlert from '@/components/ToastAlert';
import { verifyLink } from '@/api/auth/verify-link';
import {
  getSubRolesFromOrganizationType,
  type SubRole,
} from '@/utils/getSubRolesFromOrganizationType';
import { roles } from '../Register/steps/data';
import { useInvitationFormData } from '@/context/invite/useInvitationFormData';

const schema = yup.object().shape({
  email: yup
    .string()
    .email('Invalid email format')
    .required('Email is required'),
  password: yup
    .string()
    .min(
      8,
      'Password must be at least 8 characters, with upper & lowercase, a symbol or a number.'
    )
    .matches(
      passwordRegex,
      'Password must be at least 8 characters, with upper & lowercase, a number, and a special character.'
    )
    .required('Password is required'),
  confirmPassword: yup
    .string()
    .oneOf([yup.ref('password')], 'Passwords must match.')
    .required('Confirm Password is required'),
  subRole: yup.string().required('Please select a patient sub-role'),
  termsAgreed: yup
    .boolean()
    .oneOf([true], 'You must agree to the terms and conditions')
    .required('You must agree to the terms and conditions'),
});

type FormData = {
  email: string;
  password: string;
  confirmPassword: string;
  subRole: string;
  termsAgreed: boolean;
};

const LegalUserRegister: FC = () => {
  const navigate = useNavigate();
  const { invitationFormData, setInvitationFormData } = useInvitationFormData();

  const [isError, setIsError] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const [subRoles, setSubRoles] = useState<Array<SubRole>>();

  const { search } = useLocation();

  // Parse the URL search parameters to get the email
  const searchParameters = new URLSearchParams(search as string);
  // const organizationId = searchParameters.get('organizationId') || '';

  const [organizationId, setOrganizationId] = useState<string>();

  const token = searchParameters.get('token') || '';

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [isLegalUserSignUp, setIsLegalUserSignUp] = useState<boolean>(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm<FormData>({
    resolver: yupResolver(schema),
    defaultValues: {
      email: invitationFormData.email ?? '',
      password: invitationFormData.password ?? '',
      confirmPassword: invitationFormData.confirmPassword ?? '',
      subRole: invitationFormData.subRole ?? '',
    },
  });

  useEffect(() => {
    const verify = async (): Promise<void> => {
      try {
        const response = await verifyLink({
          token,
        });

        setIsLegalUserSignUp(
          response.data.organizationType === 'legal_firm' ||
            response.data.role === 'legal_user'
        );
        if (response.data.organizationType) {
          setSubRoles(
            getSubRolesFromOrganizationType(response.data.organizationType)
          );
        } else {
          setSubRoles(
            roles.find((role) => role.role === response.data.role)?.subRoles ||
              []
          );
        }
        setInvitationFormData({
          ...invitationFormData,
          firstName: response.data.firstName,
          lastName: response.data.lastName,
        });

        setOrganizationId(response.data.organizationId);
        setValue('email', response.data.email, {
          shouldValidate: true,
          shouldDirty: true,
        });
      } catch (error: unknown) {
        console.log(error);
        void navigate({ to: '/not-authorized' });
      }
    };

    if (token) {
      void verify();
    }
  }, [navigate, setValue, token]);

  const onSubmit = (data: FormData): void => {
    setIsLoading(true);
    const legalUserRegisterData = { ...data, organizationId };

    if (isLegalUserSignUp) {
      void completeProfile(legalUserRegisterData)
        .then(() => {
          setIsSuccess(true);
          setTimeout(() => setIsSuccess(false), 2000);
          setIsLoading(false);
          void navigate({ to: '/auth/login', replace: true });
        })
        .catch(() => {
          setIsLoading(false);
          setIsError(true);
          setTimeout(() => setIsError(false), 2000);
        });
    } else {
      //redirect user to basic flow screen to add basic information

      setInvitationFormData({ ...data, organizationId });
      void navigate({ to: '/auth/legal-user-register/basic-details' });
    }
  };

  // For controlled Select
  const selectedSubRole = watch('subRole');

  return (
    <Box
      component="form"
      onSubmit={handleSubmit(onSubmit)}
      sx={{
        ...authWrapperFlexStyles(),
      }}
    >
      <Box sx={{ ...authWrapperStyles(0, 'center') }}>
        <Typography variant="h2">Welcome!</Typography>
        <Typography sx={{ color: 'text.secondary' }}>
          Enter the details to continue
        </Typography>
      </Box>
      <Box
        sx={{
          ...authWrapperStyles(3, null),
          width: '100%',

          '& .MuiInputBase-root': {
            bgcolor: 'common.white',
          },
          '& .MuiFormLabel-root ': {
            mb: 0,
            fontSize: 12,
          },
          '& .MuiFormControlLabel-label ': {
            fontSize: 14,
          },
        }}
      >
        <Box sx={{ mt: 2 }}>
          <InputLabel htmlFor="email">
            <Typography component="span" sx={{ color: 'error.main' }}>
              *
            </Typography>{' '}
            Email
          </InputLabel>
          <TextField
            fullWidth
            id="email"
            disabled
            type="email"
            placeholder="Enter your email"
            {...register('email')}
            error={!!errors.email}
            helperText={errors.email?.message}
          />
        </Box>

        <Box sx={{ mt: 2 }}>
          <InputLabel htmlFor="password">
            <Typography component="span" sx={{ color: 'error.main' }}>
              *
            </Typography>{' '}
            Password
          </InputLabel>
          <TextField
            fullWidth
            id="password"
            type={showPassword ? 'text' : 'password'}
            placeholder="Enter your password"
            {...register('password')}
            error={!!errors.password}
            helperText={errors.password?.message}
            InputProps={{
              endAdornment: (
                <InputAdornment
                  position="end"
                  sx={{ cursor: 'pointer' }}
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeSlashIcon size={20} />
                  ) : (
                    <EyeIcon size={20} />
                  )}
                </InputAdornment>
              ),
            }}
          />
        </Box>

        <Box sx={{ mt: 2 }}>
          <InputLabel htmlFor="confirmPassword">
            <Typography component="span" sx={{ color: 'error.main' }}>
              *
            </Typography>{' '}
            Confirm Password{' '}
          </InputLabel>
          <TextField
            fullWidth
            id="confirmPassword"
            type={showConfirmPassword ? 'text' : 'password'}
            placeholder="Enter your password again"
            {...register('confirmPassword')}
            error={!!errors.confirmPassword}
            helperText={errors.confirmPassword?.message}
            InputProps={{
              endAdornment: (
                <InputAdornment
                  position="end"
                  sx={{ cursor: 'pointer' }}
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  {showConfirmPassword ? (
                    <EyeSlashIcon size={20} />
                  ) : (
                    <EyeIcon size={20} />
                  )}
                </InputAdornment>
              ),
            }}
          />
        </Box>

        <Box sx={{ mt: 2 }}>
          <InputLabel htmlFor="subRole">
            <Typography component="span" sx={{ color: 'error.main' }}>
              *
            </Typography>{' '}
            Sub-Role
          </InputLabel>
          <Select
            displayEmpty
            id="subRole"
            fullWidth
            size="large"
            {...register('subRole')}
            value={selectedSubRole}
            error={!!errors.subRole}
            onChange={(event) =>
              setValue('subRole', event.target.value, {
                shouldValidate: true,
              })
            }
          >
            <MenuItem value="" disabled>
              Select Sub-Role
            </MenuItem>
            {subRoles?.map((role) => (
              <MenuItem key={role.role} value={role.role}>
                {role.title}
              </MenuItem>
            ))}
          </Select>
          {errors.subRole && (
            <FormHelperText error>{errors.subRole.message}</FormHelperText>
          )}
        </Box>

        <Box
          sx={{
            mt: 2,
          }}
        >
          <FormControlLabel
            control={<Checkbox {...register('termsAgreed')} />}
            label={
              <>
                By signing up, I agree to all the{' '}
                <Link
                  to="/terms-of-use"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Typography
                    component="span"
                    variant="link"
                    sx={{
                      color: 'info.dark',
                    }}
                  >
                    Terms of Use
                  </Typography>
                </Link>{' '}
                &{' '}
                <Link
                  to="/privacy-policy"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Typography
                    component="span"
                    variant="link"
                    sx={{
                      color: 'info.dark',
                    }}
                  >
                    Privacy Policy
                  </Typography>
                </Link>
              </>
            }
            sx={{
              alignItems: 'flex-start',
              '& .MuiCheckbox-root': {
                ml: '-10px',
                mt: '-10px',
              },
              '& .MuiTypography-link ': {
                fontSize: 12,
              },
            }}
          />
          {errors.termsAgreed && (
            <FormHelperText error>{errors.termsAgreed.message}</FormHelperText>
          )}
        </Box>

        <Box sx={{ mt: 3 }}>
          <Button
            loading={isLoading}
            fullWidth
            variant="contained"
            color="primary"
            type="submit"
          >
            Continue
          </Button>
        </Box>

        <ToastAlert
          severity="error"
          showAlert={isError}
          message="Registration process failed"
          icon={<XCircleIcon weight="fill" />}
          body="Try again or contact admin"
          onClose={() => setIsError(false)}
        />
        <ToastAlert
          severity="success"
          showAlert={isSuccess}
          message="Registration process completed"
          icon={<XCircleIcon weight="fill" />}
          body="Please login MedicalEase application. "
          onClose={() => setIsSuccess(false)}
        />
      </Box>
    </Box>
  );
};

export default LegalUserRegister;
