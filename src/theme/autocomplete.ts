import type { Theme } from '@mui/material';

export const autocomplete = {
  MuiAutocomplete: {
    styleOverrides: {
      root: ({ theme }: { theme: Theme }): Record<string, unknown> => ({
        '& .MuiAutocomplete-endAdornment': {
          right: 12,
        },
        '& .MuiButtonBase-root': {
          backgroundColor: 'transparent !important',
          '& svg': {
            fill: theme.palette.neutral[300],
          },
        },
      }),
    },
  },
};
