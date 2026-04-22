import type { OptionType } from '../pages/CaseManagement/constants/options';

/**
 * Renders a placeholder or selected value in select components
 * @description When a value is selected, displays the corresponding label from options array.
 * When no value is selected, displays the provided placeholder text.
 * @param {string} value - The currently selected value
 * @param {Array<OptionType>} array - Array of options containing value/label pairs
 * @param {string} placeholder - Text to display when no value is selected
 * @returns {string} The label for the selected value or the placeholder text
 */
export const renderPlaceholder = (
  value: string,
  array: Array<OptionType>,
  placeholder: string
): string => {
  return value?.length
    ? (array.find((option) => option.value === value)?.label as string)
    : placeholder;
};

/**
 * Generates styles for select components based on whether a value is selected
 * @description Applies a different text color when no value is selected to visually
 * indicate the placeholder state. Returns an empty object when a value is selected.
 * @param {string} value - The currently selected value
 * @returns {Record<string, unknown>} Style object for the select component
 */
export const emptySelectStyle = (value: string): Record<string, unknown> => {
  return {
    ...(!value
      ? {
          '& .MuiSelect-select': {
            color: 'neutral.400',
          },
        }
      : {}),
  };
};
