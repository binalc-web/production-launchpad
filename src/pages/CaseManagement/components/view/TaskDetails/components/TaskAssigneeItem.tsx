import {
  Avatar,
  Box,
  Chip,
  IconButton,
  Slide,
  Typography,
} from '@mui/material';
import { CalendarDotsIcon, EyeIcon } from '@phosphor-icons/react';
import moment from 'moment';
import type { FC } from 'react';
import type { Task } from './TaskDetails';
import { TASKS_COLORS } from '@/pages/CaseManagement/constants/options';
import { GreyDot } from '../../PatientInfo';

type TaskAssigneeItemProps = {
  task: Task;
  redirectUserToTaskDetailsPage: (taskId: string) => void;
};

const TaskAssigneeItem: FC<TaskAssigneeItemProps> = ({
  task,
  redirectUserToTaskDetailsPage,
}) => {
  return (
    <Slide in direction="up">
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          p: 1.6,
          '&:hover': {
            backgroundColor: 'neutral.50',
            borderRadius: 1,
          },
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
        </Box>
      </Box>
    </Slide>
  );
};

export default TaskAssigneeItem;
