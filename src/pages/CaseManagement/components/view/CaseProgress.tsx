import { useState, type FC } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Step,
  StepLabel,
  Stepper,
} from '@mui/material';
import {
  CheckCircleIcon,
  FileArrowDownIcon,
  FolderSimplePlusIcon,
  GavelIcon,
  HandshakeIcon,
  PresentationChartIcon,
  ScalesIcon,
  XIcon,
} from '@phosphor-icons/react';
import { useMutation } from '@tanstack/react-query';
import { markAsDone } from '@/api/caseManagement/timeline';
import ToastAlert from '@/components/ToastAlert';

export const CASE_PROGRESS = [
  {
    value: 'case_creation',
    icon: <FolderSimplePlusIcon size={20} />,
    label: (
      <>
        Case <Box component="br" /> Creation
      </>
    ),
  },
  {
    value: 'record_retrieval',
    icon: <FileArrowDownIcon size={20} />,
    label: (
      <>
        Record <Box component="br" /> Retrieval
      </>
    ),
  },
  {
    value: 'chronology_review',
    icon: <PresentationChartIcon size={20} />,
    label: (
      <>
        Chronology <Box component="br" /> Review
      </>
    ),
  },
  {
    value: 'legal_preparation',
    icon: <ScalesIcon size={20} />,
    label: (
      <>
        Legal <Box component="br" /> Preparation
      </>
    ),
  },
  {
    value: 'settlement_litigation',
    icon: <GavelIcon size={20} />,
    label: (
      <>
        Settlement/ <Box component="br" />
        Litigation
      </>
    ),
  },
  {
    value: 'case_closure',
    icon: <HandshakeIcon size={20} />,
    label: (
      <>
        Case <Box component="br" /> Closure
      </>
    ),
  },
];

type CaseProgressProps = {
  status: string;
  caseId: number;
  refetch: () => void;
  role: string;
};

const CaseProgress: FC<CaseProgressProps> = ({
  status,
  caseId,
  refetch,
  role,
}) => {
  const [showAlert, setShowAlert] = useState<{
    showAlert: boolean;
    type: 'success' | 'error';
    message: string;
  }>({
    showAlert: false,
    type: 'success',
    message: '',
  });

  const activeStep = CASE_PROGRESS.findIndex((step) => step.value === status);

  // mark as done mutation that calls an api it takes a parameter of value to send to BE

  const markAsDoneMutation = useMutation({
    mutationFn: async (stepValue: string) => markAsDone(caseId, stepValue),
    onSuccess: () => {
      refetch();
    },
    onError: (error) => {
      setShowAlert({
        showAlert: true,
        type: 'error',
        message: error?.message || 'Failed to mark as done',
      });
    },
  });

  return (
    <>
      <Card>
        <CardContent>
          <Stepper
            activeStep={activeStep}
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
                '&.Mui-completed': {
                  bgcolor: '#F1F5FD',
                  color: 'info.dark',
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
              '& .MuiStepConnector-root.Mui-completed, .MuiStepConnector-root.Mui-active ':
                {
                  '& .MuiStepConnector-line': {
                    borderColor: 'info.dark',
                  },
                },
            }}
          >
            {CASE_PROGRESS.map((step) => (
              <Step key={step.value}>
                <StepLabel icon={step.icon}>
                  <Box>{step.label}</Box>

                  {(step.value === 'legal_preparation' ||
                    step.value === 'settlement_litigation') &&
                  role === 'legal_user' ? (
                    <Button
                      size="small"
                      variant="contained"
                      disabled={
                        activeStep >=
                        CASE_PROGRESS.findIndex((s) => s.value === step.value)
                      }
                      onClick={() => {
                        markAsDoneMutation.mutate(step.value);
                      }}
                      sx={{
                        mt: 1,
                        lineHeight: 1.5,
                        bgcolor: '#DEE7FB !important',
                        color: 'info.dark',
                        borderRadius: '4px',
                      }}
                    >
                      Mark As Done
                    </Button>
                  ) : null}
                </StepLabel>
              </Step>
            ))}
          </Stepper>
        </CardContent>
      </Card>
      <ToastAlert
        placement="right"
        severity={showAlert.type}
        showAlert={showAlert.showAlert}
        onClose={() =>
          setShowAlert({
            showAlert: false,
            type: 'error',
            message: showAlert.message,
          })
        }
        message={showAlert.message}
        icon={
          showAlert.type === 'success' ? (
            <CheckCircleIcon weight="bold" />
          ) : (
            <XIcon weight="bold" />
          )
        }
      />
    </>
  );
};

export default CaseProgress;
