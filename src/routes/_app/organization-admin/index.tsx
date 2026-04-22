import OrganizationAdmin from '../../../pages/OrganizationManagement/OrganizationAdmin';
import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/_app/organization-admin/')({
  component: OrganizationAdmin,
});
