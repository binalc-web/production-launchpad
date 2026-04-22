import type { FC } from 'react';

import {
  Avatar,
  Box,
  Card,
  Tooltip,
  Typography,
  CardContent,
} from '@mui/material';
import { ArrowRightIcon, InfoIcon } from '@phosphor-icons/react';
import { useNavigate } from '@tanstack/react-router';

type CompletedTasksProps = {
  data: {
    totalTasks: number;
    pendingTask: number;
    totalCompletedTask: number;
    totalOverdueTask: number;
    completedTaskPercentage: string;
    pendingTaskPercentage: string;
    overDueTaskPercentage: string;
  };
};

const CompletedTasks: FC<CompletedTasksProps> = (props) => {
  const { data } = props;

  const navigate = useNavigate();

  const getPendingPercentage = (): number => {
    if (!data) return 0;

    const percentage =
      ((data.pendingTask - data.totalOverdueTask) / data.totalTasks) * 100 || 0;
    return percentage;
  };

  const getOverduePercentage = (): number => {
    if (!data) return 0;

    const percentage = (data.totalOverdueTask / data.totalTasks) * 100 || 0;
    return percentage;
  };

  const getCompletedPercentage = (): number => {
    if (!data) return 0;

    const percentage = data.completedTaskPercentage
      ? parseFloat(data.completedTaskPercentage.replace('%', ''))
      : (data.totalCompletedTask / data.totalTasks) * 100 || 0;
    return percentage;
  };

  return (
    <Card sx={{ height: '100%' }}>
      <CardContent>
        <Box
          sx={{
            gap: 1.5,
            display: 'flex',
            alignItems: 'center',
          }}
        >
          <Avatar
            variant="rounded"
            sx={{
              backgroundColor: '#EEFFF1',
              color: 'success.dark',
            }}
          >
            <Box
              component="svg"
              width="24px"
              height="24px"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <Box
                display="flex"
                justifyContent="center"
                component="rect"
                x="0.666504"
                width="44px"
                height="44px"
                rx="6"
                fill="#EEFFF1"
              />

              <Box
                component="path"
                opacity="0.2"
                d="M15.75 9.375C15.75 10.4875 15.4201 11.5751 14.802 12.5001C14.1839 13.4251 13.3054 14.1461 12.2776 14.5718C11.2498 14.9976 10.1188 15.109 9.02762 14.8919C7.93648 14.6749 6.9342 14.1391 6.14753 13.3525C5.36086 12.5658 4.82513 11.5635 4.60809 10.4724C4.39104 9.38124 4.50244 8.25024 4.92818 7.22241C5.35392 6.19457 6.07489 5.31607 6.99992 4.69798C7.92495 4.0799 9.01248 3.75 10.125 3.75C11.6168 3.75 13.0476 4.34263 14.1025 5.39752C15.1574 6.45242 15.75 7.88316 15.75 9.375Z"
                fill="#00A92A"
              />
              <Box
                component="path"
                d="M13.5 14.7823C14.6757 14.0501 15.581 12.9548 16.0788 11.6622C16.5766 10.3697 16.6398 8.95013 16.259 7.61839C15.8782 6.28666 15.074 5.11518 13.9681 4.2812C12.8622 3.44721 11.5148 2.99609 10.1297 2.99609C8.74459 2.99609 7.39716 3.44721 6.29127 4.2812C5.18537 5.11518 4.38118 6.28666 4.00037 7.61839C3.61956 8.95013 3.68284 10.3697 4.18064 11.6622C4.67844 12.9548 5.58367 14.0501 6.75939 14.7823C4.82345 15.4161 3.08158 16.6002 1.68095 18.267C1.5529 18.4193 1.49059 18.6162 1.50774 18.8145C1.52488 19.0127 1.62006 19.196 1.77236 19.3241C1.92465 19.4521 2.12157 19.5144 2.3198 19.4973C2.51803 19.4801 2.70134 19.3849 2.82939 19.2327C4.71095 16.9864 7.30408 15.7498 10.125 15.7498C12.946 15.7498 15.5391 16.9864 17.4253 19.2327C17.5534 19.3849 17.7367 19.4801 17.9349 19.4973C18.1331 19.5144 18.3301 19.4521 18.4824 19.3241C18.6346 19.196 18.7298 19.0127 18.747 18.8145C18.7641 18.6162 18.7018 18.4193 18.5738 18.267C17.1731 16.6002 15.4313 15.4161 13.5 14.7823ZM5.25001 9.37484C5.25001 8.41066 5.53593 7.46813 6.0716 6.66644C6.60727 5.86475 7.36864 5.23991 8.25943 4.87093C9.15022 4.50195 10.1304 4.40541 11.0761 4.59351C12.0217 4.78162 12.8904 5.24592 13.5722 5.9277C14.2539 6.60948 14.7182 7.47812 14.9063 8.42378C15.0944 9.36944 14.9979 10.3496 14.6289 11.2404C14.2599 12.1312 13.6351 12.8926 12.8334 13.4283C12.0317 13.9639 11.0892 14.2498 10.125 14.2498C8.83254 14.2484 7.59343 13.7343 6.67951 12.8203C5.76559 11.9064 5.2515 10.6673 5.25001 9.37484ZM23.7806 12.5305L20.7806 15.5305C20.711 15.6002 20.6283 15.6555 20.5372 15.6933C20.4462 15.731 20.3486 15.7504 20.25 15.7504C20.1515 15.7504 20.0539 15.731 19.9628 15.6933C19.8718 15.6555 19.789 15.6002 19.7194 15.5305L18.2194 14.0305C18.0787 13.8897 17.9996 13.6989 17.9996 13.4998C17.9996 13.3008 18.0787 13.1099 18.2194 12.9692C18.3601 12.8285 18.551 12.7494 18.75 12.7494C18.949 12.7494 19.1399 12.8285 19.2806 12.9692L20.25 13.9395L22.7194 11.4692C22.8601 11.3285 23.051 11.2494 23.25 11.2494C23.449 11.2494 23.6399 11.3285 23.7806 11.4692C23.9214 11.6099 24.0004 11.8008 24.0004 11.9998C24.0004 12.1989 23.9214 12.3897 23.7806 12.5305Z"
                fill="#00A92A"
              />
            </Box>
          </Avatar>
          <Box>
            <Typography variant="h6">Task Assigned to Me</Typography>
          </Box>
          <Box sx={{ ml: -1, '& svg': { verticalAlign: 'middle' } }}>
            <Tooltip
              title="Shows the number of tasks assigned to you, including completed, pending, and overdue tasks."
              arrow
            >
              <InfoIcon size={20} />
            </Tooltip>
          </Box>
          <Box
            onClick={() => {
              void navigate({
                to: '/my-tasks',
                search: {
                  showToDo: true,
                },
              });
            }}
            component="button"
            sx={{
              cursor: 'pointer',
              backgroundColor: 'white',
              border: '1px solid var(--Neutral-Colors-300, #B4BBC5)',
              display: 'flex',
              alignItems: 'center',
              px: 0.5,
              py: 0.5,
              borderRadius: 1, // optional
            }}
          >
            <Typography color="neutral.700" fontWeight={600}>
              My Tasks
            </Typography>
            <ArrowRightIcon size={18} />
          </Box>
        </Box>

        <Box
          sx={{
            mt: 2.5,
          }}
        >
          <Box>
            <Typography variant="h2">
              {data?.totalCompletedTask}/{data?.totalTasks}
            </Typography>
          </Box>
          <Box
            sx={{
              mt: 2,
              gap: 1,
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <Box
              sx={{
                width:
                  getCompletedPercentage() === 0 &&
                  getPendingPercentage() === 0 &&
                  getOverduePercentage() === 0
                    ? '33%'
                    : getCompletedPercentage() <= 9
                      ? '9%'
                      : getCompletedPercentage() + '%',
              }}
            >
              {/* <Typography variant="caption" color="text.secondary">
                {getCompletedPercentage() === 0
                  ? '0'
                  : Math.round(getCompletedPercentage())}
                %
              </Typography> */}
              <Tooltip title="Completed" placement="top-end">
                <Box
                  sx={{
                    p: 2,
                    borderRadius: 1,
                    backgroundColor: 'success.main',
                  }}
                />
              </Tooltip>
            </Box>
            <Box
              sx={{
                width:
                  getCompletedPercentage() === 0 &&
                  getPendingPercentage() === 0 &&
                  getOverduePercentage() === 0
                    ? '33%'
                    : getPendingPercentage() <= 0
                      ? '9%'
                      : getPendingPercentage() + '%',
              }}
            >
              {/* <Typography variant="caption" color="text.secondary">
                {getPendingPercentage() === 0
                  ? '0'
                  : Math.round(getPendingPercentage())}
                %
              </Typography> */}
              <Tooltip title="Pending" placement="top-end">
                <Box
                  sx={{
                    p: 2,
                    borderRadius: 1,
                    backgroundColor: '#CE8324',
                  }}
                />
              </Tooltip>
            </Box>

            <Box
              sx={{
                width:
                  getCompletedPercentage() === 0 &&
                  getPendingPercentage() === 0 &&
                  getOverduePercentage() === 0
                    ? '33%'
                    : getOverduePercentage() <= 0
                      ? '9%'
                      : getOverduePercentage() + '%',
              }}
            >
              {/* <Typography variant="caption" color="text.secondary">
                {getOverduePercentage() === 0
                  ? '0'
                  : Math.round(getOverduePercentage())}
                %
              </Typography> */}
              <Tooltip title="Overdue" placement="top-end">
                <Box
                  sx={{
                    p: 2,
                    borderRadius: 1,
                    backgroundColor: '#EC4755',
                  }}
                />
              </Tooltip>
            </Box>
          </Box>
          <Box mt={1.3} display="flex" flexDirection="row" gap={1.2}>
            <Box
              display="flex"
              flexDirection="row"
              gap={0.5}
              alignItems="center"
            >
              <Box
                sx={{
                  width: 12,
                  height: 12,
                  borderRadius: 1,
                  backgroundColor: 'success.main',
                }}
              />
              <Typography fontSize={12}>Completed</Typography>
              <Typography fontSize={12} fontWeight={600}>
                {getCompletedPercentage() === 0
                  ? '0%'
                  : Math.round(getCompletedPercentage()) + '%'}
              </Typography>
            </Box>

            <Box
              display="flex"
              flexDirection="row"
              gap={0.5}
              alignItems="center"
            >
              <Box
                sx={{
                  width: 12,
                  height: 12,
                  borderRadius: 1,
                  backgroundColor: '#CE8324',
                }}
              />
              <Typography fontSize={12}>Pending</Typography>
              <Typography fontSize={12} fontWeight={600}>
                {getPendingPercentage() === 0
                  ? '0%'
                  : Math.round(getPendingPercentage()) + '%'}
              </Typography>
            </Box>

            <Box
              display="flex"
              flexDirection="row"
              gap={0.5}
              alignItems="center"
            >
              <Box
                sx={{
                  width: 12,
                  height: 12,
                  borderRadius: 1,
                  backgroundColor: '#EC4755',
                }}
              />
              <Typography fontSize={12}>Overdue</Typography>
              <Typography fontSize={12} fontWeight={600}>
                {getOverduePercentage() === 0
                  ? '0%'
                  : Math.round(getOverduePercentage()) + '%'}
              </Typography>
            </Box>
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
};

export default CompletedTasks;
