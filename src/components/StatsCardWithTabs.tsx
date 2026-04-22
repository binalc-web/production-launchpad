/**
 * StatsCardWithTabs Component
 *
 * A flexible card component with tabs for displaying different statistical data sets.
 * Combines the tabbed interface with chart display functionality.
 *
 * @file src/components/StatsCardWithTabs.tsx
 * @since 2025-06-10
 */
import { useState, type FC, type ReactNode } from 'react';

import {
  Avatar,
  Box,
  Card,
  CardContent,
  Chip,
  Tab,
  Tabs,
  Tooltip,
  Typography,
  type Theme,
  type SxProps,
} from '@mui/material';
import {
  ArrowDownRightIcon,
  ArrowUpRightIcon,
  InfoIcon,
} from '@phosphor-icons/react';
import Chart from 'react-apexcharts';
import type { ApexOptions } from 'apexcharts';
import AppCustomLoader from './AppCustomLoader';

/**
 * Chart props for ApexCharts configuration
 *
 * @property {ApexOptions} options - Options for configuring the ApexChart instance
 * @property {ApexOptions['series']} series - Series data for the chart
 */
export type ChartProps = {
  options: ApexOptions;
  series: ApexOptions['series'];
};

/**
 * Tab data configuration
 *
 * @property {string} key - Unique identifier for the tab
 * @property {string} label - Display label shown in the tab
 * @property {string} value - Main numerical value to display when tab is active
 * @property {string} trendValue - Percentage value for trend indicator
 * @property {string} trendTitle - Text description for trend comparison period
 * @property {'up' | 'down'} trend - Direction of trend to determine styling and icon
 * @property {ChartProps} chart - Chart configuration for this tab's data visualization
 */
export type TabData = {
  key: string;
  label: string;
  value: string;
  trendValue: string;
  trendTitle: string;
  trend: 'up' | 'down';
  chart: ChartProps;
};

/**
 * Props for the StatsCardWithTabs component
 *
 * @property {string} [id] - Optional ID for the component
 * @property {string} title - Card title displayed in the header
 * @property {ReactNode} icon - Icon to display in the card header
 * @property {string} iconColor - Color of the icon
 * @property {string} iconBgColor - Background color for the icon avatar
 * @property {string} [tooltipText] - Optional tooltip text to display when hovering over info icon
 * @property {Array<TabData>} tabData - Array of tab configurations with associated data
 * @property {string} [defaultTab] - Optional key of the tab to show by default
 * @property {SxProps<Theme>} [sx] - Optional MUI sx props for custom styling
 */
export type StatsCardWithTabsProps = {
  id?: string;
  title: string;
  icon: ReactNode;
  iconColor: string;
  iconBgColor: string;
  tooltipText?: string;
  tabData: Array<TabData>;
  defaultTab?: string;
  sx?: SxProps<Theme>;
  isLoading?: boolean;
  onTabChange?: (tabKey: string) => void;
};

/**
 * StatsCardWithTabs Component
 *
 * A flexible card component that displays statistical data with a tabbed interface.
 * Each tab can show different values, trends, and chart visualizations while
 * maintaining a consistent UI structure.
 *
 * @param {StatsCardWithTabsProps} props - Component props
 * @returns {JSX.Element} Rendered component
 */
