import { createFileRoute } from '@tanstack/react-router';
import DashBoard from '@/pages/Dashboard';

export const Route = createFileRoute('/_app/dashboard')({
  component: DashBoard,
});
