import { createFileRoute } from '@tanstack/react-router';
import AccountSettings from '@/pages/Settings/AccountSettings';

export const Route = createFileRoute('/_app/settings/account-settings/')({
  component: AccountSettings,
});
