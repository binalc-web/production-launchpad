import { createFileRoute } from '@tanstack/react-router';
import MasterChronology from '@/pages/MasterChronology';

export const Route = createFileRoute('/_app/master-chronology/')({
  component: MasterChronology,
});
