// src/utils/ga.ts
import ReactGA from 'react-ga4';

// TO-DO: later on we will change uat/stage to production
const isProduction = import.meta.env.VITE_ENVIRONMENT === 'prod';
const gaMeasurementId = import.meta.env.VITE_GA_MEASUREMENT_ID; // replace with your actual ID

/**
 *
 * @returns Initializes Google Analytics if in production environment.
 * This function sets up Google Analytics with the provided measurement ID.
 * It should be called once at the start of your application.
 * If the environment is not production, it does nothing.
 * If initialization fails, it logs an error to the console.
 */
export const initGA = (): void => {
  if (!isProduction) {
    return;
  }
  try {
    ReactGA.initialize(gaMeasurementId);
  } catch (error) {
    console.error('Failed to initialize Google Analytics:', error);
  }
};

/**
 * Tracks a page view in Google Analytics.
 * @param path - The path of the page to track.
 * This function sends a pageview hit to Google Analytics with the specified path.
 * It should be called whenever a user navigates to a new page in your application.
 * If tracking fails, it logs an error to the console.
 */
export const trackPageView = (path: string): void => {
  try {
    ReactGA.send({ hitType: 'pageview', page: path });
  } catch (error) {
    console.error('Failed to track page view:', error);
  }
};
