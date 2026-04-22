import type { FC } from 'react';
import { Box, Button, DialogActions, Alert } from '@mui/material';
import { CheckIcon, XCircleIcon } from '@phosphor-icons/react';
import type { FormActionsProps } from './types';

/**
 * FormActions component that renders the form action buttons in the task form
 * @component
 * @description Renders the action buttons at the bottom of the task form dialog, including:
 * - Save/Submit button for creating or updating tasks
 * - Cancel button for dismissing the form
 * - Delete button (only shown when editing an existing task)
 * - Error or success alerts for providing feedback to the user
 *
 * The component adapts its UI based on the current context (create vs edit) and
 * displays appropriate loading states during form submission.
 *
 * @param {object} props - Component props
 * @param {boolean} props.isSubmitting - Whether the form is currently being submitted
 * @param {Function} props.handleClose - Function to handle dialog close action
 * @param {TaskItemType | null} props.selectedTask - The task being edited, or null if creating a new task
 * @param {Function} props.setOpen - Function to control the dialog's open state
 * @param {Function} props.handleShowDeletePopup - Function to show the delete confirmation dialog
 * @param {boolean} props.showError - Whether to show the error/success alert
 * @param {string} props.errorMessage - The message to display in the alert
 * @param {'success' | 'error'} props.errorSeverity - The severity level of the alert
 */
const FormActions: FC<FormActionsProps> = ({
  isSubmitting,
  handleClose,
  selectedTask,
  setOpen,
  handleShowDeletePopup,
  showError,
  errorMessage,
  errorSeverity,
  reset,
  setFiles,
}) => {
  return (
    <Box>
      <DialogActions
        sx={{
          p: 3,
          pt: 3,
          pb: showError ? 1 : 3,
          borderTop: '1px solid',
          borderColor: 'divider',
          justifyContent: 'space-between',
        }}
      >
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
          <Button type="submit" variant="contained" loading={isSubmitting}>
            {selectedTask ? 'Save & Update' : 'Add Task'}
          </Button>
          <Button onClick={handleClose} variant="outlined" color="inherit">
            Cancel
          </Button>
        </Box>
        {selectedTask && (
          <Button
            onClick={() => {
              handleShowDeletePopup(selectedTask._id);
              setOpen(false);
              reset();
              setFiles([]);
            }}
            variant="outlined"
            color="error"
            sx={{
              bgcolor: '#FEF2F2',
            }}
          >
            Delete Task
          </Button>
        )}
      </DialogActions>

      {showError && (
        <Box sx={{ px: 3, pb: 2 }}>
          <Alert
            severity={errorSeverity}
            icon={
              errorSeverity === 'success' ? (
                <CheckIcon weight="bold" />
              ) : (
                <XCircleIcon weight="bold" />
              )
            }
            sx={{
              '& .MuiAlert-message': {
                display: 'flex',
                alignItems: 'center',
              },
            }}
          >
            {errorMessage}
          </Alert>
        </Box>
      )}
    </Box>
  );
};

export default FormActions;
