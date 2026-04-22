import axios from 'axios';
import { globalLogout } from '../context/auth/authContext';

/**
 * Represents a failed request that's waiting for token refresh
 * Used in the request queue when handling 401/403 responses
 */
type FailedRequest = {
  resolve: (value?: string) => void;
  reject: (error?: unknown) => void;
};

/** Base URL for API requests from environment variables */
const BASE_URL = import.meta.env.VITE_BACKEND_URL;

/**
 * Configured axios instance with baseURL and default headers
 * Used for all API requests in the application
 */
const axiosInstance = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});

/**
 * Retrieves the access token from localStorage or sessionStorage
 * @returns {string|null} The access token or null if not found
 */
const getAccessToken = (): string | null =>
  localStorage.getItem('accessToken') || sessionStorage.getItem('accessToken');
/**
 * Retrieves the refresh token from localStorage
 * @returns {string|null} The refresh token or null if not found
 */
const getRefreshToken = (): string | null =>
  localStorage.getItem('refreshToken');

/**
 * List of authentication endpoints that don't require authorization token
 * Used in request interceptor to skip token attachment
 */
const authEndpoints = ['/auth'];

/**
 * Request Interceptor: Automatically attaches authorization token to requests
 * Skips token attachment for auth endpoints defined in authEndpoints
 */
axiosInstance.interceptors.request.use(
  (config) => {
    const token = getAccessToken();
    if (
      token &&
      config.url &&
      !authEndpoints.some((url) => config.url!.includes(url))
    ) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error instanceof Error ? error : new Error(error))
);

/**
 * Token refresh handling state variables
 * isRefreshing - Tracks if a refresh request is in progress
 * failedQueue - Queue of requests that failed due to expired token and waiting for refresh
 */
let isRefreshing = false;
let failedQueue: Array<FailedRequest> = [];

/**
 * Processes the queue of failed requests after a token refresh attempt
 * Either resolves all requests with new token or rejects all with the error
 * @param {unknown} error - Error from token refresh attempt, null if successful
 * @param {string|null} token - New access token if refresh was successful, null otherwise
 */
const processQueue = (error: unknown, token: string | null = null): void => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token ?? undefined);
    }
  });
  failedQueue = [];
};

/**
 * Response Interceptor
 * Handles authentication errors (401/403) by attempting to refresh the token
 * Maintains a queue of failed requests that will be retried once token is refreshed
 */
axiosInstance.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    // Handle 401 + token refresh
    if (
      (error.response?.status === 403 || error.response?.status === 401) &&
      !originalRequest._retry
    ) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({
            resolve: (token?: string) => {
              originalRequest.headers['Authorization'] = `Bearer ${token}`;
              resolve(axiosInstance(originalRequest));
            },
            reject,
          });
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const refreshToken = getRefreshToken();
        if (!refreshToken)
          throw new Error(
            error?.response?.data?.message || 'No refresh token found'
          );

        const response = await axios.post(
          `${BASE_URL}/api/v1/auth/refresh-access-token`,
          {},
          {
            headers: {
              'x-refresh-token': refreshToken,
            },
          }
        );

        const newAccessToken = response.data.data.accessToken;
        localStorage.setItem('accessToken', newAccessToken);
        localStorage.setItem('refreshToken', response.data.data.refreshToken);

        axiosInstance.defaults.headers.common['Authorization'] =
          `Bearer ${newAccessToken}`;
        processQueue(null, newAccessToken);

        originalRequest.headers = {
          ...(originalRequest.headers || {}),
          Authorization: `Bearer ${newAccessToken}`,
        };

        return await axiosInstance(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        if (globalLogout) globalLogout();
        return await Promise.reject(
          refreshError instanceof Error
            ? refreshError
            : new Error(String(refreshError))
        );
      } finally {
        // eslint-disable-next-line require-atomic-updates
        isRefreshing = false;
      }
    }
    return Promise.reject(error instanceof Error ? error : new Error(error));
  }
);

export default axiosInstance;
