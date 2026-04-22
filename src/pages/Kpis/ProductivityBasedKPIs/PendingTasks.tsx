import type { FC } from 'react';
import {
  Box,
  Typography,
  Avatar,
  Chip,
  Card,
  CardContent,
  useTheme,
} from '@mui/material';
import ReactApexChart from 'react-apexcharts';
import { InfoIcon, HandCoinsIcon, ArrowDownIcon } from '@phosphor-icons/react';
import { dualChartTooltipValue, tooltipBullet } from '@/utils/commonStyles';

const chartData = [
  { day: 'Mon', completed: 8, pending: 10 },
  { day: 'Tue', completed: 9, pending: 11 },
  { day: 'Wed', completed: 12, pending: 13 },
  { day: 'Thu', completed: 8, pending: 9 },
  { day: 'Fri', completed: 11, pending: 11 },
  { day: 'Sat', completed: 11, pending: 11 },
  { day: 'Sun', completed: 12, pending: 13 },
];

const PendingTasks: FC = () => {
  const theme = useTheme();

  const chartOptions: ApexCharts.ApexOptions = {
    chart: {
      type: 'bar',
      height: 350,
      stacked: true,
      toolbar: {
        show: false,
      },
      animations: {
        enabled: true,
      },
    },
    plotOptions: {
      bar: {
        horizontal: false,
        borderRadius: 10,
        borderRadiusApplication: 'around',
        borderRadiusWhenStacked: 'all',
        columnWidth: '60%',
        barHeight: '70%',
      },
    },
    dataLabels: { enabled: false },
    legend: {
      show: true,
      position: 'top',
      horizontalAlign: 'left',
      fontSize: '12px',
      markers: {
        shape: 'circle',
        size: 6,
      },
      offsetY: 5,
    },
    stroke: {
      colors: ['transparent'],
      width: 4,
    },
    xaxis: {
      categories: chartData.map((item) => item.day),
      tickPlacement: 'on',
      labels: {
        show: true,
      },
      axisBorder: {
        show: false,
      },
      axisTicks: {
        show: false,
      },
    },
    yaxis: {
      show: true,
      min: 0,
      max: 30,
      tickAmount: 3,
      labels: {
        formatter: (value) => Math.floor(value).toString(),
      },
    },
    grid: {
      show: true,
      strokeDashArray: 5,
      padding: {
        top: 0,
        right: 0,
        bottom: 0,
        left: 0,
      },
    },
    states: {
      hover: { filter: { type: 'none' } },
      active: { filter: { type: 'none' } },
    },
    tooltip: {
      custom: function ({ dataPointIndex }) {
        const data = chartData[dataPointIndex];
        return `
          <div class='tooltip-group'>
            <strong>${data.day}</strong><br/>
            <div class='tooltip-item'>
            ${tooltipBullet('#E6B45A')}
              ${data.pending} pending
            </div>
            <div class='tooltip-item'>
              ${tooltipBullet('#00A92A')}
              ${data.completed} completed
            </div>
          </div>
        `;
      },
    },
    colors: ['#E6B45A', '#00A92A'],
  };

  const chartSeries = [
    {
      name: 'Pending Part',
      data: chartData.map((item) => item.pending),
    },
    {
      name: 'Completed Part',
      data: chartData.map((item) => item.completed),
    },
  ];

  return (
    <Card>
      <CardContent
        sx={{
          p: 3,
          ...dualChartTooltipValue(),
        }}
      >
        <Box
          sx={{
            mb: 2,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Avatar
              variant="rounded"
              sx={{ backgroundColor: 'tertiary.50', color: 'tertiary.600' }}
            >
              <HandCoinsIcon size={24} />
            </Avatar>
            <Typography variant="h6">Pending Tasks</Typography>
            <InfoIcon size={20} color={theme.palette.text.secondary} />
          </Box>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
          <Typography variant="h2" sx={{ mr: 1.25 }}>
            24
          </Typography>
          <Chip
            color="error"
            sx={{ backgroundColor: 'error.lightest', color: 'error.dark' }}
            label={
              <Box
                component="span"
                sx={{ display: 'flex', alignItems: 'center' }}
              >
                7% <ArrowDownIcon size={12} weight="bold" />
              </Box>
            }
            size="small"
          />
          <Typography ml={1} variant="body2" fontSize={12}>
            Avg. margin between revenue (COGS) & revenue X 100
          </Typography>
        </Box>

        <Box sx={{ mt: 3, height: 350 }}>
          <ReactApexChart
            options={chartOptions}
            series={chartSeries}
            type="bar"
            height={350}
            width="100%"
          />
        </Box>
      </CardContent>
    </Card>
  );
};

export default PendingTasks;
