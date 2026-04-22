import { CaretDownIcon } from '@phosphor-icons/react';
import type { Theme } from '@mui/material';

type SelectType = { theme: Theme };

export const select = {
  MuiSelect: {
    defaultProps: {
      IconComponent: CaretDownIcon,
    },
    styleOverrides: {
      root({ theme }: SelectType): Record<string, unknown> {
        return {
          '& .MuiSelect-icon': {
            right: 12,
            color: theme.palette.neutral[500],
          },
          '& .MuiSelect-select': {
            paddingTop: '7px !important',
            paddingBottom: '7px !important',
          },
        };
      },
    },
  },
};
