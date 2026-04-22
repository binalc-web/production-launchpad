import { useState, type FC, type ReactNode } from 'react';
import { Box, Card, Typography, Link } from '@mui/material';
import ReactDatepicker from '@/components/ReactDatepicker';
import { colors } from './data';
import moment from 'moment';
import { getCalendarEvents } from '@/api/chronologies/calendarEvents';
import { useQuery } from '@tanstack/react-query';
import { useParams } from '@tanstack/react-router';
import AppCustomLoader from '@/components/AppCustomLoader';

export const highlightLengendItem = (title: string, bgcolor: string): void => {
  return (
    <Box
      sx={{
        gap: 0.5,
        display: 'flex',
        alignItems: 'center',
      }}
    >
      <Box
        sx={{
          bgcolor,
          width: 8,
          height: 8,
          borderRadius: '50%',
        }}
      ></Box>
      <Typography fontSize={10}>{title}</Typography>
    </Box>
  );
};

const Calendar: FC = () => {
  const [expandedSummaries, setExpandedSummaries] = useState<Array<string>>([]);
  const [date, setDate] = useState<Date>(new Date());

  const { id } = useParams({
    from: '/_app/medical-chronology/timeline/$id',
  });

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['calendarEvents', date],
    queryFn: () =>
      getCalendarEvents({
        id,
        month: date.getMonth() + 1,
        year: date.getFullYear(),
      }),
  });

  const highlightWithRanges = data?.map((info) => {
    return new Date(info.date);
  });

  const toggleSummaryExpansion = (id: string): void => {
    setExpandedSummaries((previous) =>
      previous.includes(id)
        ? previous.filter((summaryId) => summaryId !== id)
        : [...previous, id]
    );
  };

  const renderSummary = (summary: string, id: string): ReactNode => {
    if (!summary) return '';

    if (summary.length <= 100 || expandedSummaries.includes(id)) {
      return summary;
    }

    return (
      <>
        {summary.substring(0, 100)}
        <Link
          component="span"
          onClick={(event) => {
            event.stopPropagation();
            toggleSummaryExpansion(id);
          }}
          sx={{
            ml: 0.5,
            fontSize: 12,
            cursor: 'pointer',
            fontWeight: 'bold',
            color: 'info.dark',
          }}
        >
          Read More
        </Link>
      </>
    );
  };

  return (
    <Card
      sx={{
        overflow: 'hidden',
        '& .react-datepicker': {
          width: '100%',
          border: 'none !important',
          boxShadow: 'none !important',
          '& .react-datepicker__month-container': {
            width: '100%',
          },
          '& .react-datepicker__day': {
            height: '34px !important',
            width: {
              xs: '14.5% !important',
              lg: '14.5% !important',
              xl: '13.5% !important',
            },
          },
          '& .react-datepicker__day-name': {
            ml: 0.25,
            width: {
              xs: '13.75% !important',
              lg: '12% !important',
              xl: '12% !important',
            },
          },
          '& .patient-visits-hospital-care': {
            bgcolor: 'info.dark',
            color: 'common.white',
          },
          '& .diagnostic-imaging-services': {
            bgcolor: 'success.dark',
            color: 'common.white',
          },
          '& .surgical-procedural-interventions': {
            bgcolor: 'warning.dark',
            color: 'common.white',
          },
        },
      }}
    >
      <ReactDatepicker
        inline
        selected={date}
        highlightDates={highlightWithRanges}
        onChange={(date) => setDate(date as Date)}
        showYearDropdown
        scrollableYearDropdown
        maxDate={new Date()}
        yearDropdownItemNumber={100}
      />
      <Box
        sx={{
          p: 2,
          pt: 0,
          gap: 1,
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
        }}
      ></Box>
      {data && data?.length ? (
        <Box
          sx={{
            mb: 1,
            ml: 1,
            gap: 0.25,
            display: 'flex',
            alignItems: 'center',
          }}
        >
          <Box
            component="svg"
            width="16px"
            height="16px"
            viewBox="0 0 20 20"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <Box
              component="path"
              d="M15.625 11.125C15.6264 11.3543 15.5567 11.5785 15.4255 11.7666C15.2943 11.9547 15.1081 12.0976 14.8923 12.1755L11.2656 13.5156L9.92968 17.1452C9.85057 17.3601 9.70743 17.5456 9.51959 17.6766C9.33174 17.8076 9.10823 17.8779 8.87921 17.8779C8.65019 17.8779 8.42667 17.8076 8.23883 17.6766C8.05099 17.5456 7.90785 17.3601 7.82874 17.1452L6.48437 13.5156L2.85483 12.1797C2.63991 12.1006 2.45442 11.9574 2.3234 11.7696C2.19238 11.5818 2.12213 11.3582 2.12213 11.1292C2.12213 10.9002 2.19238 10.6767 2.3234 10.4888C2.45442 10.301 2.63991 10.1579 2.85483 10.0787L6.48437 8.73437L7.8203 5.10484C7.89942 4.88992 8.04255 4.70443 8.23039 4.57341C8.41824 4.44239 8.64175 4.37214 8.87077 4.37214C9.0998 4.37214 9.32331 4.44239 9.51115 4.57341C9.69899 4.70443 9.84213 4.88992 9.92124 5.10484L11.2656 8.73437L14.8951 10.0703C15.111 10.1489 15.2972 10.2926 15.4279 10.4815C15.5586 10.6704 15.6275 10.8953 15.625 11.125ZM11.6875 4.375H12.8125V5.5C12.8125 5.64918 12.8718 5.79226 12.9772 5.89775C13.0827 6.00324 13.2258 6.0625 13.375 6.0625C13.5242 6.0625 13.6672 6.00324 13.7727 5.89775C13.8782 5.79226 13.9375 5.64918 13.9375 5.5V4.375H15.0625C15.2117 4.375 15.3547 4.31574 15.4602 4.21025C15.5657 4.10476 15.625 3.96168 15.625 3.8125C15.625 3.66332 15.5657 3.52024 15.4602 3.41475C15.3547 3.30926 15.2117 3.25 15.0625 3.25H13.9375V2.125C13.9375 1.97582 13.8782 1.83274 13.7727 1.72725C13.6672 1.62176 13.5242 1.5625 13.375 1.5625C13.2258 1.5625 13.0827 1.62176 12.9772 1.72725C12.8718 1.83274 12.8125 1.97582 12.8125 2.125V3.25H11.6875C11.5383 3.25 11.3952 3.30926 11.2897 3.41475C11.1843 3.52024 11.125 3.66332 11.125 3.8125C11.125 3.96168 11.1843 4.10476 11.2897 4.21025C11.3952 4.31574 11.5383 4.375 11.6875 4.375ZM17.875 6.625H17.3125V6.0625C17.3125 5.91332 17.2532 5.77024 17.1477 5.66475C17.0422 5.55926 16.8992 5.5 16.75 5.5C16.6008 5.5 16.4577 5.55926 16.3522 5.66475C16.2468 5.77024 16.1875 5.91332 16.1875 6.0625V6.625H15.625C15.4758 6.625 15.3327 6.68426 15.2272 6.78975C15.1218 6.89524 15.0625 7.03832 15.0625 7.1875C15.0625 7.33668 15.1218 7.47976 15.2272 7.58525C15.3327 7.69074 15.4758 7.75 15.625 7.75H16.1875V8.3125C16.1875 8.46168 16.2468 8.60476 16.3522 8.71025C16.4577 8.81574 16.6008 8.875 16.75 8.875C16.8992 8.875 17.0422 8.81574 17.1477 8.71025C17.2532 8.60476 17.3125 8.46168 17.3125 8.3125V7.75H17.875C18.0242 7.75 18.1672 7.69074 18.2727 7.58525C18.3782 7.47976 18.4375 7.33668 18.4375 7.1875C18.4375 7.03832 18.3782 6.89524 18.2727 6.78975C18.1672 6.68426 18.0242 6.625 17.875 6.625Z"
              fill="#8B95A5"
            />
          </Box>

          <Typography
            sx={{
              mt: 0.25,
              fontSize: 12,
              color: 'neutral.400',
            }}
          >
            AI-generated Summary
          </Typography>
        </Box>
      ) : null}

      <Box
        sx={{
          p: 2,
          pt: 0,
          maxHeight: 400,
          overflowY: 'scroll',
          '&::-webkit-scrollbar': {
            height: '4px',
            width: '4px',
          },
          '&::-webkit-scrollbar-thumb': {
            backgroundColor: 'rgba(0, 0, 0, 0.2)',
            borderRadius: '4px',
          },
          '&::-webkit-scrollbar-track': {
            backgroundColor: 'transparent',
          },
        }}
      >
        {isLoading ? (
          <AppCustomLoader height={100} />
        ) : isError ? (
          <Typography sx={{ textAlign: 'center', fontWeight: 600 }}>
            {error.message}
          </Typography>
        ) : data && data?.length ? (
          data?.map((info, index) => {
            const summaryId = `${info.date}_${index}`;
            return (
              <Box key={summaryId} mt={2}>
                <Typography fontSize={14} fontWeight={600}>
                  {moment(info.date).format('MM-DD-YYYY')}
                </Typography>
                <Box
                  sx={{
                    mt: 2,
                    p: 2,
                    borderRadius: 1,
                    bgcolor: colors['patient-visits-hospital-care'].bgcolor,
                  }}
                >
                  <Typography
                    color={colors['patient-visits-hospital-care'].color}
                  >
                    {info.title}
                  </Typography>
                  <Typography fontSize={14} sx={{ color: 'neutral.500' }}>
                    {renderSummary(info.translated_summary, summaryId)}
                  </Typography>
                </Box>
              </Box>
            );
          })
        ) : (
          <Typography sx={{ textAlign: 'center', fontWeight: 600 }}>
            No Data Found
          </Typography>
        )}
      </Box>
    </Card>
  );
};

export default Calendar;
