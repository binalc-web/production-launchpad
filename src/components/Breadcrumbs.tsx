import type { ElementType, ReactNode } from 'react';
import { Link } from '@tanstack/react-router';

import { HouseLineIcon } from '@phosphor-icons/react';

import { Breadcrumbs as MUIBreadcrumbs, Typography, Box } from '@mui/material';

export interface BreadcrumbItem {
  title: string;
  url?: string;
  icon?: ElementType;
  onClick?: () => void;
}

export interface BreadcrumbsProps {
  items: Array<BreadcrumbItem>;
}

const BreadcrumbsComponent = ({ items }: BreadcrumbsProps): ReactNode => {
  return (
    <MUIBreadcrumbs
      sx={{
        '& .MuiBreadcrumbs-separator': {
          display: 'flex',
          alignItems: 'center',
        },
      }}
    >
      <Box
        component={Link}
        to="/dashboard"
        sx={{
          display: 'flex',
          alignItems: 'center',
          textDecoration: 'none',
        }}
      >
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            mr: 0.5,
            '& svg': {
              fill: (theme) => theme.palette.neutral[400],
              '&:hover': {
                fill: (theme) => theme.palette.info.dark,
              },
            },
          }}
        >
          <HouseLineIcon size={18} weight="fill" />
        </Box>
      </Box>

      {items.map((item, index) => {
        const isLast = index === items.length - 1;
        const ItemIcon = item.icon;

        if (isLast) {
          return (
            <Typography
              key={`breadcrumb-${index}`}
              color="text.primary"
              sx={{ display: 'flex', alignItems: 'center', fontSize: 14 }}
            >
              {ItemIcon && (
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    mr: 0.5,
                    '& svg': {
                      fill: (theme) => theme.palette.neutral[400],
                    },
                  }}
                >
                  <ItemIcon size={18} weight="fill" />
                </Box>
              )}
              {item.title}
            </Typography>
          );
        }

        return (
          <Box
            component={Link}
            key={`breadcrumb-${index}`}
            to={item.url || '/'}
            onClick={(event) => {
              if (item.onClick) {
                event.preventDefault();
                item.onClick();
              }
            }}
            sx={{
              fontSize: 14,
              display: 'flex',
              alignItems: 'center',
              textDecoration: 'none',
              color: 'text.secondary',
              '&:hover': {
                color: 'info.dark',
                '& svg': {
                  fill: (theme) => theme.palette.info.dark,
                },
              },
            }}
          >
            {ItemIcon && (
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  mr: 0.5,
                  '& svg': {
                    fill: (theme) => theme.palette.neutral[400],
                  },
                }}
              >
                <ItemIcon size={18} weight="fill" />
              </Box>
            )}
            {item.title}
          </Box>
        );
      })}
    </MUIBreadcrumbs>
  );
};

export default BreadcrumbsComponent;
