import { Box, type Theme } from '@mui/material';
import {
  ClockClockwiseIcon,
  FilesIcon,
  TrayArrowUpIcon,
} from '@phosphor-icons/react';

export const activeCaseByMonth = {
  id: 'activeCaseByMonth',
  title: 'Active Cases',
  // value: '2,420',
  // trend: 'up',
  // trendValue: '47',
  trendTitle: 'From last month',
  trendColor: 'success.dark',
  icon: (
    <Box
      component="svg"
      width="24px"
      height="24px"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <Box
        component="path"
        opacity="0.2"
        d="M19.5 6.75V17.25C19.5 17.4489 19.421 17.6397 19.2803 17.7803C19.1397 17.921 18.9489 18 18.75 18H16.5V9.75L12.75 6H7.5V3.75C7.5 3.55109 7.57902 3.36032 7.71967 3.21967C7.86032 3.07902 8.05109 3 8.25 3H15.75L19.5 6.75Z"
        fill="#3957D7"
      />
      <Box
        component="path"
        d="M20.0306 6.21938L16.2806 2.46938C16.2109 2.39975 16.1282 2.34454 16.0371 2.3069C15.9461 2.26926 15.8485 2.24992 15.75 2.25H8.25C7.85218 2.25 7.47064 2.40804 7.18934 2.68934C6.90804 2.97064 6.75 3.35218 6.75 3.75V5.25H5.25C4.85218 5.25 4.47064 5.40804 4.18934 5.68934C3.90804 5.97064 3.75 6.35218 3.75 6.75V20.25C3.75 20.6478 3.90804 21.0294 4.18934 21.3107C4.47064 21.592 4.85218 21.75 5.25 21.75H15.75C16.1478 21.75 16.5294 21.592 16.8107 21.3107C17.092 21.0294 17.25 20.6478 17.25 20.25V18.75H18.75C19.1478 18.75 19.5294 18.592 19.8107 18.3107C20.092 18.0294 20.25 17.6478 20.25 17.25V6.75C20.2501 6.65148 20.2307 6.55391 20.1931 6.46286C20.1555 6.37182 20.1003 6.28908 20.0306 6.21938ZM15.75 20.25H5.25V6.75H12.4397L15.75 10.0603V17.985C15.75 17.9906 15.75 17.9953 15.75 18C15.75 18.0047 15.75 18.0094 15.75 18.015V20.25ZM18.75 17.25H17.25V9.75C17.2501 9.65148 17.2307 9.55391 17.1931 9.46286C17.1555 9.37182 17.1003 9.28908 17.0306 9.21937L13.2806 5.46938C13.2109 5.39975 13.1282 5.34454 13.0371 5.3069C12.9461 5.26926 12.8485 5.24992 12.75 5.25H8.25V3.75H15.4397L18.75 7.06031V17.25ZM13.5 14.25C13.5 14.4489 13.421 14.6397 13.2803 14.7803C13.1397 14.921 12.9489 15 12.75 15H8.25C8.05109 15 7.86032 14.921 7.71967 14.7803C7.57902 14.6397 7.5 14.4489 7.5 14.25C7.5 14.0511 7.57902 13.8603 7.71967 13.7197C7.86032 13.579 8.05109 13.5 8.25 13.5H12.75C12.9489 13.5 13.1397 13.579 13.2803 13.7197C13.421 13.8603 13.5 14.0511 13.5 14.25ZM13.5 17.25C13.5 17.4489 13.421 17.6397 13.2803 17.7803C13.1397 17.921 12.9489 18 12.75 18H8.25C8.05109 18 7.86032 17.921 7.71967 17.7803C7.57902 17.6397 7.5 17.4489 7.5 17.25C7.5 17.0511 7.57902 16.8603 7.71967 16.7197C7.86032 16.579 8.05109 16.5 8.25 16.5H12.75C12.9489 16.5 13.1397 16.579 13.2803 16.7197C13.421 16.8603 13.5 17.0511 13.5 17.25Z"
        fill="#3957D7"
      />
    </Box>
  ),

  iconBgColor: '#F1F5FD',
  iconColor: 'info.dark',
  tooltipText: 'tooltipText',

  chart: {
    options: {
      chart: {
        type: 'bar',
        width: '100%',
        sparkline: {
          enabled: true,
        },
      },
      tooltip: {
        enabled: false,
      },
      plotOptions: {
        bar: {
          borderRadius: 4,
          columnWidth: '50%',
          distributed: true,
        },
      },
      colors: ['#c5d6f8'],
    },
    // series: [{ data: [15, 25, 20, 30, 45, 30] }],
  },
  sx: {
    '& .apexcharts-canvas': {
      marginTop: '24px',
    },
    '& .apexcharts-bar-area': {
      '&:hover, &[selected="true"]': {
        fill: (theme: Theme): string => `${theme.palette.info.dark} !important`,
      },
    },
  },
};

