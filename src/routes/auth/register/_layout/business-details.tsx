import { createFileRoute } from '@tanstack/react-router';

import { BusinessDetails } from '@/pages/Register/steps/BusinessDetails';

export const Route = createFileRoute('/auth/register/_layout/business-details')(
  {
    component: BusinessDetails,
  }
);
