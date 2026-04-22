import type { Theme } from '@mui/material/styles';
import type { CSSProperties } from '@mui/material/styles/createMixins';

export const button = {
  MuiButton: {
    defaultProps: {
      disableRipple: true,
    },
    styleOverrides: {
      root: (): CSSProperties => ({
        paddingTop: '5px',
        paddingBottom: '5px',
        boxShadow: 'none !important',
        textTransform: 'capitalize',
        '&:focus': {
          outline: 0,
        },
      }),
      sizeMedium: {
        borderRadius: '6px',
      },
      sizeLarge: {
        paddingTop: '11px',
        paddingBottom: '11px',
      },
      sizeSmall: {
        borderRadius: '6px',
      },
      containedPrimary: ({ theme }: { theme: Theme }): CSSProperties => ({
        '&:focus': {
          background: theme.palette.primary.focus,
        },
        '&.Mui-disabled': {
          background: theme.palette.primary.disabled,
          color: theme.palette.primary.disabledColor,
        },
      }),
      containedSecondary: ({ theme }: { theme: Theme }): CSSProperties => ({
        '&:focus': {
          background: theme.palette.secondary.focus,
        },
        '&.Mui-disabled': {
          background: theme.palette.secondary.disabled,
          color: theme.palette.secondary.disabledColor,
        },
      }),
    },
    variants: [
      {
        props: { variant: 'tertiary' },
        style: ({ theme }: { theme: Theme }): CSSProperties => ({
          minWidth: 64,
          fontSize: 14,
          fontWeight: 500,
          lineHeight: 1.75,
          borderRadius: '6px',
          padding: '4px 10px',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: theme.palette.text.primary,
          border: `1px solid ${theme.palette.neutral[300]}`,
          '&:hover': {
            borderColor: theme.palette.neutral[50],
            background: theme.palette.neutral[50],
          },
          '&:focus': {
            background: theme.palette.neutral[50],
          },
          '&.Mui-disabled': {
            color: theme.palette.neutral[300],
            borderColor: theme.palette.neutral[300],
          },
        }),
      },
      {
        props: { variant: 'soft' },
        style: ({ theme }: { theme: Theme }): CSSProperties => ({
          minWidth: 64,
          fontSize: 14,
          fontWeight: 500,
          lineHeight: 1.75,
          borderRadius: '6px',
          padding: '4px 10px',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderColor: theme.palette.neutral[50],
          background: theme.palette.neutral[50],
          '&:hover': {
            color: theme.palette.text.primary,
            border: `1px solid ${theme.palette.neutral[300]}`,
          },
          '&:focus': {
            borderColor: theme.palette.neutral[50],
            background: theme.palette.neutral[50],
          },
          '&.Mui-disabled': {
            color: theme.palette.neutral[300],
            borderColor: 'none',
          },
        }),
      },
    ],
  },
};
