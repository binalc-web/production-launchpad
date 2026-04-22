export type user = {
  firstName: string;
  lastName: string;
  email: string;
  avatar: string;
  contact: string;
};

export const NOTIFICATION_TYPE = {
  INFORMATION: 'information',
  REMINDER: 'reminder',
  EDIT: 'edit',
  ERROR: 'error',
};

export type notification = {
  _id: string;
  message: string;
  userId: user;
  module: string;
  type: keyof typeof NOTIFICATION_TYPE;
  actionId: string;
  isRead: boolean;
  actionPerformedBy: user;
  createdAt: Date;
};
