import { Box, Typography } from '@mui/material';
import type { ReactNode } from 'react';

type UserInformationSectionProps = {
  title: string;
  children: ReactNode;
};

const UserInformationSection: React.FC<UserInformationSectionProps> = ({
  title,
  children,
}) => {
  return (
    <Box display="flex" flexDirection="column" gap={2.4} p={2.4}>
      <Typography fontWeight={600} fontSize={16} color="natural.700">
        {title}
      </Typography>
      {children}
    </Box>
  );
};
export default UserInformationSection;
