import { useEffect, useRef, useState, type FC } from 'react';
import moment from 'moment';
import {
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  Tooltip,
  Typography,
  Tabs,
  Tab,
} from '@mui/material';
import {
  CheckIcon,
  InfoIcon,
  CaretDownIcon,
  ExportIcon,
  XCircleIcon,
} from '@phosphor-icons/react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';

import { datepickerStyles } from '@/components/ReactDatepicker/styles';
import ReactApexChart from 'react-apexcharts';
import type { ApexOptions } from 'apexcharts';
import BillingTimeline from './BillingTimeline';
import type { BillingChartResponse } from '../types/BillingChronologyDetailsType';
import { getBillingChart } from '@/api/chronologies/billingChart';
import { useQuery } from '@tanstack/react-query';
import AppCustomLoader from '@/components/AppCustomLoader';
import ToastAlert from '@/components/ToastAlert';
import { getChronologySummaryReport } from '@/api/chronologies/export';
import { CHRONOLOGY_CATEGORY } from '@/api/chronologies/constants';

const BillingTimelineChart: FC<{ chronologyID: string }> = ({
  chronologyID,
}) => {
  const today = new Date();
  const oneMonthAgo = new Date(today);
  oneMonthAgo.setMonth(today.getMonth() - 1);

  const [dateRange, setDateRange] = useState<Array<Date | string | null>>([
    oneMonthAgo,
    today,
  ]);
  const [selectedYear, setSelectedYear] = useState<Date | null>(today);

  const [timePeriod, setTimePeriod] = useState<'all' | 'yearly'>('all');

  const formatDateForAPI = (date: Date | string | null): string => {
    if (date === null) return '';
    return moment(date).format('YYYY-MM-DD');
  };

  /** Formats date as MM-DD-YYYY for chronology-summary-report API */
  const formatDateMMDDYYYY = (date: Date | string | null): string => {
    if (date === null) return '';
    return moment(date).format('MM-DD-YYYY');
  };

  const getExportDates = (): { startDate: string; endDate: string } => {
    if (timePeriod === 'yearly' && selectedYear) {
      const year = selectedYear.getFullYear();
      return {
        startDate: formatDateMMDDYYYY(new Date(year, 0, 1)),
        endDate: formatDateMMDDYYYY(new Date(year, 11, 31)),
      };
    }
    return {
      startDate: formatDateMMDDYYYY(dateRange[0]),
      endDate: formatDateMMDDYYYY(dateRange[1]),
    };
  };

  const [isExportLoading, setIsExportLoading] = useState(false);
  const [showAlert, setShowAlert] = useState<{
    showAlert: boolean;
    type: 'success' | 'error';
    message: string;
  }>({
    showAlert: false,
    type: 'success',
    message: '',
  });

  const alertTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const scheduleAlertHide = (): void => {
    if (alertTimeoutRef.current !== null) {
      clearTimeout(alertTimeoutRef.current);
      alertTimeoutRef.current = null;
    }
    alertTimeoutRef.current = setTimeout(() => {
      setShowAlert((previous) => ({ ...previous, showAlert: false }));
      alertTimeoutRef.current = null;
    }, 3000);
  };

  useEffect(() => {
    return (): void => {
      if (alertTimeoutRef.current !== null) {
        clearTimeout(alertTimeoutRef.current);
        alertTimeoutRef.current = null;
      }
    };
  }, []);

  const {
    data,
    refetch,
    isLoading,
    isRefetching,
    isError,
    isRefetchError,
    error,
  } = useQuery<BillingChartResponse>({
    enabled: false,
    queryKey: ['billing-chart', chronologyID],
    queryFn: () => {
      let startDateParameter: string;
      let endDateParameter: string;

      if (timePeriod === 'yearly' && selectedYear) {
        const year = selectedYear.getFullYear();
        startDateParameter = formatDateForAPI(new Date(year, 0, 1));
        endDateParameter = formatDateForAPI(new Date(year, 11, 31));
      } else {
        startDateParameter = formatDateForAPI(dateRange[0]);
        endDateParameter = formatDateForAPI(dateRange[1]);
      }

      return getBillingChart({
        id: chronologyID,
        startDate: startDateParameter,
        endDate: endDateParameter,
        duration: timePeriod,
      });
    },
  });

  useEffect(() => {
    if (selectedYear) {
      void refetch();
    }
  }, [selectedYear, refetch]);

  useEffect(() => {
    if (
      (timePeriod === 'all' &&
        dateRange[0] !== null &&
        dateRange[1] !== null) ||
      (timePeriod === 'yearly' && selectedYear !== null)
    ) {
      void refetch();
    }
  }, [timePeriod, dateRange, selectedYear, refetch]);

  const handleTabChange = (
    _: React.SyntheticEvent,
    newValue: 'all' | 'yearly'
  ): void => {
    setTimePeriod(newValue);
  };

  const handleExportChronology = (): void => {
    const { startDate, endDate } = getExportDates();
    if (!startDate || !endDate) {
      setShowAlert({
        showAlert: true,
        type: 'error',
        message: 'Please select a date range',
      });
      scheduleAlertHide();
      return;
    }
    setIsExportLoading(true);
    void getChronologySummaryReport({
      chronologyId: chronologyID,
      category: CHRONOLOGY_CATEGORY.BILLING,
      startDate,
      endDate,
    })
      .then(() => {
        setShowAlert({
          showAlert: true,
          type: 'success',
          message: 'Chronology Summary Report has been sent to your email successfully',
        });
        scheduleAlertHide();
      })
      .catch(() => {
        setShowAlert({
          showAlert: true,
          type: 'error',
          message: 'Something went wrong!',
        });
        scheduleAlertHide();
      })
      .finally(() => {
        setIsExportLoading(false);
      });
  };

  const chartOptions: ApexOptions = {
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
        formatter: (value: number) => `${value}`,
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
      categories:
        data?.map((item) =>
          timePeriod === 'all'
            ? new Date(item.x).toLocaleDateString()
            : new Date(`${item.x}-01-01`).toLocaleDateString('en-US', {
                year: 'numeric',
              })
        ) || [],
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
      max: data?.reduce((max, item) => Math.max(max, item.y), 0) || 0,
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
  };

  const chartSeries = [
    {
      name: '',
      data: data?.map((item) => item.y) || [],
    },
  ];

  return (
    <Card
      sx={{
        minHeight: '500px',
      }}
    >
      <CardContent>
        <ToastAlert
          placement="right"
          severity={showAlert.type}
          showAlert={showAlert.showAlert}
          onClose={() =>
            setShowAlert((previous) => ({ ...previous, showAlert: false }))
          }
          message={showAlert.message}
          icon={
            showAlert.type === 'success' ? (
              <CheckIcon weight="bold" />
            ) : (
              <XCircleIcon weight="bold" />
            )
          }
        />
        <Box
          sx={{
            gap: 1,
            display: 'flex',
            flexWrap: 'nowrap',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <Box
            sx={{
              gap: 1,
              display: 'flex',
              alignItems: 'center',
              flexShrink: 0,
            }}
          >
            <Avatar
              variant="rounded"
              sx={{
                width: 40,
                height: 40,
                bgcolor: '#F9F7F7',
                '& svg': {
                  color: '#8C7676',
                },
              }}
            >
              <Box
                component="svg"
                width="40"
                height="40"
                viewBox="0 0 40 40"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <Box
                  component="rect"
                  width="40"
                  height="40"
                  rx="6"
                  fill="#F9F7F7"
                />
                <Box
                  component="path"
                  opacity="0.2"
                  d="M29 20C29 21.78 28.4722 23.5201 27.4832 25.0001C26.4943 26.4802 25.0887 27.6337 23.4442 28.3149C21.7996 28.9961 19.99 29.1743 18.2442 28.8271C16.4984 28.4798 14.8947 27.6226 13.636 26.364C12.3774 25.1053 11.5202 23.5016 11.1729 21.7558C10.8257 20.01 11.0039 18.2004 11.6851 16.5558C12.3663 14.9113 13.5198 13.5057 14.9999 12.5168C16.4799 11.5278 18.22 11 20 11C22.387 11 24.6761 11.9482 26.364 13.636C28.0518 15.3239 29 17.6131 29 20Z"
                  fill="#8C7676"
                />
                <Box
                  component="path"
                  d="M20 10.25C18.0716 10.25 16.1866 10.8218 14.5832 11.8932C12.9798 12.9645 11.7301 14.4873 10.9922 16.2688C10.2542 18.0504 10.0611 20.0108 10.4373 21.9021C10.8136 23.7934 11.7422 25.5307 13.1057 26.8943C14.4693 28.2579 16.2066 29.1865 18.0979 29.5627C19.9892 29.9389 21.9496 29.7458 23.7312 29.0078C25.5127 28.2699 27.0355 27.0202 28.1068 25.4168C29.1782 23.8134 29.75 21.9284 29.75 20C29.7473 17.415 28.7192 14.9366 26.8913 13.1087C25.0634 11.2808 22.585 10.2527 20 10.25ZM20 28.25C18.3683 28.25 16.7733 27.7661 15.4165 26.8596C14.0598 25.9531 13.0024 24.6646 12.378 23.1571C11.7536 21.6496 11.5902 19.9908 11.9085 18.3905C12.2269 16.7902 13.0126 15.3202 14.1664 14.1664C15.3202 13.0126 16.7902 12.2268 18.3905 11.9085C19.9909 11.5902 21.6497 11.7536 23.1571 12.378C24.6646 13.0024 25.9531 14.0598 26.8596 15.4165C27.7661 16.7733 28.25 18.3683 28.25 20C28.2475 22.1873 27.3775 24.2843 25.8309 25.8309C24.2843 27.3775 22.1873 28.2475 20 28.25ZM23.75 21.875C23.75 22.5712 23.4734 23.2389 22.9812 23.7312C22.4889 24.2234 21.8212 24.5 21.125 24.5H20.75V25.25C20.75 25.4489 20.671 25.6397 20.5303 25.7803C20.3897 25.921 20.1989 26 20 26C19.8011 26 19.6103 25.921 19.4697 25.7803C19.329 25.6397 19.25 25.4489 19.25 25.25V24.5H17.75C17.5511 24.5 17.3603 24.421 17.2197 24.2803C17.079 24.1397 17 23.9489 17 23.75C17 23.5511 17.079 23.3603 17.2197 23.2197C17.3603 23.079 17.5511 23 17.75 23H21.125C21.4234 23 21.7095 22.8815 21.9205 22.6705C22.1315 22.4595 22.25 22.1734 22.25 21.875C22.25 21.5766 22.1315 21.2905 21.9205 21.0795C21.7095 20.8685 21.4234 20.75 21.125 20.75H18.875C18.1788 20.75 17.5111 20.4734 17.0188 19.9812C16.5266 19.4889 16.25 18.8212 16.25 18.125C16.25 17.4288 16.5266 16.7611 17.0188 16.2688C17.5111 15.7766 18.1788 15.5 18.875 15.5H19.25V14.75C19.25 14.5511 19.329 14.3603 19.4697 14.2197C19.6103 14.079 19.8011 14 20 14C20.1989 14 20.3897 14.079 20.5303 14.2197C20.671 14.3603 20.75 14.5511 20.75 14.75V15.5H22.25C22.4489 15.5 22.6397 15.579 22.7803 15.7197C22.921 15.8603 23 16.0511 23 16.25C23 16.4489 22.921 16.6397 22.7803 16.7803C22.6397 16.921 22.4489 17 22.25 17H18.875C18.5766 17 18.2905 17.1185 18.0795 17.3295C17.8685 17.5405 17.75 17.8266 17.75 18.125C17.75 18.4234 17.8685 18.7095 18.0795 18.9205C18.2905 19.1315 18.5766 19.25 18.875 19.25H21.125C21.8212 19.25 22.4889 19.5266 22.9812 20.0188C23.4734 20.5111 23.75 21.1788 23.75 21.875Z"
                  fill="#8C7676"
                />
              </Box>
            </Avatar>
            <Typography fontWeight={600}>Event Timeline</Typography>
            <Tooltip title="Monitor billing history for each events & gain insights into cost patterns over time.">
              <InfoIcon size={20} />
            </Tooltip>
          </Box>
          <Box
            sx={{
              display: 'flex',
              flexWrap: 'nowrap',
              alignItems: 'center',
              gap: 2,
              flexShrink: 0,
              minWidth: 0,
              '& .react-datepicker__calendar-icon': {
                top: 1,
                height: 20,
                width: 20,
              },
              '& input': {
                minWidth: '220px !important',
              },
            }}
          >
            {timePeriod === 'yearly' ? (
              <Box
                sx={{
                  width: '100%',
                  position: 'relative',
                  ...datepickerStyles,
                  '& .react-datepicker': {
                    minWidth: '220px !important',
                  },
                }}
              >
                <DatePicker
                  minDate={new Date(new Date().getFullYear() - 100, 0, 1)}
                  maxDate={new Date()}
                  showIcon
                  icon={<CaretDownIcon size={24} />}
                  onChange={(date) => {
                    setSelectedYear(date);

                    setTimeout(() => {
                      void refetch();
                    }, 0);
                  }}
                  placeholderText="Select Year"
                  selected={selectedYear}
                  showYearPicker
                  dateFormat="yyyy"
                  showYearDropdown
                  scrollableYearDropdown
                  yearDropdownItemNumber={100}
                />
              </Box>
            ) : (
              <Box
                sx={{
                  width: '100%',
                  position: 'relative',
                  ...datepickerStyles,
                }}
              >
                <DatePicker
                  selectsRange
                  showIcon
                  icon={<CaretDownIcon size={24} />}
                  startDate={dateRange[0] instanceof Date ? dateRange[0] : null}
                  endDate={dateRange[1] instanceof Date ? dateRange[1] : null}
                  onChange={(dates) => {
                    if (Array.isArray(dates)) {
                      setDateRange(dates);

                      if (dates[0] && dates[1]) {
                        setTimeout(() => {
                          void refetch();
                        }, 0);
                      }
                    }
                  }}
                  minDate={new Date(new Date().getFullYear() - 100, 0, 1)}
                  maxDate={new Date()}
                  showYearDropdown
                  scrollableYearDropdown
                  yearDropdownItemNumber={100}
                  showMonthDropdown
                  monthsShown={1}
                  dateFormat="MM/dd/yyyy"
                  placeholderText="Select date range"
                />
              </Box>
            )}
            <Tabs
              value={timePeriod}
              onChange={handleTabChange}
              aria-label="time period tabs"
              sx={{
                overflow: 'visible',
              }}
            >
              <Tab
                label="All"
                value="all"
                sx={{
                  minWidth: 'auto',
                  px: 2,
                  fontWeight: timePeriod === 'all' ? 600 : 400,
                }}
              />
              <Tab
                label="Yearly"
                value="yearly"
                sx={{
                  minWidth: 'auto',
                  px: 2,
                  fontWeight: timePeriod === 'yearly' ? 600 : 400,
                }}
              />
            </Tabs>
            <Button
              variant="contained"
              color="primary"
              size="medium"
              startIcon={<ExportIcon size={20} />}
              onClick={handleExportChronology}
              disabled={isExportLoading}
              sx={{ flexShrink: 0 }}
            >
              {isExportLoading ? 'Loading...' : 'Export Chronology'}
            </Button>
          </Box>
        </Box>
        {isLoading || isRefetching ? (
          <AppCustomLoader height={100} />
        ) : isError || isRefetchError ? (
          <Typography fontWeight={600} color="error" mt={2}>
            {error.message}
          </Typography>
        ) : !data || data?.length === 0 ? (
          <Typography fontWeight={600} color="error" mt={2}>
            No data available for chart, please check the date range.
          </Typography>
        ) : (
          <Box
            sx={{
              mt: 2,
              '& .apexcharts-bar-area': {
                '&:hover': {
                  fill: (): string => `#6894A8 !important`,
                },
              },
            }}
          >
            <ReactApexChart
              options={chartOptions}
              type="bar"
              height={250}
              width="100%"
              series={chartSeries}
            />
          </Box>
        )}

        <Box mt={2}>
          <BillingTimeline chronologyID={chronologyID} />
        </Box>
      </CardContent>
    </Card>
  );
};

export default BillingTimelineChart;
