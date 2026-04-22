import ManageApprovals from '@/pages/OrganizationManagement/OrganizationAdmin/ManageApprovals';
import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute(
  '/_app/organization-admin/manage-approvals'
)({
  component: ManageApprovals,
});
