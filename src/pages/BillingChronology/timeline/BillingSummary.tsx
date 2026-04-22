import type { FC } from 'react';
import {
  Avatar,
  Box,
  Card,
  CardContent,
  Tooltip,
  Typography,
} from '@mui/material';
import {
  ChartDonutIcon,
  HandCoinsIcon,
  InfoIcon,
  MoneyWavyIcon,
} from '@phosphor-icons/react';
import ReactApexChart from 'react-apexcharts';
import type { ApexOptions } from 'apexcharts';
import { useQuery } from '@tanstack/react-query';
import { getBillingSummary } from '@/api/chronologies/summary';
import AppCustomLoader from '@/components/AppCustomLoader';
import { minimalChartTooltipValue } from '@/utils/commonStyles';

interface ColoredBoxProps {
  bgcolor: string;
  color: string;
  title: string;
  amount: number;
  icon: React.ReactNode;
}

const ColoredBox: FC<ColoredBoxProps> = ({
  bgcolor,
  color,
  icon,
  title,
  amount,
}) => {
  return (
    <Box
      sx={{
        mt: 2,
        p: 2,
        gap: 2,
        bgcolor,
        width: '100%',
        display: 'flex',
        borderRadius: 2,
        alignItems: 'center',
        '& svg': {
          color,
        },
      }}
    >
      {icon}
      <Box>
        <Typography fontSize={14} fontWeight={500} color="neutral.500">
          {title}
        </Typography>
        <Typography variant="h3">${amount}</Typography>
      </Box>
    </Box>
  );
};

const BillingSummary: FC<{ chronologyID: string }> = ({ chronologyID }) => {
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['billing-summary', chronologyID],
    queryFn: () => getBillingSummary(chronologyID),
  });

  const series = [data?.totalAmountBilled || 1, data?.totalPatientDue || 1];

  const options: ApexOptions = {
    chart: {
      type: 'donut',
    },
    labels: ['Amount Paid', 'Amount Due'],
    colors: ['#09DE3D', '#4E74E3'],
    dataLabels: {
      enabled: false,
    },
    legend: {
      show: false,
    },
    tooltip: {
      enabled: true,
      followCursor: false,

      custom: (options): string => {
        const index = options.seriesIndex;
        const label = options.w.config.labels[index] || '';
        const value = options.series[index] || 0;
        return `
            <div class="custom-tooltip" style="padding: 8px;">
              <div style="font-weight: 500; margin-bottom: 4px;">${label}</div>
              <div> <div style="width: 8px; height: 8px; border-radius: 50%; background: ${options.w.config.colors[index]}; display: inline-block; margin-right: 4px;"></div> $${series.every((item) => item === 1 || item === 0) ? 0 : value}</div>
            </div>
          `;
      },
    },
    plotOptions: {
      pie: {
        donut: {
          labels: {
            show: true,
            name: {
              show: false,
            },
            total: {
              showAlways: true,
              show: true,
              formatter: (w): string => {
                return `$${
                  data?.totalAmountBilled === 0 && data?.totalPatientDue === 0
                    ? 0
                    : w.globals.seriesTotals
                        .reduce((a: number, b: number) => {
                          return a + b;
                        }, 0)
                        ?.toFixed(2)
                }`;
              },
            },
            value: {
              fontSize: '32px',
            },
          },
        },
      },
    },
  };

  return (
    <Card
      sx={{
        overflow: 'visible',
      }}
    >
      <CardContent>
        {isLoading ? (
          <AppCustomLoader height={200} />
        ) : isError ? (
          <Typography variant="body1" color="error">
            {error?.message}
          </Typography>
        ) : (
          <>
            <Box
              sx={{
                gap: 1,
                display: 'flex',
                alignItems: 'center',
              }}
            >
              <Avatar
                variant="rounded"
                sx={{
                  width: 40,
                  height: 40,
                  bgcolor: '#F2F7F9',
                  '& svg': {
                    color: 'primary.main',
                  },
                }}
              >
                <ChartDonutIcon />
              </Avatar>
              <Typography fontWeight={600}>Overall Billing Summary</Typography>
              <Tooltip title="Billing Summary">
                <InfoIcon size={20} />
              </Tooltip>
            </Box>

            <Box sx={{ mt: 2, ...minimalChartTooltipValue('unset') }}>
              <ReactApexChart
                type="donut"
                series={series}
                options={options}
                height={300}
              />
            </Box>

            <Box sx={{ mt: 4 }}>
              <ColoredBox
                bgcolor="#EEFFF1"
                color="#00A92A"
                icon={<HandCoinsIcon size={40} />}
                title="Amount Paid"
                amount={data?.totalAmountBilled || 0}
              />
              <ColoredBox
                bgcolor="#F1F5FD"
                color="#3957D7"
                icon={<MoneyWavyIcon size={40} />}
                title="Amount Due"
                amount={data?.totalPatientDue || 0}
              />
            </Box>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default BillingSummary;
