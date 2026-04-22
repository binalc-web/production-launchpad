import { useState, type FC } from 'react';

import { ArrowUpRightIcon, InfoIcon } from '@phosphor-icons/react';
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
} from '@mui/material';

import { minimalChartTooltipValue } from '@/utils/commonStyles';
import ReactApexChart from 'react-apexcharts';
import type { ApexOptions } from 'apexcharts';
import { useQuery } from '@tanstack/react-query';
import { getRecordRequestsData } from '@/api/dashboard';
import AppCustomLoader from '@/components/AppCustomLoader';

type TimePeriod = 'weekly' | 'monthly';

const RecordRequest: FC = () => {
  const [timePeriod, setTimePeriod] = useState<TimePeriod>('weekly');

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['record-requests-dashboard'],
    queryFn: getRecordRequestsData,
  });

  const handleTabChange = (
    _: React.SyntheticEvent,
    newValue: TimePeriod
  ): void => {
    setTimePeriod(newValue);
  };

  const chartOptions: ApexOptions = {
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
        opacityFrom: 0.6, // Increased from 0.4
        opacityTo: 0.2, // Increased from 0.1
        stops: [0, 100],
      },
    },
    stroke: {
      curve: 'smooth',
      width: 2.5, // Increased from 2
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
  };

  const chartSeries = [
    {
      name: 'Record Requests',
      data:
        timePeriod === 'weekly'
          ? data?.data?.recordRequestsByWeek.flatMap(
              (item: Record<string, number | string>) => {
                return Object.values(item);
              }
            ) || []
          : data?.data?.recordRequestsByMonth.flatMap(
              (item: Record<string, number | string>) => {
                return Object.values(item);
              }
            ) || [],
    },
  ];

  return (
    <Card
      sx={{
        height: '100%',
      }}
    >
      <CardContent>
        {isLoading ? (
          <AppCustomLoader height="20vh" />
        ) : isError ? (
          <Typography fontWeight={600} color="error" mt={2}>
            {error.message}
          </Typography>
        ) : (
          <>
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                flexWrap: 'wrap',
                mb: 3,
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
                    backgroundColor: '#FBF7EB',
                    color: 'warning.main',
                  }}
                >
                  <Box
                    component="svg"
                    width="41px"
                    height="40px"
                    viewBox="0 0 41 40"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <Box
                      component="rect"
                      x="0.333008"
                      width="40px"
                      height="40px"
                      rx="6"
                      fill="#FBF7EB"
                    />
                    <Box
                      component="path"
                      opacity="0.2"
                      d="M28.583 12.5V23H25.1433C25.0448 22.9999 24.9472 23.0193 24.8562 23.0569C24.7651 23.0945 24.6824 23.1497 24.6127 23.2194L22.8024 25.0306C22.7327 25.1003 22.6499 25.1555 22.5589 25.1931C22.4678 25.2307 22.3703 25.2501 22.2718 25.25H18.3933C18.2948 25.2501 18.1972 25.2307 18.1062 25.1931C18.0151 25.1555 17.9324 25.1003 17.8627 25.0306L16.0524 23.2194C15.9827 23.1497 15.8999 23.0945 15.8089 23.0569C15.7178 23.0193 15.6203 22.9999 15.5218 23H12.083V12.5C12.083 12.3011 12.162 12.1103 12.3027 11.9697C12.4433 11.829 12.6341 11.75 12.833 11.75H27.833C28.0319 11.75 28.2227 11.829 28.3633 11.9697C28.504 12.1103 28.583 12.3011 28.583 12.5Z"
                      fill="#CE8324"
                    />
                    <Box
                      component="path"
                      d="M27.833 11H12.833C12.4352 11 12.0537 11.158 11.7723 11.4393C11.491 11.7206 11.333 12.1022 11.333 12.5V27.5C11.333 27.8978 11.491 28.2794 11.7723 28.5607C12.0537 28.842 12.4352 29 12.833 29H27.833C28.2308 29 28.6124 28.842 28.8937 28.5607C29.175 28.2794 29.333 27.8978 29.333 27.5V12.5C29.333 12.1022 29.175 11.7206 28.8937 11.4393C28.6124 11.158 28.2308 11 27.833 11ZM27.833 12.5V22.25H25.1424C24.9455 22.2495 24.7504 22.2881 24.5686 22.3636C24.3867 22.4391 24.2217 22.5499 24.083 22.6897L22.2727 24.5H18.3933L16.583 22.6897C16.4442 22.5498 16.279 22.4389 16.097 22.3634C15.915 22.2879 15.7198 22.2494 15.5227 22.25H12.833V12.5H27.833ZM27.833 27.5H12.833V23.75H15.5227L17.333 25.5603C17.4718 25.7002 17.637 25.8111 17.819 25.8866C18.0011 25.9621 18.1963 26.0006 18.3933 26H22.2727C22.4698 26.0006 22.665 25.9621 22.847 25.8866C23.029 25.8111 23.1942 25.7002 23.333 25.5603L25.1433 23.75H27.833V27.5ZM16.8024 18.2806C16.7327 18.211 16.6773 18.1283 16.6396 18.0372C16.6018 17.9462 16.5824 17.8486 16.5824 17.75C16.5824 17.6514 16.6018 17.5538 16.6396 17.4628C16.6773 17.3717 16.7327 17.289 16.8024 17.2194L19.8024 14.2194C19.872 14.1496 19.9548 14.0943 20.0458 14.0566C20.1369 14.0188 20.2344 13.9994 20.333 13.9994C20.4316 13.9994 20.5292 14.0188 20.6202 14.0566C20.7113 14.0943 20.794 14.1496 20.8636 14.2194L23.8636 17.2194C23.9333 17.2891 23.9886 17.3718 24.0263 17.4628C24.064 17.5539 24.0834 17.6515 24.0834 17.75C24.0834 17.8485 24.064 17.9461 24.0263 18.0372C23.9886 18.1282 23.9333 18.2109 23.8636 18.2806C23.794 18.3503 23.7112 18.4056 23.6202 18.4433C23.5291 18.481 23.4316 18.5004 23.333 18.5004C23.2345 18.5004 23.1369 18.481 23.0458 18.4433C22.9548 18.4056 22.8721 18.3503 22.8024 18.2806L21.083 16.5603V22.25C21.083 22.4489 21.004 22.6397 20.8633 22.7803C20.7227 22.921 20.5319 23 20.333 23C20.1341 23 19.9433 22.921 19.8027 22.7803C19.662 22.6397 19.583 22.4489 19.583 22.25V16.5603L17.8636 18.2806C17.794 18.3504 17.7113 18.4057 17.6202 18.4434C17.5292 18.4812 17.4316 18.5006 17.333 18.5006C17.2344 18.5006 17.1369 18.4812 17.0458 18.4434C16.9548 18.4057 16.872 18.3504 16.8024 18.2806Z"
                      fill="#CE8324"
                    />
                  </Box>
                </Avatar>
                <Typography variant="h6">Record Requests</Typography>
                <Tooltip title="Total no. of medical record retrieval requests submitted each week / month">
                  <InfoIcon size={20} />
                </Tooltip>
              </Box>
              <Box sx={{ flexGrow: 1 }} />
              <Tabs
                value={timePeriod}
                onChange={handleTabChange}
                aria-label="time period tabs"
              >
                <Tab
                  label="Weekly"
                  value="weekly"
                  sx={{
                    minWidth: 'auto',
                    px: 2,
                    fontWeight: timePeriod === 'weekly' ? 600 : 400,
                  }}
                />
                <Tab
                  label="Monthly"
                  value="monthly"
                  sx={{
                    minWidth: 'auto',
                    px: 2,
                    fontWeight: timePeriod === 'monthly' ? 600 : 400,
                  }}
                />
              </Tabs>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
              <Typography variant="h2" sx={{ mr: 1.25 }}>
                {data?.data?.totalRecordRequests || 0}
              </Typography>
              <Chip
                color={
                  data?.data?.changeFromPreviousMonth !== 'N/A' &&
                  data?.data?.changeFromPreviousMonth.includes('-')
                    ? 'error'
                    : 'success'
                }
                sx={{
                  color: 'success.dark',
                  backgroundColor: 'success.lightest',
                }}
                label={
                  <Box
                    sx={{
                      gap: 0.5,
                      display: 'flex',
                      alignItems: 'center',
                    }}
                  >
                    <Box component="span">
                      {timePeriod === 'weekly'
                        ? data?.data?.changeFromPreviousWeek
                        : data?.data?.changeFromPreviousMonth}
                    </Box>
                    <Box component="span">
                      <ArrowUpRightIcon size={12} />
                    </Box>
                  </Box>
                }
                size="small"
              />
              <Typography variant="body2" sx={{ fontSize: 12, ml: 1.25 }}>
                From last {timePeriod.replace('ly', '')}
              </Typography>
            </Box>
            <Box sx={{ mt: 1, ...minimalChartTooltipValue() }}>
              {chartSeries?.[0]?.data?.length > 0 ? (
                <ReactApexChart
                  options={chartOptions}
                  series={chartSeries}
                  height={120}
                  width="100%"
                  type="area"
                />
              ) : (
                <Typography sx={{ mt: 3 }}>No chart data to display</Typography>
              )}
            </Box>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default RecordRequest;
