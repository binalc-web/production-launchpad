import OrganizationUsers from '@/pages/OrganizationManagement/OrganizationUsers';
import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/_app/organization/users/$id')({
  component: OrganizationUsers,
});
