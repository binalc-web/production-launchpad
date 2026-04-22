import { useCallback, useEffect, useMemo, useState, type FC } from 'react';
import { LineSegmentsIcon } from '@phosphor-icons/react';
import StatsCardWithTabs from '@/components/StatsCardWithTabs';
import { minimalChartTooltipValue } from '@/utils/commonStyles';
import type { ApexOptions } from 'apexcharts';
import { useQuery } from '@tanstack/react-query';
import { getChronologiesData } from '@/api/dashboard';

const ChronologiesChart: FC = () => {
  const [activeTab, setActiveTab] = useState<string>('weekly');
  const [chartKey, setChartKey] = useState<number>(0);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['chronologies-dashboard'],
    queryFn: getChronologiesData,
    refetchOnWindowFocus: false,
    refetchOnMount: true,
    staleTime: 5 * 60 * 1000,
  });

  // Force chart re-render when data changes or tab changes
  useEffect(() => {
    setChartKey((previousKey) => previousKey + 1);
  }, [data?.data, activeTab]);

  const createChartOptions = useCallback(
    (): ApexOptions => ({
      chart: {
        type: 'bar',
        width: '100%',
        height: '100%',
        sparkline: {
          enabled: true,
        },
        toolbar: {
          show: false,
        },
        animations: {
          enabled: true,
          speed: 800,
          animateGradually: {
            enabled: true,
            delay: 150,
          },
          dynamicAnimation: {
            enabled: true,
            speed: 350,
          },
        },
      },
      tooltip: {
        enabled: true,
        x: {
          show: true,
        },
        y: {
          formatter: (value) => `${value} chronologies`,
        },
      },
      plotOptions: {
        bar: {
          borderRadius: 4,
          columnWidth: '50%',
          distributed: true,
        },
      },
      colors: ['#E878FA'],
      dataLabels: {
        enabled: false,
      },
      stroke: {
        width: 0,
      },
      grid: {
        show: false,
      },
      xaxis: {
        axisBorder: {
          show: false,
        },
        axisTicks: {
          show: false,
        },
      },
      yaxis: {
        show: false,
      },
    }),
    []
  );

  // Extract chart data based on period type (weekly/monthly)
  const extractChartData = useCallback(
    (period: 'weekly' | 'monthly'): Array<number> => {
      if (isLoading || isError || !data?.data) return [0];

      try {
        const sourceData =
          period === 'weekly'
            ? data.data.recordChronologiesByWeek
            : data.data.recordChronologiesByMonth;

        if (!Array.isArray(sourceData) || sourceData.length === 0) {
          return [0];
        }

        return sourceData.map((item: Record<string, number | string>) => {
          const value = Object.values(item)[0];
          return typeof value === 'string'
            ? parseInt(value, 10) || 0
            : Number(value) || 0;
        });
      } catch (error) {
        console.error(`Error extracting ${period} chart data:`, error);
        return [0];
      }
    },
    [data?.data, isLoading, isError]
  );

  // Create chart series with data based on period
  const createSeries = useCallback(
    (period: 'weekly' | 'monthly') => {
      try {
        const chartData = extractChartData(period);
        // Ensure we never return empty or invalid data
        if (!chartData || !Array.isArray(chartData) || chartData.length === 0) {
          return [
            {
              name: 'Chronologies',
              data: [0],
            },
          ];
        }

        return [
          {
            name: 'Chronologies',
            data: chartData,
          },
        ];
      } catch (error) {
        console.error(`Error creating series for ${String(period)}:`, error);
        return [
          {
            name: 'Chronologies',
            data: [0],
          },
        ];
      }
    },
    [extractChartData]
  );

  // Helper function to determine trend direction
  const getValidTrend = useCallback(
    (trend: string | undefined): 'up' | 'down' => {
      if (!trend) return 'up';
      return trend.includes('-') ? 'down' : 'up';
    },
    []
  );

  // Extract values from API data or use defaults
  const totalChronologies = data?.data?.totalChronologies || '0';
  const weeklyChange = data?.data?.changeFromPreviousWeek || 'N/A';
  const monthlyChange = data?.data?.changeFromPreviousMonth || 'N/A';

  // Create chart options that will be used for both tabs
  const chartOptions = useMemo(
    () => createChartOptions(),
    [createChartOptions]
  );

  // Create data series for weekly and monthly charts
  const weeklySeries = useMemo(() => {
    const series = createSeries('weekly');
    // Ensure we have a valid array with at least one data point
    return series.map((s) => ({
      ...s,
      data: Array.isArray(s.data) && s.data.length > 0 ? s.data : [0],
    }));
  }, [createSeries]);

  const monthlySeries = useMemo(() => {
    const series = createSeries('monthly');
    // Ensure we have a valid array with at least one data point
    return series.map((s) => ({
      ...s,
      data: Array.isArray(s.data) && s.data.length > 0 ? s.data : [0],
    }));
  }, [createSeries]);

  // For debugging purposes
  console.log('Weekly data:', weeklySeries[0]?.data);
  console.log('Monthly data:', monthlySeries[0]?.data);

  // Prepare tab data configuration for the StatsCardWithTabs component
  const tabData = useMemo(() => {
    if (isLoading) {
      return [
        {
          key: 'weekly',
          label: 'Weekly',
          value: 'Loading...',
          trend: 'up' as const,
          trendValue: 'N/A',
          trendTitle: 'From week',
          chart: {
            options: chartOptions,
            series: [{ name: 'Loading', data: [0] }],
          },
        },
        {
          key: 'monthly',
          label: 'Monthly',
          value: 'Loading...',
          trend: 'up' as const,
          trendValue: 'N/A',
          trendTitle: 'From month',
          chart: {
            options: chartOptions,
            series: [{ name: 'Loading', data: [0] }],
          },
        },
      ];
    }

    return [
      {
        key: 'weekly',
        label: 'Weekly',
        value: totalChronologies.toString(),
        trend: getValidTrend(weeklyChange),
        trendValue: weeklyChange,
        trendTitle: 'From week',
        chart: {
          options: chartOptions,
          series: weeklySeries,
        },
      },
      {
        key: 'monthly',
        label: 'Monthly',
        value: totalChronologies.toString(),
        trend: getValidTrend(monthlyChange),
        trendValue: monthlyChange,
        trendTitle: 'From month',
        chart: {
          options: chartOptions,
          series: monthlySeries,
        },
      },
    ];
  }, [
    totalChronologies,
    weeklySeries,
    monthlySeries,
    weeklyChange,
    monthlyChange,
    isLoading,
    chartOptions,
    getValidTrend,
  ]);

  // Handle tab change
  const handleTabChange = (tabKey: string): void => {
    setActiveTab(tabKey);
  };

  return (
    <StatsCardWithTabs
      isLoading={isLoading}
      title="Chronologies Generated"
      icon={<LineSegmentsIcon size={24} />}
      iconColor="#BA24CE"
      iconBgColor="#FDF4FF"
      defaultTab="weekly"
      onTabChange={handleTabChange}
      tabData={tabData}
      tooltipText="Total no. of chronologies (medical and billing) generated each week / month"
      sx={{
        '& .apexcharts-canvas': minimalChartTooltipValue(),
        opacity: isLoading ? 0.7 : 1,
      }}
      id={`chronologies-chart-${chartKey}`}
    />
  );
};

export default ChronologiesChart;
