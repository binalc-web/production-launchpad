import { createFileRoute } from '@tanstack/react-router';
import RoleSelection from '@/pages/Register/steps/RoleSelection';

export const Route = createFileRoute('/auth/register/_layout/role-selection')({
  component: RoleSelection,
});
