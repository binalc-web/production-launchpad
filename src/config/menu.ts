export type MenuItemType = {
  key: string;
  text: string;
  path: string;
  icon: string;
};

const thirdPartyMenuItems: {
  general: Array<MenuItemType>;
  tools: Array<MenuItemType>;
} = {
  general: [
    {
      key: 'dashboard',
      text: 'Dashboard',
      path: '/dashboard',
      icon: 'House',
    },

    {
      key: 'my-tasks',
      text: 'My Task',
      path: '/my-tasks',
      icon: 'CheckCircle',
    },
  ],
  tools: [
    {
      key: 'organization-users',
      text: 'Organization Users',
      path: '/organization-admin',
      icon: 'UsersFour',
    },
    {
      key: 'help-support',
      path: '/help-support',
      text: 'Help and Support',
      icon: 'Headset',
    },
    {
      key: 'settings',
      path: '/settings/profile-overview',
      text: 'Settings',
      icon: 'Gear',
    },
    {
      key: 'referral-program',
      path: 'https://forms.zohopublic.com/solvereininc/form/ProductFeedback/formperma/AG4ACzdK4D1pnqdLdeDT5MjMNr7XnNMptCqqpOXk9qY',
      text: 'Referral Program',
      icon: 'MegaphoneIcon',
    },
  ],
};

const individualMenuItems: {
  general: Array<MenuItemType>;
  tools: Array<MenuItemType>;
} = {
  general: [
    {
      key: 'dashboard',
      text: 'Dashboard',
      path: '/dashboard',
      icon: 'House',
    },
    {
      key: 'case-management',
      text: 'Case Management',
      path: '/case-management',
      icon: 'Folders',
    },
  ],
  tools: [
    {
      key: 'help-support',
      path: '/help-support',
      text: 'Help and Support',
      icon: 'Headset',
    },
    {
      key: 'settings',
      path: '/settings/profile-overview',
      text: 'Settings',
      icon: 'Gear',
    },
    {
      key: 'referral-program',
      path: 'https://forms.zohopublic.com/solvereininc/form/ProductFeedback/formperma/AG4ACzdK4D1pnqdLdeDT5MjMNr7XnNMptCqqpOXk9qY',
      text: 'Referral Program',
      icon: 'MegaphoneIcon',
    },
  ],
};

export const menuItems: Record<
  string,
  { general: Array<MenuItemType>; tools: Array<MenuItemType> }
> = {
  // eslint-disable-next-line camelcase
  legal_user: {
    general: [
      {
        key: 'dashboard',
        text: 'Dashboard',
        path: '/dashboard',
        icon: 'House',
      },
      {
        key: 'case-management',
        text: 'Case Management',
        path: '/case-management',
        icon: 'Folders',
      },
      {
        key: 'medical-records',
        path: '/medical-records',
        text: 'Medical Records',
        icon: 'Files',
      },
      {
        key: 'medical-chronology',
        path: '/medical-chronology',
        text: 'Medical Chronology',
        icon: 'LineSegments',
      },
      {
        key: 'billing-chronology',
        path: '/billing-chronology',
        text: 'Billing Chronology',
        icon: 'Invoice',
      },
      {
        key: 'master-chronology',
        path: '/master-chronology',
        text: 'Master Chronology',
        icon: 'AlignLeftIcon',
      },
      {
        key: 'audit-reports',
        path: '/audit-reports',
        text: 'Audit Reports',
        icon: 'ListMagnifyingGlass',
      },
    ],
    tools: [
      {
        key: 'organization-users',
        text: 'Organization Users',
        path: '/organization-admin',
        icon: 'UsersFour',
      },
      {
        key: 'organization',
        text: 'Manage Organization',
        path: '/organization',
        icon: 'BuildingIcon',
      },
      {
        key: 'roles-management',
        path: '/roles-management',
        text: 'Role Management',
        icon: 'UsersThree',
      },
      {
        key: 'help-support',
        path: '/help-support',
        text: 'Help and Support',
        icon: 'Headset',
      },
      {
        key: 'settings',
        path: '/settings/profile-overview',
        text: 'Settings',
        icon: 'Gear',
      },
      {
        key: 'referral-program',
        path: 'https://forms.zohopublic.com/solvereininc/form/ProductFeedback/formperma/AG4ACzdK4D1pnqdLdeDT5MjMNr7XnNMptCqqpOXk9qY',
        text: 'Referral Program',
        icon: 'MegaphoneIcon',
      },
    ],
  },

  patient: individualMenuItems,

  parent: individualMenuItems,

  trustee: individualMenuItems,

  // eslint-disable-next-line camelcase
  durable_power_of_attorney: individualMenuItems,

  // eslint-disable-next-line camelcase
  super_admin: {
    general: [
      {
        key: 'dashboard',
        text: 'Dashboard',
        path: '/dashboard',
        icon: 'House',
      },
      {
        key: 'user-management',
        text: 'User Management',
        path: '/user-management',
        icon: 'UsersThree',
      },
    ],
    tools: [
      {
        key: 'organization',
        text: 'Organization',
        path: '/organization',
        icon: 'UsersFour',
      },
      {
        key: 'help-support',
        path: '/help-support',
        text: 'Help and Support',
        icon: 'Headset',
      },
      {
        key: 'settings',
        path: '/settings/profile-overview',
        text: 'Settings',
        icon: 'Gear',
      },
      {
        key: 'referral-program',
        path: 'https://forms.zohopublic.com/solvereininc/form/ProductFeedback/formperma/AG4ACzdK4D1pnqdLdeDT5MjMNr7XnNMptCqqpOXk9qY',
        text: 'Referral Program',
        icon: 'MegaphoneIcon',
      },
    ],
  },

  // eslint-disable-next-line camelcase
  third_party_administrator_user: thirdPartyMenuItems,
  // eslint-disable-next-line camelcase
  hospital_user: thirdPartyMenuItems,
  // eslint-disable-next-line camelcase
  estate_representative_user: thirdPartyMenuItems,
  // eslint-disable-next-line camelcase
  insurance_user: thirdPartyMenuItems,
};
