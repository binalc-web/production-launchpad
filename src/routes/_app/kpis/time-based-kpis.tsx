/**
 * Route definition for the Time-Based KPIs page.
 *
 * This file defines the route for the Time-Based KPIs page using `@tanstack/react-router`.
 * It specifies the component to be rendered for this route.
 */

import { createFileRoute } from '@tanstack/react-router';
import TimeBasedKPIs from '@/pages/Kpis/TimeBasedKPIs';

/**
 * Route configuration for the Time-Based KPIs page.
 *
 * - Path: '/_app/kpis/time-based-kpis'
 * - Component: `TimeBasedKPIs`
 */
export const Route = createFileRoute('/_app/kpis/time-based-kpis')({
  component: TimeBasedKPIs,
});
