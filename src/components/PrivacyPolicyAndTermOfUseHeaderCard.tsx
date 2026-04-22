import { Box, Card, CardContent, Divider } from '@mui/material';

import logo from '../assets/logo.svg';
import solvereinLogo from '../assets/solverein.svg';

const PrivacyPolicyAndTermOfUseHeaderCard: React.FC = () => {
  return (
    <Card sx={{ my: 3.2, mx: 30, height: 180, bgcolor: 'tertiary.100' }}>
      <CardContent sx={{ height: '100%', p: 0 }}>
        <Box
          display="flex"
          height="100%"
          flexDirection="row"
          alignItems="center"
          justifyContent={'center'}
        >
          <Box
            component="img"
            src={logo}
            alt="Logo"
            style={{ width: '167px', height: 'auto' }}
          />

          <Divider
            flexItem
            orientation="vertical"
            sx={{ border: 0.2, borderColor: 'neutral.200', mx: 6 }}
          />

          <Box
            component="img"
            src={solvereinLogo}
            alt="Logo"
            style={{ width: '212px', height: 'auto' }}
          />
        </Box>
      </CardContent>
    </Card>
  );
};
export default PrivacyPolicyAndTermOfUseHeaderCard;
