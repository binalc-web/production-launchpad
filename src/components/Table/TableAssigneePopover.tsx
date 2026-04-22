import {
  Box,
  Button,
  Checkbox,
  Divider,
  InputBase,
  Popover,
} from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import type { Assignee } from '@/pages/CaseManagement/types/assignee';
import UserProfileTile from './UserProfileTile';
import { useEffect, useState } from 'react';
import { getAllLegalUsers } from '@/api/users/getAllLegalUsers';
import AppCustomLoader from '../AppCustomLoader';

interface TableAssigneePopoverProps {
  id: string | undefined;
  open: boolean;
  handleClose: (columnId: string) => void;
  anchorEl: HTMLElement | null;
  selectedAssignees: Array<string>;
  onAssigneeChange: (assigneeIds: Array<string>) => void;
}

const TableAssigneePopover: React.FC<TableAssigneePopoverProps> = ({
  id,
  open,
  handleClose,
  anchorEl,
  selectedAssignees,
  onAssigneeChange,
}) => {
  const [selected, setSelected] = useState<Array<string>>(selectedAssignees);
  const [searchKey, setSearchKey] = useState<string>('');

  const {
    data: assigneeList,
    isLoading,
    // isError,
    // refetch,
  }: {
    data: Array<Assignee> | undefined;
    isLoading: boolean;
    isError: boolean;
    refetch: () => void;
  } = useQuery({
    queryKey: ['assignee'],
    queryFn: async () => {
      const data = await getAllLegalUsers();
      return data;
    },
    staleTime: Infinity,
    refetchOnWindowFocus: false,
  });

  const [FilteredAssigneeList, setFilteredAssigneeList] =
    useState(assigneeList);

  const toggleStatus = (status: string): void => {
    setSelected((previous) =>
      previous.includes(status)
        ? previous.filter((s) => s !== status)
        : [...previous, status]
    );
  };

  const handleReset = (): void => {
    setSelected([]);
  };

  const handleApply = (): void => {
    onAssigneeChange(selected);
    handleClose(id!);
  };

  useEffect(() => {
    if (searchKey.trim() === '') {
      setFilteredAssigneeList(assigneeList);
    } else {
      const lowerSearchKey = searchKey.toLowerCase();
      const filtered = assigneeList?.filter(
        (user) =>
          user.firstName.toLowerCase().includes(lowerSearchKey) ||
          user.lastName.toLowerCase().includes(lowerSearchKey) ||
          user.email.toLowerCase().includes(lowerSearchKey)
      );
      setFilteredAssigneeList(filtered);
    }
  }, [searchKey]);

  useEffect(() => {
    setFilteredAssigneeList(assigneeList);
  }, [assigneeList]);

  return (
    <Popover
      id={id}
      open={open}
      anchorEl={anchorEl}
      onClose={() => handleClose(id!)}
      anchorOrigin={{
        vertical: 'bottom',
        horizontal: 'left',
      }}
      transformOrigin={{
        vertical: 'top',
        horizontal: 'left',
      }}
      slotProps={{
        paper: {
          sx: {
            width: 295,
            borderRadius: 1.25,
            height: 360,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
          },
        },
      }}
    >
      {isLoading ? (
        <AppCustomLoader height={100} />
      ) : (
        <Box display="flex" flexDirection="column" flex={1}>
          <Box display="flex" flexDirection="column">
            <InputBase
              placeholder="Search here..."
              onChange={(event) => setSearchKey(event.target.value)}
              sx={{
                margin: 1.2,
                pl: 0.8,
                border: '1px solid #ccc',
                borderRadius: 1,
                height: 38,
              }}
            />
          </Box>
          <Divider />

          <Box
            marginLeft={2}
            display="flex"
            flexDirection="column"
            sx={{
              flex: 1,
              overflowY: 'auto',
              maxHeight: 250,
            }}
          >
            {FilteredAssigneeList?.map((assignee) => (
              <Box
                key={assignee._id}
                display="flex"
                flexDirection="row"
                p={0.5}
                gap={1}
              >
                <Checkbox
                  checked={selected.includes(assignee._id)}
                  onChange={() => toggleStatus(assignee._id)}
                />

                <UserProfileTile
                  imageUrl={assignee?.avatar}
                  fullName={`${assignee.firstName} ${assignee.lastName}`}
                ></UserProfileTile>
              </Box>
            ))}
          </Box>

          <Divider />
          <Box
            display="flex"
            flexDirection="row"
            justifyContent="space-between"
            alignItems="center"
            m={1}
          >
            <Button
              variant="text"
              onClick={handleReset}
              sx={{ color: '#3957D7' }}
            >
              Reset
            </Button>
            <Button variant="contained" size="small" onClick={handleApply}>
              Okay
            </Button>
          </Box>
        </Box>
      )}
    </Popover>
  );
};
export default TableAssigneePopover;
