import { Box, InputLabel, TextField, Typography } from '@mui/material';

type RejectUserComponentProps = {
  editedContent: string;
  setEditedContent: (content: string) => void;
};

export const RejectUserComponent: React.FC<RejectUserComponentProps> = ({
  editedContent,
  setEditedContent,
}) => {
  return (
    <Box
      display="flex"
      justifyContent="center"
      alignItems="left"
      flexDirection="column"
      mt={2}
      mb={3.2}
    >
      <InputLabel htmlFor="caseID">
        <Typography component="span" sx={{ color: 'error.main', fontSize: 12 }}>
          *
        </Typography>{' '}
        Please provide a reason for rejection
      </InputLabel>

      <TextField
        multiline
        rows={2}
        fullWidth
        placeholder="Write your rejection reason here..."
        value={editedContent}
        onChange={(event) => setEditedContent(event.target.value)}
        variant="outlined"
        autoFocus
      />
      <Typography fontSize={14} color='natural.500' mt={0.8}>
        This message will be shared with the requester.
      </Typography>
    </Box>
  );
};
