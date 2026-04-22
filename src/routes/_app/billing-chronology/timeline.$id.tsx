import { createFileRoute } from '@tanstack/react-router';
import ChronologyTimeline from '@/pages/BillingChronology/timeline';

export const Route = createFileRoute('/_app/billing-chronology/timeline/$id')({
  component: ChronologyTimeline,
});
