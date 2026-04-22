import { addComment } from '@/api/caseManagement/taskComments';
import ToastAlert from '@/components/ToastAlert';
import { useAuth } from '@/context/auth/useAuth';
import { trackEvent } from '@/utils/mixPanel/mixpanel';
import { Avatar, Box, Button, TextField, Typography } from '@mui/material';
import { XIcon } from '@phosphor-icons/react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, type FC } from 'react';

type PostCommentSectionType = {
  taskId: string;
};

const PostCommentSection: FC<PostCommentSectionType> = ({ taskId }) => {
  const { basicUserDetails } = useAuth();

  const queryClient = useQueryClient();
  const [comment, setComment] = useState('');
  const [isError, setError] = useState(false);

  /**
   * Mutation for adding a new note
   * Creates a new note and refreshes the notes list on success
   */
  const addCommentMutation = useMutation({
    mutationFn: addComment,
    onSuccess: () => {
      void trackEvent('Comment Added', {
        taskId: taskId,
      });
      void queryClient.invalidateQueries({
        queryKey: ['comments', taskId],
      });
      setComment('');
    },
    onError: () => {
      setError(true);
      setTimeout(() => {
        setError(false);
      }, 2000);
    },
  });

  /**
   * Adds a new note
   * Triggers the add mutation with the note content and metadata
   */
  const handleAddComment = (): void => {
    void trackEvent('Comment Add button Clicked', {
      taskId: taskId,
    });
    if (!comment.trim()) return; // prevent empty

    addCommentMutation.mutate({
      taskId,
      comment: comment.trim(),
    });
  };

  const handleCancelAddComment = (): void => {
    setComment('');
  };

  return (
    <Box p={2}>
      <Box
        display="flex"
        flexDirection="row"
        sx={{ mt: 'auto' }}
        gap={0.8}
      >
        <Avatar
          src={`${import.meta.env.VITE_AVATAR_CLOUD_FRONT_DISTRIBUTION}${basicUserDetails?.avatar}`}
          sx={{ width: 32, height: 32, mt: 0.5 }}
        >
          <Typography fontSize={11}>
            {' '}
            {basicUserDetails?.firstName?.[0]} {basicUserDetails?.lastName?.[0]}
          </Typography>
        </Avatar>
        <TextField
          rows={2}
          multiline
          fullWidth
          placeholder="Add comment..."
          value={comment}
          onChange={(event) => {
            setComment(event.target.value);
          }}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && !event.shiftKey) {
              event.preventDefault();
              handleAddComment();
            }
          }}
          disabled={addCommentMutation.isPending}
        />
        <ToastAlert
          severity="error"
          placement="right"
          showAlert={isError}
          onClose={() => setError(false)}
          message={'Something went wrong while adding comment!'}
          icon={<XIcon weight="bold" />}
        />
      </Box>

      <Box
        sx={{
          mt: 1.6,
          gap: 1,
          display: 'flex',
          justifyContent: 'flex-end',
        }}
      >
        <Button
          size="small"
          color="inherit"
          variant="outlined"
          onClick={handleCancelAddComment}
          disabled={addCommentMutation.isPending}
        >
          Cancel
        </Button>
        <Button
          size="small"
          variant="contained"
          onClick={handleAddComment}
          disabled={!comment.trim() || addCommentMutation.isPending}
        >
          {addCommentMutation.isPending ? 'Sending...' : 'Send'}
        </Button>
      </Box>
    </Box>
  );
};

export default PostCommentSection;
