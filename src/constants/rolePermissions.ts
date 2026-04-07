import { UserPermissions } from '../types';

export const ROLE_PERMISSIONS: Record<string, UserPermissions> = {
  'Engineering Manager': {
    canCreateMeetings: true,
    canAccessAllMeetings: true,
    canCreateJiraTickets: true,
    canCreateConfluenceDocs: true,
    canManageIntegrations: true,
    canManageUsers: true,
    directJiraAccess: true
  },
  'Product Manager': {
    canCreateMeetings: true,
    canAccessAllMeetings: true,
    canCreateJiraTickets: true,
    canCreateConfluenceDocs: true,
    canManageIntegrations: true,
    canManageUsers: true,
    directJiraAccess: true
  },
  'UI/UX Lead': {
    canCreateMeetings: true,
    canAccessAllMeetings: true,
    canCreateJiraTickets: false,
    canCreateConfluenceDocs: true,
    canManageIntegrations: true,
    canManageUsers: false,
    directJiraAccess: false
  },
  'Team Lead': {
    canCreateMeetings: true,
    canAccessAllMeetings: true,
    canCreateJiraTickets: true,
    canCreateConfluenceDocs: true,
    canManageIntegrations: false,
    canManageUsers: false,
    directJiraAccess: false // Can create in tracker, not directly in Jira
  },
  'Employee': {
    canCreateMeetings: false,
    canAccessAllMeetings: false,
    canCreateJiraTickets: false,
    canCreateConfluenceDocs: false,
    canManageIntegrations: false,
    canManageUsers: false,
    directJiraAccess: false
  }
};