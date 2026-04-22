import axiosInstance from '../axios';
import type { AxiosResponse } from 'axios';
import { getErrorMessage } from '../errorMessage';

/**
 * Response type for the endpoint API
 */
export type GetEndpointResponse = {
  success: boolean;
  message: string;
  data: Array<{ address: string; display: string; reference: string }>;
};

/**
 * Calls the /endpoint route and returns a link for redirection
 * @param signal - The abort signal for the request
 * @returns Promise resolving to the API response with link
 * @throws {Error} If the request fails
 */
export const getEndpoint = async (
  signal?: AbortSignal
): Promise<GetEndpointResponse> => {
  try {
    const response: AxiosResponse<GetEndpointResponse> =
      await axiosInstance.get('/api/v1/medical-record/request-epic-urls', {
        signal,
        // 3 minutes timeout so that the browser waits for the repsonse from the server for this time taking API
        timeout: 3 * 60 * 1000,
      });
    return response.data;
  } catch (error) {
    throw getErrorMessage(error);
  }
};
