export type RouteAccessType = 'all' | Array<string>;

const thirdPartyUserAccessRoutes = [
  '/dashboard',
  '/help-support',
  '/organization-admin',
  '/organization/users/:id',
  '/case-management/task/:id',
  '/organization-admin/manage-approvals',
  '/settings/profile-overview',
  '/settings/account-settings',
  '/settings/profile-overview/edit',
  '/my-tasks',
];

const individualUserAccessRoutes = [
  '/dashboard',
  '/case-management',
  '/case-management/view/:id',
  '/case-management/task/:id',
  '/help-support',
  '/settings/profile-overview',
  '/settings/account-settings',
  '/settings/profile-overview/edit',
  '/medical-records/request',
];

export const routeAccess: Record<string, RouteAccessType> = {
  patient: individualUserAccessRoutes,
  parent: individualUserAccessRoutes,
  trustee: individualUserAccessRoutes,
  // eslint-disable-next-line camelcase
  durable_power_of_attorney: individualUserAccessRoutes,

  // eslint-disable-next-line camelcase
  legal_user: 'all',
  // eslint-disable-next-line camelcase
  super_admin: [
    '/dashboard',
    '/organization',
    '/organization/users/:id',
    '/user-management',
    '/help-support',
    '/settings/profile-overview',
    '/settings/account-settings',
    '/settings/profile-overview/edit',
  ],
  // eslint-disable-next-line camelcase
  third_party_administrator_user: thirdPartyUserAccessRoutes,
  // eslint-disable-next-line camelcase
  hospital_user: thirdPartyUserAccessRoutes,
  // eslint-disable-next-line camelcase
  estate_representative_user: thirdPartyUserAccessRoutes,
  // eslint-disable-next-line camelcase
  insurance_user: thirdPartyUserAccessRoutes,
};
