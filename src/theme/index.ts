// @ts-expect-error Importing type declarations for MUI
import '@types/mui.d.ts';

import { createTheme } from '@mui/material';
import type { Shadows as ShadowsType } from '@mui/material/styles';

import { palette } from './palette';
import { shadows } from './shadows';
import { chipOverride } from './chip';
import { cardOverride } from './card';

import { switchOverride } from './switch';
import { formControlLabel } from './formControlLabel';
import { typography, typographyOverride } from './typography';

// components
import { menu } from './menu';
import { select } from './select';
import { button } from './button';
import { tabsOverride } from './tabs';
import { label, input } from './input';
import { iconButton } from './iconButton';
import { autocomplete } from './autocomplete';
import { checkbox } from './check';
import { tooltip } from './tooltip';

const baseTheme = createTheme({
  palette: {
    mode: 'light',
    ...palette,
  },
  shadows: shadows as ShadowsType,
  spacing: 8,
  typography,
  shape: {
    borderRadius: 8,
  },
});

// Then add components using the typed approach
export const theme = createTheme(baseTheme, {
  components: {
    ...button,
    ...iconButton,
    ...label,
    ...input,
    ...typographyOverride,
    ...switchOverride,
    ...formControlLabel,
    ...select,
    ...chipOverride,
    ...cardOverride,
    ...tabsOverride,
    ...menu,
    ...autocomplete,
    ...checkbox,
    ...tooltip,
  },
});
