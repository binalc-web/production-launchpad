/**
 * Route definition for the Customer Satisfaction & Retention KPIs page.
 *
 * This file defines the route for the Customer Satisfaction & Retention KPIs page using `@tanstack/react-router`.
 * It specifies the component to be rendered for this route.
 */

import { createFileRoute } from '@tanstack/react-router';
import CustomerSatisfactionRetention from '@/pages/Kpis/CustomerSatisfactionRetention';

/**
 * Route configuration for the Customer Satisfaction & Retention KPIs page.
 *
 * - Path: '/_app/kpis/customer-satisfaction-retention'
 * - Component: `CustomerSatisfactionRetention`
 */
export const Route = createFileRoute(
  '/_app/kpis/customer-satisfaction-retention'
)({
  component: CustomerSatisfactionRetention,
});
