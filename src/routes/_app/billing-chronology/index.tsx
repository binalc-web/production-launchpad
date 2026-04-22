import { createFileRoute } from '@tanstack/react-router';
import BillingChronology from '@/pages/BillingChronology';

export const Route = createFileRoute('/_app/billing-chronology/')({
  component: BillingChronology,
});
