export const tooltip = {
  MuiTooltip: {
    defaultProps: {
      arrow: true, // Enable arrow for tooltips
      placement: 'right', // Default placement of the tooltip
    },
    styleOverrides: {
      tooltip: {
        backgroundColor: '#1D272F', // Dark background for the tooltip
        color: '#fff', // White text color
        fontSize: 10, // Font size for the tooltip text
        padding: '8px 12px', // Padding around the tooltip text
      },
      arrow: {
        color: '#1D272F', // Color of the arrow to match the tooltip background
      },
    },
  },
};
