export const checkbox = {
  MuiCheckbox: {
    defaultProps: {
      color: 'primary', // Can be 'primary', 'secondary', etc.
    },
    styleOverrides: {
      root: {
        padding: 8,
        color: '#666', // Unchecked color
        '&.MuiCheckbox-indeterminate': {
          color: '#3957D7', // color when indeterminate
        },
        '&:hover': {
          backgroundColor: 'rgba(25, 118, 210, 0.08)', // Light hover background
        },
        '&.Mui-checked': {
          color: '#3957D7', // Checked color
        },
        '&.Mui-disabled': {
          color: '#ccc', // Disabled color
        },
      },
    },
  },
};
