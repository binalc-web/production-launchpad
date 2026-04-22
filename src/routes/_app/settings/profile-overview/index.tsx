import { createFileRoute } from '@tanstack/react-router';
import ProfileOverView from '@/pages/Settings/ProfileOverview';

export const Route = createFileRoute('/_app/settings/profile-overview/')({
  component: ProfileOverView,
});
