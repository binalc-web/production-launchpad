import {
  Avatar,
  Box,
  Chip,
  IconButton,
  Slide,
  Typography,
} from '@mui/material';
import {
  CalendarDotsIcon,
  EyeIcon,
  PaperclipIcon,
  PencilSimpleIcon,
  TrashIcon,
} from '@phosphor-icons/react';
import moment from 'moment';
import type { FC } from 'react';
import type { Task } from './TaskDetails';
import { TASKS_COLORS } from '@/pages/CaseManagement/constants/options';
import { GreyDot } from '../../PatientInfo';
import { useAuth } from '@/context/auth/useAuth';

type TaskItemProps = {
  task: Task;
  handleSelectTask: (task: Task) => void;
  handleViewFile: (task: Task) => void;
  handleShowDeletePopup: (taskId: string) => void;
  redirectUserToTaskDetailsPage: (taskId: string) => void;
};

const TaskItem: FC<TaskItemProps> = ({
  task,
  handleSelectTask,
  handleViewFile,
  handleShowDeletePopup,
  redirectUserToTaskDetailsPage,
}) => {
  const { basicUserDetails } = useAuth();

  return (
    <Slide in direction="up">
      <Box
        sx={{
          gap: 1,
          display: 'flex',
          justifyContent: 'space-between',
        }}
      >
        <Box>
          <Box
            sx={{
              gap: 1,
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <Typography
              sx={{
                textDecoration:
                  task.status === 'completed' ? 'line-through' : 'none',
              }}
              fontWeight={500}
            >
              {task.title}
            </Typography>
            <Chip
              sx={{
                ml: 0.5,
                textTransform: 'capitalize',
                color: TASKS_COLORS[task.priority].color,
                bgcolor: TASKS_COLORS[task.priority].bgcolor,
                border: `1px solid ${TASKS_COLORS[task.priority].borderColor}`,
              }}
              label={task.priority}
            />
          </Box>
          <Box
            sx={{
              gap: 1,
              mt: 1.25,
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <Box
              sx={{
                gap: 1,
                display: 'flex',
                alignItems: 'center',
              }}
            >
              <Avatar
                src={
                  task.assignee?.avatar
                    ? `${import.meta.env.VITE_AVATAR_CLOUD_FRONT_DISTRIBUTION}${task.assignee?.avatar}`
                    : undefined
                }
                sx={{
                  width: 24,
                  height: 24,
                  fontSize: 12,
                }}
              >
                {task?.assignee?.firstName?.[0]}
                {task?.assignee?.lastName?.[0]}
              </Avatar>
              <Typography noWrap sx={{ color: 'neutral.500' }}>
                {task?.assignee?.firstName} {task?.assignee?.lastName}
              </Typography>
            </Box>
            {GreyDot}
            <Box
              sx={{
                gap: 1,
                display: 'flex',
                alignItems: 'center',
              }}
            >
              <CalendarDotsIcon color="#677284" />
              <Typography noWrap sx={{ color: 'neutral.500' }}>
                {moment(task.dueDate).format('MM-DD-YYYY')}
              </Typography>
            </Box>
            {GreyDot}
            <Box
              sx={{
                gap: 1,
                display: 'flex',
                cursor: 'pointer',
                alignItems: 'center',
              }}
              onClick={() => handleViewFile(task)}
            >
              <PaperclipIcon color="#677284" />
              <Typography noWrap sx={{ color: 'neutral.500' }}>
                {task.files?.length} Attachments
              </Typography>
            </Box>
          </Box>
        </Box>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
          }}
        >
          <IconButton
            variant="soft"
            onClick={() => redirectUserToTaskDetailsPage(task._id)}
          >
            <EyeIcon />
          </IconButton>
          {basicUserDetails?.role === 'legal_user' && (
            <IconButton variant="soft" onClick={() => handleSelectTask(task)}>
              <PencilSimpleIcon />
            </IconButton>
          )}
          {basicUserDetails?.role === 'legal_user' && (
            <IconButton
              variant="soft"
              onClick={() => handleShowDeletePopup(task._id)}
            >
              <TrashIcon />
            </IconButton>
          )}
        </Box>
      </Box>
    </Slide>
  );
};

export default TaskItem;
