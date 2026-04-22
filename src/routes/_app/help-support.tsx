/**
 * Route definition for the Help and Support page.
 *
 * This file defines the route for the Help and Support page using `@tanstack/react-router`.
 * It specifies the component to be rendered for this route.
 */

import { createFileRoute } from '@tanstack/react-router';
import HelpAndSupport from '@/pages/HelpAndSupport';

/**
 * Route configuration for the Help and Support page.
 *
 * - Path: '/_app/help-support'
 * - Component: `HelpAndSupport`
 */
export const Route = createFileRoute('/_app/help-support')({
  component: HelpAndSupport,
});
