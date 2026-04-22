import type { Theme } from '@mui/material/styles';
import type { CSSProperties } from '@mui/material/styles/createMixins';

export const label = {
  MuiInputLabel: {
    styleOverrides: {
      root: ({ theme }: { theme: Theme }): CSSProperties => ({
        fontSize: 14,
        fontWeight: 500,
        lineHeight: '20px',
        marginBottom: '4px',
        color: theme.palette.neutral[700],
      }),
    },
  },
};

export const input = {
  MuiInputBase: {
    styleOverrides: {
      root: ({ theme }: { theme: Theme }): CSSProperties => ({
        borderRadius: '6px !important',

        '& .MuiInputBase-input': {
          height: 13,
          fontSize: 14,
          paddingTop: '12.5px',
          paddingBottom: '12.5px',
          color: theme.palette.text.primary,
          '&::placeholder': {
            color: theme.palette.neutral[400],
          },
          '& fieldset': {
            borderColor: theme.palette.neutral[300],
          },
        },
        '& textarea.MuiInputBase-input': {
          paddingLeft: 12,
          paddingRight: 12,
        },
        '&.MuiInputBase-multiline': {
          padding: 0,
        },

        // States
        '&:hover': {
          '& fieldset': {
            borderColor: `${theme.palette.neutral[300]} !important`,
          },
        },
        '&.Mui-focused': {
          '& fieldset': {
            borderColor: `${theme.palette.info.dark} !important`,
          },
        },
        '&.Mui-disabled': {
          backgroundColor: theme.palette.neutral[100],
          '& .MuiInputBase-input': {
            color: theme.palette.neutral[400],
            WebkitTextFillColor: theme.palette.neutral[400],
          },
          '& fieldset': {
            borderColor: `${theme.palette.neutral[300]} !important`,
          },
          '& .MuiInputAdornment-root svg': {
            fill: `${theme.palette.neutral[300]}`,
          },
        },
        '& ~ .MuiFormHelperText-root': {
          marginTop: 4,
          marginLeft: 0,
          fontWeight: 500,
          color: theme.palette.text.secondary,
        },
        '&.Mui-error': {
          '& fieldset': {
            borderColor: `${theme.palette.error.dark} !important`,
          },
          '& ~ .MuiFormHelperText-root': {
            color: theme.palette.error.dark,
          },
        },

        // Sizes
        '&.MuiInputBase-sizeSmall': {
          '& .MuiInputBase-input': {
            height: 11,
            fontSize: 12,
            paddingTop: '12.5px ',
            paddingBottom: '12.5px ',
          },
        },
        '&.MuiInputBase-sizeLarge': {
          '& .MuiInputBase-input': {
            fontSize: 16,
            paddingTop: '17.5px ',
            paddingBottom: '17.5px ',
          },
        },

        // Adornments
        '&.MuiInputBase-adornedStart': {
          paddingLeft: 12,
          '& .MuiInputAdornment-positionStart': {
            marginRight: 10,
          },
        },
        '&.MuiInputBase-adornedend': {
          paddingRight: 12,
          '& .MuiInputAdornment-positionEnd': {
            marginLeft: 10,
          },
        },

        // Select with chips
        '&.MuiSelect-root': {
          '& .MuiChip-root': {
            height: 26,
            fontSize: 14,
            fontWeight: 500,
            borderRadius: '6px',
            backgroundColor: theme.palette.neutral[100],
            border: `1px solid ${theme.palette.neutral[200]}`,
            '& .MuiChip-deleteIcon': {
              color: theme.palette.text.primary,
            },
          },
          '&.MuiSelect-root': {
            '& .MuiSelect-select': {
              paddingTop: '9px',
              paddingBottom: '9px',
            },
            '&.MuiInputBase-sizeLarge': {
              '& .MuiSelect-select': {
                paddingTop: '10.5px',
                paddingBottom: '10.5px',
              },
              '& .MuiChip-root': {
                height: 28,
              },
            },
            '&.MuiInputBase-sizeSmall': {
              '& .MuiSelect-select': {
                paddingTop: '9.5px',
                paddingBottom: '9.5px',
              },
              '& .MuiChip-root': {
                height: 24,
              },
            },
          },
        },
      }),
    },
  },
};
