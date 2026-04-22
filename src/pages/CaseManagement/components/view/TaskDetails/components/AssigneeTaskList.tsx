import AppCustomLoader from '@/components/AppCustomLoader';
import {
  Box,
  Card,
  CardContent,
  Chip,
  Tab,
  Tabs,
  Typography,
} from '@mui/material';
import { Fragment, useState, type FC, type ReactNode } from 'react';
import type { Task } from './TaskDetails';
import TaskAssigneeItem from './TaskAssigneeItem';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { getTasksForAssignee } from '@/api/tasks/getTasksForAssignee';

type AssigneeTaskListProps = {
  isToDoTabVisible: boolean;
  isShowTitle?: boolean;
};

const AssigneeTaskList: FC<AssigneeTaskListProps> = ({
  isToDoTabVisible = false,
  isShowTitle = false,
}) => {
  const [activeTab, setActiveTab] = useState(
    isToDoTabVisible ? 'todo' : 'in_progress'
  );
  const navigate = useNavigate();

  const { isLoading, isError, data, isRefetching } = useQuery({
    queryKey: ['tasks-assignee'],
    queryFn: () => getTasksForAssignee(),
    retry: 2,
    staleTime: 5 * 60 * 1000,
  });

  /**
   * Handles tab change events for task status filtering
   * @function
   * @description Updates the active tab state when user switches between task status tabs
   * @param {React.SyntheticEvent} _ - The event object (unused)
   * @param {string} tab - The new tab value to set active
   */
  const handleTabChange = (_: React.SyntheticEvent, tab: string): void => {
    setActiveTab(tab);
  };

  /**
   * Calculates the number of tasks for a specific status type
   * @function
   * @description Used to display the count of tasks in each tab
   * @param {string} type - The task status type (todo, in_progress, completed)
   * @returns {number} The count of tasks with the specified status
   */
  const getLength = (type: string): number => {
    return data?.data?.filter((task: Task) => task.status === type).length || 0;
  };

  const redirectUserToTaskDetailsPage = (id: string): void => {
    void navigate({ to: `/case-management/task/${id}` });
  };

  return (
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
            flexDirection: 'column',
            alignItems: 'stretch',
            minHeight: '72vh',
            maxHeight: '72vh',
          }}
        >
          <Box sx={{ width: '100%' }}>
            <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
              {isShowTitle && (
                <Typography px={1.6} pt={1.2} fontSize={20} fontWeight={600}>
                  My Tasks
                </Typography>
              )}

              <Tabs
                className="Tabs--settings"
                value={activeTab}
                onChange={handleTabChange}
                aria-label="basic tabs example"
                sx={{
                  pb: 0,
                  '& .MuiTabs-indicator': {
                    height: '1px',
                    display: 'flex',
                    backgroundColor: 'info.dark',
                  },
                  '& .MuiChip-root': {
                    height: 20,
                    borderRadius: '50%',
                    bgcolor: 'primary.disabled',
                    '& .MuiChip-label': {
                      fontSize: 12,
                      padding: '2px 8px',
                    },
                  },
                  '& .Mui-selected': {
                    '& .MuiChip-root': {
                      bgcolor: '#DEE7FB',
                      color: 'info.dark',
                    },
                  },
                }}
              >
                {isToDoTabVisible && (
                  <Tab
                    className="Tab--settings"
                    label={
                      <Box
                        sx={{
                          gap: 1,
                          display: 'flex',
                          alignItems: 'center',
                        }}
                      >
                        <Typography>To Do</Typography>
                        <Chip size="small" label={getLength('todo')} />
                      </Box>
                    }
                    value="todo"
                  />
                )}
                <Tab
                  className="Tab--settings"
                  label={
                    <Box
                      sx={{
                        gap: 1,
                        display: 'flex',
                        alignItems: 'center',
                      }}
                    >
                      <Typography>In Progress</Typography>
                      <Chip size="small" label={getLength('in_progress')} />
                    </Box>
                  }
                  value="in_progress"
                />
                <Tab
                  className="Tab--settings"
                  label={
                    <Box
                      sx={{
                        gap: 1,
                        display: 'flex',
                        alignItems: 'center',
                      }}
                    >
                      <Typography>In Review</Typography>
                      <Chip size="small" label={getLength('in_review')} />
                    </Box>
                  }
                  value="in_review"
                />
                <Tab
                  className="Tab--settings"
                  label={
                    <Box
                      sx={{
                        gap: 1,
                        display: 'flex',
                        alignItems: 'center',
                      }}
                    >
                      <Typography>Completed</Typography>
                      <Chip size="small" label={getLength('completed')} />
                    </Box>
                  }
                  value="completed"
                />
              </Tabs>
            </Box>
          </Box>

          <Box p={1.6}>
            {isLoading || isRefetching ? (
              <AppCustomLoader height={100} />
            ) : isError ? (
              <Typography>
                Failed to load tasks. Please try again later.
              </Typography>
            ) : !data?.data || !data?.data?.length ? (
              <Box
                display="flex"
                flexDirection="column"
                alignContent="center"
                alignItems="center"
              >
                <Box
                  component="svg"
                  width={60}
                  height={60}
                  viewBox="0 0 64 64"
                  fill="none"
                >
                  <Box
                    component="path"
                    opacity="0.2"
                    d="M19.17 40C19.4327 39.9998 19.6929 40.0513 19.9357 40.1517C20.1785 40.2521 20.3991 40.3993 20.585 40.585L25.4125 45.415C25.5984 45.6007 25.819 45.7479 26.0618 45.8483C26.3046 45.9487 26.5648 46.0002 26.8275 46H37.17C37.4327 46.0002 37.6929 45.9487 37.9357 45.8483C38.1785 45.7479 38.3991 45.6007 38.585 45.415L43.4125 40.585C43.5984 40.3993 43.819 40.2521 44.0618 40.1517C44.3046 40.0513 44.5648 39.9998 44.8275 40H54V12C54 11.4696 53.7893 10.9609 53.4142 10.5858C53.0391 10.2107 52.5304 10 52 10H12C11.4696 10 10.9609 10.2107 10.5858 10.5858C10.2107 10.9609 10 11.4696 10 12V40H19.17Z"
                    fill="#8B95A5"
                  />
                  <Box
                    component="path"
                    d="M52 10H12C10.8954 10 10 10.8954 10 12V52C10 53.1046 10.8954 54 12 54H52C53.1046 54 54 53.1046 54 52V12C54 10.8954 53.1046 10 52 10Z"
                    stroke="#8B95A5"
                    stroke-width="3"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  />
                  <Box
                    component="path"
                    d="M10 40H19.1725C19.7022 40.0002 20.2102 40.2106 20.585 40.585L25.415 45.415C25.7898 45.7894 26.2978 45.9998 26.8275 46H37.1725C37.7022 45.9998 38.2102 45.7894 38.585 45.415L43.415 40.585C43.7898 40.2106 44.2978 40.0002 44.8275 40H54"
                    stroke="#8B95A5"
                    stroke-width="3"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  />
                </Box>

                <Typography
                  fontSize={19}
                  textAlign="center"
                  fontWeight={400}
                  sx={{
                    color: (theme) => theme.palette.neutral[700],
                  }}
                >
                  No data available.
                </Typography>
              </Box>
            ) : (
              <Box
                sx={{
                  gap: 0.5,
                  display: 'flex',
                  maxHeight: 400,
                  flexDirection: 'column',
                  overflowY: 'auto',
                }}
              >
                {data?.data
                  ?.filter((item: Task) => item.status === activeTab)
                  .map(
                    (item: Task): ReactNode => (
                      <Fragment>
                        <TaskAssigneeItem
                          task={item}
                          redirectUserToTaskDetailsPage={
                            redirectUserToTaskDetailsPage
                          }
                        />
                      </Fragment>
                    )
                  )}
              </Box>
            )}
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
};

export default AssigneeTaskList;
