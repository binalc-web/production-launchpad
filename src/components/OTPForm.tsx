import { useCallback, useEffect, useState, type FC } from 'react';
import { Box, Button, FormHelperText, Typography } from '@mui/material';
import { Controller, useForm } from 'react-hook-form';
import { MuiOtpInput } from 'mui-one-time-password-input';
import { CheckCircleIcon, XIcon, XCircleIcon } from '@phosphor-icons/react';
import type { AxiosResponse } from 'axios';
import ToastAlert from './ToastAlert';
import type {
  verifyEmailData,
  resendVerificationData,
} from '../api/auth/register';

type FormData = {
  otp: string;
};

type CustomDataType = verifyEmailData;

export interface OTPFormProps {
  isForgotPass?: boolean;
  onVerificationSuccess?: (response: AxiosResponse) => void;
  showTimerCounter?: boolean;
  initialTimerSeconds?: number;
  customValidation?: (value: string) => string | boolean;
  buttonText?: string;
  resendPrefixText?: string;
  buttonStyles?: React.CSSProperties;
  resendStyles?: React.CSSProperties;
  customData?: CustomDataType;
  resendAPI: (forgotPasswordData: resendVerificationData) => void;
  apiToCall: (customData: verifyEmailData) => Promise<AxiosResponse>;
}

