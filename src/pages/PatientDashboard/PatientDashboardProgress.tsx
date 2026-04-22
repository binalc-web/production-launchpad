import type { FC } from 'react';
import {
  Box,
  Card,
  CardContent,
  Step,
  StepLabel,
  Stepper,
} from '@mui/material';
import {
  BoxArrowUpIcon,
  FileLockIcon,
  FilesIcon,
  IdentificationCardIcon,
  ShareIcon,
  ShieldStarIcon,
} from '@phosphor-icons/react';

export const CASE_PROGRESS = [
  {
    value: 'request_initiation',
    icon: <ShareIcon size={20} />,
    label: (
      <>
        Request <Box component="br" /> Initiation
      </>
    ),
  },
  {
    value: 'consent_validation',
    icon: <FileLockIcon size={20} />,
    label: (
      <>
        Consent <Box component="br" /> Validation
      </>
    ),
  },
  {
    value: 'clearid_verification',
    icon: <IdentificationCardIcon size={20} />,
    label: (
      <>
        ClearID <Box component="br" /> Verification
      </>
    ),
  },
  {
    value: 'record_query',
    icon: <FilesIcon size={20} />,
    label: (
      <>
        Record <Box component="br" /> Query
      </>
    ),
  },
  {
    value: 'encryption_decryption',
    icon: <ShieldStarIcon size={20} />,
    label: (
      <>
        Encryption/ <Box component="br" />
        Decryption
      </>
    ),
  },
  {
    value: 'record_delivery',
    icon: <BoxArrowUpIcon size={20} />,
    label: (
      <>
        Record <Box component="br" /> Delivery
      </>
    ),
  },
];

type PatientDashboardProgressProps = {
  status: string;
};

const PatientDashboardProgress: FC<PatientDashboardProgressProps> = ({
  status,
}) => {
  return (
    <Card>
      <CardContent>
        <Stepper
          activeStep={CASE_PROGRESS.findIndex((step) => step.value === status)}
          alternativeLabel
          sx={{
            '& .MuiStepLabel-iconContainer': {
              width: 40,
              height: 40,
              display: 'flex',
              borderRadius: '50%',
              border: '1px solid',
              alignItems: 'center',
              borderColor: 'divider',
              justifyContent: 'center',
              '&.Mui-active': {
                bgcolor: 'info.dark',
                color: 'common.white',
                borderColor: 'info.dark',
              },
            },
            '& .MuiStepConnector-root': {
              top: 20,
              left: 'calc(-50% + 35px)',
              right: 'calc(50% + 35px)',
            },
            '& .MuiStepLabel-label': {
              mt: 1,
              fontSize: 12,
            },
          }}
        >
          {CASE_PROGRESS.map((step) => (
            <Step key={step.value}>
              <StepLabel icon={step.icon}>{step.label}</StepLabel>
            </Step>
          ))}
        </Stepper>
      </CardContent>
    </Card>
  );
};

export default PatientDashboardProgress;
