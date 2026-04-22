import type { ApexOptions } from 'apexcharts';
import {
  CheckSquareOffsetIcon,
  ClockCountdownIcon,
  ClockCounterClockwiseIcon,
  ClockUserIcon,
  FilesIcon,
  FolderOpenIcon,
  GavelIcon,
  HourglassMediumIcon,
  PercentIcon,
  ProhibitInsetIcon,
  ShapesIcon,
  SignInIcon,
  TrayArrowDownIcon,
  TrayArrowUpIcon,
  UserCirclePlusIcon,
  UsersThreeIcon,
  XCircleIcon,
} from '@phosphor-icons/react';
import type { StatsCardWithTabsProps } from '@/components/StatsCardWithTabs';
import type { Theme } from '@mui/material';
import type { StatsCardProps } from '@/components/StatsCard';

const createSeries = (
  name: string,
  period: 'daily' | 'weekly' | 'monthly',
  data?: {
    daily?: Array<number>;
    weekly?: Array<number>;
    monthly?: Array<number>;
  }
): Array<{ name: string; data: Array<number> }> => {
  // Set specific realistic data based on the period
  if (period === 'daily') {
    // 7 days of the week
    return [
      {
        name,
        data: data?.daily || [1200, 800, 1400, 2100, 1800, 900, 1600],
      },
    ];
  } else if (period === 'weekly') {
    // 4 weeks of the month
    return [
      {
        name,
        data: data?.weekly || [700, 1100, 1700, 2600],
      },
    ];
  } else {
    // 12 months of the year
    return [
      {
        name,
        data: data?.monthly || [
          1200, 800, 1400, 1800, 2200, 1900, 1300, 2000, 2400, 1700, 2100, 1500,
        ],
      },
    ];
  }
};

const createChartOptions = (
  period: 'daily' | 'weekly' | 'monthly',
  chartType?: 'line' | 'area',
  curve?: 'smooth' | 'straight',
  color?: string
): ApexOptions => ({
  chart: {
    type: chartType || 'line',
    width: '100%',
    height: 250,
    toolbar: {
      show: false,
    },
    zoom: {
      enabled: false,
    },
  },
  xaxis: {
    categories:
      period === 'daily'
        ? ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] // 7 days
        : period === 'weekly'
          ? ['Week 1', 'Week 2', 'Week 3', 'Week 4'] // 4 weeks
          : [
              'Jan',
              'Feb',
              'Mar',
              'Apr',
              'May',
              'Jun',
              'Jul',
              'Aug',
              'Sep',
              'Oct',
              'Nov',
              'Dec',
            ], // 12 months
    axisBorder: {
      show: false,
    },
    axisTicks: {
      show: false,
    },
    labels: {
      style: {
        colors: '#9CA3AF',
      },
    },
  },
  yaxis: {
    show: true,
    min: 0,
    max: chartType === 'area' ? 300 : period === 'weekly' ? 3000 : 3500,
    tickAmount: 5,
    labels: {
      style: {
        colors: '#9CA3AF',
      },
      formatter: (value) => Math.round(value).toString(),
    },
  },
  tooltip: {
    enabled: true,
    theme: 'light',
    x: {
      show: true,
    },
    y: {
      formatter: (value) => `${value.toLocaleString()}`,
    },
  },
  grid: {
    show: true,
    borderColor: '#E5E7EB',
    strokeDashArray: 5,
    xaxis: {
      lines: {
        show: false,
      },
    },
    yaxis: {
      lines: {
        show: true,
      },
    },
    padding: {
      top: 0,
      right: 0,
      bottom: 0,
      left: 10,
    },
  },
  stroke: {
    width: 2,
    curve: curve || 'smooth',
  },
  markers: {
    size: 5,
    colors: [color || '#0E9388'],
    strokeColors: '#fff',
    strokeWidth: 2,
    hover: {
      size: 7,
    },
  },

  colors: [color || '#0E9388'],
  ...(chartType === 'area' && {
    fill: {
      type: 'gradient',
      gradient: {
        shade: 'light',
        type: 'vertical',
        shadeIntensity: 0.75,
        gradientToColors: undefined,
        opacityFrom: 0.7,
        opacityTo: 0.5,
        stops: [0, 100],
      },
    },
    dataLabels: {
      enabled: false,
    },
  }),
});

// Utility for Chronologies Generated chart (Billing & Medical Chronology)
const chronologyDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const chronologyData = [
  { day: 'Mon', billing: 60, medical: 90 },
  { day: 'Tue', billing: 140, medical: 210 },
  { day: 'Wed', billing: 180, medical: 150 },
  { day: 'Thu', billing: 110, medical: 120 },
  { day: 'Fri', billing: 130, medical: 140 },
  { day: 'Sat', billing: 190, medical: 160 },
  { day: 'Sun', billing: 150, medical: 70 },
];

function createChronologiesChartOptions(): ApexOptions {
  return {
    chart: {
      type: 'bar',
      height: 350,
      stacked: false,
      toolbar: { show: false },
    },
    plotOptions: {
      bar: {
        horizontal: false,
        borderRadius: 6,
        columnWidth: '60%',
        distributed: false,
      },
    },
    colors: ['#E878FA', '#F59E42'], // Billing, Medical
    dataLabels: { enabled: false },
    legend: {
      show: true,
      position: 'top',
      horizontalAlign: 'left',
      fontSize: '12px',

      markers: { shape: 'circle', size: 6 },
    },
    xaxis: {
      categories: chronologyDays,
      labels: { style: { colors: '#9CA3AF' } },
      axisBorder: { show: false },
      axisTicks: { show: false },
    },
    yaxis: {
      show: true,
      min: 0,
      max: 300,
      tickAmount: 3,
      labels: { style: { colors: '#9CA3AF' } },
    },
    grid: {
      show: true,
      borderColor: '#E5E7EB',
      strokeDashArray: 5,
      yaxis: { lines: { show: true } },
      xaxis: { lines: { show: false } },
      padding: { left: 10, right: 0 },
    },
    tooltip: { enabled: true },
  };
}

function createChronologiesSeries(data?: {
  billing: Array<number>;
  medical: Array<number>;
}): Array<{
  name: string;
  data: Array<number>;
}> {
  return [
    {
      name: 'Billing Chronology',
      data: data?.billing || chronologyData.map((d) => d.billing),
    },
    {
      name: 'Medical Chronology',
      data: data?.medical || chronologyData.map((d) => d.medical),
    },
  ];
}

