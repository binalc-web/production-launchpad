/**
 * @module Routes/BillingChronology
 * @fileoverview Defines the dynamic route for viewing individual billing events
 * This route uses TanStack Router's file-based routing with dynamic parameters
 */

import { createFileRoute } from '@tanstack/react-router';
import EventTimelineDetail from '@/pages/BillingChronology/timeline/EventTimelineDetail';

/**
 * Route definition for viewing billing event details
 * Uses the dynamic $id parameter to identify which event to display
 */
/**
 * Defines the route for viewing an individual billing event
 *
 * This route is created with TanStack Router's createFileRoute and takes a dynamic $id parameter
 * The component to be rendered is EventTimelineDetail
 *
 * @typedef {import('@tanstack/react-router').Route} Route
 * @type {Route}
 * @category Routes
 * @subcategory BillingChronology
 */
export const Route = createFileRoute(
  '/_app/billing-chronology/billing-event/$chronologyID/$id'
)({
  component: EventTimelineDetail,
});
