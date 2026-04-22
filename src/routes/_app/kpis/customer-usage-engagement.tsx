/**
 * Route definition for the Customer Usage & Engagement KPIs page.
 *
 * This file defines the route for the Customer Usage & Engagement KPIs page using `@tanstack/react-router`.
 * It specifies the component to be rendered for this route.
 */

import { createFileRoute } from '@tanstack/react-router';
import CustomerUsageEngagement from '@/pages/Kpis/CustomerUsageEngagement';

/**
 * Route configuration for the Customer Usage & Engagement KPIs page.
 *
 * - Path: '/_app/kpis/customer-usage-engagement'
 * - Component: `CustomerUsageEngagement`
 */
export const Route = createFileRoute('/_app/kpis/customer-usage-engagement')({
  component: CustomerUsageEngagement,
});
