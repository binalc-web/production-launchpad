import type { FC } from 'react';
import {
  Box,
  Grid,
  InputLabel,
  MenuItem,
  Select,
  TextField,
  Typography,
} from '@mui/material';
import { Controller } from 'react-hook-form';
import ReactDatepicker from '@/components/ReactDatepicker';
import { renderPlaceholder, emptySelectStyle } from '@/utils/placeholder';
import { PRIORITY_OPTIONS, STATUS_OPTIONS } from './constants';
import type { TaskInfoSectionProps } from './types';
import TaskAssignee from './TaskAssignee';

/**
 * Component that renders the task information form fields
 * @component
 * @description Renders a form section with fields for task information including
 * task title, description, priority, status, due date, reminder settings, and assignee selection.
 * Uses react-hook-form for form management and validation.
 *
 * The component provides a consistent user experience with standardized form fields that include:
 * - Validation error display
 * - Required field indicators
 * - Consistent styling and layout
 * - Proper handling of loading states for async data
 *
 * @param {object} props - Component props
 * @param {Control<TaskFormData>} props.control - react-hook-form control object for managing form state
 * @param {FieldErrors<TaskFormData>} props.errors - Form validation errors from react-hook-form
 * @param {boolean} props.isLoadingAssignees - Whether assignees are currently being loaded
 * @param {object} props.assigneesData - Data containing available assignees with their details
 * @param {Array<Assignee>} props.assigneesData.data - Array of assignee objects with _id, firstName, lastName properties
 */

const TaskInfoSection: FC<TaskInfoSectionProps> = ({
  control,
  errors,
  dueDateValue,
  watch,
  caseId,
}) => {
  return (
    <Box sx={{ p: 3 }}>
      <Grid container rowSpacing={2.5} columnSpacing={2}>
        <Grid size={{ xs: 12 }}>
          <InputLabel htmlFor="title">
            <Typography
              component="span"
              sx={{ color: 'error.main', fontSize: 12 }}
            >
              *
            </Typography>{' '}
            Task Title
          </InputLabel>
          <Controller
            name="title"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                fullWidth
                id="title"
                placeholder="Enter Task Title"
                error={!!errors.title}
                helperText={errors.title?.message}
              />
            )}
          />
        </Grid>
        <Grid size={{ xs: 12 }}>
          <InputLabel htmlFor="description">Task Description</InputLabel>
          <Controller
            name="description"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                fullWidth
                id="description"
                placeholder="Write your notes here..."
                multiline
                rows={2}
                error={!!errors.description}
                helperText={errors.description?.message}
              />
            )}
          />
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <InputLabel htmlFor="priority">
            <Typography
              component="span"
              sx={{ color: 'error.main', fontSize: 12 }}
            >
              *
            </Typography>{' '}
            Task Priority
          </InputLabel>
          <Controller
            name="priority"
            control={control}
            render={({ field }) => (
              <Select
                {...field}
                fullWidth
                id="priority"
                displayEmpty
                renderValue={(value) =>
                  renderPlaceholder(value, PRIORITY_OPTIONS, 'Select Priority')
                }
                sx={{
                  ...emptySelectStyle(field.value),
                }}
                error={!!errors.priority}
              >
                {PRIORITY_OPTIONS.map((option) => (
                  <MenuItem key={option.value} value={option.value}>
                    {option.label}
                  </MenuItem>
                ))}
              </Select>
            )}
          />
          {errors.priority && (
            <Typography
              variant="caption"
              sx={{ color: 'error.main', ml: 1.75, mt: 0.5 }}
            >
              {errors.priority.message}
            </Typography>
          )}
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <InputLabel htmlFor="status">
            <Typography
              component="span"
              sx={{ color: 'error.main', fontSize: 12 }}
            >
              *
            </Typography>{' '}
            Task Status
          </InputLabel>
          <Controller
            name="status"
            control={control}
            render={({ field }) => (
              <Select
                {...field}
                fullWidth
                id="status"
                displayEmpty
                renderValue={(value) =>
                  renderPlaceholder(value, STATUS_OPTIONS, 'Select Status')
                }
                sx={{
                  ...emptySelectStyle(field.value),
                }}
                error={!!errors.status}
              >
                {STATUS_OPTIONS.map((option) => (
                  <MenuItem key={option.value} value={option.value}>
                    {option.label}
                  </MenuItem>
                ))}
              </Select>
            )}
          />
          {errors.status && (
            <Typography
              variant="caption"
              sx={{ color: 'error.main', ml: 0.5, mt: 0.5 }}
            >
              {errors.status.message}
            </Typography>
          )}
        </Grid>
        <Grid size={{ xs: 12, md: 6 }} sx={{ '& input': { py: 0.2 } }}>
          <InputLabel htmlFor="dueDate">
            <Typography
              component="span"
              sx={{ color: 'error.main', fontSize: 12 }}
            >
              *
            </Typography>{' '}
            Due Date
          </InputLabel>
          <Controller
            name="dueDate"
            control={control}
            render={({ field }) => (
              <ReactDatepicker
                placeholderText="Select Due Date"
                selected={field.value}
                onChange={(date) => field.onChange(date)}
                showTimeSelect={false}
                dateFormat="MM/dd/yyyy"
                minDate={new Date()}
                className={errors.dueDate ? 'error' : ''}
              />
            )}
          />
          {errors.dueDate && (
            <Typography
              variant="caption"
              sx={{ color: 'error.main', ml: 1.75, mt: 0.5 }}
            >
              {errors.dueDate.message}
            </Typography>
          )}
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <InputLabel htmlFor="taskReminderDate">Task Reminder</InputLabel>
          <Controller
            name="taskReminderDate"
            control={control}
            render={({ field }) => (
              <ReactDatepicker
                disabled={!dueDateValue}
                placeholderText="Select Task Reminder"
                selected={field.value}
                onChange={(date) => field.onChange(date)}
                showTimeSelect={false}
                dateFormat="MM/dd/yyyy"
                minDate={new Date()}
                maxDate={(dueDateValue as Date) || new Date()}
              />
            )}
          />
        </Grid>

        <TaskAssignee
          control={control}
          errors={errors}
          watch={watch}
          caseId={caseId}
        />
      </Grid>
    </Box>
  );
};

export default TaskInfoSection;
