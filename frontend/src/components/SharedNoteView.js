import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import {
  Box,
  Typography,
  Paper,
  Button,
  CircularProgress,
  Container,
  Breadcrumbs,
  Link,
  Chip,
  Tooltip,
  Grid,
  Card,
  CardContent,
  CardActions,
  AppBar,
  Toolbar,
  IconButton,
  Divider,
  useTheme,
  useMediaQuery,
  CssBaseline,
  Drawer,
  Stack,
} from '@mui/material';
import {
  ArrowBack,
  Person as PersonIcon,
  AccessTime as AccessTimeIcon,
  Warning as WarningIcon,
  LocalOffer as TagIcon,
  Menu as MenuIcon,
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { getNoteById } from '../services/subjectService';
import { getItemShares } from '../services/sharingService';
import Sidebar from './Sidebar';

// Sidebar width - consistent with other components
const drawerWidth = 240;

export default function SharedNoteView() {
  const { noteId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { currentUser } = useAuth();
  const [note, setNote] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [shareDetails, setShareDetails] = useState(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  useEffect(() => {
    const fetchNoteDetails = async () => {
      setLoading(true);
      try {
        // Fetch the shared note
        const noteData = await getNoteById(noteId);
        if (!noteData) {
          throw new Error('Note not found or you do not have access');
        }

        // Log the full structure to see what's available
        console.log('Fetched note data:', noteData);

        // Log specific fields we're interested in
        console.log('Subject info:', {
          subjectId: noteData.subjectId,
          subjectTitle: noteData.subjectTitle,
          subject: noteData.subject,
        });

        console.log('User info:', {
          createdBy: noteData.createdBy,
          sharedBy: noteData.sharedBy,
          createdByUser: noteData.createdByUser,
          sharedByUser: noteData.sharedByUser,
        });

        setNote(noteData);

        // Get sharing details
        try {
          const shareData = await getItemShares(noteId, 'note');
          console.log('Share details:', shareData);
          if (shareData && shareData.length > 0) {
            console.log('Using first share detail:', shareData[0]);
            setShareDetails(shareData[0]);
          }
        } catch (shareError) {
          console.warn('Unable to fetch share details:', shareError);
        }

        setLoading(false);
      } catch (err) {
        console.error('Error fetching note:', err);
        setError(err.message || 'Failed to load note');
        setLoading(false);
      }
    };

    if (noteId) {
      fetchNoteDetails();
    }
  }, [noteId, currentUser?.uid]);

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const handleBack = () => {
    navigate('/dashboard', { state: { view: 'shared' } });
  };

  const createMarkup = (htmlContent) => {
    return { __html: htmlContent };
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return 'Unknown date';
    try {
      const date = new Date(timestamp);
      return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
    } catch (e) {
      return 'Unknown date';
    }
  };

  // Helper function to get subject name safely
  const getSubjectName = () => {
    // Check all possible paths for subject title
    if (note.subjectTitle && typeof note.subjectTitle === 'string') {
      return note.subjectTitle;
    }

    if (note.subject && note.subject.title) {
      return note.subject.title;
    }

    // Try to get from shareDetails
    if (shareDetails && shareDetails.subjectTitle) {
      return shareDetails.subjectTitle;
    }

    // If we have a subjectId, display that with a fallback message
    if (note.subjectId) {
      return `Subject ID: ${note.subjectId}`;
    }

    return 'Unknown Subject';
  };

  // Helper function to get shared by info safely
  const getSharedByInfo = () => {
    // Check all possible paths for owner name
    // From note direct fields
    if (note.createdByName) return note.createdByName;
    if (note.sharedByName) return note.sharedByName;

    // From user objects
    if (note.createdByUser) {
      if (note.createdByUser.displayName) return note.createdByUser.displayName;
      if (note.createdByUser.name) return note.createdByUser.name;
      if (note.createdByUser.email) return note.createdByUser.email;
    }

    if (note.sharedByUser) {
      if (note.sharedByUser.displayName) return note.sharedByUser.displayName;
      if (note.sharedByUser.name) return note.sharedByUser.name;
      if (note.sharedByUser.email) return note.sharedByUser.email;
    }

    // Try to get from shareDetails
    if (shareDetails) {
      if (shareDetails.sharedByName) return shareDetails.sharedByName;
      if (shareDetails.sharedBy) return shareDetails.sharedBy;
    }

    // As a fallback, try direct ID fields but make it clear it's an ID
    if (note.sharedBy) return `User: ${note.sharedBy}`;
    if (note.createdBy) return `User: ${note.createdBy}`;

    return 'Unknown User';
  };

  // Loading state
  if (loading) {
    return (
      <Box sx={{ display: 'flex' }}>
        <CssBaseline />
        <AppBar
          position="fixed"
          sx={{ zIndex: (theme) => theme.zIndex.drawer + 1 }}
        >
          <Toolbar>
            <IconButton
              color="inherit"
              aria-label="open drawer"
              edge="start"
              onClick={handleDrawerToggle}
              sx={{ mr: 2, display: { sm: 'none' } }}
            >
              <MenuIcon />
            </IconButton>
            <Typography variant="h6" noWrap component="div">
              StudyHub - Shared Note
            </Typography>
          </Toolbar>
        </AppBar>
        <Sidebar
          mobileOpen={mobileOpen}
          handleDrawerToggle={handleDrawerToggle}
        />
        <Box
          component="main"
          sx={{
            flexGrow: 1,
            p: 3,
            width: { sm: `calc(100% - ${drawerWidth}px)` },
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            minHeight: '100vh',
          }}
        >
          <Toolbar />
          <CircularProgress />
        </Box>
      </Box>
    );
  }

  // Error state
  if (error) {
    return (
      <Box sx={{ display: 'flex' }}>
        <CssBaseline />
        <AppBar
          position="fixed"
          sx={{ zIndex: (theme) => theme.zIndex.drawer + 1 }}
        >
          <Toolbar>
            <IconButton
              color="inherit"
              aria-label="open drawer"
              edge="start"
              onClick={handleDrawerToggle}
              sx={{ mr: 2, display: { sm: 'none' } }}
            >
              <MenuIcon />
            </IconButton>
            <Typography variant="h6" noWrap component="div">
              StudyHub - Error
            </Typography>
          </Toolbar>
        </AppBar>
        <Sidebar
          mobileOpen={mobileOpen}
          handleDrawerToggle={handleDrawerToggle}
        />
        <Box
          component="main"
          sx={{
            flexGrow: 1,
            p: 3,
            width: { sm: `calc(100% - ${drawerWidth}px)` },
          }}
        >
          <Toolbar />
          <Paper sx={{ p: 3, mb: 3 }}>
            <Typography variant="h5" color="error" gutterBottom>
              Error
            </Typography>
            <Typography>{error}</Typography>
            <Button
              variant="contained"
              startIcon={<ArrowBack />}
              onClick={handleBack}
              sx={{ mt: 2 }}
            >
              Back to Dashboard
            </Button>
          </Paper>
        </Box>
      </Box>
    );
  }

  // Note not found state
  if (!note) {
    return (
      <Box sx={{ display: 'flex' }}>
        <CssBaseline />
        <AppBar
          position="fixed"
          sx={{ zIndex: (theme) => theme.zIndex.drawer + 1 }}
        >
          <Toolbar>
            <IconButton
              color="inherit"
              aria-label="open drawer"
              edge="start"
              onClick={handleDrawerToggle}
              sx={{ mr: 2, display: { sm: 'none' } }}
            >
              <MenuIcon />
            </IconButton>
            <Typography variant="h6" noWrap component="div">
              StudyHub - Note Not Found
            </Typography>
          </Toolbar>
        </AppBar>
        <Sidebar
          mobileOpen={mobileOpen}
          handleDrawerToggle={handleDrawerToggle}
        />
        <Box
          component="main"
          sx={{
            flexGrow: 1,
            p: 3,
            width: { sm: `calc(100% - ${drawerWidth}px)` },
          }}
        >
          <Toolbar />
          <Paper sx={{ p: 3, mb: 3 }}>
            <Typography variant="h5" gutterBottom>
              Note Not Found
            </Typography>
            <Typography>
              The shared note you're looking for doesn't exist or you don't have
              access to it.
            </Typography>
            <Button
              variant="contained"
              startIcon={<ArrowBack />}
              onClick={handleBack}
              sx={{ mt: 2 }}
            >
              Back to Dashboard
            </Button>
          </Paper>
        </Box>
      </Box>
    );
  }

  // Main component rendering
  return (
    <Box sx={{ display: 'flex' }}>
      <CssBaseline />
      <AppBar
        position="fixed"
        sx={{
          width: { sm: `calc(100% - ${drawerWidth}px)` },
          ml: { sm: `${drawerWidth}px` },
        }}
      >
        <Toolbar>
          <IconButton
            color="inherit"
            aria-label="open drawer"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ mr: 2, display: { sm: 'none' } }}
          >
            <MenuIcon />
          </IconButton>
          <Box sx={{ display: 'flex', alignItems: 'center', width: '100%' }}>
            <Typography
              variant="h6"
              noWrap
              component="div"
              sx={{ flexGrow: 1 }}
            >
              {note.title || 'Untitled Note'}
            </Typography>
            <Chip
              icon={<PersonIcon />}
              label="Shared Note"
              color="secondary"
              size="small"
              sx={{
                ml: 1,
                color: 'white',
                backgroundColor: 'rgba(255,255,255,0.2)',
              }}
            />
          </Box>
        </Toolbar>
      </AppBar>

      <Sidebar
        mobileOpen={mobileOpen}
        handleDrawerToggle={handleDrawerToggle}
      />

      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          width: { sm: `calc(100% - ${drawerWidth}px)` },
        }}
      >
        <Toolbar />

        {/* Breadcrumbs */}
        <Breadcrumbs aria-label="breadcrumb" sx={{ mb: 2 }}>
          <Link
            underline="hover"
            color="inherit"
            onClick={() => navigate('/dashboard')}
            sx={{ cursor: 'pointer' }}
          >
            Dashboard
          </Link>
          <Link
            underline="hover"
            color="inherit"
            onClick={() =>
              navigate('/dashboard', { state: { view: 'shared' } })
            }
            sx={{ cursor: 'pointer' }}
          >
            Shared Content
          </Link>
          <Typography color="text.primary">
            {note.title || 'Untitled Note'}
          </Typography>
        </Breadcrumbs>

        {/* Note Info Card */}
        <Paper
          elevation={2}
          sx={{
            p: 3,
            mb: 3,
            background:
              theme.palette.mode === 'dark'
                ? 'linear-gradient(135deg, #2d3748 0%, #1a202c 100%)'
                : 'linear-gradient(135deg, #f5f7fa 0%, #e4e8f0 100%)',
          }}
        >
          <Stack spacing={2}>
            <Box>
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: 1,
                }}
              >
                <Typography variant="h5" component="h1" sx={{ mr: 1 }}>
                  {note.title || 'Untitled Note'}
                </Typography>
                <Chip
                  icon={<PersonIcon />}
                  label="Shared Note"
                  color="secondary"
                  size="small"
                />
              </Box>

              <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
                <Chip
                  label={`From: ${getSubjectName()}`}
                  size="small"
                  variant="outlined"
                  sx={{ mr: 1 }}
                />
                <Tooltip title="You have access to this note, but not its parent subject">
                  <WarningIcon fontSize="small" color="warning" />
                </Tooltip>
              </Box>
            </Box>

            <Divider />

            <Box>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                <Chip
                  icon={<PersonIcon />}
                  label={`Shared by: ${getSharedByInfo()}`}
                  size="small"
                  variant="outlined"
                />
                <Chip
                  icon={<AccessTimeIcon />}
                  label={`Last updated: ${formatDate(
                    note.updatedAt || note.createdAt
                  )}`}
                  size="small"
                  variant="outlined"
                />
                {note.tags &&
                  note.tags.length > 0 &&
                  note.tags.map((tag) => (
                    <Chip
                      key={tag}
                      icon={<TagIcon />}
                      label={tag}
                      size="small"
                      variant="outlined"
                    />
                  ))}
              </Box>

              <Button
                variant="contained"
                startIcon={<ArrowBack />}
                onClick={handleBack}
                sx={{ mt: 2 }}
              >
                Back to Dashboard
              </Button>
            </Box>
          </Stack>
        </Paper>

        {/* Note Content */}
        <Card variant="outlined" sx={{ mb: 3 }}>
          <CardContent>
            <Paper
              elevation={0}
              sx={{
                p: 3,
                minHeight: '300px',
                backgroundColor: '#fff',
                '& img': { maxWidth: '100%' },
              }}
            >
              <div
                className="note-content"
                dangerouslySetInnerHTML={createMarkup(note.content || '')}
              />
            </Paper>
          </CardContent>
        </Card>

        {/* Media Items (if any) */}
        {note.mediaItems && note.mediaItems.length > 0 && (
          <Box sx={{ mt: 3 }}>
            <Typography variant="h6" gutterBottom>
              Attachments
            </Typography>
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: 'repeat(12, 1fr)',
                gap: 2,
              }}
            >
              {note.mediaItems.map((media, index) => (
                <Box
                  sx={{
                    gridColumn: { xs: 'span 12', sm: 'span 6', md: 'span 4' },
                  }}
                  key={index}
                >
                  <Card variant="outlined">
                    <CardContent>
                      <Typography variant="subtitle1">
                        {media.title || `${media.type} ${index + 1}`}
                      </Typography>
                      {media.type === 'image' && (
                        <Box
                          component="img"
                          src={media.url}
                          alt={media.title || 'Image'}
                          sx={{
                            maxWidth: '100%',
                            maxHeight: '200px',
                            objectFit: 'contain',
                            display: 'block',
                            margin: '0 auto',
                            mt: 1,
                          }}
                        />
                      )}
                      {media.type === 'file' && (
                        <Typography variant="body2" sx={{ mt: 1 }}>
                          File attachment
                        </Typography>
                      )}
                      {media.type === 'link' && (
                        <Typography variant="body2" sx={{ mt: 1 }}>
                          Link: {media.url}
                        </Typography>
                      )}
                    </CardContent>
                    <CardActions>
                      <Button
                        size="small"
                        href={media.url}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        Open {media.type}
                      </Button>
                    </CardActions>
                  </Card>
                </Box>
              ))}
            </Box>
          </Box>
        )}
      </Box>
    </Box>
  );
}
