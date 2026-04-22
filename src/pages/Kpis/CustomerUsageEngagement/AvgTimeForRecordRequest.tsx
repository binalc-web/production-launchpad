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
import { InfoIcon, ClockCountdownIcon } from '@phosphor-icons/react';
import { dualChartTooltipValue, tooltipBullet } from '@/utils/commonStyles';

// Mock data
const chartData = [
  { day: 'Monday', year: 2024, avgTime: 15, requests: 40 },
  { day: 'Tuesday', year: 2024, avgTime: 18, requests: 55 },
  { day: 'Wednesday', year: 2025, avgTime: 20, requests: 70 },
  { day: 'Thursday', year: 2025, avgTime: 22, requests: 60 },
  { day: 'Friday', year: 2025, avgTime: 25, requests: 90 },
];

const AvgTimeForRecordRequest: FC = () => {
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
        columnWidth: '50%',
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
    },
    stroke: {
      colors: ['transparent'],
      width: 6,
    },

    xaxis: {
      categories: chartData.map((item) => item.day),
      tickPlacement: 'on',
      labels: {
        show: true,
      },
      axisBorder: {
        show: true,
      },
      axisTicks: {
        show: true,
      },
    },
    yaxis: {
      show: true,
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
            <strong>${data.day}, ${data.year}</strong><br/>
            <div class='tooltip-item'>
            ${tooltipBullet('#E9B949')}
              ${data.avgTime} min
            </div>
            <div class='tooltip-item'>
              ${tooltipBullet('#92A6E2')}
              ${data.requests} request
            </div>
          </div>
        `;
      },
    },
    colors: ['#92A6E2', '#E9B949'], // Requests below, time above
  };

  const chartSeries = [
    {
      name: 'Retrieval Requests',
      data: chartData.map((item) => item.requests),
    },
    {
      name: 'Avg. Time',
      data: chartData.map((item) => item.avgTime),
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
              <ClockCountdownIcon size={24} />
            </Avatar>
            <Typography variant="h6">
              Avg. Time for Record Request Submission
            </Typography>
            <InfoIcon size={20} color={theme.palette.text.secondary} />
          </Box>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
          <Typography variant="h2" sx={{ mr: 1.25 }}>
            18 min
          </Typography>
          <Chip
            color="error"
            sx={{ backgroundColor: 'error.lightest', color: 'error.dark' }}
            label={<Box component="span">-3.0%</Box>}
            size="small"
          />
          <Typography ml={1} variant="body2" fontSize={12}>
            Avg. time taken for record request completion
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

export default AvgTimeForRecordRequest;