const OTPForm: FC<OTPFormProps> = (props) => {
  const {
    resendAPI,
    isForgotPass = false,
    onVerificationSuccess,
    showTimerCounter = true,
    initialTimerSeconds = 120,
    customValidation,
    buttonText = 'Verify',
    buttonStyles,
    resendPrefixText,
    resendStyles,
    customData,
    apiToCall,
  } = props;

  const [showAlert, setShowAlert] = useState<boolean>(false);
  const [alertMessage, setAlertMessage] = useState<string>('');
  const [showOtpSentAlert, setShowOtpSentAlert] = useState(false);
  const [showInvalidOTPAlert, setShowInvalidOTPAlert] = useState(false);
  const [remainingTime, setRemainingTime] = useState(initialTimerSeconds);
  const [isTimerActive, setIsTimerActive] = useState(true);
  const [isLoading, setIsLoading] = useState(false);

  const { control, handleSubmit } = useForm<FormData>({
    defaultValues: {
      otp: '',
    },
  });

  const validate = (value: string): string | boolean => {
    if (customValidation) {
      return customValidation(value);
    }
    if (!value) return 'OTP is required';
    if (value.length < 6) return 'OTP must be 6 digits';
    if (!/^\d+$/.test(value)) return 'Please enter only numeric digits';
    return true;
  };

  const onResendCode = useCallback((): Promise<void> => {
    return new Promise((resolve) => {
      try {
        resendAPI({
          email: customData?.email as string,
          isForForgetPassword: isForgotPass,
        });
        resolve();
      } catch (error) {
        console.error('Error resending code:', error);
        resolve();
      }
    });
  }, [customData?.email, isForgotPass, resendAPI]);

  const handleResendCode = useCallback(async (): Promise<void> => {
    setRemainingTime(initialTimerSeconds);
    setIsTimerActive(true);

    try {
      await onResendCode();
      setShowOtpSentAlert(true);
    } catch (error) {
      if (error instanceof Error) {
        setAlertMessage(error.message);
        setShowAlert(true);
      } else {
        setAlertMessage('Something went wrong!');
        setShowAlert(true);
      }
    }
  }, [onResendCode, initialTimerSeconds]);

  const onSubmit = async (data: FormData): Promise<void> => {
    setIsLoading(true);
    try {
      const response = await apiToCall({
        verificationCode: data.otp,
        email: customData?.email as string,
      });
      if (response && onVerificationSuccess) {
        onVerificationSuccess(response);
      }
      setIsLoading(false);
    } catch (error: unknown) {
      setIsLoading(false);
      if (error instanceof Error) {
        setAlertMessage(error.message);
        setShowAlert(true);
      } else {
        setAlertMessage('Something went wrong!');
        setShowAlert(true);
      }
    }
  };

  useEffect((): (() => void) => {
    let interval: NodeJS.Timeout | null = null;

    if (isTimerActive && remainingTime > 0) {
      interval = setInterval(() => {
        setRemainingTime((previousTime) => previousTime - 1);
      }, 1000);
    } else if (remainingTime === 0) {
      setIsTimerActive(false);
      if (interval) clearInterval(interval);
    }

    return (): void => {
      if (interval) clearInterval(interval);
    };
  }, [isTimerActive, remainingTime]);

  useEffect(() => {
    if (showAlert) {
      setTimeout(() => setShowAlert(false), 2000);
    }
    if (showOtpSentAlert) {
      setTimeout(() => setShowOtpSentAlert(false), 2000);
    }
    if (showInvalidOTPAlert) {
      setTimeout(() => setShowInvalidOTPAlert(false), 2000);
    }
  }, [showAlert, showOtpSentAlert, showInvalidOTPAlert]);

  return (
    <Box component="form" onSubmit={handleSubmit(onSubmit)}>
      <Box sx={{ width: '100%' }}>
        <Controller
          name="otp"
          control={control}
          rules={{
            required: 'OTP is required',
            validate,
          }}
          render={({ field, fieldState }) => (
            <Box
              sx={{
                '& .MuiInputBase-input': {
                  py: '19.5px !important',
                },
              }}
            >
              <MuiOtpInput
                {...field}
                length={6}
                sx={{ gap: 1, justifyContent: 'center' }}
                TextFieldsProps={(index) => ({
                  error: fieldState.invalid,
                  sx: {
                    width: 52,
                    ...(index === 2 && {
                      mr: 3,
                      '&::after': {
                        content: '"-"',
                        position: 'absolute',
                        right: -22,
                        top: '50%',
                        transform: 'translateY(-50%)',
                        color: 'text.disabled',
                        fontSize: '1.5rem',
                      },
                    }),
                  },
                })}
              />
              {fieldState.invalid ? (
                <FormHelperText
                  error
                  sx={{
                    ml: 1.5,
                    textAlign: 'center',
                  }}
                >
                  {fieldState.error?.message}
                </FormHelperText>
              ) : null}
            </Box>
          )}
        />
      </Box>

      <Box sx={{ ...(buttonStyles || {}) }}>
        <Button
          fullWidth
          variant="contained"
          color="primary"
          type="submit"
          disabled={isLoading}
        >
          {isLoading ? 'Submitting...' : buttonText}
        </Button>
      </Box>
      <Box sx={{ ...(resendStyles || {}) }}>
        <Typography
          sx={{
            color: (theme) => theme.palette.neutral[600],
          }}
        >
          {resendPrefixText || null}
          {showTimerCounter ? (
            <>
              {' '}
              {isTimerActive ? (
                <Typography
                  component="span"
                  variant="link"
                  sx={{
                    color: 'info.dark',
                  }}
                >
                  Resend in {Math.floor(remainingTime / 60)}:
                  {(remainingTime % 60).toString().padStart(2, '0')}
                </Typography>
              ) : (
                <Typography
                  component="span"
                  variant="link"
                  onClick={handleResendCode}
                  sx={{
                    color: 'info.dark',
                    cursor: 'pointer',
                  }}
                >
                  Click Here
                </Typography>
              )}
            </>
          ) : null}
        </Typography>
      </Box>

      <ToastAlert
        severity="error"
        showAlert={showAlert}
        onClose={() => setShowAlert(false)}
        message={alertMessage}
        icon={<XIcon weight="bold" />}
      />

      <ToastAlert
        severity="error"
        showAlert={showInvalidOTPAlert}
        message="The code you've entered is invalid!"
        icon={<XCircleIcon weight="fill" />}
        body="Get a new code & try again."
        onClose={() => setShowInvalidOTPAlert(false)}
      />

      <ToastAlert
        showAlert={showOtpSentAlert}
        onClose={() => setShowOtpSentAlert(false)}
        message="OTP sent successfully!"
        body="Check your email for the verification code."
        icon={<CheckCircleIcon weight="fill" />}
        severity="success"
      />
    </Box>
  );
};

export default OTPForm;
