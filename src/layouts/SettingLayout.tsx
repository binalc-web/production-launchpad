import { Box, Paper, Tab, Tabs, Typography } from '@mui/material';
import Breadcrumbs, { type BreadcrumbItem } from '../components/Breadcrumbs';
import { Outlet, useNavigate, useRouterState } from '@tanstack/react-router';
import { useEffect } from 'react';

const breadcrumbItems: Array<BreadcrumbItem> = [
  {
    title: 'Settings',
  },
];

const listOfTabsForSetting = [
  {
    label: 'Profile Overview',
    isDisabled: false,
    path: '/settings/profile-overview',
  },
  {
    label: 'Account Settings',
    isDisabled: false,
    path: '/settings/account-settings',
  },
  {
    label: 'Notifications',
    isDisabled: true,
  },
  {
    label: 'Billing Settings',
    isDisabled: true,
  },
  {
    label: 'Referrals',
    isDisabled: true,
  },
  {
    label: 'Subscription',
    isDisabled: true,
  },
];

export const SettingLayout: React.FC = () => {
  const navigate = useNavigate();
  const { location } = useRouterState();

  const selectedTab =
    listOfTabsForSetting.find((tab) => location.pathname === tab.path)?.label ||
    'Profile Overview';

  const handleChange = (
    _event: React.SyntheticEvent,
    newLabel: string
  ): void => {
    const selected = listOfTabsForSetting.find((tab) => tab.label === newLabel);
    if (selected) void navigate({ to: selected.path });
  };

  useEffect(() => {
    if (
      location.pathname === '/settings' ||
      location.pathname === '/settings/'
    ) {
      void navigate({
        to: '/settings/profile-overview',
      });
    }
  }, [location.pathname, navigate]);

  return (
    <>
      <Box mb={3}>
        <Breadcrumbs items={breadcrumbItems} />
        <Box
          sx={{
            mt: 1.25,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <Typography variant="h4">Settings</Typography>
        </Box>
      </Box>

      <Tabs
        component={Paper}
        className="Tabs--settings"
        value={selectedTab}
        onChange={handleChange}
        aria-label="secondary tabs example"
        sx={{
          pb: 0,
          '& .MuiTabs-indicator': {
            display: 'flex',
            backgroundColor: 'info.dark',
          },
        }}
      >
        {listOfTabsForSetting.map((tab) => {
          return (
            <Tab
              sx={{
                pb: 1,
              }}
              key={tab.label}
              className="Tab--settings"
              value={tab.label}
              label={tab.label}
              disabled={tab.isDisabled}
            />
          );
        })}
      </Tabs>

      <Outlet />
    </>
  );
};
