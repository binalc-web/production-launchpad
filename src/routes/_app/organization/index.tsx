import Organization from '@/pages/OrganizationManagement';
import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/_app/organization/')({
  component: Organization,
});
