import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Box,
  Drawer,
  Toolbar,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Divider,
  Typography,
  Collapse,
  Badge,
} from '@mui/material';
import {
  MenuBook,
  FolderOpen,
  BookmarkBorder,
  Settings,
  ExitToApp,
  ExpandLess,
  ExpandMore,
  Dashboard as DashboardIcon,
  School,
  Share as ShareIcon,
  LocalOffer as TagIcon,
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';

// Sidebar width
const drawerWidth = 240;

export default function Sidebar({
  mobileOpen,
  handleDrawerToggle,
  subjects = [],
  currentSubjectId = null,
  activeView = 'subjects',
  sharedItemsCount = 0,
  tagsCount = 0,
}) {
  const navigate = useNavigate();
  const location = useLocation();
  const { logout } = useAuth();
  const [subjectsOpen, setSubjectsOpen] = useState(true);

  // Determine if we're on a subject detail page
  const isSubjectDetail = location.pathname.startsWith('/subject/');

  // Auto expand subjects when a subject is selected
  useEffect(() => {
    if (isSubjectDetail) {
      setSubjectsOpen(true);
    }
  }, [isSubjectDetail]);

  const handleSubjectsClick = () => {
    setSubjectsOpen(!subjectsOpen);
  };

  async function handleLogout() {
    try {
      await logout();
      navigate('/login');
    } catch {
      console.error('Failed to log out');
    }
  }

  const isCurrentPage = (path) => {
    return location.pathname === path;
  };

  const isCurrentSubject = (subjectId) => {
    return currentSubjectId === subjectId;
  };

  const isCurrentSection = (section) => {
    if (section === 'dashboard') {
      // Dashboard tab is active only when on dashboard page and no specific view is active
      return isCurrentPage('/dashboard') && activeView === 'dashboard';
    } else if (section === 'subjects') {
      // Subjects tab is active when viewing a subject detail or the subjects list
      return (
        isSubjectDetail ||
        (isCurrentPage('/dashboard') && activeView === 'subjects')
      );
    } else if (section === 'shared') {
      // Shared tab is active when viewing shared content
      return isCurrentPage('/dashboard') && activeView === 'shared';
    } else if (section === 'recent') {
      // Recent tab is active when viewing recent notes
      return isCurrentPage('/dashboard') && activeView === 'recent';
    } else if (section === 'tags') {
      // Tags tab is active when viewing tags
      return isCurrentPage('/dashboard') && activeView === 'tags';
    }
    return false;
  };

  // Sidebar content
  const drawer = (
    <div>
      <Toolbar
        sx={{ flexDirection: 'column', alignItems: 'flex-start', py: 2 }}
      >
        <Box
          sx={{ display: 'flex', alignItems: 'center', width: '100%', mb: 1 }}
        >
          <MenuBook sx={{ mr: 2 }} />
          <Typography
            variant="h6"
            component="div"
            sx={{ cursor: 'pointer' }}
            onClick={() => navigate('/dashboard')}
          >
            StudyHub
          </Typography>
        </Box>
      </Toolbar>
      <Divider />
      <List>
        {/* Dashboard - separate tab */}
        <ListItem
          button
          onClick={() =>
            navigate('/dashboard', { state: { view: 'dashboard' } })
          }
          selected={isCurrentSection('dashboard')}
        >
          <ListItemIcon>
            <DashboardIcon
              color={isCurrentSection('dashboard') ? 'primary' : 'inherit'}
            />
          </ListItemIcon>
          <ListItemText
            primary="Dashboard"
            primaryTypographyProps={{
              color: isCurrentSection('dashboard') ? 'primary' : 'inherit',
              fontWeight: isCurrentSection('dashboard') ? 'bold' : 'normal',
            }}
          />
        </ListItem>
      </List>

      <Divider sx={{ my: 1 }} />

      <List>
        {/* My Subjects - now clearly separated */}
        <ListItem
          button
          onClick={handleSubjectsClick}
          selected={isCurrentSection('subjects')}
        >
          <ListItemIcon>
            <School
              color={isCurrentSection('subjects') ? 'primary' : 'inherit'}
            />
          </ListItemIcon>
          <ListItemText
            primary="My Subjects"
            primaryTypographyProps={{
              color: isCurrentSection('subjects') ? 'primary' : 'inherit',
              fontWeight: isCurrentSection('subjects') ? 'bold' : 'normal',
            }}
          />
          {subjectsOpen ? <ExpandLess /> : <ExpandMore />}
        </ListItem>

        <Collapse in={subjectsOpen} timeout="auto" unmountOnExit>
          <List component="div" disablePadding>
            {subjects.map((subject) => (
              <ListItem
                button
                key={subject.id}
                sx={{ pl: 4 }}
                selected={isCurrentSubject(subject.id)}
                onClick={() => navigate(`/subject/${subject.id}`)}
              >
                <ListItemIcon>
                  <FolderOpen
                    fontSize="small"
                    color={isCurrentSubject(subject.id) ? 'primary' : 'inherit'}
                  />
                </ListItemIcon>
                <ListItemText
                  primary={subject.title}
                  primaryTypographyProps={{
                    color: isCurrentSubject(subject.id) ? 'primary' : 'inherit',
                    fontWeight: isCurrentSubject(subject.id)
                      ? 'bold'
                      : 'normal',
                  }}
                />
              </ListItem>
            ))}
          </List>
        </Collapse>

        {/* Shared With Me section */}
        <ListItem
          button
          onClick={() => navigate('/dashboard', { state: { view: 'shared' } })}
          selected={isCurrentSection('shared')}
        >
          <ListItemIcon>
            <ShareIcon
              color={isCurrentSection('shared') ? 'primary' : 'inherit'}
            />
          </ListItemIcon>
          <ListItemText
            primary={
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <span>Shared Content</span>
              </Box>
            }
            primaryTypographyProps={{
              color: isCurrentSection('shared') ? 'primary' : 'inherit',
              fontWeight: isCurrentSection('shared') ? 'bold' : 'normal',
            }}
          />
        </ListItem>

        {/* Tags section */}
        <ListItem
          button
          onClick={() => navigate('/dashboard', { state: { view: 'tags' } })}
          selected={isCurrentSection('tags')}
        >
          <ListItemIcon>
            <TagIcon color={isCurrentSection('tags') ? 'primary' : 'inherit'} />
          </ListItemIcon>
          <ListItemText
            primary={
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <span>Tags</span>
                {tagsCount > 0 && (
                  <Badge
                    color="primary"
                    badgeContent={tagsCount}
                    sx={{ ml: 1 }}
                  />
                )}
              </Box>
            }
            primaryTypographyProps={{
              color: isCurrentSection('tags') ? 'primary' : 'inherit',
              fontWeight: isCurrentSection('tags') ? 'bold' : 'normal',
            }}
          />
        </ListItem>

        {/* Recent Notes */}
        <ListItem
          button
          onClick={() => navigate('/dashboard', { state: { view: 'recent' } })}
          selected={isCurrentSection('recent')}
        >
          <ListItemIcon>
            <BookmarkBorder
              color={isCurrentSection('recent') ? 'primary' : 'inherit'}
            />
          </ListItemIcon>
          <ListItemText
            primary="Recent Notes"
            primaryTypographyProps={{
              color: isCurrentSection('recent') ? 'primary' : 'inherit',
              fontWeight: isCurrentSection('recent') ? 'bold' : 'normal',
            }}
          />
        </ListItem>
      </List>
      <Divider />
      <List>
        <ListItem button onClick={() => navigate('/profile')}>
          <ListItemIcon>
            <Settings />
          </ListItemIcon>
          <ListItemText primary="Profile Settings" />
        </ListItem>
        <ListItem button onClick={handleLogout}>
          <ListItemIcon>
            <ExitToApp />
          </ListItemIcon>
          <ListItemText primary="Logout" />
        </ListItem>
      </List>

      {isSubjectDetail && currentSubjectId && (
        <>
          <Divider />
          <Box sx={{ p: 2 }}>
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
              Current Subject
            </Typography>
            <Typography variant="body1" fontWeight="medium">
              {subjects.find((s) => s.id === currentSubjectId)?.title || ''}
            </Typography>
          </Box>
        </>
      )}
    </div>
  );

  return (
    <Box
      component="nav"
      sx={{ width: { sm: drawerWidth }, flexShrink: { sm: 0 } }}
      aria-label="menu options"
    >
      {/* Mobile drawer */}
      <Drawer
        variant="temporary"
        open={mobileOpen}
        onClose={handleDrawerToggle}
        ModalProps={{
          keepMounted: true, // Better open performance on mobile
        }}
        sx={{
          display: { xs: 'block', sm: 'none' },
          '& .MuiDrawer-paper': {
            boxSizing: 'border-box',
            width: drawerWidth,
          },
        }}
      >
        {drawer}
      </Drawer>

      {/* Desktop drawer */}
      <Drawer
        variant="permanent"
        sx={{
          display: { xs: 'none', sm: 'block' },
          '& .MuiDrawer-paper': {
            boxSizing: 'border-box',
            width: drawerWidth,
          },
        }}
        open
      >
        {drawer}
      </Drawer>
    </Box>
  );
}
