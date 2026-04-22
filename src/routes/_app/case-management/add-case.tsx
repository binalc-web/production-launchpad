import { createFileRoute } from '@tanstack/react-router';
import AddCase from '@/pages/CaseManagement/AddCase';

export const Route = createFileRoute('/_app/case-management/add-case')({
  component: AddCase,
});
