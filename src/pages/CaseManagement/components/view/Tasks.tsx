import { type FC, useState, Fragment, type ReactNode, useEffect } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Tab,
  Tabs,
  Typography,
} from '@mui/material';
import { PlusIcon } from '@phosphor-icons/react';
import {
  getAssignees,
  type AddCaseDataType,
} from '@/api/caseManagement/addCase';
import { getTasks } from '@/api/caseManagement/caseTasks';
import { useQuery } from '@tanstack/react-query';
import AppCustomLoader from '@/components/AppCustomLoader';
import { TaskForm } from './taskform';
import FileViewer from '@/components/FileViewer';
import { trackEvent } from '@/utils/mixPanel/mixpanel';
import { useNavigate } from '@tanstack/react-router';
import TaskItem from './TaskDetails/components/TaskItem';
import type { Task } from './TaskDetails/components/TaskDetails';
import DeleteTask from './TaskDetails/components/DeleteTask';
import { useAuth } from '@/context/auth/useAuth';

/**
 * Props for the Tasks component
 * @interface TasksProps
 * @property {string} caseId - The ID of the case to display tasks for
 */
type TasksProps = {
  caseId: string;
};

/**
 * Tasks component for displaying and managing case tasks
 * @component
 * @description Renders a card with tabs for different task statuses (Todo, In Progress, Completed)
 * and provides functionality to add, edit, view, and delete tasks associated with a case.
 *
 * Features include:
 * - Filtering tasks by status (Todo, In Progress, Completed)
 * - Adding new tasks via a modal form
 * - Editing existing tasks
 * - Viewing task attachments
 * - Deleting tasks with confirmation
 * - Real-time updates with React Query
 *
 * @param {object} props - Component props
 * @param {string} props.caseId - ID of the case to display tasks for
 * @returns {React.ReactElement} Rendered component
 */
const Tasks: FC<TasksProps> = ({ caseId }) => {
  const navigate = useNavigate();
  const { basicUserDetails } = useAuth();

  const [activeTab, setActiveTab] = useState('todo');
  const [openAddTaskDialog, setOpenAddTaskDialog] = useState(false);

  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [selectedFile, setSelectedFile] = useState<
    AddCaseDataType['files'][0] | null
  >(null);
  const [openFileViewer, setOpenFileViewer] = useState(false);
  const [showDeletePopup, setShowDeletePopup] = useState(false);
  const [fileToDelete, setFileToDelete] = useState<string | null>(null);

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

  const { isLoading, isError, data, refetch, isRefetching } = useQuery({
    queryKey: ['tasks', caseId],
    queryFn: () => getTasks(caseId),
    retry: 2,
    staleTime: 5 * 60 * 1000,
  });

  const { isLoading: isLoadingAssignees, data: assigneesData } = useQuery({
    queryKey: ['assignees'],
    queryFn: () => getAssignees('legal_user'),
    retry: 2,
    staleTime: 5 * 60 * 1000,
  });

  /**
   * Handles click on the add task button
   * @function
   * @description Opens the task form dialog in create mode by resetting selected task
   * and setting the dialog open state to true
   */
  const handleAddTaskClick = (): void => {
    void trackEvent(`Add Task Button clicked`, {
      caseId,
    });
    setOpenAddTaskDialog(true);
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

  /**
   * Handles selecting a task for editing
   * @function
   * @description Sets the selected task and opens the task form dialog in edit mode
   * @param {Task} task - The task to be edited
   */
  const handleSelectTask = (task: Task): void => {
    void trackEvent(`Edit Task Button clicked`, {
      caseId,
      taskId: task._id,
    });
    setSelectedTask(task);
    setOpenAddTaskDialog(true);
  };

  /**
   * Handles viewing files attached to a task
   * @function
   * @description Opens the file viewer dialog and sets the selected task with files
   * @param {Task} task - The task containing files to view
   */
  const handleViewFile = (task: Task): void => {
    void trackEvent('Task File View Button Clicked', {
      caseId,
      taskId: task._id,
    });
    setSelectedTask(task);
    setSelectedFile(task.files?.[0] || null);
    setOpenFileViewer(true);
  };

  /**
   * Shows the delete confirmation popup
   * @function
   * @description Sets the file to delete and displays the confirmation popup
   * @param {string} id - ID of the task to delete
   */
  const handleShowDeletePopup = (id: string): void => {
    void trackEvent('Task Delete Button Clicked', {
      caseId,
      taskId: id,
    });
    setShowDeletePopup(true);
    setFileToDelete(id);
  };

  const redirectUserToTaskDetailsPage = (id: string): void => {
    void navigate({ to: `/case-management/task/${id}` });
  };

  /**
   * Hides the delete confirmation popup
   * @function
   * @description Resets the file to delete and hides the confirmation popup
   */
  const handleHideDeletePopup = (): void => {
    setShowDeletePopup(false);
    setFileToDelete(null);
    setSelectedTask(null);
  };

  const handleSuccessOnDeleteTask = (): void => {
    void trackEvent('Task Deleted', {
      caseId,
      taskId: fileToDelete,
    });

    handleHideDeletePopup();
  };

  useEffect(() => {
    if (!openFileViewer) {
      setSelectedFile(null);
      setSelectedTask(null);
    }
  }, [openFileViewer]);

  return (
    <Card>
      <CardContent>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <Typography variant="h6">All Tasks</Typography>
          {basicUserDetails?.role === 'legal_user' && (
            <Button
              color="secondary"
              variant="contained"
              startIcon={<PlusIcon size={16} />}
              onClick={handleAddTaskClick}
            >
              Add Task
            </Button>
          )}
        </Box>
      </CardContent>
      <Box sx={{ width: '100%' }}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
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
      <CardContent>
        {isLoading || isRefetching ? (
          <AppCustomLoader height={100} />
        ) : isError ? (
          <Typography>Failed to load tasks. Please try again later.</Typography>
        ) : !data?.data || !data?.data?.length ? (
          <Typography>No tasks found please add a task.</Typography>
        ) : (
          <Box
            sx={{
              gap: 3,
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
                    <TaskItem
                      task={item}
                      handleSelectTask={handleSelectTask}
                      handleViewFile={handleViewFile}
                      redirectUserToTaskDetailsPage={
                        redirectUserToTaskDetailsPage
                      }
                      handleShowDeletePopup={handleShowDeletePopup}
                    />
                  </Fragment>
                )
              )}
          </Box>
        )}
      </CardContent>
      <TaskForm
        caseId={caseId}
        refetch={refetch}
        open={openAddTaskDialog}
        selectedTask={selectedTask}
        assigneesData={assigneesData || { data: [] }}
        setOpen={setOpenAddTaskDialog}
        setSelectedTask={setSelectedTask}
        isLoadingAssignees={isLoadingAssignees}
        handleShowDeletePopup={handleShowDeletePopup}
      />
      <FileViewer
        hideRefetchAndLog
        open={openFileViewer}
        setOpen={setOpenFileViewer}
        selectedFile={selectedFile}
        files={[...(selectedTask?.files || [])]}
        setSelectedFile={setSelectedFile}
      />
      <DeleteTask
        taskId={fileToDelete!}
        setShowDeletePopup={setShowDeletePopup}
        showDeletePopup={showDeletePopup}
        handleOnSuccess={handleSuccessOnDeleteTask}
      />
    </Card>
  );
};

export default Tasks;
