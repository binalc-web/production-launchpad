import ManageAllUsersApprovals from '@/pages/OrganizationManagement/ManageAllUsersApprovals';
import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/_app/organization/manage-all-users-approvals')({
  component: ManageAllUsersApprovals,
});
