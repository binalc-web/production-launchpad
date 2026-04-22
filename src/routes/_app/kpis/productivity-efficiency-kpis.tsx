/**
 * Route definition for the Time-Based KPIs page.
 *
 * This file defines the route for the Time-Based KPIs page using `@tanstack/react-router`.
 * It specifies the component to be rendered for this route.
 */

import { createFileRoute } from '@tanstack/react-router';
import ProductivityEfficiencyKPIs from '@/pages/Kpis/ProductivityEfficiencyKPIs';

/**
 * Route configuration for the Time-Based KPIs page.
 *
 * - Path: '/_app/kpis/time-based-kpis'
 * - Component: `TimeBasedKPIs`
 */
export const Route = createFileRoute('/_app/kpis/productivity-efficiency-kpis')(
  {
    component: ProductivityEfficiencyKPIs,
  }
);
