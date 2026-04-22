import type { FC, ReactNode } from 'react';

import {
  Avatar,
  Box,
  Card,
  Chip,
  Tooltip,
  Typography,
  CardContent,
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

export type ChartProps = {
  options: ApexOptions;
  series: ApexOptions['series'];
};

export type StatsCardProps = {
  id?: string;
  title: string;
  value: string;
  icon: ReactNode;
  iconColor: string;
  chart: ChartProps;
  trendValue: string;
  trendTitle: string;
  iconBgColor: string;
  trend: 'up' | 'down';
  tooltipText?: string;
  sx?: SxProps<Theme>;
};

const StatsCard: FC<StatsCardProps> = (props) => {
  const {
    sx,
    id,
    icon,
    title,
    value,
    trend,
    chart,
    iconColor,
    trendTitle,
    trendValue,
    iconBgColor,
    tooltipText,
  } = props;

  return (
    <Card>
      <CardContent
        sx={{
          ...sx,
        }}
      >
        <Box
          sx={{
            gap: 1.5,
            display: 'flex',
            alignItems: 'center',
          }}
        >
          <Avatar
            variant="rounded"
            sx={{
              backgroundColor: iconBgColor,
              color: iconColor || '#000000',
              '& svg': {
                width: 24,
                height: 24,
              },
            }}
          >
            {icon}
          </Avatar>
          <Box>
            <Typography variant="h6">{title}</Typography>
          </Box>
          {tooltipText && (
            <Box sx={{ ml: -1, '& svg': { verticalAlign: 'middle' } }}>
              <Tooltip title={tooltipText} arrow>
                <InfoIcon size={20} />
              </Tooltip>
            </Box>
          )}
        </Box>
        <Box
          sx={{
            mt: 2.5,
          }}
        >
          <Box>
            <Box sx={{ mt: 1, gap: 1, display: 'flex', alignItems: 'center' }}>
              <Typography variant="h2">{value}</Typography>
              <Chip
                color={trend === 'up' ? 'success' : 'error'}
                sx={{
                  backgroundColor:
                    trend === 'up' ? 'success.lightest' : 'error.lightest',
                  color: trend === 'up' ? 'success.dark' : 'error.dark',
                }}
                label={
                  <Box
                    sx={{
                      gap: 0.5,
                      display: 'flex',
                      alignItems: 'center',
                    }}
                  >
                    <Box component="span">{trendValue}</Box>
                    <Box component="span">
                      {trend === 'up' ? (
                        <ArrowUpRightIcon size={12} />
                      ) : (
                        <ArrowDownRightIcon size={12} />
                      )}
                    </Box>
                  </Box>
                }
              />
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                {trendTitle}
              </Typography>
            </Box>
          </Box>
          <Box>
            <Chart
              {...(id ? { id } : {})}
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
                ...chart.options,
              }}
              series={chart.series}
              type={chart.options.chart?.type}
              width={chart.options.chart?.width || 100}
              height={chart.options.chart?.height || 100}
            />
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
};

export default StatsCard;
