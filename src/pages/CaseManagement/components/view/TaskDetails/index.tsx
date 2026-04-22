import { useEffect, useState, type FC } from 'react';
import { getTask } from '@/api/caseManagement/caseTasks';
import AppCustomLoader from '@/components/AppCustomLoader';
import {
  Box,
  Button,
  Card,
  CardContent,
  Divider,
  Typography,
} from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import { useNavigate, useParams } from '@tanstack/react-router';
import Breadcrumbs, { type BreadcrumbItem } from '@/components/Breadcrumbs';
import { PencilIcon, TrashIcon } from '@phosphor-icons/react';
import ErrorComponent from './components/ErrorComponent';
import TaskDetails from './components/TaskDetails';
import PostCommentSection from './components/PostCommentSection';
import CommentTile from './components/CommentTile';
import DeleteTask from './components/DeleteTask';
import { type Assignee, TaskForm } from '../taskform';
import { getAssignees } from '@/api/caseManagement/addCase';
import { getComments } from '@/api/caseManagement/taskComments';
import { useAuth } from '@/context/auth/useAuth';

export type TaskComment = {
  _id: string;
  comment: string;
  createdBy: Assignee;
  createdAt: Date;
};

export const Dot = (
  <Box
    sx={{
      width: 4,
      height: 4,
      borderRadius: '50%',
      bgcolor: 'neutral.400',
    }}
  />
);

