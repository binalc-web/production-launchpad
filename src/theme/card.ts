import type { Theme } from '@mui/material';

export const cardOverride = {
  MuiCard: {
    defaultProps: {
      elevation: 0,
    },
    styleOverrides: {
      root: ({ theme }: { theme: Theme }): Record<string, unknown> => ({
        borderRadius: 16,
        border: `1px solid ${theme.palette.neutral[100]}`,
        '& .MuiCardContent-root': {
          padding: theme.spacing(3),
        },
      }),
    },
  },
};
