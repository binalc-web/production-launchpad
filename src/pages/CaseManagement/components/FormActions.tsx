import { Box, Button, CardContent } from '@mui/material';

/**
 * Props for the FormActions component
 * @interface FormActionsProps
 * @property {number} [id] - Optional case ID, used to determine if form is in edit or create mode
 * @property {() => void} [onCancel] - Optional callback function for cancel button
 * @property {boolean} [isSubmitting] - Optional flag indicating if form is currently submitting
 */
interface FormActionsProps {
  id?: number;
  onCancel?: () => void;
  isSubmitting?: boolean;
}

/**
 * Component that renders form action buttons (submit and cancel)
 * @component
 * @description Displays consistent form action buttons for case forms.
 * Part of the AddCase component refactoring that breaks down a large form into smaller,
 * focused components. Button text adapts based on whether it's an edit or create operation.
 *
 * @param {object} props - Component props
 * @param {number} [props.id] - Optional case ID, determines if in edit or create mode
 * @param {() => void} [props.onCancel] - Callback for cancel button click
 * @param {boolean} [props.isSubmitting] - Whether form is currently submitting
 * @returns {React.ReactElement} Rendered component
 */
const FormActions: React.FC<FormActionsProps> = ({
  id,
  onCancel,
  isSubmitting,
}) => {
  return (
    <CardContent>
      <Box
        sx={{
          gap: 1,
          display: 'flex',
          alignItems: 'center',
        }}
      >
        <Button loading={isSubmitting} type="submit" variant="contained">
          {id ? 'Save & Update' : 'Add Case'}
        </Button>
        <Button
          variant="outlined"
          onClick={onCancel}
          sx={{
            color: 'neutral.700',
            borderColor: 'neutral.500',
          }}
        >
          Cancel
        </Button>
      </Box>
    </CardContent>
  );
};

export default FormActions;
