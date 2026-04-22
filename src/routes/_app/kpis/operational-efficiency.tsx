/**
 * Route definition for the Operational Efficiency KPIs page.
 *
 * This file defines the route for the Operational Efficiency KPIs page using `@tanstack/react-router`.
 * It specifies the component to be rendered for this route.
 */

import { createFileRoute } from '@tanstack/react-router';
import OperationalEfficiency from '@/pages/Kpis/OperationalEfficiency';

/**
 * Route configuration for the Operational Efficiency KPIs page.
 *
 * - Path: '/_app/kpis/operational-efficiency'
 * - Component: `OperationalEfficiency`
 */
export const Route = createFileRoute('/_app/kpis/operational-efficiency')({
  component: OperationalEfficiency,
});