export const statsCardsData = [
  {
    id: 'activeCaseByMonth',
    title: 'Active Cases',
    value: '2,420',
    trend: 'up',
    trendValue: '47',
    trendTitle: 'From last month',
    trendColor: 'success.dark',
    icon: <FilesIcon />,
    iconBgColor: '#F1F5FD',
    iconColor: 'info.dark',
    tooltipText: 'tooltipText',

    chart: {
      options: {
        chart: {
          type: 'bar',
          width: '100%',
          sparkline: {
            enabled: true,
          },
        },
        tooltip: {
          enabled: false,
        },
        plotOptions: {
          bar: {
            borderRadius: 4,
            columnWidth: '50%',
            distributed: true,
          },
        },
        colors: ['#c5d6f8'],
      },
      // series: [{ data: [15, 25, 20, 30, 45, 30] }],
    },
    sx: {
      '& .apexcharts-bar-area': {
        '&:hover, &[selected="true"]': {
          fill: (theme: Theme): string =>
            `${theme.palette.info.dark} !important`,
        },
      },
    },
  },
  {
    id: 'requestProcessingTime',
    title: 'Record Turnaround Time',
    value: '12 min',
    trend: 'down',
    trendValue: '6',
    trendTitle: 'Total time duration',
    trendColor: '#FF5252',
    icon: <ClockClockwiseIcon />,
    iconBgColor: '#F2F7F9',
    iconColor: 'primary.main',
    tooltipText: 'tooltipText',
    chart: {
      options: {
        chart: {
          type: 'line',
          width: '100%',
          sparkline: {
            enabled: true,
          },
        },
        tooltip: {
          enabled: false,
        },
        markers: {
          size: 4,
          shape: 'circle',
          colors: ['#fff'],
          strokeWidth: 2,
          strokeColors: ['#4C788E'],
        },
        stroke: {
          curve: 'straight',
          width: 2,
        },
        grid: {
          show: true,
          padding: {
            left: 0,
            right: 0,
            top: 0,
            bottom: -10,
          },
          strokeDashArray: 4,
          yaxis: {
            lines: {
              show: true,
            },
          },
          xaxis: {
            lines: {
              show: false,
            },
          },
        },
        colors: ['#4C788E'],
      },
      // series: [{ data: [10, 20, 15, 25, 35, 30] }],
    },
  },

  {
    id: 'averageSessionDuration',
    title: 'Average Session Duration',
    value: '20 min',
    trend: 'up',
    trendValue: '34',
    trendTitle: 'Avg. per session time',
    trendColor: 'success.dark',
    icon: <FilesIcon />,
    iconBgColor: 'tertiary.50',
    iconColor: 'tertiary.500',
    tooltipText: 'tooltipText',
    chart: {
      options: {
        chart: {
          type: 'area',
          width: '100%',
          height: 72,
          sparkline: {
            enabled: true,
          },
        },
        tooltip: {
          enabled: false,
        },
        fill: {
          type: 'gradient',
          gradient: {
            shade: 'light',
            type: 'vertical',
            shadeIntensity: 0.5,
            gradientToColors: undefined,
            opacityFrom: 0.4,
            opacityTo: 0.1,
            stops: [0, 100],
          },
        },
        stroke: {
          curve: 'straight',
          width: 2,
        },

        colors: ['#4C788E'],
        grid: {
          show: false,
        },

        xaxis: {
          labels: {
            show: false,
          },
          axisTicks: {
            show: false,
          },
          axisBorder: {
            show: false,
          },
        },
        yaxis: {
          show: false,
        },
      },
      // series: [{ data: [10, 30, 20, 50, 40, 30] }],
    },
  },
];

