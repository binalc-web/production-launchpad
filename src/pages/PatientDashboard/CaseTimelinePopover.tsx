import type React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  IconButton,
  Typography,
  Step,
  StepLabel,
  Stepper,
  Divider,
  Box,
} from '@mui/material';
import { CASE_PROGRESS } from '../CaseManagement/components/view/CaseProgress';
import { XIcon } from '@phosphor-icons/react';

type Props = {
  open: boolean;
  onClose: () => void;
  caseStatus: string;
};

const CaseTimelinePopover: React.FC<Props> = ({
  open,
  onClose,
  caseStatus,
}) => {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      sx={{
        '& .MuiPaper-root': {
          borderRadius: '24px',
          width: 500,
        },
      }}
    >
      <DialogTitle
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <Typography fontWeight={600} variant="h4" fontSize={20}>
          Case Timeline
        </Typography>
        <IconButton
          onClick={onClose}
          sx={{
            backgroundColor: 'transparent',
            '&:hover': {
              backgroundColor: 'transparent',
            },
          }}
        >
          <XIcon size={24} color="neutral.500" />
        </IconButton>
      </DialogTitle>
      <Divider></Divider>
      <DialogContent
        sx={{
          m: 2,
        }}
      >
        <Stepper
          orientation="vertical"
          activeStep={CASE_PROGRESS.findIndex(
            (step) => step.value === caseStatus
          )}
          sx={{
            pl: 1,
            '& .MuiStepConnector-line': {
              minHeight: 24,
              borderLeft: '1px solid',
              borderColor: 'divider',
              ml: 2,
            },

            // Active step
            '& .MuiStepConnector-root.Mui-active .MuiStepConnector-line': {
              borderColor: 'info.main',
            },
          }}
        >
          {CASE_PROGRESS.map((step, index) => {
            const isActive = step.value === caseStatus;
            const isCompleted =
              CASE_PROGRESS.findIndex((s) => s.value === caseStatus) > index;

            return (
              <Step key={step.value}>
                <StepLabel
                  icon={null}
                  StepIconComponent={() => null}
                  sx={{ py: 1 }}
                >
                  <Box display="flex" alignItems="center" gap={1}>
                    <Box
                      sx={{
                        width: 40,
                        height: 40,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        borderRadius: '50%',
                        border: '1px solid',
                        borderColor:
                          isActive || isCompleted ? 'info.dark' : 'divider',
                        bgcolor:
                          isActive || isCompleted ? 'info.dark' : 'transparent',
                        color:
                          isActive || isCompleted
                            ? 'common.white'
                            : 'text.secondary',
                      }}
                    >
                      {step.icon}
                    </Box>
                    <Typography
                      fontSize={14}
                      fontWeight={isActive ? 500 : 400}
                      color={
                        isActive || isCompleted
                          ? 'text.primary'
                          : 'text.secondary'
                      }
                    >
                      {step.label}
                    </Typography>
                  </Box>
                </StepLabel>
              </Step>
            );
          })}
        </Stepper>
      </DialogContent>
    </Dialog>
  );
};

export default CaseTimelinePopover;