export const customerUsageEngagementData: Record<string, StatsCardProps> = {
  loginsPerUser: {
    id: 'loginsPerUser',
    title: 'Logins Per User',
    value: '25',
    trend: 'up',
    trendValue: '2',
    trendTitle: 'Avg. no. of logins per user last week',
    trendColor: 'success.dark',
    icon: <SignInIcon size={24} />,
    iconBgColor: '#F1F5FD',
    iconColor: 'info.dark',
    tooltipText: 'Average number of times each user logs in during the week',

    chart: {
      options: {
        chart: {
          type: 'bar',
          width: '100%',
          height: 270,
          toolbar: {
            show: false,
          },
        },
        legend: {
          show: false,
        },
        dataLabels: {
          enabled: false,
        },
        tooltip: {
          enabled: true,
          y: {
            formatter: (value: number) => `${value} logins`,
          },
        },
        plotOptions: {
          bar: {
            borderRadius: 6,
            columnWidth: '60%',
            distributed: true,
          },
        },
        xaxis: {
          categories: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
          axisBorder: {
            show: false,
          },
          axisTicks: {
            show: false,
          },
          labels: {
            style: {
              colors: '#9CA3AF',
            },
          },
        },
        yaxis: {
          show: true,
          min: 0,
          max: 30,
          tickAmount: 3,
          labels: {
            style: {
              colors: '#9CA3AF',
            },
            formatter: (value: number) => Math.round(value).toString(),
          },
        },
        grid: {
          show: true,
          borderColor: '#E5E7EB',
          strokeDashArray: 5,
          xaxis: {
            lines: {
              show: false,
            },
          },
          yaxis: {
            lines: {
              show: true,
            },
          },
          padding: {
            top: 0,
            right: 0,
            bottom: 0,
            left: 10,
          },
        },
        colors: [
          '#c5d6f8',
          '#c5d6f8',
          '#c5d6f8',
          '#4763E4',
          '#c5d6f8',
          '#c5d6f8',
          '#c5d6f8',
        ],
        states: {
          hover: {
            filter: {
              type: 'lighten',
              value: 0.08,
            },
          },
        },
      },
      series: [
        {
          name: 'Logins per user',
          data: [9, 12, 15, 23, 9, 15, 12],
        },
      ],
    },
    sx: {
      '& .apexcharts-bar-area': {
        '&:hover': {
          fill: (theme: Theme): string =>
            `${theme.palette.info.dark} !important`,
        },
      },
    },
  },
  recordRequestPerUser: {
    id: 'recordRequestPerUser',
    title: 'Record Request Per User',
    value: '89',
    trend: 'down',
    trendValue: '9',
    trendTitle: 'Avg. record request',
    trendColor: 'error.dark',
    icon: <SignInIcon size={24} />,
    iconBgColor: '#F9F7F7',
    iconColor: '#A48F8F',
    tooltipText: 'Average number of record requests per user',

    chart: {
      options: {
        chart: {
          type: 'bar',
          width: '100%',
          height: 150,
          toolbar: {
            show: false,
          },
          sparkline: {
            enabled: true,
          },
        },

        plotOptions: {
          bar: {
            borderRadius: 6,
            columnWidth: '60%',
            distributed: true,
          },
        },

        colors: [
          '#E7E1E1',
          '#A48F8F',
          '#E7E1E1',
          '#E7E1E1',
          '#E7E1E1',
          '#E7E1E1',
          '#E7E1E1',
        ],
      },
      series: [
        {
          name: 'Request per user',
          data: [10, 12, 8, 5, 10, 12, 15],
        },
      ],
    },
    sx: {
      '& .apexcharts-bar-area': {
        '&:hover': {
          fill: (): string => `#A48F8F !important`,
        },
      },
    },
  },
  averageSessionDuration: {
    id: 'averageSessionDuration',
    title: 'Average Session Duration',
    value: '20 min',
    trend: 'up',
    trendValue: '34',
    trendTitle: 'Avg. per session time',
    trendColor: 'success.dark',
    icon: <HourglassMediumIcon size={24} />,
    iconBgColor: '#F2F7F9',
    iconColor: '#4C788E',
    tooltipText: 'tooltipText',
    chart: {
      options: {
        chart: {
          type: 'area',
          width: '100%',
          height: 150,
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
      series: [{ data: [10, 30, 20, 30, 40] }],
    },
  },
  featureAdoptionRate: {
    id: 'featureAdoptionRate',
    title: 'Feature Adoption Rate',
    value: '28',
    trend: 'up',
    trendValue: '10',
    trendTitle: 'Users utilizing key features',
    trendColor: 'success.dark',
    icon: <ShapesIcon size={24} />,
    iconBgColor: '#FEF6EE',
    iconColor: '#DB551B',
    tooltipText: 'Users utilizing key features user',

    chart: {
      options: {
        chart: {
          type: 'bar',
          width: '100%',
          height: 150,
          toolbar: {
            show: false,
          },
          sparkline: {
            enabled: true,
          },
        },

        plotOptions: {
          bar: {
            borderRadius: 6,
            columnWidth: '65%',
            distributed: true,
          },
        },

        colors: [
          '#FEF6EE',
          '#FEF6EE',
          '#FEF6EE',
          '#DB551B',
          '#FEF6EE',
          '#FEF6EE',
          '#FEF6EE',
        ],
      },
      series: [
        {
          name: 'Feature Adoption',
          data: [10, 12, 8, 5, 10, 12, 15],
        },
      ],
    },
    sx: {
      '& .apexcharts-bar-area': {
        '&:hover': {
          fill: (): string => `#DB551B !important`,
        },
      },
    },
  },

  timeToFirstRequest: {
    id: 'timeToFirstRequest',
    title: 'Time to First Request',
    value: '8 Min',
    trend: 'up',
    trendValue: '2',
    trendTitle: 'Avg. time taken by new customers for first request',
    trendColor: 'success.dark',
    icon: <ClockCountdownIcon size={24} />,
    iconBgColor: '#FBF7EB',
    iconColor: '#CE8324',
    tooltipText: 'Average number of times each user logs in during the week',

    chart: {
      options: {
        chart: {
          type: 'bar',
          width: '100%',
          height: 270,
          toolbar: {
            show: false,
          },
        },
        legend: {
          show: false,
        },
        dataLabels: {
          enabled: false,
        },
        tooltip: {
          enabled: true,
          y: {
            formatter: (value: number) => `${value} min`,
          },
        },
        plotOptions: {
          bar: {
            borderRadius: 6,
            columnWidth: '60%',
            distributed: true,
          },
        },
        xaxis: {
          categories: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
          axisBorder: {
            show: false,
          },
          axisTicks: {
            show: false,
          },
          labels: {
            style: {
              colors: '#9CA3AF',
            },
          },
        },
        yaxis: {
          show: true,
          min: 0,
          max: 30,
          tickAmount: 3,
          labels: {
            style: {
              colors: '#9CA3AF',
            },
            formatter: (value: number) => Math.round(value).toString(),
          },
        },
        grid: {
          show: true,
          borderColor: '#E5E7EB',
          strokeDashArray: 5,
          xaxis: {
            lines: {
              show: false,
            },
          },
          yaxis: {
            lines: {
              show: true,
            },
          },
          padding: {
            top: 0,
            right: 0,
            bottom: 0,
            left: 10,
          },
        },
        colors: [
          '#F0D498',
          '#F0D498',
          '#F0D498',
          '#F0D498',
          '#CE8324',
          '#F0D498',
          '#F0D498',
        ],
        states: {
          hover: {
            filter: {
              type: 'lighten',
              value: 0.08,
            },
          },
        },
      },
      series: [
        {
          name: 'Time to first request',
          data: [9, 12, 15, 23, 9, 15, 12],
        },
      ],
    },
    sx: {
      '& .apexcharts-bar-area': {
        '&:hover': {
          fill: (): string => `#CE8324 !important`,
        },
      },
    },
  },
};

export const customerUsageEngagementTabData: Record<
  string,
  StatsCardWithTabsProps
> = {
  activeUsers: {
    title: 'Active Users',
    icon: <UsersThreeIcon size={24} />,
    iconColor: '#0E9388',
    iconBgColor: '#F0FDFA',
    defaultTab: 'daily',
    tabData: [
      {
        key: 'daily',
        label: 'Daily',
        value: '845',
        trend: 'up' as const,
        trendValue: '23%',
        trendTitle: 'Active users per day',
        chart: {
          options: createChartOptions('daily', 'line', 'straight'),
          series: createSeries('Daily Active Users', 'daily'),
        },
      },
      {
        key: 'weekly',
        label: 'Weekly',
        value: '1,620',
        trend: 'up' as const,
        trendValue: '47%',
        trendTitle: 'Active users per last week',
        chart: {
          options: createChartOptions('weekly', 'line', 'straight'),
          series: createSeries('Weekly Active Users', 'weekly'),
        },
      },
      {
        key: 'monthly',
        label: 'Monthly',
        value: '4,832',
        trend: 'up' as const,
        trendValue: '15%',
        trendTitle: 'Active users per last month',
        chart: {
          options: createChartOptions('monthly', 'line', 'straight'),
          series: createSeries('Monthly Active Users', 'monthly'),
        },
      },
    ],
    id: 'css-chart',
  },
  chronologiesGenerated: {
    id: 'chronologiesGenerated',
    title: 'Chronologies Generated',
    icon: <UsersThreeIcon size={24} />, // Consider a more relevant icon if available
    iconColor: '#BA24CE',
    iconBgColor: '#FDF4FF',
    defaultTab: 'weekly',
    tabData: [
      {
        key: 'weekly',
        label: 'Weekly',
        value: '182',
        trend: 'down',
        trendValue: '4%',
        trendTitle: 'Total medical & billing chronologies generated last week',
        chart: {
          options: createChronologiesChartOptions(),
          series: createChronologiesSeries(),
        },
      },
      {
        key: 'monthly',
        label: 'Monthly',
        value: '182',
        trend: 'down',
        trendValue: '4%',
        trendTitle: 'Total medical & billing chronologies generated last week',
        chart: {
          options: createChronologiesChartOptions(),
          series: createChronologiesSeries({
            billing: [60, 120, 180, 200, 250, 220, 280],
            medical: [80, 140, 100, 120, 200, 180, 220],
          }),
        },
      },
    ],
    tooltipText: 'Total medical & billing chronologies generated',
  },
  recordRequest: {
    title: 'Record Request',
    icon: <TrayArrowUpIcon size={24} />,
    iconColor: '#BA24CE',
    iconBgColor: '#FDF4FF',
    defaultTab: 'weekly',
    tabData: [
      {
        key: 'weekly',
        label: 'Weekly',
        value: '228',
        trend: 'up' as const,
        trendValue: '10%',
        trendTitle: 'Record retrieval requests submitted last week',
        chart: {
          options: createChartOptions('weekly', 'area', 'straight'),
          series: createSeries('Weekly Record Request', 'weekly', {
            weekly: [50, 100, 150, 100, 150, 200, 250],
          }),
        },
      },
      {
        key: 'monthly',
        label: 'Monthly',
        value: '620',
        trend: 'down' as const,
        trendValue: '8%',
        trendTitle: 'Record retrieval requests submitted last month',
        chart: {
          options: createChartOptions('monthly', 'area', 'straight'),
          series: createSeries('Monthly Record Request', 'monthly', {
            monthly: [100, 50, 100, 50, 150, 200, 250],
          }),
        },
      },
    ],
    id: 'css-chart',
  },
};

export const operationalEfficiencyData: Record<string, StatsCardProps> = {
  avgReqProcessingTime: {
    id: 'avgReqProcessingTime',
    title: 'Average Request Processing Time',
    value: '20 min',
    trend: 'down',
    trendValue: '-3',
    trendTitle: 'Avg. time to complete the retrieval',
    trendColor: 'error.dark',
    icon: <FilesIcon size={24} />,
    iconBgColor: 'success.lightest',
    iconColor: 'success.dark',
    tooltipText: 'Average number of record requests per user',

    chart: {
      options: {
        chart: {
          type: 'area',
          width: '100%',
          height: 250,
          toolbar: {
            show: false,
          },
        },
        tooltip: {
          enabled: false,
        },
        markers: {
          size: 5,
          colors: ['#0E9388'],
          strokeColors: '#fff',
          strokeWidth: 2,
          hover: {
            size: 7,
          },
        },
        fill: {
          type: 'gradient',
          gradient: {
            shade: 'light',
            type: 'vertical',
            shadeIntensity: 0.5,
            gradientToColors: undefined,
            opacityFrom: 0.4,
            opacityTo: 0.5,
            stops: [0, 100],
          },
        },
        stroke: {
          curve: 'smooth',
          width: 2,
        },
        dataLabels: {
          enabled: false,
        },

        colors: ['#00A92A'],
        grid: {
          show: true,
          strokeDashArray: 5,
        },

        xaxis: {
          categories: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
          labels: {
            show: true,
          },
          axisTicks: {
            show: false,
          },
          axisBorder: {
            show: false,
          },
        },
        yaxis: {
          show: true,
        },
      },
      series: [{ data: [10, 30, 20, 30, 40, 20, 30] }],
    },
  },
  errorRate: {
    id: 'errorRate',
    title: 'Error Rate in Request',
    value: '24%',
    trend: 'down',
    trendValue: '-0.4',
    trendTitle: 'Rate of requests with missing or incorrect information',
    trendColor: 'error.dark',
    icon: <XCircleIcon size={24} />,
    iconBgColor: 'error.lightest',
    iconColor: 'error.dark',
    tooltipText: 'Rate of requests with missing or incorrect information',

    chart: {
      options: {
        chart: {
          type: 'line',
          width: '100%',
          height: 250,
          toolbar: {
            show: false,
          },
        },
        tooltip: {
          enabled: false,
        },
        markers: {
          size: 5,
          colors: ['#fff'],
          strokeColors: '#D7263D',
          strokeWidth: 2,
          hover: {
            size: 7,
          },
        },
        stroke: {
          curve: 'straight',
          width: 2,
        },
        dataLabels: {
          enabled: false,
        },

        colors: ['#D7263D'],
        grid: {
          show: true,
          strokeDashArray: 5,
        },

        xaxis: {
          categories: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
          labels: {
            show: true,
          },
          axisTicks: {
            show: false,
          },
          axisBorder: {
            show: false,
          },
        },
        yaxis: {
          show: true,
        },
      },
      series: [{ data: [20, 50, 10, 30, 40, 50, 20] }],
    },
  },
  successRateOfRecordRetrieval: {
    id: 'successRateOfRecordRetrieval',
    title: 'Success Rate of Record Retrieval',
    value: '92%',
    trend: 'up',
    trendValue: '0.8',
    trendTitle: 'Rate of successful record retrieval',
    trendColor: 'success.dark',
    icon: <PercentIcon size={24} />,
    iconBgColor: '#F2F7F9',
    iconColor: '#426378',
    tooltipText: 'Rate of successful record retrieval',

    chart: {
      options: {
        chart: {
          type: 'bar',
          width: '100%',
          height: 300,
          toolbar: {
            show: false,
          },
        },
        tooltip: {
          enabled: false,
        },
        plotOptions: {
          bar: {
            borderRadius: 4,
            columnWidth: '50%',
            distributed: false,
          },
        },
        dataLabels: {
          enabled: false,
        },
        legend: {
          position: 'top',
          horizontalAlign: 'left',
          markers: {
            shape: 'circle',
            size: 6,
          },
          fontSize: '12px',
          itemMargin: {
            vertical: 20,
          },
        },
        colors: ['#5FE9D5', '#6894A8'],
        grid: {
          show: true,
          strokeDashArray: 5,
        },

        xaxis: {
          categories: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
          labels: {
            show: true,
          },
          axisTicks: {
            show: false,
          },
          axisBorder: {
            show: false,
          },
        },
        yaxis: {
          show: true,
        },
      },
      series: [
        {
          name: 'Retrieved Records',
          data: [20, 50, 10, 30, 40, 50, 20],
        },
        {
          name: 'Total Requests',
          data: [50, 20, 30, 40, 50, 20, 30],
        },
      ],
    },
  },
  turnaroundTimeCompliance: {
    id: 'turnaroundTimeCompliance',
    title: 'Turnaround Time Compliance',
    value: '16%',
    trend: 'down',
    trendValue: '-0.2',
    trendTitle: 'Rate of requests completion within the turnaround time',
    trendColor: 'error.dark',
    icon: <ClockCountdownIcon size={24} />,
    iconBgColor: '#F1F5FD',
    iconColor: 'info.dark',
    tooltipText: 'Rate of requests completion within the turnaround time',

    chart: {
      options: {
        chart: {
          type: 'area',
          width: '100%',
          height: 250,
          toolbar: {
            show: false,
          },
        },
        tooltip: {
          enabled: false,
        },
        markers: {
          size: 5,
          colors: ['#fff'],
          strokeColors: '#3957D7',
          strokeWidth: 2,
          hover: {
            size: 7,
          },
        },
        fill: {
          type: 'gradient',
          gradient: {
            shade: 'light',
            type: 'vertical',
            shadeIntensity: 0.5,
            gradientToColors: undefined,
            opacityFrom: 0.4,
            opacityTo: 0.5,
            stops: [0, 100],
          },
        },
        stroke: {
          curve: 'straight',
          width: 2,
        },
        dataLabels: {
          enabled: false,
        },

        colors: ['#3957D7'],
        grid: {
          show: true,
          strokeDashArray: 5,
        },

        xaxis: {
          categories: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
          labels: {
            show: true,
          },
          axisTicks: {
            show: false,
          },
          axisBorder: {
            show: false,
          },
        },
        yaxis: {
          show: true,
        },
      },

      series: [{ data: [10, 20, 15, 25, 35, 30] }],
    },
  },
  duplicateRequestRate: {
    id: 'duplicateRequestRate',
    title: 'Duplicate Request Rate',
    value: '25%',
    trend: 'up',
    trendValue: '2',
    trendTitle: 'Rate of redundant or duplicate requests',
    trendColor: 'success.dark',
    icon: <ClockCountdownIcon size={24} />,
    iconBgColor: '#FEF6EE',
    iconColor: '#EA6E25',
    tooltipText: 'Rate of redundant or duplicate requests',

    chart: {
      options: {
        chart: {
          type: 'bar',
          width: '100%',
          height: 250,
          toolbar: {
            show: false,
          },
        },
        legend: {
          show: false,
        },
        dataLabels: {
          enabled: false,
        },
        tooltip: {
          enabled: true,
          y: {
            formatter: (value: number) => `${value} min`,
          },
        },
        plotOptions: {
          bar: {
            borderRadius: 6,
            columnWidth: '60%',
            distributed: true,
          },
        },
        xaxis: {
          categories: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
          axisBorder: {
            show: false,
          },
          axisTicks: {
            show: false,
          },
          labels: {
            style: {
              colors: '#9CA3AF',
            },
          },
        },
        yaxis: {
          show: true,
          min: 0,
          max: 30,
          tickAmount: 3,
          labels: {
            style: {
              colors: '#9CA3AF',
            },
            formatter: (value: number) => Math.round(value).toString(),
          },
        },
        grid: {
          show: true,
          borderColor: '#E5E7EB',
          strokeDashArray: 5,
          xaxis: {
            lines: {
              show: false,
            },
          },
          yaxis: {
            lines: {
              show: true,
            },
          },
          padding: {
            top: 0,
            right: 0,
            bottom: 0,
            left: 10,
          },
        },
        colors: [
          '#F8D4B0',
          '#F8D4B0',
          '#F8D4B0',
          '#EA6E25',
          '#F8D4B0',
          '#F8D4B0',
          '#F8D4B0',
        ],
        states: {
          hover: {
            filter: {
              type: 'lighten',
              value: 0.08,
            },
          },
        },
      },
      series: [
        {
          name: 'Duplicate Request Rate',
          data: [9, 12, 15, 23, 9, 15, 12],
        },
      ],
    },
    sx: {
      '& .apexcharts-bar-area': {
        '&:hover': {
          fill: (): string => `#CE8324 !important`,
        },
      },
    },
  },
};

export const customerSatisfactionRetentionData: Record<string, StatsCardProps> =
  {
    customerRetentionRate: {
      id: 'customerRetentionRate',
      title: 'Customer Retention Rate',
      value: '88%',
      trend: 'down',
      trendValue: '-0.4',
      trendTitle: 'Rate of subscription renewal',
      trendColor: 'error.dark',
      icon: <CheckSquareOffsetIcon size={24} />,
      iconBgColor: 'success.lightest',
      iconColor: 'success.dark',
      tooltipText: 'Rate of subscription renewal',

      chart: {
        options: {
          chart: {
            type: 'area',
            width: '100%',
            height: 250,
            toolbar: {
              show: false,
            },
          },
          tooltip: {
            enabled: false,
          },
          markers: {
            size: 5,
            colors: ['#fff'],
            strokeColors: '#00A92A',
            strokeWidth: 2,
            hover: {
              size: 7,
            },
          },
          fill: {
            type: 'gradient',
            gradient: {
              shade: 'light',
              type: 'vertical',
              shadeIntensity: 0.5,
              gradientToColors: undefined,
              opacityFrom: 0.4,
              opacityTo: 0.5,
              stops: [0, 100],
            },
          },
          stroke: {
            curve: 'straight',
            width: 2,
          },
          dataLabels: {
            enabled: false,
          },

          colors: ['#00A92A'],
          grid: {
            show: true,
            strokeDashArray: 5,
          },

          xaxis: {
            categories: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
            labels: {
              show: true,
            },
            axisTicks: {
              show: false,
            },
            axisBorder: {
              show: false,
            },
          },
          yaxis: {
            show: true,
          },
        },

        series: [{ data: [10, 20, 15, 25, 35, 30] }],
      },
    },
    churnRate: {
      id: 'churnRate',
      title: 'Churn Rate',
      value: '19%',
      trend: 'down',
      trendValue: '-0.4',
      trendTitle: 'Rate of customers who have stopped using the platform',
      trendColor: 'error.dark',
      icon: <ProhibitInsetIcon size={24} />,
      iconBgColor: '#FEF6EE',
      iconColor: '#DB551B',
      tooltipText: 'Rate of customers who have stopped using the platform',

      chart: {
        options: {
          chart: {
            type: 'line',
            width: '100%',
            height: 250,
            toolbar: {
              show: false,
            },
          },
          tooltip: {
            enabled: false,
          },
          markers: {
            size: 5,
            colors: ['#fff'],
            strokeColors: '#DB551B',
            strokeWidth: 2,
            hover: {
              size: 7,
            },
          },
          stroke: {
            curve: 'straight',
            width: 2,
          },
          dataLabels: {
            enabled: false,
          },

          colors: ['#DB551B'],
          grid: {
            show: true,
            strokeDashArray: 5,
          },

          xaxis: {
            categories: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
            labels: {
              show: true,
            },
            axisTicks: {
              show: false,
            },
            axisBorder: {
              show: false,
            },
          },
          yaxis: {
            show: true,
          },
        },
        series: [{ data: [20, 10, 10, 30, 20, 10, 20] }],
      },
    },
    resolutionTime: {
      id: 'resolutionTime',
      title: 'Resolution Time for support issues',
      value: '17 min',
      trend: 'up',
      trendValue: '2',
      trendTitle: 'Avg. time to resolve ',
      trendColor: 'success.dark',
      icon: <ClockUserIcon size={24} />,
      iconBgColor: '#FBF7EB',
      iconColor: '#CE8324',
      tooltipText: 'Avg. time to resolve ',

      chart: {
        options: {
          chart: {
            type: 'bar',
            width: '100%',
            height: 250,
            toolbar: {
              show: false,
            },
          },
          legend: {
            show: false,
          },
          dataLabels: {
            enabled: false,
          },
          tooltip: {
            enabled: true,
            y: {
              formatter: (value: number) => `${value} min`,
            },
          },
          plotOptions: {
            bar: {
              borderRadius: 6,
              columnWidth: '60%',
              distributed: true,
            },
          },
          xaxis: {
            categories: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
            axisBorder: {
              show: false,
            },
            axisTicks: {
              show: false,
            },
            labels: {
              style: {
                colors: '#9CA3AF',
              },
            },
          },
          yaxis: {
            show: true,
            min: 0,
            max: 30,
            tickAmount: 3,
            labels: {
              style: {
                colors: '#9CA3AF',
              },
              formatter: (value: number) => Math.round(value).toString(),
            },
          },
          grid: {
            show: true,
            borderColor: '#E5E7EB',
            strokeDashArray: 5,
            xaxis: {
              lines: {
                show: false,
              },
            },
            yaxis: {
              lines: {
                show: true,
              },
            },
            padding: {
              top: 0,
              right: 0,
              bottom: 0,
              left: 10,
            },
          },
          colors: [
            '#F0D498',
            '#F0D498',
            '#F0D498',
            '#CE8324',
            '#F0D498',
            '#F0D498',
            '#F0D498',
          ],
          states: {
            hover: {
              filter: {
                type: 'lighten',
                value: 0.08,
              },
            },
          },
        },
        series: [
          {
            name: 'Resolution Time',
            data: [9, 12, 15, 23, 9, 15, 12],
          },
        ],
      },
      sx: {
        '& .apexcharts-bar-area': {
          '&:hover': {
            fill: (): string => `#CE8324 !important`,
          },
        },
      },
    },
  };

export const timeBasedKPIsData: Record<string, StatsCardProps> = {
  avgSessionDuration: {
    id: 'avgSessionDuration',
    title: 'Average Session Duration',
    value: '20 min',
    trend: 'up',
    trendValue: '34',
    trendTitle: 'Avg. time to complete the retrieval',
    trendColor: 'success.dark',
    icon: <HourglassMediumIcon size={24} />,
    iconBgColor: '#FBF7EB',
    iconColor: '#CE8324',
    tooltipText: 'Avg. time to complete the retrieval',

    chart: {
      options: {
        chart: {
          type: 'line',
          width: '100%',
          height: 250,
          toolbar: {
            show: false,
          },
        },
        tooltip: {
          enabled: false,
        },
        markers: {
          size: 5,
          colors: ['#fff'],
          strokeColors: '#CE8324',
          strokeWidth: 2,
          hover: {
            size: 7,
          },
        },
        stroke: {
          curve: 'straight',
          width: 2,
        },
        dataLabels: {
          enabled: false,
        },

        colors: ['#CE8324'],
        grid: {
          show: true,
          strokeDashArray: 5,
        },

        xaxis: {
          categories: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
          labels: {
            show: true,
          },
          axisTicks: {
            show: false,
          },
          axisBorder: {
            show: false,
          },
        },
        yaxis: {
          show: true,
        },
      },

      series: [{ data: [20, 50, 10, 30, 40, 50, 20] }],
    },
  },
};

export const productivityBasedKPIsData: Record<string, StatsCardProps> = {
  activeCases: {
    title: 'Active Cases',
    icon: <FilesIcon size={24} />,
    iconColor: '#DB551B',
    iconBgColor: '#FEF6EE',
    defaultTab: 'weekly',
    tabData: [
      {
        key: 'weekly',
        label: 'Weekly',
        value: '1,620',
        trend: 'up' as const,
        trendValue: '47%',
        trendTitle: 'Active Cases per last week',
        chart: {
          options: createChartOptions('weekly', 'area', 'smooth', '#DB551B'),
          series: createSeries('Weekly Active Cases', 'weekly', {
            weekly: [180, 50, 120, 280],
          }),
        },
      },
      {
        key: 'monthly',
        label: 'Monthly',
        value: '4,832',
        trend: 'up' as const,
        trendValue: '15%',
        trendTitle: 'Active Cases per last month',
        chart: {
          options: createChartOptions('monthly', 'area', 'smooth', '#DB551B'),
          series: createSeries('Monthly Active Cases', 'monthly', {
            monthly: [0, 30, 60, 150, 120, 150, 180],
          }),
        },
      },
    ],
    id: 'css-chart',
  },
  recordRequestPerUser: {
    id: 'recordRequestPerUser',
    title: 'Record Request Per User',
    value: '89',
    trend: 'down',
    trendValue: '9',
    trendTitle:
      'Avg. no. of medical record retrieval requests submitted per user',
    trendColor: 'error.dark',
    icon: <TrayArrowUpIcon size={24} />,
    iconBgColor: 'tertiary.50',
    iconColor: 'tertiary.500',
    tooltipText: 'Average number of times each user logs in during the week',

    chart: {
      options: {
        chart: {
          type: 'bar',
          width: '100%',
          height: 270,
          toolbar: {
            show: false,
          },
        },
        legend: {
          show: false,
        },
        dataLabels: {
          enabled: false,
        },
        tooltip: {
          enabled: true,
          y: {
            formatter: (value: number) => `${value} logins`,
          },
        },
        plotOptions: {
          bar: {
            borderRadius: 6,
            columnWidth: '60%',
            distributed: true,
          },
        },
        xaxis: {
          categories: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
          axisBorder: {
            show: false,
          },
          axisTicks: {
            show: false,
          },
          labels: {
            style: {
              colors: '#9CA3AF',
            },
          },
        },
        yaxis: {
          show: true,
          min: 0,
          max: 30,
          tickAmount: 3,
          labels: {
            style: {
              colors: '#9CA3AF',
            },
            formatter: (value: number) => Math.round(value).toString(),
          },
        },
        grid: {
          show: true,
          borderColor: '#E5E7EB',
          strokeDashArray: 5,
          xaxis: {
            lines: {
              show: false,
            },
          },
          yaxis: {
            lines: {
              show: true,
            },
          },
          padding: {
            top: 0,
            right: 0,
            bottom: 0,
            left: 10,
          },
        },
        colors: [
          '#E7E1E1',
          '#E7E1E1',
          '#E7E1E1',
          '#A48F8F',
          '#E7E1E1',
          '#E7E1E1',
          '#E7E1E1',
        ],
        states: {
          hover: {
            filter: {
              type: 'lighten',
              value: 0.08,
            },
          },
        },
      },
      series: [
        {
          name: 'Record Request Per User',
          data: [9, 12, 15, 23, 9, 15, 12],
        },
      ],
    },
    sx: {
      '& .apexcharts-bar-area': {
        '&:hover': {
          fill: (theme: Theme): string =>
            `${theme.palette.tertiary[50]} !important`,
        },
      },
    },
  },
};

export const productivityBasedKPIsTabsData: Record<
  string,
  StatsCardWithTabsProps
> = {
  activeCases: {
    title: 'Active Cases',
    icon: <FilesIcon size={24} />,
    iconColor: '#DB551B',
    iconBgColor: '#FEF6EE',
    defaultTab: 'weekly',
    tabData: [
      {
        key: 'weekly',
        label: 'Weekly',
        value: '1,620',
        trend: 'up' as const,
        trendValue: '47%',
        trendTitle: 'Active Cases per last week',
        chart: {
          options: createChartOptions('weekly', 'area', 'smooth', '#DB551B'),
          series: createSeries('Weekly Active Cases', 'weekly', {
            weekly: [180, 50, 120, 280],
          }),
        },
      },
      {
        key: 'monthly',
        label: 'Monthly',
        value: '4,832',
        trend: 'up' as const,
        trendValue: '15%',
        trendTitle: 'Active Cases per last month',
        chart: {
          options: createChartOptions('monthly', 'area', 'smooth', '#DB551B'),
          series: createSeries('Monthly Active Cases', 'monthly', {
            monthly: [0, 30, 60, 150, 120, 150, 180],
          }),
        },
      },
    ],
    id: 'css-chart',
  },
};

export const timeSavingKPIsData: Record<string, StatsCardProps> = {
  reductionInRecordRetrievalTime: {
    id: 'reductionInRecordRetrievalTime',
    title: 'Reduction in Record Retrieval Time',
    value: '16%',
    trend: 'up',
    trendValue: '9',
    trendTitle: 'Rate of time taken to retrieve medical records',
    trendColor: 'success.dark',
    icon: <ClockCounterClockwiseIcon size={24} />,
    iconBgColor: '#F1F5FD',
    iconColor: 'info.dark',
    tooltipText: 'Rate of time taken to retrieve medical records',

    chart: {
      options: {
        chart: {
          type: 'area',
          width: '100%',
          height: 250,
          toolbar: {
            show: false,
          },
        },
        tooltip: {
          enabled: false,
        },
        markers: {
          size: 5,
          colors: ['#fff'],
          strokeColors: '#3957D7',
          strokeWidth: 2,
          hover: {
            size: 7,
          },
        },
        fill: {
          type: 'gradient',
          gradient: {
            shade: 'light',
            type: 'vertical',
            shadeIntensity: 0.5,
            gradientToColors: undefined,
            opacityFrom: 0.4,
            opacityTo: 0.5,
            stops: [0, 100],
          },
        },
        stroke: {
          curve: 'straight',
          width: 2,
        },
        dataLabels: {
          enabled: false,
        },

        colors: ['#3957D7'],
        grid: {
          show: true,
          strokeDashArray: 5,
        },

        xaxis: {
          categories: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
          labels: {
            show: true,
          },
          axisTicks: {
            show: false,
          },
          axisBorder: {
            show: false,
          },
        },
        yaxis: {
          show: true,
        },
      },

      series: [{ data: [10, 20, 15, 25, 35, 30] }],
    },
  },
  timeToFirstRequest: {
    id: 'timeToFirstRequest',
    title: 'Time to First Request',
    value: '8 Min',
    trend: 'up',
    trendValue: '2',
    trendTitle: 'Avg. time taken by new customers for first request',
    trendColor: 'success.dark',
    icon: <TrayArrowDownIcon size={24} />,
    iconBgColor: '#F2F7F9',
    iconColor: 'primary.dark',
    tooltipText: 'Average number of times each user logs in during the week',

    chart: {
      options: {
        chart: {
          type: 'bar',
          width: '100%',
          height: 270,
          toolbar: {
            show: false,
          },
        },
        legend: {
          show: false,
        },
        dataLabels: {
          enabled: false,
        },
        tooltip: {
          enabled: true,
          y: {
            formatter: (value: number) => `${value} min`,
          },
        },
        plotOptions: {
          bar: {
            borderRadius: 6,
            columnWidth: '60%',
            distributed: true,
          },
        },
        xaxis: {
          categories: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
          axisBorder: {
            show: false,
          },
          axisTicks: {
            show: false,
          },
          labels: {
            style: {
              colors: '#9CA3AF',
            },
          },
        },
        yaxis: {
          show: true,
          min: 0,
          max: 30,
          tickAmount: 3,
          labels: {
            style: {
              colors: '#9CA3AF',
            },
            formatter: (value: number) => Math.round(value).toString(),
          },
        },
        grid: {
          show: true,
          borderColor: '#E5E7EB',
          strokeDashArray: 5,
          xaxis: {
            lines: {
              show: false,
            },
          },
          yaxis: {
            lines: {
              show: true,
            },
          },
          padding: {
            top: 0,
            right: 0,
            bottom: 0,
            left: 10,
          },
        },
        colors: [
          '#6894A8',
          '#C3D6DE',
          '#C3D6DE',
          '#C3D6DE',
          '#C3D6DE',
          '#C3D6DE',
          '#C3D6DE',
        ],
        states: {
          hover: {
            filter: {
              type: 'lighten',
              value: 0.08,
            },
          },
        },
      },
      series: [
        {
          name: 'Time to first request',
          data: [9, 12, 15, 23, 9, 15, 12],
        },
      ],
    },
    sx: {
      '& .apexcharts-bar-area': {
        '&:hover': {
          fill: (): string => `#6894A8 !important`,
        },
      },
    },
  },
  reductionInFollowUpsNeeded: {
    id: 'reductionInFollowUpsNeeded',
    title: 'Reduction in Follow Ups Needed',
    value: '73',
    trend: 'down',
    trendValue: '-0.2',
    trendTitle: 'Rate of time spent following up on records',
    trendColor: 'error.dark',
    icon: <ClockUserIcon size={24} />,
    iconBgColor: 'error.lightest',
    iconColor: 'error.dark',
    tooltipText: 'Rate of time spent following up on records',

    chart: {
      options: {
        chart: {
          type: 'line',
          width: '100%',
          height: 250,
          toolbar: {
            show: false,
          },
        },
        tooltip: {
          enabled: false,
        },
        markers: {
          size: 5,
          colors: ['#fff'],
          strokeColors: '#D7263D',
          strokeWidth: 2,
          hover: {
            size: 7,
          },
        },
        stroke: {
          curve: 'straight',
          width: 2,
        },
        dataLabels: {
          enabled: false,
        },

        colors: ['#D7263D'],
        grid: {
          show: true,
          strokeDashArray: 5,
        },

        xaxis: {
          categories: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
          labels: {
            show: true,
          },
          axisTicks: {
            show: false,
          },
          axisBorder: {
            show: false,
          },
        },
        yaxis: {
          show: true,
        },
      },
      series: [{ data: [20, 50, 10, 30, 40, 50, 20] }],
    },
  },
};

export const productivityEfficiencyData: Record<string, StatsCardProps> = {
  reductionInClientRequest: {
    id: 'reductionInClientRequest',
    title: 'Reduction in Client Requests',
    value: '25%',
    trend: 'down',
    trendValue: '12',
    trendTitle: 'Rate of client inquiries related to record retrieval issues',
    trendColor: 'error.dark',
    icon: <UserCirclePlusIcon size={24} />,
    iconBgColor: '#F0FDFA',
    iconColor: 'secondary.dark',
    tooltipText: 'Rate of client inquiries related to record retrieval issues',

    chart: {
      options: {
        chart: {
          type: 'bar',
          width: '100%',
          height: 250,
          toolbar: {
            show: false,
          },
        },
        legend: {
          show: false,
        },
        dataLabels: {
          enabled: false,
        },
        tooltip: {
          enabled: true,
          y: {
            formatter: (value: number) => `${value}%`,
          },
        },
        plotOptions: {
          bar: {
            borderRadius: 6,
            columnWidth: '60%',
            distributed: true,
          },
        },
        xaxis: {
          categories: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
          axisBorder: {
            show: false,
          },
          axisTicks: {
            show: false,
          },
          labels: {
            style: {
              colors: '#9CA3AF',
            },
          },
        },
        yaxis: {
          show: true,
          min: 0,
          max: 30,
          tickAmount: 3,
          labels: {
            style: {
              colors: '#9CA3AF',
            },
            formatter: (value: number) => Math.round(value).toString(),
          },
        },
        grid: {
          show: true,
          borderColor: '#E5E7EB',
          strokeDashArray: 5,
          xaxis: {
            lines: {
              show: false,
            },
          },
          yaxis: {
            lines: {
              show: true,
            },
          },
          padding: {
            top: 0,
            right: 0,
            bottom: 0,
            left: 10,
          },
        },
        colors: [
          '#9AF5E4',
          '#9AF5E4',
          '#9AF5E4',
          '#17C3B2',
          '#9AF5E4',
          '#9AF5E4',
          '#9AF5E4',
        ],
        states: {
          hover: {
            filter: {
              type: 'lighten',
              value: 0.08,
            },
          },
        },
      },
      series: [
        {
          name: 'Reduction in Client Requests',
          data: [9, 12, 15, 23, 9, 15, 12],
        },
      ],
    },
    sx: {
      '& .apexcharts-bar-area': {
        '&:hover': {
          fill: (): string => `#17C3B2 !important`,
        },
      },
    },
  },
  recordsRetrieved: {
    id: 'recordsRetrieved',
    title: 'Records Retrieved',
    value: '178',
    trend: 'down',
    trendValue: '6',
    trendTitle: 'Record retrieved last week',
    trendColor: 'error.dark',
    icon: <TrayArrowDownIcon size={24} />,
    iconBgColor: '#FDF4FF',
    iconColor: '#BA24CE',
    tooltipText: 'Record retrieved last week',

    chart: {
      options: {
        chart: {
          type: 'area',
          width: '100%',
          height: 250,
          toolbar: {
            show: false,
          },
        },
        tooltip: {
          enabled: false,
        },
        markers: {
          size: 5,
          colors: ['#fff'],
          strokeColors: '#BA24CE',
          strokeWidth: 2,
          hover: {
            size: 7,
          },
        },
        fill: {
          type: 'gradient',
          gradient: {
            shade: 'light',
            type: 'vertical',
            shadeIntensity: 0.5,
            gradientToColors: undefined,
            opacityFrom: 0.4,
            opacityTo: 0.5,
            stops: [0, 100],
          },
        },
        stroke: {
          curve: 'straight',
          width: 2,
        },
        dataLabels: {
          enabled: false,
        },

        colors: ['#BA24CE'],
        grid: {
          show: true,
          strokeDashArray: 5,
        },

        xaxis: {
          categories: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
          labels: {
            show: true,
          },
          axisTicks: {
            show: false,
          },
          axisBorder: {
            show: false,
          },
        },
        yaxis: {
          show: true,
        },
      },

      series: [{ data: [10, 20, 15, 25, 35, 30] }],
    },
  },
  userEngagementRate: {
    id: 'userEngagementRate',
    title: 'User Engagement Rate',
    value: '65%',
    trend: 'down',
    trendValue: '-2',
    trendTitle: 'Rate of firm staff actively using the platform',
    trendColor: 'error.dark',
    icon: <FilesIcon size={24} />,
    iconBgColor: 'success.lightest',
    iconColor: 'success.dark',
    tooltipText: 'Rate of firm staff actively using the platform',

    chart: {
      options: {
        chart: {
          type: 'area',
          width: '100%',
          height: 250,
          toolbar: {
            show: false,
          },
        },
        tooltip: {
          enabled: false,
        },
        markers: {
          size: 5,
          colors: ['#0E9388'],
          strokeColors: '#fff',
          strokeWidth: 2,
          hover: {
            size: 7,
          },
        },
        fill: {
          type: 'gradient',
          gradient: {
            shade: 'light',
            type: 'vertical',
            shadeIntensity: 0.5,
            gradientToColors: undefined,
            opacityFrom: 0.4,
            opacityTo: 0.5,
            stops: [0, 100],
          },
        },
        stroke: {
          curve: 'smooth',
          width: 2,
        },
        dataLabels: {
          enabled: false,
        },

        colors: ['#00A92A'],
        grid: {
          show: true,
          strokeDashArray: 5,
        },

        xaxis: {
          categories: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
          labels: {
            show: true,
          },
          axisTicks: {
            show: false,
          },
          axisBorder: {
            show: false,
          },
        },
        yaxis: {
          show: true,
        },
      },
      series: [{ data: [10, 30, 20, 30, 40, 20, 30] }],
    },
  },
};

export const costSavingROIData: Record<string, StatsCardProps> = {
  increaseInCaseCapacity: {
    id: 'increaseInCaseCapacity',
    title: 'Increase in Case Capacity',
    value: '67%',
    trend: 'up',
    trendValue: '40',
    trendTitle: 'Rate of cases handled due to process efficiency',
    trendColor: 'success.dark',
    icon: <FolderOpenIcon size={24} />,
    iconBgColor: '#F1F5FD',
    iconColor: 'info.dark',
    tooltipText: 'Rate of cases handled due to process efficiency',

    chart: {
      options: {
        chart: {
          type: 'bar',
          width: '100%',
          height: 250,
          toolbar: {
            show: false,
          },
        },
        legend: {
          show: false,
        },
        dataLabels: {
          enabled: false,
        },
        tooltip: {
          enabled: true,
          y: {
            formatter: (value: number) => `${value} logins`,
          },
        },
        plotOptions: {
          bar: {
            borderRadius: 6,
            columnWidth: '60%',
            distributed: true,
          },
        },
        xaxis: {
          categories: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
          axisBorder: {
            show: false,
          },
          axisTicks: {
            show: false,
          },
          labels: {
            style: {
              colors: '#9CA3AF',
            },
          },
        },
        yaxis: {
          show: true,
          min: 0,
          max: 30,
          tickAmount: 3,
          labels: {
            style: {
              colors: '#9CA3AF',
            },
            formatter: (value: number) => Math.round(value).toString(),
          },
        },
        grid: {
          show: true,
          borderColor: '#E5E7EB',
          strokeDashArray: 5,
          xaxis: {
            lines: {
              show: false,
            },
          },
          yaxis: {
            lines: {
              show: true,
            },
          },
          padding: {
            top: 0,
            right: 0,
            bottom: 0,
            left: 10,
          },
        },
        colors: [
          '#c5d6f8',
          '#c5d6f8',
          '#c5d6f8',
          '#4763E4',
          '#c5d6f8',
          '#c5d6f8',
          '#c5d6f8',
        ],
        states: {
          hover: {
            filter: {
              type: 'lighten',
              value: 0.08,
            },
          },
        },
      },
      series: [
        {
          name: 'Logins per user',
          data: [9, 12, 15, 23, 9, 15, 12],
        },
      ],
    },
    sx: {
      '& .apexcharts-bar-area': {
        '&:hover': {
          fill: (theme: Theme): string =>
            `${theme.palette.info.dark} !important`,
        },
      },
    },
  },
  legalCaseResolutionTimeReduction: {
    id: 'legalCaseResolutionTimeReduction',
    title: 'Legal Case Resolution Time Reduction',
    value: '65%',
    trend: 'down',
    trendValue: '-2',
    trendTitle: 'Rate of avg. time taken to close cases',
    trendColor: 'error.dark',
    icon: <GavelIcon size={24} />,
    iconBgColor: '#F2F7F9',
    iconColor: 'primary.dark',
    tooltipText: 'Rate of avg. time taken to close cases',

    chart: {
      options: {
        chart: {
          type: 'area',
          width: '100%',
          height: 250,
          toolbar: {
            show: false,
          },
        },
        tooltip: {
          enabled: false,
        },
        markers: {
          size: 5,
          colors: ['#426378'],
          strokeColors: '#fff',
          strokeWidth: 2,
          hover: {
            size: 7,
          },
        },
        fill: {
          type: 'gradient',
          gradient: {
            shade: 'light',
            type: 'vertical',
            shadeIntensity: 0.5,
            gradientToColors: undefined,
            opacityFrom: 0.4,
            opacityTo: 0.5,
            stops: [0, 100],
          },
        },
        stroke: {
          curve: 'smooth',
          width: 2,
        },
        dataLabels: {
          enabled: false,
        },

        colors: ['#426378'],
        grid: {
          show: true,
          strokeDashArray: 5,
        },

        xaxis: {
          categories: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
          labels: {
            show: true,
          },
          axisTicks: {
            show: false,
          },
          axisBorder: {
            show: false,
          },
        },
        yaxis: {
          show: true,
        },
      },
      series: [{ data: [10, 30, 20, 30, 40, 20, 30] }],
    },
  },
};
