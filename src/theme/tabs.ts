import type { Theme } from '@mui/material';

export const tabsOverride = {
  MuiTabs: {
    styleOverrides: {
      root: ({ theme }: { theme: Theme }): Record<string, unknown> => ({
        padding: 5,
        borderRadius: 8,
        minHeight: 'auto',
        backgroundColor: theme.palette.background.default,
        '& .MuiTabs-scroller': {
          overflow: 'visible !important',
        },
        '&.Tabs--settings': {
          backgroundColor: theme.palette.common.white,
          paddingTop: 12,
        },
      }),
      indicator: {
        display: 'none',
        '&.Tabs--settings-indicator': {
          display: 'flex',
        },
      },
    },
  },
  MuiTab: {
    styleOverrides: {
      root: ({ theme }: { theme: Theme }): Record<string, unknown> => ({
        minHeight: 0,
        padding: '6px 16px',
        borderRadius: 6,
        fontSize: 14,
        fontWeight: 600,
        textTransform: 'none',
        color: theme.palette.neutral[400],
        transition: 'all 0.2s ease-in-out',
        '&.Mui-selected': {
          color: '#1E293B',
          backgroundColor: theme.palette.common.white,
          boxShadow: theme.shadows[1],
        },

        '&.Tab--settings': {
          color: theme.palette.neutral[500],

          '&.Mui-selected': {
            color: theme.palette.info.dark,
            backgroundColor: theme.palette.common.white,
            boxShadow: 'none',
          },

          '&.Mui-disabled': {
            color: theme.palette.text.disabled,
          },
        },
      }),
    },
  },
};
