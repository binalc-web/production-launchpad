/**
 * Route definition for the Cost Saving & ROI KPIs page.
 *
 * This file defines the route for the Cost Saving & ROI KPIs page using `@tanstack/react-router`.
 * It specifies the component to be rendered for this route.
 */

import { createFileRoute } from '@tanstack/react-router';
import CostSavingROI from '@/pages/Kpis/CostSavingROI';

/**
 * Route configuration for the Cost Saving & ROI KPIs page.
 *
 * - Path: '/_app/kpis/cost-saving-roi'
 * - Component: `CostSavingROI`
 */
export const Route = createFileRoute('/_app/kpis/cost-saving-roi')({
  component: CostSavingROI,
});
