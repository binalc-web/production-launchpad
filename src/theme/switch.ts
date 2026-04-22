import type { Theme } from '@mui/material';

export const switchOverride = {
  MuiSwitch: {
    styleOverrides: {
      root: ({ theme }: { theme: Theme }): Record<string, unknown> => ({
        width: 36,
        height: 20,
        padding: 0,
        display: 'flex',
        '&:active': {
          '& .MuiSwitch-thumb': {
            width: 15,
          },
        },
        '& .MuiSwitch-switchBase': {
          padding: 2,
          '&.Mui-checked': {
            transform: 'translateX(16px)',
            color: '#fff',
            '& + .MuiSwitch-track': {
              opacity: 1,
              backgroundColor: theme.palette.info.dark,
            },
          },
        },
        '& .MuiSwitch-thumb': {
          boxShadow: '0 2px 4px 0 rgb(0 35 11 / 20%)',
          width: 16,
          height: 16,
          borderRadius: 10,
          transition: theme.transitions.create(['width'], {
            duration: 200,
          }),
        },
        '& .MuiSwitch-track': {
          borderRadius: 10,
          opacity: 1,
          backgroundColor: theme.palette.neutral[200],
          boxSizing: 'border-box',
        },
      }),
    },
  },
};
