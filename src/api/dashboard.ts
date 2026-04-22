import type { AxiosResponse } from 'axios';

import axiosInstance from './axios';
import { getErrorMessage } from './errorMessage';
import type { SuperAdminUsersData } from '@/pages/SuperAdminDashboard';

export const getCasesTasksData = async (): Promise<AxiosResponse> => {
  try {
    const response = await axiosInstance.get('/api/v1/dashboard/cases-tasks');
    return response.data;
  } catch (error) {
    throw getErrorMessage(error);
  }
};

export const getRecordRequestsData = async (): Promise<AxiosResponse> => {
  try {
    const response = await axiosInstance.get(
      '/api/v1/dashboard/record-requests'
    );
    return response.data;
  } catch (error) {
    throw getErrorMessage(error);
  }
};

export const getChronologiesData = async (): Promise<AxiosResponse> => {
  try {
    const response = await axiosInstance.get('/api/v1/dashboard/chronologies');
    return response.data;
  } catch (error) {
    throw getErrorMessage(error);
  }
};

export const getSuperAdminUsersData =
  async (): Promise<SuperAdminUsersData> => {
    try {
      const response = await axiosInstance.get(
        '/api/v1/user/super-admin-dashboard'
      );
      return response.data.data;
    } catch (error) {
      throw getErrorMessage(error);
    }
  };
