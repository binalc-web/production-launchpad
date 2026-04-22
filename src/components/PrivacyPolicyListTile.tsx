import { ListItem, Typography } from '@mui/material';
import type { FC } from 'react';

type PrivacyPolicyListTileProps = {
  text: string;
};

const PrivacyPolicyListTile: FC<PrivacyPolicyListTileProps> = ({ text }) => {
  return (
    <>
      <ListItem sx={{ display: 'list-item', py: 0 }}>
        <Typography
          mt={1}
          fontSize={14}
          color="natural.500"
          textAlign="justify"
        >
          {text}
        </Typography>
      </ListItem>
    </>
  );
};
export default PrivacyPolicyListTile;
