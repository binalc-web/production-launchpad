/**
 * Route definition for the Productivity-Based KPIs page.
 *
 * This file defines the route for the Productivity-Based KPIs page using `@tanstack/react-router`.
 * It specifies the component to be rendered for this route.
 */

import { createFileRoute } from '@tanstack/react-router';
import ProductivityBasedKPIs from '@/pages/Kpis/ProductivityBasedKPIs';

/**
 * Route configuration for the Productivity-Based KPIs page.
 *
 * - Path: '/_app/kpis/productivity-based-kpis'
 * - Component: `ProductivityBasedKPIs`
 */
export const Route = createFileRoute('/_app/kpis/productivity-based-kpis')({
  component: ProductivityBasedKPIs,
});
