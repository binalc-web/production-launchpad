import { useEffect, useState, type FC } from 'react';
import {
  Drawer,
  IconButton,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Typography,
  Divider,
  Box,
  Tooltip,
} from '@mui/material';

import * as PhosphorIcons from '@phosphor-icons/react';
import type { Icon } from '@phosphor-icons/react';

import logo from '@assets/logo-white.svg';
import logoInitial from '@assets/logo-initial.svg';
import { useLocation, useNavigate } from '@tanstack/react-router';
import { useAuth } from '../context/auth/useAuth';
import { menuItems } from '../config/menu';
import { trackEvent } from '@/utils/mixPanel/mixpanel';

type CollapsibleSidebarType = {
  open: boolean;
  drawerWidth: number;
  collapsedWidth: number;
  setOpen: (open: boolean) => void;
};

const CollapsibleSidebar: FC<CollapsibleSidebarType> = (props) => {
  const { open, setOpen, drawerWidth, collapsedWidth } = props;

  const [selectedItem, setSelectedItem] = useState<string | null>(null);

  const location = useLocation(); // Get current URL
  const navigate = useNavigate();

  const { basicUserDetails } = useAuth();

  // Update selected item based on current URL
  useEffect(() => {
    const roleMenuItems =
      menuItems[basicUserDetails?.role as keyof typeof menuItems] ||
      menuItems['legal_user'];
    const matchedItem = [...roleMenuItems.general, ...roleMenuItems.tools].find(
      (item) => location.pathname.startsWith(item.path)
    );
    if (matchedItem) {
      setSelectedItem(matchedItem.key);
    }
  }, [location.pathname, basicUserDetails?.role]);

  const toggleDrawer = (): void => {
    setOpen(!open);
  };

  return (
    <Drawer
      variant="permanent"
      sx={{
        width: open ? drawerWidth : collapsedWidth,
        transition: 'width 0.3s',
        flexShrink: 0,
        '& .MuiDrawer-paper': {
          width: open ? drawerWidth : collapsedWidth,
          transition: 'width 0.3s',
          backgroundColor: 'tertiary.1000',
          color: 'common.white',
          overflowX: 'hidden',
          paddingX: open ? 2 : 1,
        },
      }}
    >
      <Box
        display="flex"
        alignItems="center"
        justifyContent="center"
        p={2}
        mt={2.4}
      >
        <Box component="img" src={open ? logo : logoInitial} alt="logo" />
      </Box>
      {open && (
        <Typography
          fontWeight={500}
          fontSize={14}
          sx={{ color: 'primary.main' }}
        >
          General
        </Typography>
      )}

      <List>
        {menuItems[
          (basicUserDetails?.role as keyof typeof menuItems) || 'legal_user'
        ].general.map((item, index) => {
          const IconComponent =
            (PhosphorIcons[item.icon as keyof typeof PhosphorIcons] as Icon) ||
            PhosphorIcons.House;
          return (
            <ListItem
              key={index}
              onClick={() => {
                setSelectedItem(item.key);
                navigate({ to: item.path }).catch((error) => {
                  console.error('Navigation error:', error);
                });
              }}
              sx={{
                justifyContent: open ? 'initial' : 'center',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                backgroundColor:
                  selectedItem === item.key ? 'info.main' : 'transparent',
                borderRadius: selectedItem === item.key ? 1 : 0,
                my: 0.5,
                p: 1,
                '&:hover': {
                  backgroundColor: '#303e49',
                  borderRadius: 1,
                },
                '& .MuiListItemText-primary': {
                  fontSize: 14,
                },
              }}
            >
              <ListItemIcon
                sx={{
                  ml: 0.5,
                  color: 'common.white',
                  minWidth: 0,
                  justifyContent: 'center',
                }}
              >
                <IconComponent size={20} />
              </ListItemIcon>
              {open && (
                <Tooltip title={item.text} placement="right">
                  <ListItemText
                    primary={item.text}
                    sx={{ ml: 1, fontSize: 14 }}
                  />
                </Tooltip>
              )}
            </ListItem>
          );
        })}
      </List>

      <Divider sx={{ borderColor: '#374956', borderWidth: '1px' }} />

      {open && (
        <Typography
          fontWeight={500}
          fontSize={14}
          sx={{ color: 'primary.main', marginTop: 2 }}
        >
          Tools
        </Typography>
      )}

      <List>
        {menuItems[
          (basicUserDetails?.role as keyof typeof menuItems) || 'legal_user'
        ].tools

          .filter(
            (item) =>
              basicUserDetails?.isOrganizationAdmin ||
              item.key !== 'organization-users'
          )
          .map((item, index) => {
            const IconComponent =
              (PhosphorIcons[
                item.icon as keyof typeof PhosphorIcons
              ] as Icon) || PhosphorIcons.House;
            return (
              <ListItem
                key={index}
                onClick={() => {
                  if (item.key === 'referral-program') {
                    void trackEvent('ZOHO referral from Opened', {
                      userId: basicUserDetails?.userId,
                    });
                    window.open(
                      `https://zfrmz.com/99pNGb15WhBli9uS9ton?Name_First=${basicUserDetails?.firstName}&Name_Last=${basicUserDetails?.lastName}&Email=${basicUserDetails?.email}`,
                      '_blank'
                    );
                  } else {
                    setSelectedItem(item.key);
                    navigate({ to: item.path }).catch((error) => {
                      console.error('Navigation error:', error);
                    });
                  }
                }}
                sx={{
                  justifyContent: open ? 'initial' : 'center',
                  cursor: 'pointer',
                  color:
                    item.key === 'referral-program'
                      ? '#80A4ED'
                      : 'common.white',
                  backgroundColor:
                    selectedItem === item.key ? 'info.main' : 'transparent',
                  borderRadius: selectedItem === item.key ? 1 : 0,
                  my: 0.5,
                  p: 1,
                  transition: 'all 0.3s ease',
                  '&:hover': {
                    backgroundColor: '#303e49',
                    borderRadius: 1,
                  },
                  '& .MuiListItemText-primary': {
                    fontSize: 14,
                  },
                }}
              >
                <ListItemIcon
                  sx={{
                    color: 'common.white',
                    ml: 0.5,
                    minWidth: 0,
                    justifyContent: 'center',
                  }}
                >
                  <IconComponent
                    size={20}
                    style={
                      item.key === 'referral-program'
                        ? { transform: 'scaleX(-1)', color: '#80A4ED' }
                        : {}
                    }
                  />
                </ListItemIcon>
                {open && (
                  <Tooltip
                    title={
                      item.key === 'organization-users'
                        ? `Organization ${basicUserDetails?.organizationName}`
                        : item.text
                    }
                    placement="right"
                  >
                    <ListItemText
                      primary={
                        item.key === 'organization-users'
                          ? `Organization ${basicUserDetails?.organizationName??''}`
                          : item.text
                      }
                      slotProps={{
                        primary: {
                          noWrap: true,
                        },
                      }}
                      sx={{ ml: 1 }}
                    />
                  </Tooltip>
                )}
              </ListItem>
            );
          })}
      </List>

      <IconButton
        onClick={toggleDrawer}
        variant="soft"
        sx={{
          position: 'absolute',
          bottom: 16,
          right: 0,
          transform: 'translateX(-50%)',
        }}
      >
        {open ? (
          <PhosphorIcons.ArrowLineLeft size={24} color="#99BAC7" />
        ) : (
          <PhosphorIcons.ArrowLineRight color="#99BAC7" />
        )}
      </IconButton>
    </Drawer>
  );
};

export default CollapsibleSidebar;
