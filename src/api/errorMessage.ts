import axios from 'axios';

/**
 * Extracts a standardized error message from various error types
 * Handles Axios errors, standard Errors, strings, and objects with message property
 *
 * @param {unknown} error - The error to process, can be of any type
 * @returns {Error} Standardized Error object with appropriate message
 * @throws {Error} Throws directly for Axios errors with response data
 */
export const getErrorMessage = (error: unknown): Error => {
  if (axios.isAxiosError(error) && error.response) {
    throw Error(error.response.data.message);
  } else if (error instanceof Error) {
    return Error(error.message);
  } else if (typeof error === 'string') {
    return Error(error);
  } else if (error && typeof error === 'object' && 'message' in error) {
    return Error((error as { message: string }).message);
  }
  return Error('An unknown error occurred');
};
