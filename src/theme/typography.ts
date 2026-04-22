import type { Theme } from '@mui/material/styles';
import type { CSSProperties } from '@mui/material/styles/createMixins';

export const typography = {
  htmlFontSize: 16,
  fontFamily: 'Inter, sans-serif',
  h1: {
    fontSize: 32,
    fontWeight: 600,
  },
  h2: {
    fontSize: 28,
    fontWeight: 600,
  },
  h3: {
    fontSize: 24,
    fontWeight: 600,
  },
  h4: {
    fontSize: 20,
    fontWeight: 600,
  },
  h5: {
    fontSize: 18,
    fontWeight: 600,
  },
  h6: {
    fontSize: 16,
    fontWeight: 600,
  },
  body1: {
    fontSize: 16,
    fontWeight: 400,
  },
  body2: {
    fontSize: 14,
    fontWeight: 400,
  },
  caption: {
    fontSize: 12,
    fontWeight: 400,
  },
};

export const typographyOverride = {
  MuiTypography: {
    variants: [
      {
        props: { variant: 'link' },
        style: ({ theme }: { theme: Theme }): CSSProperties => ({
          fontSize: 14,
          fontWeight: 600,
          cursor: 'pointer',
          lineHeight: '20px',
          textDecoration: 'underline',
          color: theme.palette.text.primary,
          '&[href]': {
            fontWeight: 400,
            textDecoration: 'none',
          },
        }),
      },
    ],
  },
};
