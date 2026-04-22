import type { FC } from 'react';

import {
  Avatar,
  Box,
  Card,
  Tooltip,
  Typography,
  CardContent,
} from '@mui/material';
import { InfoIcon } from '@phosphor-icons/react';

type PendingTaskProps = {
  data: {
    totalTasks: number;
    pendingTask: number;
    totalCompletedTask: number;
    completedTaskPercentage: string;
    pendingTaskPercentage: string;
  };
};

const PendingTasks: FC<PendingTaskProps> = (props) => {
  const { data } = props;

  const getPendingPercentage = (): number => {
    if (!data) return 0;

    const percentage = data.pendingTaskPercentage
      ? parseFloat(data.pendingTaskPercentage.replace('%', ''))
      : (data.pendingTask / data.totalTasks) * 100 || 0;
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
              width="44px"
              height="44px"
              viewBox="0 0 41 40"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <Box
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
                d="M29.6665 20C29.6665 21.78 29.1387 23.5201 28.1497 25.0001C27.1608 26.4802 25.7552 27.6337 24.1107 28.3149C22.4661 28.9961 20.6565 29.1743 18.9107 28.8271C17.1649 28.4798 15.5612 27.6226 14.3025 26.364C13.0439 25.1053 12.1867 23.5016 11.8394 21.7558C11.4922 20.01 11.6704 18.2004 12.3516 16.5558C13.0328 14.9113 14.1863 13.5057 15.6664 12.5168C17.1464 11.5278 18.8865 11 20.6665 11C23.0535 11 25.3426 11.9482 27.0305 13.636C28.7183 15.3239 29.6665 17.6131 29.6665 20Z"
                fill="#00A92A"
              />
              <Box
                component="path"
                d="M24.9471 17.2194C25.0169 17.289 25.0722 17.3717 25.1099 17.4628C25.1477 17.5538 25.1671 17.6514 25.1671 17.75C25.1671 17.8486 25.1477 17.9462 25.1099 18.0372C25.0722 18.1283 25.0169 18.211 24.9471 18.2806L19.6971 23.5306C19.6275 23.6004 19.5448 23.6557 19.4537 23.6934C19.3627 23.7312 19.2651 23.7506 19.1665 23.7506C19.0679 23.7506 18.9704 23.7312 18.8793 23.6934C18.7883 23.6557 18.7055 23.6004 18.6359 23.5306L16.3859 21.2806C16.2452 21.1399 16.1661 20.949 16.1661 20.75C16.1661 20.551 16.2452 20.3601 16.3859 20.2194C16.5266 20.0786 16.7175 19.9996 16.9165 19.9996C17.1155 19.9996 17.3064 20.0786 17.4471 20.2194L19.1665 21.9397L23.8859 17.2194C23.9555 17.1496 24.0383 17.0943 24.1293 17.0566C24.2204 17.0188 24.3179 16.9994 24.4165 16.9994C24.5151 16.9994 24.6127 17.0188 24.7037 17.0566C24.7948 17.0943 24.8775 17.1496 24.9471 17.2194ZM30.4165 20C30.4165 21.9284 29.8447 23.8134 28.7733 25.4168C27.702 27.0202 26.1793 28.2699 24.3977 29.0078C22.6161 29.7458 20.6557 29.9389 18.7644 29.5627C16.8731 29.1865 15.1358 28.2579 13.7722 26.8943C12.4087 25.5307 11.4801 23.7934 11.1039 21.9021C10.7276 20.0108 10.9207 18.0504 11.6587 16.2688C12.3966 14.4873 13.6463 12.9645 15.2497 11.8932C16.8531 10.8218 18.7381 10.25 20.6665 10.25C23.2515 10.2527 25.7299 11.2808 27.5578 13.1087C29.3857 14.9366 30.4138 17.415 30.4165 20ZM28.9165 20C28.9165 18.3683 28.4327 16.7733 27.5261 15.4165C26.6196 14.0598 25.3311 13.0024 23.8236 12.378C22.3162 11.7536 20.6574 11.5902 19.057 11.9085C17.4567 12.2268 15.9867 13.0126 14.8329 14.1664C13.6791 15.3202 12.8934 16.7902 12.575 18.3905C12.2567 19.9908 12.4201 21.6496 13.0445 23.1571C13.6689 24.6646 14.7263 25.9531 16.0831 26.8596C17.4398 27.7661 19.0348 28.25 20.6665 28.25C22.8538 28.2475 24.9508 27.3775 26.4974 25.8309C28.044 24.2843 28.914 22.1873 28.9165 20Z"
                fill="#00A92A"
              />
            </Box>
          </Avatar>
          <Box>
            <Typography variant="h6">Pending Tasks</Typography>
          </Box>
          <Box sx={{ ml: -1, '& svg': { verticalAlign: 'middle' } }}>
            <Tooltip title="No. of pending tasks out of completed tasks" arrow>
              <InfoIcon size={20} />
            </Tooltip>
          </Box>
        </Box>
        <Box
          sx={{
            mt: 2.5,
          }}
        >
          <Box>
            <Typography variant="h2">
              {data?.pendingTask}/{data?.totalTasks}
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
                  getCompletedPercentage() === 0
                    ? '50%'
                    : getCompletedPercentage() + '%',
              }}
            >
              <Typography variant="caption" color="text.secondary">
                {getCompletedPercentage() === 0
                  ? '0'
                  : Math.round(getCompletedPercentage())}
                %
              </Typography>
              <Box
                sx={{
                  p: 2,
                  borderRadius: 1,
                  backgroundColor: 'success.main',
                }}
              />
            </Box>
            <Box
              sx={{
                width:
                  getPendingPercentage() === 0
                    ? '50%'
                    : getPendingPercentage() + '%',
              }}
            >
              <Typography variant="caption" color="text.secondary">
                {getPendingPercentage() === 0
                  ? '0'
                  : Math.round(getPendingPercentage())}
                %
              </Typography>
              <Box
                sx={{
                  p: 2,
                  borderRadius: 1,
                  backgroundColor: '#B2FFC4',
                }}
              />
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
                  backgroundColor: '#B2FFC4',
                }}
              />
              <Typography fontSize={12}>Pending</Typography>
              <Typography fontSize={12} fontWeight={600}>
                {getPendingPercentage() === 0
                  ? '0%'
                  : Math.round(getPendingPercentage()) + '%'}
              </Typography>
            </Box>
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
};

export default PendingTasks;
