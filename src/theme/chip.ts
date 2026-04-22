import type { Theme } from '@mui/material';

type ChipType = { theme: Theme; ownerState: { color: string } };

export const chipOverride = {
  MuiChip: {
    styleOverrides: {
      root: ({
        theme,
        ownerState: { color: parentColor },
      }: ChipType): Record<string, unknown> => {
        return {
          height: 28,
          borderRadius: '6px',
          '& .MuiChip-label': {
            fontSize: 14,
            fontWeight: 500,
            padding: '3px 6px',
            color: theme.palette[parentColor as keyof typeof theme.palette],
          },
        };
      },
    },
  },
};