const StatsCardWithTabs: FC<StatsCardWithTabsProps> = (props) => {
  const {
    id,
    title,
    icon,
    iconColor,
    iconBgColor,
    tooltipText,
    tabData,
    defaultTab,
    sx,
    isLoading,
    onTabChange,
  } = props;

  // Set the default tab or use the first tab if not specified
  const [activeTab, setActiveTab] = useState<string>(
    defaultTab || (tabData.length > 0 ? tabData[0].key : '')
  );

  // Find the currently active tab data
  const currentTabData =
    tabData.find((tab) => tab.key === activeTab) || tabData[0];

  /**
   * Handle tab selection change
   *
   * @param {React.SyntheticEvent} _ - React synthetic event (unused)
   * @param {string} newValue - Key of the newly selected tab
   */
  const handleTabChange = (_: React.SyntheticEvent, newValue: string): void => {
    setActiveTab(newValue);
    onTabChange?.(newValue);
  };

  return (
    <Card sx={{ height: '100%' }}>
      <CardContent sx={{ ...sx }}>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            flexWrap: 'wrap',
            mb: 2,
          }}
        >
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1,
            }}
          >
            <Avatar
              variant="rounded"
              sx={{
                backgroundColor: iconBgColor,
                color: iconColor,
                '& svg': {
                  width: 24,
                  height: 24,
                },
              }}
            >
              {icon}
            </Avatar>
            <Typography variant="h6">{title}</Typography>
            {tooltipText && (
              <Tooltip title={tooltipText} arrow>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <InfoIcon size={20} />
                </Box>
              </Tooltip>
            )}
          </Box>

          <Box sx={{ flexGrow: 1 }} />

          {/* Tab navigation */}
          <Tabs
            value={activeTab}
            onChange={handleTabChange}
            aria-label="stats card tabs"
          >
            {tabData.map((tab) => (
              <Tab
                key={tab.key}
                label={tab.label}
                value={tab.key}
                sx={{
                  minWidth: 'auto',
                  px: 2,
                  fontWeight: activeTab === tab.key ? 600 : 400,
                }}
              />
            ))}
          </Tabs>
        </Box>

        {isLoading ? (
          <AppCustomLoader height={200} />
        ) : (
          <>
            {/* Value and trend indicator */}
            {currentTabData && (
              <Box sx={{ mt: 2.5 }}>
                <Box
                  sx={{ mt: 1, gap: 1, display: 'flex', alignItems: 'center' }}
                >
                  <Typography variant="h2">{currentTabData.value}</Typography>
                  <Chip
                    color={currentTabData.trend === 'up' ? 'success' : 'error'}
                    sx={{
                      backgroundColor:
                        currentTabData.trend === 'up'
                          ? 'success.lightest'
                          : 'error.lightest',
                      color:
                        currentTabData.trend === 'up'
                          ? 'success.dark'
                          : 'error.dark',
                    }}
                    label={
                      <Box
                        sx={{
                          gap: 0.5,
                          display: 'flex',
                          alignItems: 'center',
                        }}
                      >
                        <Box component="span">{currentTabData.trendValue}</Box>
                        <Box component="span">
                          {currentTabData.trend === 'up' ? (
                            <ArrowUpRightIcon size={12} />
                          ) : (
                            <ArrowDownRightIcon size={12} />
                          )}
                        </Box>
                      </Box>
                    }
                  />
                  <Typography
                    variant="caption"
                    sx={{ color: 'text.secondary' }}
                  >
                    {currentTabData.trendTitle}
                  </Typography>
                </Box>
              </Box>
            )}

            {/* Chart */}
            {currentTabData && currentTabData.chart && (
              <Box sx={{ mt: 2 }}>
                {/* Check if series has data, handling both array of objects with data property and direct number arrays */}
                {Array.isArray(currentTabData.chart.series) &&
                currentTabData.chart.series.length > 0 &&
                // Check if it's an object with data property
                ((typeof currentTabData.chart.series[0] === 'object' &&
                  currentTabData.chart.series[0]?.data?.length > 0) ||
                  // Or if it's a direct array of numbers
                  (Array.isArray(currentTabData.chart.series[0]) &&
                    currentTabData.chart.series[0].length > 0)) ? (
                  <Chart
                    {...(id ? { id: `${id}-${activeTab}` } : {})}
                    options={{
                      states: {
                        normal: {
                          filter: { type: 'none', value: 0 },
                        },
                        hover: {
                          filter: { type: 'none' },
                        },
                        active: {
                          filter: { type: 'none' },
                        },
                      } as ApexOptions['states'],
                      ...currentTabData.chart.options,
                    }}
                    series={currentTabData.chart.series}
                    type={currentTabData.chart.options.chart?.type}
                    width={currentTabData.chart.options.chart?.width || '100%'}
                    height={currentTabData.chart.options.chart?.height || 100}
                  />
                ) : (
                  <Typography sx={{ mt: 3 }}>
                    No chart data to display
                  </Typography>
                )}
              </Box>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default StatsCardWithTabs;
