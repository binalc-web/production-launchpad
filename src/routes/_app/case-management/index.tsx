import { createFileRoute } from '@tanstack/react-router';
import CaseManagement from '@/pages/CaseManagement';

export const Route = createFileRoute('/_app/case-management/')({
  component: CaseManagement,
});