export const recordRequestsData = [
  {
    id: 'recordRequest',
    title: 'Record Requests',
    value: '228',
    trend: 'up',
    trendValue: '10',
    trendTitle: 'From last month',
    trendColor: 'success.dark',
    icon: <TrayArrowUpIcon />,
    iconBgColor: '#FBF7EB',
    iconColor: 'warning.main',
    tooltipText: 'tooltipText',
    chart: {
      options: {
        chart: {
          type: 'area',
          width: '100%',
          height: 120,
          sparkline: {
            enabled: true,
          },
        },
        tooltip: {
          enabled: false,
        },
        fill: {
          type: 'gradient',
          gradient: {
            shade: 'light',
            type: 'vertical',
            shadeIntensity: 0.5,
            gradientToColors: undefined,
            opacityFrom: 0.4,
            opacityTo: 0.1,
            stops: [0, 100],
          },
        },
        stroke: {
          curve: 'smooth',
          width: 2,
        },

        colors: ['#CE8324'],
        grid: {
          show: false,
        },

        xaxis: {
          labels: {
            show: false,
          },
          axisTicks: {
            show: false,
          },
          axisBorder: {
            show: false,
          },
        },
        yaxis: {
          show: false,
        },
      },
      // series: [{ data: [10, 30, 20, 50, 40, 30] }],
    },
  },
];

export type ChartDataType = {
  day: string;
  score: number;
};

export type CustomerSatisfactionDataType = {
  stat: number;
  trendTitle: string;
  trendValue: string;
  trend: 'up' | 'down';
  chartData: Array<ChartDataType>;
};

export const weekly: CustomerSatisfactionDataType = {
  stat: 108,
  trend: 'up',
  trendValue: '10%',
  trendTitle: 'Average score for last week (17 Feb - 23 Feb, 2025)',
  chartData: [
    { day: 'Mon', score: 100 },
    { day: 'Tue', score: 150 },
    { day: 'Wed', score: 45 },
    { day: 'Thu', score: 120 },
    { day: 'Fri', score: 162 },
    { day: 'Sat', score: 120 },
    { day: 'Sun', score: 150 },
  ],
};

export const monthly: CustomerSatisfactionDataType = {
  stat: 257,
  trend: 'up',
  trendValue: '6%',
  trendTitle: 'Average score for last month (Feb, 2025)',
  chartData: [
    { day: '1', score: 420 },
    { day: '2', score: 620 },
    { day: '3', score: 180 },
    { day: '4', score: 490 },
    { day: '5', score: 680 },
    { day: '6', score: 480 },
    { day: '7', score: 570 },
    { day: '8', score: 720 },
    { day: '9', score: 450 },
    { day: '10', score: 577 },
    { day: '11', score: 240 },
    { day: '12', score: 330 },
    { day: '13', score: 650 },
    { day: '14', score: 480 },
    { day: '15', score: 270 },
  ],
};

export const yearly: CustomerSatisfactionDataType = {
  stat: 448,
  trend: 'down',
  trendValue: '3%',
  trendTitle: 'Average score for last year (2024)',
  chartData: [
    { day: 'Jan', score: 410 },
    { day: 'Feb', score: 620 },
    { day: 'Mar', score: 180 },
    { day: 'Apr', score: 490 },
    { day: 'May', score: 680 },
    { day: 'Jun', score: 480 },
    { day: 'Jul', score: 260 },
    { day: 'Aug', score: 497 },
    { day: 'Sep', score: 450 },
    { day: 'Oct', score: 730 },
    { day: 'Nov', score: 650 },
    { day: 'Dec', score: 340 },
  ],
};

export type TimeToFirstRequestDataType = {
  month: string;
  avgTime: number;
  requests: number;
};

export const timeToFirstRequestData: Array<TimeToFirstRequestDataType> = [
  { month: 'Jan', avgTime: 278 / 2, requests: 278 },
  { month: 'Feb', avgTime: 290 / 2, requests: 290 },
  { month: 'Mar', avgTime: 310 / 2, requests: 310 },
  { month: 'Apr', avgTime: 340 / 2, requests: 340 },
  { month: 'May', avgTime: 278 / 2, requests: 278 },
  { month: 'Jun', avgTime: 240 / 2, requests: 240 },
  { month: 'Jul', avgTime: 270 / 2, requests: 270 },
];

export type SuccessRateDataType = {
  period: string;
  rate: number;
};

export const successRateData: Array<SuccessRateDataType> = [
  { period: 'Jan', rate: 10 },
  { period: 'Feb', rate: 28 },
  { period: 'Mar', rate: 36 },
  { period: 'Apr', rate: 78 },
  { period: 'May', rate: 90 },
  { period: 'Jun', rate: 75 },
  { period: 'Jul', rate: 85 },
];
