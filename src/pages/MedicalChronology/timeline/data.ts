/**
 * @module MedicalChronology
 * @fileoverview Contains mock data structures for medical chronology timeline display
 * This file defines the data structures used to populate the medical chronology timeline
 * including event highlights, color schemes, and timeline entry data.
 */

/**
 * Array of date ranges for different medical event categories to highlight in the timeline
 * Each object maps a category key to an array of dates representing highlighting ranges
 */
export const highlightWithRanges = [
  {
    'patient-visits-hospital-care': [
      new Date(new Date().setDate(new Date().getDate() - 3)),
    ],
  },
  {
    'diagnostic-imaging-services': [
      new Date(new Date().setDate(new Date().getDate() + 3)),
    ],
  },
  {
    'surgical-procedural-interventions': [
      new Date(new Date().setDate(new Date().getDate() + 5)),
    ],
  },
];

/**
 * Color scheme definitions for different medical event categories
 * Maps each category key to its corresponding color and background color
 */
export const colors: Record<string, { color: string; bgcolor: string }> = {
  'patient-visits-hospital-care': {
    color: 'info.dark',
    bgcolor: '#F1F5FD',
  },
  'diagnostic-imaging-services': {
    color: 'success.dark',
    bgcolor: '#EEFFF1',
  },
  'surgical-procedural-interventions': {
    color: 'warning.dark',
    bgcolor: '#FBF7EB',
  },
  pharmacy: {
    color: '#0E9388',
    bgcolor: '#F0FDFA',
  },
};

/**
 * Detailed information for each date or date range in the medical chronology
 * Maps date strings to objects containing event details, category, and content descriptions
 */
export const detailedInfo = {
  '09-12-2024 (DOI)': {
    title: 'ER Visits',
    bullet: 'patient-visits-hospital-care',
    bulletTitle: 'Patient Visits & Hospital Care',
    content:
      'Patient rushed to ER after a motor vehicle accident. Initial examination, X-rays, and CT scan performed.',
  },
  '09-18-2024': {
    title: 'Surgery',
    bullet: 'surgical-procedural-interventions',
    bulletTitle: 'Surgical Procedural Interventions',
    content:
      'Patient underwent a hernia repair surgery. Post-operative care and pain management provided.',
  },
  '09-20-2024 to 09-25-2024': {
    title: 'Radiology Services',
    bullet: 'diagnostic-imaging-services',
    bulletTitle: 'Diagnostic Imaging Services',
    content:
      'Post-operative X-rays and CT scan to evaluate healing and pain management.',
  },
};

/**
 * Comprehensive timeline data for medical events in chronological order
 * Each object represents a distinct medical event with metadata for display in the timeline
 * @type {Array<{
 *   id: number,
 *   date: string,
 *   meta: string,
 *   rate: number,
 *   chip: string,
 *   key: string,
 *   facility: string,
 *   days: number | null,
 *   visit: number
 * }>}
 */
export const chartTimelineData = [
  {
    id: 1,
    date: '09-12-2024',
    meta: '(DOI)',
    rate: 1,
    chip: 'ER Visits',
    key: 'patient-visits-hospital-care',
    facility: 'Harbourview Emergency Care',
    days: 1,
    visit: 1,
  },
  {
    id: 2,
    date: '09-12-2024',
    meta: 'to 09-17-2024',
    rate: 10,
    chip: 'Hospitalization',
    key: 'patient-visits-hospital-care',
    facility: 'Summit General Hospital',
    days: 5,
    visit: 1,
  },
  {
    id: 3,
    date: '09-18-2024',
    meta: '',
    rate: 1,
    chip: 'Surgery',
    key: 'surgical-procedural-interventions',
    facility: 'Crestview Orthopedic & Trauma Center',
    days: 1,
    visit: 1,
  },
  {
    id: 4,
    date: '09-20-2024',
    meta: 'to 09-25-2024',
    rate: 5,
    chip: 'Radiology Services',
    key: 'diagnostic-imaging-services',
    facility: 'Oakview Radiology',
    days: 5,
    visit: 2,
  },
  {
    id: 5,
    date: '10-03-2024',
    meta: '',
    rate: 3,
    chip: 'Pharmacy',
    key: 'pharmacy',
    facility: 'Westgate Pharmacy',
    days: null,
    visit: 10,
  },
];
