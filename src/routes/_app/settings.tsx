import { createFileRoute } from '@tanstack/react-router';
import { SettingLayout } from '@/layouts/SettingLayout';

export const Route = createFileRoute('/_app/settings')({
  component: SettingLayout,
});
