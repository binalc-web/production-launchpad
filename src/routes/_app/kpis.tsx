/**
 * Route definition for the KPIs (Key Performance Indicators) page.
 *
 * This file defines the route for the KPIs page using `@tanstack/react-router`.
 * It specifies the layout component to be rendered for this route.
 */

import { createFileRoute } from '@tanstack/react-router';
import { KpiLayout } from '@/layouts/KpiLayout';

/**
 * Route configuration for the KPIs page.
 *
 * - Path: '/_app/kpis'
 * - Component: `KpiLayout`
 */
export const Route = createFileRoute('/_app/kpis')({
  component: KpiLayout,
});
