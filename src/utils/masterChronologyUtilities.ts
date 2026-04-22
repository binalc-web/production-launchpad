/**
 * 
 * @param value - The value to format
 * @returns - The formatted currency string
 */
export const formatCurrency = (value: number): string => {
  const safeNumber = Number.isFinite(Number(value)) ? Number(value) : 0;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(safeNumber);
};

