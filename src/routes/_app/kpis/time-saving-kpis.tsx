/**
 * Route definition for the Time-Saving KPIs page.
 *
 * This file defines the route for the Time-Saving KPIs page using `@tanstack/react-router`.
 * It specifies the component to be rendered for this route.
 */

import { createFileRoute } from '@tanstack/react-router';
import TimeSavingKPIs from '@/pages/Kpis/TimeSavingKPIs';

/**
 * Route configuration for the Time-Saving KPIs page.
 *
 * - Path: '/_app/kpis/time-saving-kpis'
 * - Component: `TimeSavingKPIs`
 */
export const Route = createFileRoute('/_app/kpis/time-saving-kpis')({
  component: TimeSavingKPIs,
});
