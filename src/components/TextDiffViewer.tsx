import { Box, Typography } from '@mui/material';
import { diffChars } from 'diff';
import type { JSX } from 'react';

/**
 * Component to display the difference between two strings.
 * @param string1 The first string (current).
 * @param string2 The second string (previous).
 * @returns A React component that displays the difference between the two strings.
 */
export function TextDiffViewer({
  string1,
  string2,
}: {
  string1?: string | null;
  string2?: string | null;
}): JSX.Element {
  const safeString1 = string1 ?? '';
  const safeString2 = string2 ?? '';
  const changes = diffChars(safeString2, safeString1, {}) ?? [];
  return (
    <Box
      sx={{
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-word',
      }}
    >
      {changes &&
        changes.length > 0 &&
        changes.map((part, index) => (
          !part.removed && (
          <Typography
            component="span"
            key={index}
            sx={{
              color: part.added ? '#3957D7' : part.removed ? 'red' : 'inherit',
              textDecoration: part.removed ? 'line-through' : 'none',
              fontStyle: part.added ? 'italic' : 'normal',
              bgcolor: part.added ? '#DEE7FB' : 'transparent',
              fontSize: '16px',
            }}
          >
            {part.value}
          </Typography>
          )
        ))}
    </Box>
  );
}
