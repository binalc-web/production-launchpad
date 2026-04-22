import {
  Box,
  InputAdornment,
  InputBase,
  MenuItem,
  Select,
  type SelectChangeEvent,
} from '@mui/material';
import { MagnifyingGlassIcon } from '@phosphor-icons/react';
import type { SearchCategory } from '../utils/searchCategories';

interface CustomSearchBarProps {
  dropDownSelectedValue?: string;
  value?: string;
  placeHolderText: string;
  onTextChange: (
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => void;
  onDropDownValueChange: (value: string) => void;
  shouldDisable: boolean;
  marginFromTop: number;
  dropDownList: Array<SearchCategory>;
  ShouldShowInputAdornment?: boolean;
}
export const CustomSearchBar: React.FC<CustomSearchBarProps> = ({
  dropDownList,
  dropDownSelectedValue,
  onDropDownValueChange,
  value,
  placeHolderText,
  onTextChange,
  shouldDisable,
  ShouldShowInputAdornment,
}) => {
  return (
    <>
      <Box
        sx={{
          width: '65%',
          display: 'flex',
          borderRadius: '6px',
          border: '1px solid',
          borderColor: 'divider',
          fontSize: 16,
        }}
      >
        <Select
          required
          value={dropDownSelectedValue || ''}
          disabled={shouldDisable}
          displayEmpty
          onChange={(event: SelectChangeEvent<string>) =>
            onDropDownValueChange(event.target.value)
          }
          input={
            <InputBase
              sx={{
                width: '25%',
                border: '1px solid',
                borderTop: 0,
                borderLeft: 0,
                borderBottom: 0,
                borderColor: 'divider',
                borderRadius: '0px !important',
                px: 1.2,
              }}
            ></InputBase>
          }
        >
          {dropDownList.map((item, index) => {
            return (
              <MenuItem key={index} value={item.value}>
                {item.value}
              </MenuItem>
            );
          })}
        </Select>
        <InputBase
          sx={{
            width: '75%',
          }}
          placeholder={placeHolderText}
          required
          value={value}
          onChange={(
            event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
          ) => {
            onTextChange(event);
          }}
          disabled={shouldDisable}
          startAdornment={
            ShouldShowInputAdornment && (
              <InputAdornment position="start">
                <MagnifyingGlassIcon />
              </InputAdornment>
            )
          }
        />
      </Box>
    </>
  );
};
