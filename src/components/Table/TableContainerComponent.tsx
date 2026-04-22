import {
  Box,
  InputAdornment,
  InputBase,
  MenuItem,
  OutlinedInput,
  Pagination,
  Paper,
  Select,
  type SelectChangeEvent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableFooter,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import {
  CaretDownIcon,
  CaretUpIcon,
  CaretUpDownIcon,
  FunnelIcon,
  MagnifyingGlassIcon,
} from '@phosphor-icons/react';

import {
  type ColumnDef,
  type ColumnFiltersState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  type SortingState,
  useReactTable,
} from '@tanstack/react-table';
import { useState, type JSX } from 'react';
import AppCustomLoader from '../AppCustomLoader';

type TableContainerComponentProps<T> = {
  title: string;
  data: Array<T>;
  columns: Array<ColumnDef<T>>;
  currentPage: number;
  rowsPerPage: number;
  totalPages: number;
  totalRecords: number;
  isLoading: boolean;
  activeFilterColumn: Array<string> | null;
  handlePageChange: (_event: unknown, newPage: number) => void;
  handleChangeRowsPerPage: (event: SelectChangeEvent<number>) => void;
  onFilterClick?: (anchorElement: HTMLElement | null, columnId: string) => void;
  onRowClick?: (rowData: T) => void;
  handleTableSearch: (value: string) => void;
};

const TableContainerComponent = <T,>({
  title,
  data,
  columns,
  currentPage,
  rowsPerPage,
  totalPages,
  totalRecords,
  handlePageChange,
  handleChangeRowsPerPage,
  onFilterClick,
  handleTableSearch,
  isLoading,
  activeFilterColumn,
  onRowClick,
}: TableContainerComponentProps<T>): JSX.Element => {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);

  const table = useReactTable<T>({
    data,
    columns,
    state: {
      sorting,
      columnFilters,
    },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  });

  return (
    <TableContainer
      component={Paper}
      sx={{
        padding: 2,
        borderRadius: 1.6,
        width: '100%',
        overflowX: 'auto', // This enables horizontal scroll
        whiteSpace: 'nowrap',
      }}
    >
      <Box p={2} display="flex" justifyContent="space-between">
        <Typography fontWeight={600} fontSize={20}>
          {title}
        </Typography>

        <InputBase
          placeholder="Search by case id or name.."
          onChange={(event) => handleTableSearch(event.target.value)}
          sx={{
            paddingX: 1,
            border: '1px solid #ccc',
            borderRadius: 1,
            height: 38,
            width: 365,
            '& .MuiInputBase-input::placeholder': {
              color: 'neutral.400',
              opacity: 1,
            },
          }}
          startAdornment={
            <InputAdornment position="start">
              <MagnifyingGlassIcon />
            </InputAdornment>
          }
        />
      </Box>
      <Table>
        <TableHead
          sx={{
            backgroundColor: '#F6F7F9',
          }}
        >
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id}>
              {headerGroup.headers.map((header, index) => {
                const isFirst = index === 0;
                const isLast = index === headerGroup.headers.length - 1;
                const canSort = header.column.getCanSort();
                const isSorted = header.column.getIsSorted();

                const SortIcon = {
                  asc: (
                    <CaretUpIcon
                      size={16}
                      weight="fill"
                      style={{ opacity: 0.3 }}
                    />
                  ),
                  desc: (
                    <CaretDownIcon
                      size={16}
                      weight="fill"
                      style={{ opacity: 0.3 }}
                    />
                  ),
                  false: (
                    <CaretUpDownIcon
                      size={16}
                      weight="fill"
                      style={{ opacity: 0.3 }}
                    />
                  ),
                }[(isSorted as string) || 'false'];

                return (
                  <TableCell
                    sx={{
                      cursor: canSort ? 'pointer' : 'default',
                      borderTopLeftRadius: isFirst ? 10 : 0,
                      borderBottomLeftRadius: isFirst ? 10 : 0,
                      borderTopRightRadius: isLast ? 10 : 0,
                      borderBottomRightRadius: isLast ? 10 : 0,
                      userSelect: 'none',
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Box>
                        {flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                      </Box>

                      {canSort && (
                        <Box
                          onClick={
                            canSort
                              ? header.column.getToggleSortingHandler()
                              : undefined
                          }
                          sx={{
                            display: 'flex',
                            alignItems: 'center',
                            ml: 0.5,
                          }}
                        >
                          {SortIcon}
                        </Box>
                      )}
                      {header.column.getCanFilter() && (
                        <Box
                          onClick={(event) => {
                            onFilterClick?.(
                              event.currentTarget,
                              header.column.id
                            );
                          }}
                          sx={{
                            display: 'flex',
                            alignItems: 'center',
                            ml: 0.5,
                          }}
                        >
                          <FunnelIcon
                            size={16}
                            weight="fill"
                            style={{
                              opacity: activeFilterColumn?.includes(
                                header.column.id
                              )
                                ? 1
                                : 0.3,
                            }}
                          />
                        </Box>
                      )}
                    </Box>
                  </TableCell>
                );
              })}
            </TableRow>
          ))}
        </TableHead>
        {data.length > 0 && (
          <TableBody>
            {table.getRowModel().rows.map((row) => (
              <TableRow
                key={row.id}
                onClick={() => (onRowClick ? onRowClick(row.original) : null)}
                sx={{
                  cursor: onRowClick ? 'pointer' : 'default',
                }}
              >
                {row.getVisibleCells().map((cell) => (
                  <TableCell
                    sx={{
                      borderBottom: '1px solid #ccc',
                    }}
                  >
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        )}
        {data.length > 0 && (
          <TableFooter>
            <TableRow>
              <TableCell colSpan={100} sx={{ borderBottom: 'none' }}>
                <Box
                  display="flex"
                  flexDirection="row"
                  width="100%"
                  justifyContent="space-between"
                  alignItems="center"
                >
                  <Typography>
                    Showing{' '}
                    {currentPage === 1
                      ? currentPage
                      : currentPage * rowsPerPage - rowsPerPage + 1}{' '}
                    to{' '}
                    {totalRecords < currentPage * rowsPerPage
                      ? totalRecords
                      : currentPage * rowsPerPage}{' '}
                    of {totalRecords} results
                  </Typography>
                  <Box
                    display="flex"
                    flexDirection="row"
                    gap={2}
                    alignItems="center"
                  >
                    <Pagination
                      count={totalPages}
                      variant="outlined"
                      shape="rounded"
                      color="primary"
                      page={currentPage}
                      onChange={handlePageChange}
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        height: 48,
                      }}
                    />
                    <Select
                      value={rowsPerPage}
                      sx={{
                        height: 32,
                      }}
                      label="rows"
                      input={
                        <OutlinedInput notched={false} sx={{ height: 32 }} />
                      }
                      onChange={handleChangeRowsPerPage}
                    >
                      <MenuItem value={10}>10/Page</MenuItem>
                      <MenuItem value={20}>20/Page</MenuItem>
                      <MenuItem value={50}>50/page</MenuItem>
                      <MenuItem value={100}>100/page</MenuItem>
                    </Select>
                  </Box>
                </Box>
              </TableCell>
            </TableRow>
          </TableFooter>
        )}
      </Table>
      {data.length === 0 && (
        <Box
          display="flex"
          gap={1.6}
          height="55vh"
          alignItems="center"
          justifyContent="center"
          flexDirection="column"
        >
          {isLoading ? (
            <AppCustomLoader height={150} />
          ) : (
            <>
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
            </>
          )}
        </Box>
      )}
    </TableContainer>
  );
};

export default TableContainerComponent;
