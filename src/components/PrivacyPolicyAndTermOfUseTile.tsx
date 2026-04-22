import { Divider, Typography } from '@mui/material';

type PrivacyPolicyAndTermOfUseTileProps = {
  title: string;
  description: string;
  children?: React.ReactNode;
  mt?: number;
};

const PrivacyPolicyAndTermOfUseTile: React.FC<
  PrivacyPolicyAndTermOfUseTileProps
> = ({ title, description, children, mt }) => {
  return (
    <>
      <Typography
        mt={mt ? mt : 1.6}
        fontWeight={600}
        fontSize={20}
        color="natural.700"
      >
        {title}
      </Typography>
      <Typography
        mt={1.6}
        fontSize={14}
        color="natural.500"
        textAlign="justify"
      >
        {description}
      </Typography>
      {children && children}
      <Divider sx={{ mt: 3.2 }} />
    </>
  );
};

export default PrivacyPolicyAndTermOfUseTile;
