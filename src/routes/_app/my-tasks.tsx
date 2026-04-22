import MyTasks from '@/pages/CaseManagement/components/MyTasks';
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_app/my-tasks')({
  validateSearch: (search) => {
    return {
      showToDo: search.showToDo as boolean | undefined,
    };
  },
  component: MyTasks,
});
