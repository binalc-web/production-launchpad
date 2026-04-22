import type { Theme } from '@mui/material';

/**
 * Creates styles for authentication component wrappers
 * @description Generates responsive styling for authentication containers with
 * customizable margin-top, text alignment, and maximum width
 * @param {number | null} mt - Margin top value
 * @param {string | null} textAlign - Text alignment value
 * @param {string | null} maxWidth - Maximum width on extra small screens
 * @returns {Record<string, unknown>} Style object for authentication wrappers
 */
export const authWrapperStyles = (
  mt: number | null,
  textAlign: string | null,
  maxWidth?: string | null
): Record<string, unknown> => ({
  maxWidth: { xs: maxWidth || '80%', lg: 400, xl: 400 },
  mx: { xs: 'auto', lg: 'unset' },
  ...(mt
    ? {
        mt,
      }
    : {}),
  ...(textAlign
    ? {
        textAlign,
      }
    : {}),
});

/**
 * Creates flex styles for authentication component wrappers
 * @description Sets up a centered flex container for authentication components
 * @returns {Record<string, unknown>} Style object with flex properties
 */
export const authWrapperFlexStyles = (): Record<string, unknown> => ({
  width: '100%',
  display: 'flex',
  alignItems: 'center',
  flexDirection: 'column',
});

/**
 * Creates styles for minimal chart tooltips
 * @description Configures the appearance of tooltips for minimal charts,
 * including positioning, color, and border styling
 * @returns {Record<string, unknown>} Style object for chart tooltips
 */
export const minimalChartTooltipValue = (
  transform?: string
): Record<string, unknown> => ({
  '& .apexcharts-tooltip': {
    py: 0.25,
    px: 1.25,
    color: '#fff',
    borderRadius: 0.75,
    transform: transform || 'translateX(-40px) translateY(-24px)',
    borderColor: (theme: Theme) => `${theme.palette.tertiary[1000]} !important`,
    backgroundColor: (theme: Theme) =>
      `${theme.palette.tertiary[1000]} !important`,
    '& .apexcharts-tooltip-title': {
      borderColor: (theme: Theme) =>
        `${theme.palette.tertiary[1000]} !important`,
      backgroundColor: (theme: Theme) =>
        `${theme.palette.tertiary[1000]} !important`,
    },
  },
});

/**
 * Generates HTML for a colored bullet point used in chart tooltips
 * @description Creates a small circular indicator to represent a data series in chart tooltips
 * @param {string} color - Color value for the bullet point
 * @returns {string} HTML string for the bullet indicator
 */
export const tooltipBullet = (color: string): string =>
  `<span style="width: 8px; height: 8px; border-radius: 50%; background: ${color}; display: inline-block; margin-right: 4px;"></span>`;

/**
 * Creates styles for dual chart tooltips
 * @description Configures the appearance of tooltips for charts with multiple data series,
 * including background, borders, text styling, and spacing
 * @returns {Record<string, unknown>} Style object for dual chart tooltips
 */
export const dualChartTooltipValue = (): Record<string, unknown> => ({
  '& .apexcharts-tooltip': {
    borderColor: (theme: Theme) => `${theme.palette.tertiary[1000]} !important`,
    backgroundColor: (theme: Theme) =>
      `${theme.palette.tertiary[1000]} !important`,
    color: 'white',
    fontSize: '14px',
    borderRadius: 0.75,
    padding: '12px',
  },
  '& .apexcharts-tooltip-title': {
    fontWeight: 600,
    mb: '4px',
  },
  '& .apexcharts-tooltip-series-group': {
    marginBottom: '2px',
  },
  '& .tooltip-group': {
    '& .tooltip-item': {
      mt: '6px',
      fontSize: '12px',
    },
  },
});
