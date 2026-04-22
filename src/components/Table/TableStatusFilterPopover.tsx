import {
  Box,
  Button,
  Checkbox,
  Divider,
  FormControlLabel,
  Popover,
} from '@mui/material';
import { useState, useEffect } from 'react';
import { getCaseType } from '@/utils/caseType';
import { getRecordStatus } from '@/utils/recordStatus';

interface TableStatusFilterPopoverProps {
  id: string | undefined;
  open: boolean;
  handleClose: (columnId: string) => void;
  anchorEl: HTMLElement | null;
  selectedStatuses: Array<string>;
  onStatusChange: (statuses: Array<string>) => void;
  isCaseFilter: boolean;
}

const caseStatusOptions = ['open', 'closed', 'in_review'];
const recordStatusOptions = ['completed', 'failed', 'in_progress'];

const TableStatusFilterPopover: React.FC<TableStatusFilterPopoverProps> = ({
  id,
  open,
  anchorEl,
  handleClose,
  selectedStatuses,
  onStatusChange,
  isCaseFilter,
}) => {
  const [selected, setSelected] = useState<Array<string>>(selectedStatuses);

  const statusOptions = isCaseFilter ? caseStatusOptions : recordStatusOptions;

  const toggleStatus = (status: string): void => {
    setSelected((previous) =>
      previous.includes(status)
        ? previous.filter((s) => s !== status)
        : [...previous, status]
    );
  };

  const handleSelectAll = (): void => {
    if (selected.length === statusOptions.length) {
      setSelected([]);
    } else {
      setSelected([...statusOptions]);
    }
  };

  const handleReset = (): void => {
    setSelected([]);
  };

  const handleApply = (): void => {
    onStatusChange(selected);
    handleClose(id!);
  };

  useEffect(() => {
    setSelected(selectedStatuses); // sync when reopened
  }, [open, selectedStatuses]);

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
          sx: { width: 200, borderRadius: 1.25 },
        },
      }}
    >
      <Box display="flex" flexDirection="column">
        <FormControlLabel
          control={
            <Checkbox
              checked={selected.length === statusOptions.length}
              indeterminate={
                selected.length > 0 && selected.length < statusOptions.length
              }
              onChange={handleSelectAll}
            />
          }
          label="Select All"
        />
        <Divider />
        <Box marginLeft={2} display="flex" flexDirection="column">
          {statusOptions.map((status) => (
            <Box key={status}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={selected.includes(status)}
                    onChange={() => toggleStatus(status)}
                  />
                }
                label={
                  isCaseFilter ? getCaseType(status) : getRecordStatus(status)
                }
              />
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
    </Popover>
  );
};

export default TableStatusFilterPopover;
