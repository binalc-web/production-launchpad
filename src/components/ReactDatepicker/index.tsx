import { type FC, useState, useEffect, type ReactNode } from 'react';

import { Box, Typography } from '@mui/material';

import Datepicker, { type DatePickerProps } from 'react-datepicker';
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  CalendarDotsIcon,
} from '@phosphor-icons/react';

import 'react-datepicker/dist/react-datepicker.css';
import { datepickerStyles } from './styles';

type ReactDatepickerProps = DatePickerProps;

const renderYearDropdown = (
  arrayLength: number,
  date: Date,
  changeYear: (year: number) => void,
  updateSelectedDate: (newDate: Date) => void
): ReactNode => {
  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)', // 4 per row
        gap: 1,
      }}
    >
      {Array.from({ length: arrayLength }, (_, index) => {
        const currentYear = new Date().getFullYear();
        const yearToDisplay = currentYear - index;

        return (
          <Box
            key={yearToDisplay}
            className={`react-datepicker__year-text-custom ${
              date.getFullYear() === yearToDisplay
                ? 'react-datepicker__year-text-custom--selected'
                : ''
            }`}
            onClick={(event) => {
              event.stopPropagation();
              changeYear(yearToDisplay);
              const newDate = new Date(
                yearToDisplay,
                date.getMonth(),
                date.getDate()
              );
              updateSelectedDate(newDate);
            }}
            sx={{
              cursor: 'pointer',
              textAlign: 'center',
              padding: 1,
            }}
          >
            {yearToDisplay}
          </Box>
        );
      })}
    </Box>
  );
};

const ReactDatepicker: FC<ReactDatepickerProps> = (props) => {
  const [showMonthPicker, setShowMonthPicker] = useState(false);
  const [showYearPicker, setShowYearPicker] = useState(false);
  const [dateSelected, setDateSelected] = useState(false);

  useEffect(() => {
    if (dateSelected) {
      setShowMonthPicker(false);
      setShowYearPicker(false);
      setDateSelected(false);
    }
  }, [dateSelected]);

  const handleCalendarClose = (): void => {
    setShowMonthPicker(false);
    setShowYearPicker(false);
  };

  const handleMonthChange = (date: Date): void => {
    setDateSelected(true);
    if (props.onMonthChange) {
      props.onMonthChange(date);
    }
  };

  const handleYearChange = (date: Date): void => {
    setDateSelected(true);
    if (props.onYearChange) {
      props.onYearChange(date);
    }
  };

  const updateSelectedDate = (newDate: Date): void => {
    if (props.onChange) {
      props.onChange(
        newDate as Date & [Date | null, Date | null] & Array<Date>
      );
    }
  };
  return (
    <Box sx={datepickerStyles}>
      <Datepicker
        showIcon
        icon={<CalendarDotsIcon size={24} />}
        showMonthYearPicker={showMonthPicker}
        showYearPicker={showYearPicker}
        onCalendarClose={handleCalendarClose}
        onMonthChange={handleMonthChange}
        onYearChange={handleYearChange}
        renderCustomHeader={({
          date,
          decreaseMonth,
          increaseMonth,
          changeYear,
          prevMonthButtonDisabled,
          nextMonthButtonDisabled,
        }) => {
          return (
            <Box>
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: '8px',
                }}
              >
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '24px',
                    height: '24px',
                    borderRadius: '50%',
                    cursor: prevMonthButtonDisabled ? 'not-allowed' : 'pointer',
                    opacity: prevMonthButtonDisabled ? 0.5 : 1,
                    '&:hover': {
                      backgroundColor: '#f5f5f5',
                    },
                  }}
                  onClick={() => {
                    decreaseMonth();
                    const newDate = new Date(date);
                    newDate.setMonth(date.getMonth() - 1);
                    updateSelectedDate(newDate);
                  }}
                >
                  <ArrowLeftIcon size={14} />
                </Box>

                <Box sx={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Typography
                    variant="h6"
                    sx={{
                      cursor: 'pointer',
                      '&:hover': { textDecoration: 'underline' },
                    }}
                    onClick={() => {
                      setShowMonthPicker(true);
                      setShowYearPicker(false);
                    }}
                  >
                    {date.toLocaleDateString('en-US', {
                      month: 'long',
                    })}
                  </Typography>

                  <Typography
                    variant="h6"
                    sx={{
                      cursor: 'pointer',
                      '&:hover': { textDecoration: 'underline' },
                    }}
                    onClick={() => {
                      setShowYearPicker(true);
                      setShowMonthPicker(false);
                    }}
                  >
                    {date.toLocaleDateString('en-US', {
                      year: 'numeric',
                    })}
                  </Typography>
                </Box>

                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '24px',
                    height: '24px',
                    borderRadius: '50%',
                    cursor: nextMonthButtonDisabled ? 'not-allowed' : 'pointer',
                    opacity: nextMonthButtonDisabled ? 0.5 : 1,
                    '&:hover': {
                      backgroundColor: '#f5f5f5',
                    },
                  }}
                  onClick={() => {
                    increaseMonth();
                    const newDate = new Date(date);
                    newDate.setMonth(date.getMonth() + 1);
                    updateSelectedDate(newDate);
                  }}
                >
                  <ArrowRightIcon size={14} />
                </Box>
              </Box>
              <Box
                className="react-datepicker__year"
                sx={{
                  maxHeight: '200px',
                  overflowY: 'scroll',
                }}
              >
                {showYearPicker
                  ? props.yearDropdownItemNumber
                    ? renderYearDropdown(
                        props.yearDropdownItemNumber,
                        date,
                        changeYear,
                        updateSelectedDate
                      )
                    : renderYearDropdown(
                        50,
                        date,
                        changeYear,
                        updateSelectedDate
                      )
                  : null}
              </Box>
            </Box>
          );
        }}
        showPopperArrow={false}
        {...props}
      />
    </Box>
  );
};

export default ReactDatepicker;
