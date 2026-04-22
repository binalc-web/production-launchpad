import { createFileRoute } from '@tanstack/react-router';
import EditCase from '@/pages/CaseManagement/EditCase';

export const Route = createFileRoute('/_app/case-management/edit/$id')({
  component: EditCase,
});
