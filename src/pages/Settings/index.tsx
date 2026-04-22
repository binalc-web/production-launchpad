import { Box, Paper, Tab, Tabs, Typography } from '@mui/material';
import Breadcrumbs, { type BreadcrumbItem } from '@/components/Breadcrumbs';
import { useState } from 'react';
import ProfileInformationContainer from './components/ProfileInformationsContainer';

const breadcrumbItems: Array<BreadcrumbItem> = [
  {
    title: 'Settings',
  },
];

const listOfTabsForSetting = [
  {
    label: 'Profile Overview',
    isDisabled: false,
  },
  {
    label: 'Account Settings',
    isDisabled: false,
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

const Settings: React.FC = () => {
  const [selectedTab, setSelectedTab] = useState('Profile Overview');

  const handleChange = (
    event: React.SyntheticEvent,
    newValue: string
  ): void => {
    setSelectedTab(newValue);
  };

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
          '& .MuiTabs-indicator': {
            display: 'flex',
            backgroundColor: 'info.dark',
          },
        }}
      >
        {listOfTabsForSetting.map((tab) => {
          return (
            <Tab
              key={tab.label}
              className="Tab--settings"
              value={tab.label}
              label={tab.label}
              disabled={tab.isDisabled}
            />
          );
        })}
      </Tabs>
      {selectedTab === 'Profile Overview' ? (
        <ProfileInformationContainer />
      ) : (
        <></>
      )}
    </>
  );
};

export default Settings;
