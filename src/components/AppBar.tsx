import {
  AppBar,
  Container,
  Toolbar,
  Typography,
  IconButton,
  Avatar,
  Box,
  Badge,
} from '@mui/material';
import { BellIcon, CaretDownIcon, TranslateIcon } from '@phosphor-icons/react';
import { useCallback, useEffect, useState } from 'react';
import { CustomSearchBar } from './CustomSearchBar';
import { searchCategories } from '../utils/searchCategories';
import AppBarPopOver from './AppBarPopOver';
import { stringAvatar } from '../utils/stringAvatar';
import { useAuth } from '../context/auth/useAuth';
import SearchBarPopOver from './SearchBarPopOver';
import { MegaphoneIcon } from '@phosphor-icons/react/dist/ssr/Megaphone';
import LanguagePopOver from './LanguagePopOver';
import { trackEvent } from '@/utils/mixPanel/mixpanel';
import NotificationPopOver from './NotificationPopOver';
import { useQuery } from '@tanstack/react-query';
import { getAllNotifications } from '@/api/notificationsManagement/getAllNotifications';
import type { notification } from '@/types/notification';

type AppBarType = {
  open: boolean;
  drawerWidth: number;
  collapsedWidth: number;
};

const AppBarComponent: React.FC<AppBarType> = (props) => {
  const { open: sidebarOpen, drawerWidth, collapsedWidth } = props;

  const [searchText, setSearchText] = useState<string>('');
  const [searchCategory, setSearchCategory] = useState<string>('Cases');

  const [unReadNotificationCount, setUnreadNotificationCount] =
    useState<number>(0);

  const [anchorElement, setAnchorElement] = useState<null | HTMLElement>(null);

  const [languageAnchorElement, setLanguageAnchorElement] =
    useState<null | HTMLElement>(null);

  const [notificationAnchorElement, setNotificationAnchorElement] =
    useState<null | HTMLElement>(null);

  const [searchAnchorElement, setSearchAnchorElement] =
    useState<null | HTMLElement>(null);

  const [scroll, setScroll] = useState(0);

  const open = Boolean(anchorElement);
  const id = open ? 'profile-popover' : undefined;

  const languageOpen = Boolean(languageAnchorElement);
  const languageId = languageOpen ? 'profile-popover' : undefined;

  const notificationOpen = Boolean(notificationAnchorElement);
  const notificationId = notificationOpen ? 'notification-popover' : undefined;

  const searchOpen = Boolean(searchAnchorElement);
  const searchId = searchOpen ? 'search-popover' : undefined;

  const { basicUserDetails } = useAuth();

  const handleScroll = useCallback(() => {
    setScroll(window.scrollY);
  }, []);

  useEffect(() => {
    window.addEventListener('scroll', handleScroll);
    return (): void => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, [handleScroll]);

  const handleClick = (event: React.MouseEvent<HTMLElement>): void => {
    setAnchorElement(event.currentTarget);
  };

  const handleClose = (): void => {
    setAnchorElement(null);
  };

  const searchHandleClose = (): void => {
    setSearchText('');
    setSearchAnchorElement(null);
  };

  const handleLanguageClick = (event: React.MouseEvent<HTMLElement>): void => {
    setLanguageAnchorElement(event.currentTarget);
  };

  const handleLanguageClose = (): void => {
    setLanguageAnchorElement(null);
  };

  const handleNotificationClick = (
    event: React.MouseEvent<HTMLElement>
  ): void => {
    setNotificationAnchorElement(event.currentTarget);
  };

  const handleNotificationClose = (): void => {
    setNotificationAnchorElement(null);
  };

  const {
    data: notificationList,
    isLoading,
    isError,
    refetch,
  } = useQuery<Array<notification>>({
    queryKey: ['notification-list'],
    queryFn: getAllNotifications,
    staleTime: 0,
    refetchOnWindowFocus: true,
    refetchInterval: 60000,
  });

  useEffect(() => {
    //get list of notifications and set badge icon accordingly
    setUnreadNotificationCount(
      notificationList
        ? notificationList.filter((notification) => !notification.isRead).length
        : 0
    );
  }, [notificationList]);

  return (
    <AppBar
      elevation={0}
      position="fixed"
      sx={{
        py: 1,
        backgroundColor: 'white',
        transition: 'all 0.3s ease',
        opacity: scroll > 100 ? 0.95 : 1,
        width: `calc(100% - ${sidebarOpen ? drawerWidth : collapsedWidth}px)`,
      }}
    >
      <Container maxWidth="xl">
        <Toolbar disableGutters>
          <Box
            display="flex"
            justifyContent={
              basicUserDetails?.role === 'legal_user'
                ? 'space-between'
                : 'flex-end'
            }
            width="100%"
          >
            {basicUserDetails?.role === 'legal_user' && (
              <CustomSearchBar
                placeHolderText="Search by Case ID, Patient Name, or other related keywords..."
                dropDownList={searchCategories}
                value={searchText}
                onDropDownValueChange={(value) => {
                  setSearchCategory(value);
                }}
                onTextChange={(
                  event: React.ChangeEvent<
                    HTMLInputElement | HTMLTextAreaElement
                  >
                ) => {
                  if (event.target.value.length <= 1) {
                    setSearchAnchorElement(null);
                  } else {
                    setSearchAnchorElement(event.currentTarget);
                  }

                  setSearchText(event.target.value);
                }}
                marginFromTop={2}
                shouldDisable={false}
                dropDownSelectedValue={searchCategory}
                ShouldShowInputAdornment
              />
            )}

            <Box display="flex" gap={1}>
              <IconButton variant="soft" onClick={handleLanguageClick}>
                <TranslateIcon />
              </IconButton>
              <IconButton
                variant="soft"
                onClick={() => {
                  void trackEvent('ZOHO referral from Opened', {
                    userId: basicUserDetails?.userId,
                  });
                  window.open(
                    `https://zfrmz.com/99pNGb15WhBli9uS9ton?Name_First=${basicUserDetails?.firstName}&Name_Last=${basicUserDetails?.lastName}&Email=${basicUserDetails?.email}`,
                    '_blank'
                  );
                }}
              >
                <MegaphoneIcon style={{ transform: 'scaleX(-1)' }} />
              </IconButton>

              <IconButton variant="soft" onClick={handleNotificationClick}>
                <Badge
                  sx={{
                    '& .MuiBadge-badge': {
                      backgroundColor: '#3957D7',
                      color: '#fff', // optional: for better contrast
                    },
                  }}
                  badgeContent={unReadNotificationCount}
                  invisible={unReadNotificationCount === 0}
                >
                  <BellIcon />
                </Badge>
              </IconButton>

              <Box
                display="flex"
                flexDirection="row"
                alignItems="center"
                gap={1}
                onClick={handleClick}
                sx={{ ml: 1, cursor: 'pointer' }}
              >
                <Avatar
                  src={`${import.meta.env.VITE_AVATAR_CLOUD_FRONT_DISTRIBUTION}${basicUserDetails?.avatar}`}
                  {...stringAvatar(
                    `${basicUserDetails?.firstName} ${basicUserDetails?.lastName}`
                  )}
                  sx={{
                    width: 32,
                    height: 32,
                  }}
                />
                <Typography fontSize={14} fontWeight={500} color="#474E5D">
                  {` ${basicUserDetails?.firstName} ${basicUserDetails?.lastName}`}
                </Typography>
                <CaretDownIcon color="#8B95A5" size={16} weight="fill" />
              </Box>
              <AppBarPopOver
                id={id}
                handleClose={handleClose}
                anchorEl={anchorElement}
                open={open}
              />

              <NotificationPopOver
                id={notificationId}
                refetch={refetch}
                handleClose={handleNotificationClose}
                anchorEl={notificationAnchorElement}
                open={notificationOpen}
                notifications={notificationList}
                isLoading={isLoading}
                isError={isError}
              />

              <LanguagePopOver
                id={languageId}
                open={languageOpen}
                handleClose={handleLanguageClose}
                anchorEl={languageAnchorElement}
              />

              {searchText.length >= 1 && (
                <SearchBarPopOver
                  id={searchId}
                  category={searchCategory}
                  searchTerms={searchText}
                  handleClose={searchHandleClose}
                  anchorEl={searchAnchorElement}
                  open={searchOpen}
                />
              )}
            </Box>
          </Box>
        </Toolbar>
      </Container>
    </AppBar>
  );
};
export default AppBarComponent;