const TaskDetailsPage: FC = () => {
  const parameters = useParams({ from: '/_app/case-management/task/$id' });
  const [showDeletePopup, setShowDeletePopup] = useState(false);
  const [openAddTaskDialog, setOpenAddTaskDialog] = useState(false);

  const [isCurrentUserAssignee, setIsCurrentUserAssignee] = useState(false);

  const { basicUserDetails } = useAuth();
  const navigate = useNavigate();
  const isUserPatient =
    basicUserDetails?.role === 'patient' ||
    basicUserDetails?.role === 'parent' ||
    basicUserDetails?.role === 'trustee' ||
    basicUserDetails?.role === 'durable_power_of_attorney';

  /**
   * Query to fetch task data.
   * @description Uses React Query to fetch task details by ID when in edit mode.
   * Only enabled when a task ID is available and the form is open.
   */
  const {
    isLoading,
    isError,
    refetch,
    data: taskData,
    // refetch: refetchTaskData,
  } = useQuery({
    queryKey: ['tasks-details', parameters.id],
    queryFn: () => getTask(parameters.id),
    retry: 2,
    staleTime: 5 * 60 * 1000,
  });

  const { isLoading: isLoadingAssignees, data: assigneesData } = useQuery({
    queryKey: ['assignees'],
    queryFn: () => getAssignees('legal_user'),
    retry: 2,
    staleTime: 5 * 60 * 1000,
  });

  const {
    isLoading: isCommentLoading,
    data: commentData,
    isError: isErrorWhileFetchingComments,
  } = useQuery({
    queryKey: ['comments', parameters.id],
    queryFn: () => getComments(parameters.id),
    retry: 2,
    staleTime: 0,
  });

  const handleSuccessOnDeleteTask = (): void => {
    void navigate({
      to: `/case-management/view/${taskData?.data.caseData.caseId}`,
    });
  };

  const breadcrumbItems: Array<BreadcrumbItem> = [
    isCurrentUserAssignee && !isUserPatient
      ? { title: 'My Tasks', url: '/my-tasks' }
      : {
          title: 'Case Management',
          url: '/case-management',
        },
    ...(!isCurrentUserAssignee || isUserPatient
      ? [
          {
            title: 'Case Details',
            url: `/case-management/view/${taskData?.data.caseData.caseId}`,
          },
        ]
      : []),
    {
      title: 'Task Details',
    },
  ];

  useEffect(() => {
    setIsCurrentUserAssignee(
      basicUserDetails?.userId !== taskData?.data.task.createdBy
    );
  }, [basicUserDetails?.userId, taskData?.data.task]);

  return (
    <Box>
      <Breadcrumbs items={breadcrumbItems} />
      <Box
        sx={{
          gap: 2,
          mt: 1.25,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <Typography
          variant="h4"
          noWrap
          sx={{ maxWidth: 500, cursor: 'default' }}
        >
          Task Details
        </Typography>

        {taskData?.data.task && !isCurrentUserAssignee && (
          <Box gap={2} display="flex" flexDirection="row">
            <Button
              size="large"
              variant="contained"
              startIcon={<TrashIcon />}
              onClick={() => {
                setShowDeletePopup(true);
              }}
              sx={{
                fontWeight: 600,
                color: (theme) => `${theme.palette.text.primary} !important`,
                bgcolor: (theme) => `${theme.palette.common.white} !important`,
              }}
            >
              Delete
            </Button>
            <Button
              color="secondary"
              variant="contained"
              onClick={() => setOpenAddTaskDialog(true)}
              startIcon={<PencilIcon size={16} />}
            >
              Edit Task
            </Button>
          </Box>
        )}
      </Box>

      <Card
        sx={{
          mt: 3,
        }}
      >
        <CardContent sx={{ p: '0 !important' }}>
          <Box
            sx={{
              gap: 0,
              display: 'flex',
              width: '100%',
              flexDirection: 'row',
              alignItems: 'stretch',
              minHeight: '72vh',
              maxHeight: '72vh',
            }}
          >
            <DeleteTask
              taskId={parameters.id}
              setShowDeletePopup={setShowDeletePopup}
              showDeletePopup={showDeletePopup}
              handleOnSuccess={handleSuccessOnDeleteTask}
            />

            {taskData?.data.task && (
              <TaskForm
                caseId={taskData.data.caseData._id}
                refetch={refetch}
                open={openAddTaskDialog}
                selectedTask={taskData?.data.task}
                assigneesData={assigneesData || { data: [] }}
                setOpen={setOpenAddTaskDialog}
                isLoadingAssignees={isLoadingAssignees}
                handleShowDeletePopup={() => setShowDeletePopup(true)}
              />
            )}

            <Box
              sx={{
                p: 2,
                width: '70%',
                minHeight: 0,
                overflowY: 'auto',
              }}
            >
              {isLoading ? (
                <AppCustomLoader height={150} />
              ) : isError || !taskData ? (
                <ErrorComponent isErrorInTask />
              ) : (
                <TaskDetails
                  caseData={taskData.data.caseData}
                  task={taskData.data.task}
                  isCurrentUserAssignee={isCurrentUserAssignee}
                  refetch={refetch}
                />
              )}
            </Box>

            {/* Center Line */}
            <Box
              sx={{
                width: '1px',
                backgroundColor: 'divider',
              }}
            />

            {/* Right Box - 30% */}
            <Box
              sx={{
                // p: 2,
                width: '30%',
                height: '72vh',
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              <Box
                sx={{
                  px: 2,
                  flex: 1,
                  minHeight: 0,
                  overflowY: 'auto',
                  display: 'flex',
                  flexDirection: 'column-reverse',
                }}
              >
                {isCommentLoading ? (
                  <AppCustomLoader height={150} />
                ) : isErrorWhileFetchingComments || !commentData?.data ? (
                  <ErrorComponent isErrorInTask />
                ) : (
                  <Box sx={{ mt: 'auto' }}>
                    {[...commentData.data].reverse().map((comment) => (
                      <CommentTile
                        comment={comment.comment}
                        commentDateAndTime={comment.createdAt}
                        commentedByUser={comment.createdBy}
                      />
                    ))}
                  </Box>
                )}
              </Box>

              <Divider
                sx={{
                  mt: 1.2,
                  mb: 1.6,
                  borderColor: 'divider',
                  borderBottomWidth: 1,
                }}
              />

              <PostCommentSection taskId={parameters.id} />
            </Box>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
};

export default TaskDetailsPage;
