export const formControlLabel = {
  MuiFormControlLabel: {
    styleOverrides: {
      root: (): Record<string, unknown> => ({
        marginLeft: 0,
        '& .MuiFormControlLabel-label': {
          fontSize: 14,
          marginLeft: 4,
        },
      }),
    },
  },
};
