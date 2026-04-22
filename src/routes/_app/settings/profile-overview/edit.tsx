import { createFileRoute } from '@tanstack/react-router';
import EditProfile from '@/pages/Settings/EditProfile';

export const Route = createFileRoute('/_app/settings/profile-overview/edit')({
  component: EditProfile,
});
