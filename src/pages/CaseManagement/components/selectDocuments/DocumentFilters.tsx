import { type FC, useState } from 'react';
import {
  Box,
  Button,
  Divider,
  InputAdornment,
  InputBase,
  Menu,
  MenuItem,
  Typography,
} from '@mui/material';
import {
  FileTextIcon,
  MagnifyingGlassIcon,
  CalendarBlankIcon,
  CaretDownIcon,
  StethoscopeIcon,
  InvoiceIcon,
} from '@phosphor-icons/react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { datepickerStyles } from '@/components/ReactDatepicker/styles';
import { DOC_TYPES, DocumentTypeEnum, type DocumentType } from './types';

type DocumentFiltersProps = {
  search: string;
  onSearchChange: (value: string) => void;
  dateRange: [Date | null, Date | null];
  onDateRangeChange: (range: [Date | null, Date | null]) => void;
  typeFilter: DocumentType | '';
  onTypeFilterChange: (type: DocumentType | '') => void;
};

const DocumentFilters: FC<DocumentFiltersProps> = ({
  search,
  onSearchChange,
  dateRange,
  onDateRangeChange,
  typeFilter,
  onTypeFilterChange,
}) => {
  const [typeAnchorElement, setTypeAnchorElement] =
    useState<null | HTMLElement>(null);

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 2,
        mb: 2.5,
        flexWrap: 'wrap',
      }}
    >
      {/* Search */}
      <InputBase
        value={search}
        onChange={(event) => onSearchChange(event.target.value)}
        placeholder="Search here..."
        sx={{
          width: 500,
          border: '1px solid',
          borderColor: 'divider',
          borderRadius: 1.5,
          px: 1.5,
          height: 40,
          fontSize: 14,
          bgcolor: 'background.paper',
        }}
        startAdornment={
          <InputAdornment position="start">
            <MagnifyingGlassIcon size={16} color="#8B95A5" />
          </InputAdornment>
        }
      />

      <Box sx={{ display: 'flex', gap: 2 }}>
        {/* Date range picker */}
        <Box
          sx={{
            position: 'relative',
            ...datepickerStyles,
            '& .react-datepicker-wrapper': { display: 'block' },
            '& input': {
              height: 40,
              minWidth: '220px',
              border: '1px solid',
              borderColor: dateRange[0] ? 'primary.main' : 'divider',
              borderRadius: '6px',
              paddingLeft: '36px',
              paddingRight: '12px',
              fontSize: 14,
              color: dateRange[0] ? 'primary.main' : 'text.secondary',
              bgcolor: 'background.paper',
              cursor: 'pointer',
              outline: 'none',
              width: '100%',
            },
            '& .react-datepicker__calendar-icon': {
              top: '50%',
              transform: 'translateY(-50%)',
              left: 8,
              width: 16,
              height: 16,
              color: dateRange[0] ? 'primary.main' : '#8B95A5',
            },
          }}
        >
          <DatePicker
            selectsRange
            showIcon
            icon={<CalendarBlankIcon size={16} />}
            startDate={dateRange[0]}
            endDate={dateRange[1]}
            onChange={(dates) => {
              if (Array.isArray(dates)) {
                onDateRangeChange(dates);
              }
            }}
            minDate={new Date(new Date().getFullYear() - 100, 0, 1)}
            maxDate={new Date()}
            showYearDropdown
            scrollableYearDropdown
            yearDropdownItemNumber={100}
            showMonthDropdown
            monthsShown={1}
            dateFormat="MM/dd/yyyy"
            placeholderText="Start Date – End Date"
            isClearable
          />
        </Box>

        {/* Document Type filter */}
        <Button
          variant="outlined"
          size="medium"
          startIcon={<FileTextIcon size={16} />}
          endIcon={<CaretDownIcon size={14} />}
          onClick={(event) => setTypeAnchorElement(event.currentTarget)}
          sx={{
            borderColor: typeFilter ? 'primary.main' : 'divider',
            color: typeFilter ? 'primary.main' : 'text.secondary',
            textTransform: 'none',
            height: 40,
            minWidth: 160,
            fontWeight: 400,
            bgcolor: 'background.paper',
          }}
        >
          {typeFilter || 'Document Type'}
        </Button>
      </Box>

      <Menu
        anchorEl={typeAnchorElement}
        open={Boolean(typeAnchorElement)}
        onClose={() => setTypeAnchorElement(null)}
        PaperProps={{ sx: { borderRadius: 2, minWidth: 160, mt: 0.5 } }}
      >
        <MenuItem
          dense
          onClick={() => {
            onTypeFilterChange('');
            setTypeAnchorElement(null);
          }}
        >
          <Typography variant="body2" color="text.secondary">
            Reset
          </Typography>
        </MenuItem>
        <Divider />
        {DOC_TYPES.map((type) => (
          <MenuItem
            key={type}
            dense
            selected={typeFilter === type}
            onClick={() => {
              onTypeFilterChange(type);
              setTypeAnchorElement(null);
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              {type === DocumentTypeEnum.MEDICAL && (
                <StethoscopeIcon size={14} />
              )}
              {type === DocumentTypeEnum.BILLING && <InvoiceIcon size={14} />}
              <Typography variant="body2">{type}</Typography>
            </Box>
          </MenuItem>
        ))}
      </Menu>
    </Box>
  );
};

export default DocumentFilters;
