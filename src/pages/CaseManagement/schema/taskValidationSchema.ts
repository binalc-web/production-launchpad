import * as yup from 'yup';

export const addTaskSchema = yup.object().shape({
  title: yup.string().required('Task title is required'),
  description: yup.string().optional(),
  priority: yup.string().required('Task priority is required'),
  status: yup
    .string()
    .required('Status is required')
    .test(
      'assignee-status-rule',
      'Tasks assigned to another user must be set to "In Progress".',
      function (value) {
        const { assignee } = this.parent;
        const currentUserId = this.options.context?.currentUserId;
        console.log(
          'currentUserId',
          currentUserId,
          assignee,
          assignee !== currentUserId,
          value
        );
        if (!value) return true;

        // ❌ If different user AND status is todo → invalid
        if (assignee && assignee !== currentUserId && value === 'todo') {
          return false;
        }

        return true;
      }
    ),
  dueDate: yup.date().typeError('Invalid date').required('Date is required'),
  taskReminderDate: yup.date().nullable().optional(),
  assignee: yup.string().required('Assignee is required'),
  caseId: yup.string(),
  files: yup.array().of(yup.mixed()),
  organizationId: yup.string().optional(),
});
