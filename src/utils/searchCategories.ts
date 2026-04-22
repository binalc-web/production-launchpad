/**
 * Represents a search category option in the application
 * @interface SearchCategory
 * @property {string} key - Unique identifier used for API requests and internal logic
 * @property {string} value - Human-readable display label
 */

/**
 * Represents a search category option in the application
 * @interface SearchCategory
 * @property {string} key - Unique identifier used for API requests and internal logic
 * @property {string} value - Human-readable display label
 */
export type SearchCategory = {
  key: string;
  value: string;
};

/**
 * List of available search categories for filtering search results
 * @description Predefined search categories that users can select from when performing searches
 * @type {Array<SearchCategory>}
 */

export const searchCategories: Array<SearchCategory> = [
  {
    key: 'cases',
    value: 'Cases',
  },
  {
    key: 'records',
    value: 'Records',
  },
  {
    key: 'medical_chronology',
    value: 'Medical Chronology',
  },
  {
    key: 'billing-chronology',
    value: 'Billing Chronology',
  },
];
