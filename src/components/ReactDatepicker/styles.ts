export const datepickerStyles = {
  '& .react-datepicker-wrapper, & input': {
    width: '100%',
  },
  '& input': {
    py: '10px !important',
    px: '12px !important',
    borderRadius: 0.75,
    border: '1px solid',
    borderColor: 'neutral.300',
    fontFamily: 'Inter,sans-serif',
    '&:focus': {
      outline: 'none',
      borderWidth: 2,
      borderColor: 'info.dark',
    },
    '&.error': {
      borderColor: 'error.dark',
    },
    '&:disabled': {
      color: 'neutral.400',
      backgroundColor: 'neutral.100',
    },
    '&::placeholder': {
      color: 'neutral.400',
    },
  },
  '& .react-datepicker__calendar-icon': {
    height: 24,
    width: 24,
    right: 0,
  },
  '& .react-datepicker': {
    border: '1px solid',
    borderColor: 'neutral.200',
    borderRadius: '8px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
    overflow: 'hidden',
    '& .react-datepicker__triangle': {
      display: 'none',
    },
    '& .react-datepicker__header': {
      backgroundColor: 'white',
      border: 0,
      padding: '12px 12px 8px',
    },
    '& .react-datepicker__month': {
      margin: 0,
      padding: '0 12px 12px',
    },
    '& .react-datepicker__day-names': {
      marginBottom: 0,
      paddingTop: 2,
      borderTop: '1px solid',
      borderColor: 'neutral.200',
    },
    '& .react-datepicker__day-name': {
      margin: '4px',
      width: '32px',
      height: '32px',
      alignItems: 'center',
      justifyContent: 'center',
      color: 'text.secondary',
      fontSize: 14,
    },
    '& .react-datepicker__year .react-datepicker__year-text': {
      display: 'none',
    },
    '& .react-datepicker__day, & .react-datepicker__month-text, & .react-datepicker__year-text-custom':
      {
        margin: '0',
        width: '40px',
        height: '40px',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: '6px',
        color: 'text.primary',
        fontSize: 14,
        fontWeight: 400,
        lineHeight: 1,
        bgcolor: 'common.white',
        '&:hover': {
          backgroundColor: 'info.light',
          borderRadius: '6px',
          color: 'white',
          cursor: 'pointer',
        },
      },
    '& .react-datepicker__month-text, & .react-datepicker__year-text-custom': {
      width: 64,
    },
    '& .react-datepicker__year-wrapper': {
      justifyContent: 'center',
      mx: 'auto',
      overflowY: 'auto',
    },
    '& .react-datepicker__day--selected, & .react-datepicker__month-text--selected,  & .react-datepicker__year-text-custom--selected, & .react-datepicker__day--in-range':
      {
        backgroundColor: 'info.main',
        color: 'white',
        borderRadius: '6px',
        '&:hover': {
          backgroundColor: 'info.main',
        },
      },

    '& .react-datepicker__day--in-range': {
      borderRadius: '0 !important',
      '&.react-datepicker__day--range-start': {
        borderTopLeftRadius: '6px !important',
        borderBottomLeftRadius: '6px !important',
      },
      '&.react-datepicker__day--range-end': {
        borderTopRightRadius: '6px !important',
        borderBottomRightRadius: '6px !important',
      },
    },
    '& .react-datepicker__day--keyboard-selected, & .react-datepicker__month-text--keyboard-selected, & .react-datepicker__year-text-custom--keyboard-selected':
      {
        backgroundColor: 'info.main',
        color: 'common.white',
      },
    '& .react-datepicker__day--outside-month': {
      color: 'neutral.400',
    },
    '& .react-datepicker__day--disabled': {
      color: 'neutral.400',
      '&:hover': {
        color: 'neutral.400',
        backgroundColor: 'transparent',
      },
    },
  },
};
