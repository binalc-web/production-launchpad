import { createFileRoute } from '@tanstack/react-router';
import AuditsAndReports from '@/pages/AuditsAndReports';

export const Route = createFileRoute('/_app/audit-reports')({
  component: AuditsAndReports,
});
