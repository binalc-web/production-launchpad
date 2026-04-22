import type { CSSObject } from '@emotion/react';

declare module '@mui/material/styles' {
  interface Palette {
    neutral: {
      50: string;
      100: string;
      200: string;
      300: string;
      400: string;
      500: string;
      600: string;
      700: string;
      800: string;
      900: string;
      950: string;
    };
    tertiary: {
      50: string;
      100: string;
      200: string;
      300: string;
      400: string;
      500: string;
      600: string;
      700: string;
      800: string;
      900: string;
      950: string;
      1000: string;
    };
  }

  interface PaletteOptions {
    neutral?: {
      50?: string;
      100?: string;
      200?: string;
      300?: string;
      400?: string;
      500?: string;
      600?: string;
      700?: string;
      800?: string;
      900?: string;
      950?: string;
    };
    tertiary?: {
      50?: string;
      100?: string;
      200?: string;
      300?: string;
      400?: string;
      500?: string;
      600?: string;
      700?: string;
      800?: string;
      900?: string;
      950?: string;
      1000?: string;
    };
  }

  interface PaletteColor {
    focus?: string;
    lightest?: string;
    disabled?: string;
    disabledColor?: string;
  }

  interface SimplePaletteColorOptions {
    focus?: string;
    lightest?: string;
    disabled?: string;
    disabledColor?: string;
  }

  interface ComponentsOverrides {
    MuiButton: {
      variants: Array<{
        props: { variant: 'tertiary' | 'soft' };
        style: CSSObject;
      }>;
    };
    MuiIconButton: {
      variants: Array<{
        props: { variant: 'tertiary' | 'soft' };
        style: CSSObject;
      }>;
    };
  }
}

declare module '@mui/material/Button' {
  interface ButtonPropsVariantOverrides {
    tertiary: true;
    soft: true;
  }
}

declare module '@mui/material/TextField' {
  interface TextFieldPropsSizeOverrides {
    large: true;
  }
}

declare module '@mui/material/InputBase' {
  interface InputBasePropsSizeOverrides {
    large: true;
  }
}

declare module '@mui/material/Select' {
  interface SelectPropsSizeOverrides {
    large: true;
  }
}

declare module '@mui/material/IconButton' {
  interface IconButtonOwnProps {
    variant?: 'tertiary' | 'soft';
    type?: string;
  }
}

declare module '@mui/material/Typography' {
  interface TypographyPropsVariantOverrides {
    link: true;
  }
}
