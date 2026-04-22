import TaskDetails from '../../../pages/CaseManagement/components/view/TaskDetails';
import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/_app/case-management/task/$id')({
  component: TaskDetails
});
