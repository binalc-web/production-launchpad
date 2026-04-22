/**
 * KPI Layout Component
 *
 * This component serves as the layout for the KPIs (Key Performance Indicators) section.
 * It includes a breadcrumb for navigation, a scrollable tab bar for different KPI categories,
 * and an outlet for rendering the selected KPI content.
 */

import { Box, Paper, Tab, Tabs, Typography } from '@mui/material';
import Breadcrumbs, { type BreadcrumbItem } from '../components/Breadcrumbs';
import { Outlet, useNavigate, useRouterState } from '@tanstack/react-router';
import { useEffect, useRef } from 'react';

/**
 * Breadcrumb items for the KPI layout.
 */
const breadcrumbItems: Array<BreadcrumbItem> = [
  {
    title: 'KPIs',
  },
];

/**
 * List of tabs for the KPI categories.
 * Each tab includes a label, a path for navigation, and a flag to indicate if it is disabled.
 */
const listOfTabsForKpis = [
  {
    label: 'Customer Usage & Engagement',
    isDisabled: false,
    path: '/kpis/customer-usage-engagement',
  },
  {
    label: 'Operational Efficiency',
    isDisabled: false,
    path: '/kpis/operational-efficiency',
  },
  {
    label: 'Customer Satisfaction & Retention',
    path: '/kpis/customer-satisfaction-retention',
    isDisabled: false,
  },
  {
    label: 'Time-based KPIs',
    path: '/kpis/time-based-kpis',
    isDisabled: false,
  },
  {
    label: 'Productivity-based KPIs',
    path: '/kpis/productivity-based-kpis',
    isDisabled: false,
  },
  {
    label: 'Time Saving KPIs',
    path: '/kpis/time-saving-kpis',
    isDisabled: false,
  },
  {
    label: 'Productivity & Efficiency KPIs',
    path: '/kpis/productivity-efficiency-kpis',
    isDisabled: false,
  },
  {
    label: 'Cost Saving & ROI',
    path: '/kpis/cost-saving-roi',
    isDisabled: false,
  },
];

export const KpiLayout: React.FC = () => {
  const navigate = useNavigate();
  const { location } = useRouterState();

  /**
   * Reference to the scrollable tabs container.
   */
  const tabsRef = useRef<HTMLDivElement | null>(null);

  /**
   * References to individual tab elements for scrolling.
   */
  const tabRefs = useRef<Record<string, HTMLDivElement | null>>({});

  /**
   * Determines the currently selected tab based on the current route.
   */
  const selectedTab =
    listOfTabsForKpis.find((tab) => location.pathname === tab.path)?.label ||
    'Customer Usage & Engagement';

  /**
   * Handles tab change events.
   * Navigates to the selected tab's path.
   *
   * @param {React.SyntheticEvent} _event - The event object.
   * @param {string} newLabel - The label of the selected tab.
   */
  const handleChange = (
    _event: React.SyntheticEvent,
    newLabel: string
  ): void => {
    const selected = listOfTabsForKpis.find((tab) => tab.label === newLabel);
    if (selected) void navigate({ to: selected.path });
  };

  /**
   * Ensures the default tab is selected when the route is `/kpis`.
   * Scrolls the selected tab into view when the route changes.
   */
  useEffect(() => {
    if (location.pathname === '/kpis' || location.pathname === '/kpis/') {
      void navigate({
        to: '/kpis/customer-usage-engagement',
      });
    }

    const currentTab = tabRefs.current[selectedTab];
    if (currentTab && tabsRef.current) {
      currentTab.scrollIntoView({
        behavior: 'smooth',
        inline: 'center',
        block: 'nearest',
      });
    }
  }, [location.pathname, navigate, selectedTab]);

  return (
    <>
      {/* Breadcrumbs and Page Header */}
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
          <Typography variant="h4">KPIs</Typography>
        </Box>
      </Box>

      {/* Scrollable Tabs for KPI Categories */}
      <Tabs
        component={Paper}
        className="Tabs--settings"
        value={selectedTab}
        onChange={handleChange}
        aria-label="KPI category tabs"
        sx={{
          overflowX: 'scroll',
          whiteSpace: 'nowrap',
          '&::-webkit-scrollbar': {
            height: '4px',
          },
          '&::-webkit-scrollbar-thumb': {
            backgroundColor: 'rgba(0, 0, 0, 0.2)',
            borderRadius: '4px',
          },
          '&::-webkit-scrollbar-track': {
            backgroundColor: 'transparent',
          },
          pb: 0,
          '& .MuiTabs-indicator': {
            display: 'flex',
            backgroundColor: 'info.dark',
          },
        }}
        ref={tabsRef}
      >
        {listOfTabsForKpis.map((tab) => {
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
              ref={(element) => {
                tabRefs.current[tab.label] = element;
              }}
            />
          );
        })}
      </Tabs>

      {/* Outlet for Rendering Selected KPI Content */}
      <Outlet />
    </>
  );
};
