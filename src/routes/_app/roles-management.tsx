import RolesManagement from '../../pages/RoleManagement';
import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/_app/roles-management')({
  component: RolesManagement,
});
