import { createFileRoute } from '@tanstack/react-router';
import ViewCase from '@/pages/CaseManagement/ViewCase';

export const Route = createFileRoute('/_app/case-management/view/$id')({
  component: ViewCase,
});
