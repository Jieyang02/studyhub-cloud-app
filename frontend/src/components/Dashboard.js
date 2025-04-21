import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  CardActions,
  Button,
  CircularProgress,
  AppBar,
  Toolbar,
  IconButton,
  Avatar,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Fab,
  Badge,
  Tooltip,
  Container,
  Divider,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Chip,
} from '@mui/material';
import {
  Add,
  Menu as MenuIcon,
  Share as ShareIcon,
  PersonAdd,
  Edit as EditIcon,
  Delete as DeleteIcon,
  School,
  Folder,
  Note as NoteIcon,
  Warning as WarningIcon,
  LocalOffer as TagIcon,
} from '@mui/icons-material';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  getAllSubjects,
  getUserSubjects,
  createSubject,
  getSubjectById,
  updateSubject,
  deleteSubject,
  getRecentNotes,
  getNoteById,
} from '../services/subjectService';
import {
  shareItem,
  getSharedWithUser,
  getItemsSharedByMe,
  removeSharing,
} from '../services/sharingService';
import { getAllTags, getNotesByTag } from '../services/tagService';
import Sidebar from './Sidebar';
import ShareDialog from './ShareDialog';

// Sidebar width
const drawerWidth = 240;

export default function Dashboard() {
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [subjects, setSubjects] = useState([]);
  const [sharedSubjects, setSharedSubjects] = useState([]);
  const [sharedByMeItems, setSharedByMeItems] = useState([]);
  const [sharedNotes, setSharedNotes] = useState([]);
  const [recentNotes, setRecentNotes] = useState([]);
  const [tags, setTags] = useState([]);
  const [selectedTag, setSelectedTag] = useState(null);
  const [notesByTag, setNotesByTag] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [mobileOpen, setMobileOpen] = useState(false);
  const [openDialog, setOpenDialog] = useState(false);
  const [newSubject, setNewSubject] = useState({ title: '', description: '' });
  const [editSubject, setEditSubject] = useState(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [activeView, setActiveView] = useState('dashboard');

  // Share dialog state
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [currentShareItem, setCurrentShareItem] = useState(null);

  useEffect(() => {
    // Check if we have a view change in location state
    if (location.state?.view) {
      setActiveView(location.state.view);
      // Clear the location state to prevent it from persisting
      window.history.replaceState({}, document.title);
    }
  }, [location]);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // Always fetch tags for the sidebar count
        if (activeView === 'tags' || activeView === 'dashboard') {
          const userTags = await getAllTags();
          setTags(userTags);

          // If a tag is selected, fetch notes for that tag
          if (selectedTag && activeView === 'tags') {
            const taggedNotes = await getNotesByTag(selectedTag);
            setNotesByTag(taggedNotes);
          }
        }

        let fetchedSubjects;
        if (activeView === 'subjects') {
          fetchedSubjects = await getUserSubjects();
          setSubjects(fetchedSubjects);
        } else if (activeView === 'shared') {
          // Fetch user's own subjects to identify owned content
          const userOwnedSubjects = await getUserSubjects();
          const userOwnedSubjectIds = new Set(
            userOwnedSubjects.map((subject) => subject.id)
          );

          // Reset shared content states
          setSharedSubjects([]);
          setSharedNotes([]);
          setSharedByMeItems([]);

          // Run both API calls in parallel to improve performance
          const [sharedWithMeResponse, sharedByMeResponse] = await Promise.all([
            getSharedWithUser(),
            getItemsSharedByMe(),
          ]);

          // Process items shared BY the current user
          const sharedByMeItemIds = new Set();

          // Track items shared by the user for filtering
          sharedByMeResponse.forEach((item) => {
            sharedByMeItemIds.add(`${item.itemType}-${item.itemId}`);
          });

          // Process shared by me items - detailed data
          const processedSharedByMeItems = await Promise.all(
            sharedByMeResponse.map(async (item) => {
              const createdAt =
                item.createdAt || item.sharedAt || new Date().toISOString();
              const validCreatedAt =
                new Date(createdAt).toString() === 'Invalid Date'
                  ? new Date().toISOString()
                  : createdAt;

              let itemTitle = item.itemTitle || 'Unnamed Item';
              let subjectId = item.subjectId;

              // Get full details based on item type
              if (item.itemType === 'note') {
                try {
                  const noteData = await getNoteById(item.itemId);
                  if (noteData) {
                    itemTitle = noteData.title || itemTitle;
                    subjectId = noteData.subjectId || subjectId;
                  }
                } catch (err) {
                  console.error(
                    `Error fetching note data for ${item.itemId}:`,
                    err
                  );
                }
              } else if (item.itemType === 'subject') {
                try {
                  const subjectData = await getSubjectById(item.itemId);
                  if (subjectData) {
                    itemTitle = subjectData.title || itemTitle;
                    subjectId = item.itemId;
                  }
                } catch (err) {
                  console.error(
                    `Error fetching subject data for ${item.itemId}:`,
                    err
                  );
                }
              }

              return {
                ...item,
                itemTitle,
                createdAt: validCreatedAt,
                subjectId,
              };
            })
          );

          setSharedByMeItems(processedSharedByMeItems);

          // Process items shared WITH the current user (exclude those shared by the user)
          const sharedWithMeItems = sharedWithMeResponse.filter((item) => {
            // Skip if the current user shared this item themselves
            const itemKey = `${item.itemType}-${item.itemId}`;

            // Also ensure the item was shared by someone else, not the current user
            return (
              !sharedByMeItemIds.has(itemKey) &&
              item.sharedBy !== currentUser.uid
            );
          });

          // Process shared subjects
          const subjectPromises = [];
          const notePromises = [];

          for (const item of sharedWithMeItems) {
            if (item.itemType === 'subject') {
              subjectPromises.push(
                getSubjectById(item.itemId)
                  .then((subjectData) => ({
                    ...subjectData,
                    sharedBy: item.sharedBy || 'Unknown',
                    sharedAt: item.sharedAt || new Date().toISOString(),
                    itemType: 'subject',
                  }))
                  .catch((err) => {
                    console.error(
                      `Error fetching shared subject ${item.itemId}:`,
                      err
                    );
                    return null;
                  })
              );
            } else if (item.itemType === 'note') {
              notePromises.push(
                getNoteById(item.itemId)
                  .then((noteData) => {
                    // Skip notes from subjects owned by the current user or if noteData is undefined
                    if (
                      !noteData ||
                      userOwnedSubjectIds.has(noteData.subjectId)
                    ) {
                      return null;
                    }

                    return {
                      ...noteData,
                      sharedBy: item.sharedBy || 'Unknown',
                      sharedAt: item.sharedAt || new Date().toISOString(),
                      itemType: 'note',
                    };
                  })
                  .catch((err) => {
                    console.error(
                      `Error fetching shared note ${item.itemId}:`,
                      err
                    );
                    return null;
                  })
              );
            }
          }

          // Resolve all promises
          const [resolvedSubjects, resolvedNotes] = await Promise.all([
            Promise.all(subjectPromises),
            Promise.all(notePromises),
          ]);

          // Filter out null results
          setSharedSubjects(
            resolvedSubjects.filter((subject) => subject !== null)
          );
          setSharedNotes(resolvedNotes.filter((note) => note !== null));
        } else if (activeView === 'recent') {
          // Fetch recent notes
          const notes = await getRecentNotes(10); // Fetch 10 most recent notes
          setRecentNotes(notes);
        } else if (activeView !== 'tags') {
          // Dashboard view - fetch all types of content
          const [
            allSubjects,
            recentNotesData,
            sharedWithMeData,
            sharedByMeData,
            userTags,
          ] = await Promise.all([
            getAllSubjects(),
            getRecentNotes(5),
            getSharedWithUser(),
            getItemsSharedByMe(),
            getAllTags(),
          ]);

          setSubjects(allSubjects);
          setRecentNotes(recentNotesData);
          setTags(userTags);

          // Process shared by me items for count purposes
          setSharedByMeItems(sharedByMeData);

          // Create set of IDs shared by user for filtering
          const sharedByMeItemIds = new Set(
            sharedByMeData.map((item) => `${item.itemType}-${item.itemId}`)
          );

          // Filter out items shared by the current user
          const sharedWithMeItems = sharedWithMeData.filter((item) => {
            const itemKey = `${item.itemType}-${item.itemId}`;
            return (
              !sharedByMeItemIds.has(itemKey) &&
              item.sharedBy !== currentUser.uid
            );
          });

          // Just count them, don't resolve details for dashboard overview
          const sharedWithMeSubjects = sharedWithMeItems.filter(
            (item) => item.itemType === 'subject'
          );
          const sharedWithMeNotes = sharedWithMeItems.filter(
            (item) => item.itemType === 'note'
          );

          setSharedSubjects(sharedWithMeSubjects);
          setSharedNotes(sharedWithMeNotes);
        }
        setLoading(false);
      } catch (err) {
        console.error('Failed to fetch data:', err);
        setError(err.message || 'Failed to fetch data');
        setLoading(false);
      }
    };

    fetchData();
  }, [activeView, currentUser?.uid, selectedTag]);

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  async function handleLogout() {
    setError('');
    try {
      await logout();
      navigate('/login');
    } catch {
      setError('Failed to log out');
    }
  }

  const handleViewNotes = (subjectId) => {
    navigate(`/subject/${subjectId}`);
  };

  const handleAddSubject = () => {
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setNewSubject({ title: '', description: '' });
  };

  const handleCreateSubject = async () => {
    if (!newSubject.title) {
      setError('Subject title is required');
      return;
    }

    try {
      // Create subject via API
      const subjectData = {
        title: newSubject.title,
        description: newSubject.description,
      };

      const createdSubject = await createSubject(subjectData);

      // Add to local state
      setSubjects((prev) => [...prev, createdSubject]);
      handleCloseDialog();
    } catch (err) {
      console.error('Failed to create subject:', err);
      setError(err.message || 'Failed to create subject');
    }
  };

  const handleSwitchView = (view) => {
    setActiveView(view);
  };

  // Sharing functionality
  const handleOpenShareDialog = (subject) => {
    setCurrentShareItem(subject);
    setShareDialogOpen(true);
  };

  const handleCloseShareDialog = () => {
    setShareDialogOpen(false);
    setCurrentShareItem(null);
  };

  const handleShare = async (shareData) => {
    try {
      // Share item via API
      const result = await shareItem(shareData);
      console.log('Sharing result:', result);

      // Show a success message
      alert(
        `${
          shareData.itemType === 'subject' ? 'Subject' : 'Note'
        } shared successfully!`
      );
    } catch (err) {
      console.error('Failed to share item:', err);
      setError(err.message || 'Failed to share item');
    }
  };

  const handleEditSubject = (subject) => {
    setEditSubject(subject);
    setEditDialogOpen(true);
  };

  const handleCloseEditDialog = () => {
    setEditDialogOpen(false);
    setEditSubject(null);
  };

  const handleUpdateSubject = async () => {
    if (!editSubject || !editSubject.title) {
      setError('Subject title is required');
      return;
    }

    try {
      setLoading(true);
      // Update subject via API
      const updatedSubject = await updateSubject(editSubject.id, {
        title: editSubject.title,
        description: editSubject.description || '',
      });

      // Update local state
      setSubjects((prevSubjects) =>
        prevSubjects.map((s) =>
          s.id === updatedSubject.id ? updatedSubject : s
        )
      );

      handleCloseEditDialog();
      setLoading(false);
    } catch (err) {
      console.error('Failed to update subject:', err);
      setError(err.message || 'Failed to update subject');
      setLoading(false);
    }
  };

  const handleDeleteSubject = async (subjectId) => {
    try {
      await deleteSubject(subjectId);
      setSubjects((prevSubjects) =>
        prevSubjects.filter((s) => s.id !== subjectId)
      );
    } catch (err) {
      console.error('Failed to delete subject:', err);
      setError(err.message || 'Failed to delete subject');
    }
  };

  const handleTagSelect = async (tag) => {
    setSelectedTag(tag);
  };

  // Render tag-based notes
  const renderTagsView = () => {
    if (loading) {
      return (
        <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
          <CircularProgress />
        </Box>
      );
    }

    return (
      <>
        <Typography variant="h5" component="h2" gutterBottom>
          Tags
        </Typography>

        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle1" gutterBottom>
            Select a tag to view related notes:
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
            {tags.length === 0 ? (
              <Typography color="text.secondary">
                No tags found. Add tags to your notes to see them here.
              </Typography>
            ) : (
              tags.map((tag) => (
                <Chip
                  key={tag}
                  label={tag}
                  icon={<TagIcon />}
                  onClick={() => handleTagSelect(tag)}
                  color={selectedTag === tag ? 'primary' : 'default'}
                  variant={selectedTag === tag ? 'filled' : 'outlined'}
                  sx={{ m: 0.5 }}
                />
              ))
            )}
          </Box>
        </Box>

        {selectedTag && (
          <>
            <Typography variant="h6" gutterBottom>
              Notes tagged with "{selectedTag}"
            </Typography>

            {notesByTag.length === 0 ? (
              <Typography color="text.secondary">
                No notes found with this tag.
              </Typography>
            ) : (
              <Grid container spacing={3}>
                {notesByTag
                  .filter((note) => note && note.id)
                  .map((note) => (
                    <Grid item xs={12} sm={6} md={4} key={note.id}>
                      <Card variant="outlined">
                        <CardContent>
                          <Typography variant="h6" component="div" gutterBottom>
                            {note.title}
                          </Typography>
                          <Typography
                            variant="body2"
                            color="text.secondary"
                            gutterBottom
                          >
                            {subjects.find((s) => s.id === note.subjectId)
                              ?.title || 'Unknown Subject'}
                          </Typography>
                          <div
                            dangerouslySetInnerHTML={{
                              __html: note.content
                                ? note.content.substring(0, 150) +
                                  (note.content.length > 150 ? '...' : '')
                                : 'No content available',
                            }}
                          />
                          {note.tags && note.tags.length > 0 && (
                            <Box
                              sx={{
                                mt: 2,
                                display: 'flex',
                                flexWrap: 'wrap',
                                gap: 0.5,
                              }}
                            >
                              {note.tags.map((tag) => (
                                <Chip
                                  key={tag}
                                  label={tag}
                                  size="small"
                                  variant="outlined"
                                  sx={{ mr: 0.5 }}
                                />
                              ))}
                            </Box>
                          )}
                        </CardContent>
                        <CardActions>
                          <Button
                            size="small"
                            color="primary"
                            onClick={() =>
                              navigate(`/subject/${note.subjectId}`, {
                                state: {
                                  openNote: note.id,
                                  isSharedNote: true,
                                },
                              })
                            }
                          >
                            View Note
                          </Button>
                        </CardActions>
                      </Card>
                    </Grid>
                  ))}
              </Grid>
            )}
          </>
        )}
      </>
    );
  };

  // Render recent notes
  const renderRecentNotes = () => {
    if (recentNotes.length === 0) {
      return (
        <Box sx={{ p: 3, textAlign: 'center' }}>
          <Typography variant="h6" color="text.secondary">
            No recent notes found
          </Typography>
          <Button
            variant="contained"
            sx={{ mt: 2 }}
            onClick={() =>
              navigate('/dashboard', { state: { view: 'subjects' } })
            }
          >
            Go to My Subjects
          </Button>
        </Box>
      );
    }

    return recentNotes
      .filter((note) => note && note.id) // Filter out null or undefined notes or notes without IDs
      .map((note) => (
        <Grid item xs={12} key={note.id}>
          <Card variant="outlined">
            <CardContent>
              <Typography variant="h6" component="div" gutterBottom>
                {note.title}
              </Typography>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Subject:{' '}
                {subjects.find((s) => s.id === note.subjectId)?.title ||
                  'Unknown'}
              </Typography>
              <div
                dangerouslySetInnerHTML={{
                  __html: note.content
                    ? note.content.substring(0, 150) +
                      (note.content.length > 150 ? '...' : '')
                    : 'No content available',
                }}
              />
            </CardContent>
            <CardActions>
              <Button
                size="small"
                color="primary"
                onClick={() =>
                  navigate(`/shared-note/${note.id}`, {
                    state: {
                      noteId: note.id,
                      isSharedNote: true,
                    },
                  })
                }
              >
                View Full Note
              </Button>
            </CardActions>
          </Card>
        </Grid>
      ));
  };

  // Calculate badge count for shared items
  const sharedWithMeCount = sharedSubjects.length + sharedNotes.length;
  const totalSharedCount = sharedWithMeCount + sharedByMeItems.length;

  let mainContent;
  if (loading) {
    mainContent = (
      <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
        <CircularProgress />
      </Box>
    );
  } else {
    switch (activeView) {
      case 'dashboard':
        mainContent = (
          <>
            <Typography variant="h5" component="h2" gutterBottom>
              Overview
            </Typography>
            <Grid container spacing={3}>
              <Grid item xs={12} sm={6} md={4}>
                <Card variant="outlined" sx={{ height: '100%' }}>
                  <CardContent>
                    <Typography variant="h6" component="div" gutterBottom>
                      My Subjects
                    </Typography>
                    <Typography variant="h3" color="primary">
                      {subjects.length}
                    </Typography>
                  </CardContent>
                  <CardActions>
                    <Button
                      size="small"
                      color="primary"
                      onClick={() => handleSwitchView('subjects')}
                    >
                      View All Subjects
                    </Button>
                  </CardActions>
                </Card>
              </Grid>
              <Grid item xs={12} sm={6} md={4}>
                <Card variant="outlined" sx={{ height: '100%' }}>
                  <CardContent>
                    <Typography variant="h6" component="div" gutterBottom>
                      Shared Content
                    </Typography>
                    <Typography variant="h3" color="primary">
                      {totalSharedCount}
                    </Typography>
                  </CardContent>
                  <CardActions>
                    <Button
                      size="small"
                      color="primary"
                      onClick={() => handleSwitchView('shared')}
                    >
                      View Shared Content
                    </Button>
                  </CardActions>
                </Card>
              </Grid>
              <Grid item xs={12} sm={6} md={4}>
                <Card variant="outlined" sx={{ height: '100%' }}>
                  <CardContent>
                    <Typography variant="h6" component="div" gutterBottom>
                      Tags
                    </Typography>
                    <Typography variant="h3" color="primary">
                      {tags.length}
                    </Typography>
                  </CardContent>
                  <CardActions>
                    <Button
                      size="small"
                      color="primary"
                      onClick={() => handleSwitchView('tags')}
                    >
                      Browse by Tags
                    </Button>
                  </CardActions>
                </Card>
              </Grid>
            </Grid>
          </>
        );
        break;
      case 'subjects':
        mainContent = (
          <>
            <Typography variant="h5" component="h2" gutterBottom>
              My Subjects
            </Typography>
            {subjects.length === 0 ? (
              <Typography variant="body1" sx={{ mt: 2 }}>
                No subjects created yet. Create your first subject to get
                started!
              </Typography>
            ) : (
              <Grid container spacing={3}>
                {subjects.map((subject) => (
                  <Grid item xs={12} sm={6} md={4} key={subject.id}>
                    <Card
                      variant="outlined"
                      sx={{
                        height: '100%',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                      }}
                    >
                      <CardContent>
                        <Typography variant="h6" component="div">
                          {subject.title}
                        </Typography>
                        <Typography
                          variant="body2"
                          color="text.secondary"
                          sx={{ mt: 1 }}
                        >
                          {subject.description}
                        </Typography>
                      </CardContent>
                      <CardActions sx={{ justifyContent: 'space-between' }}>
                        <Button
                          size="small"
                          color="primary"
                          onClick={() => handleViewNotes(subject.id)}
                        >
                          View Notes
                        </Button>
                        <IconButton
                          size="small"
                          color="primary"
                          onClick={() => handleEditSubject(subject)}
                        >
                          <EditIcon fontSize="small" />
                        </IconButton>
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => handleDeleteSubject(subject.id)}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                        <Tooltip title="Share this subject">
                          <IconButton
                            size="small"
                            color="secondary"
                            onClick={() =>
                              handleOpenShareDialog({
                                ...subject,
                                itemType: 'subject',
                              })
                            }
                          >
                            <ShareIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </CardActions>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            )}
          </>
        );
        break;
      case 'shared':
        mainContent = (
          <>
            <Typography variant="h5" component="h2" gutterBottom>
              Shared Content
            </Typography>

            {/* Section for content shared WITH the user */}
            <Box
              sx={{
                mb: 4,
                p: 3,
                borderRadius: 2,
                position: 'relative',
                overflow: 'hidden',
                background: 'linear-gradient(135deg, #f5f7fa 0%, #e4e8f0 100%)',
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
              }}
            >
              <Box
                sx={{
                  position: 'absolute',
                  right: 0,
                  top: 0,
                  height: '100%',
                  width: '200px',
                  opacity: 0.1,
                  backgroundImage: 'url(/soton_2.png)',
                  backgroundSize: 'contain',
                  backgroundRepeat: 'no-repeat',
                  backgroundPosition: 'right center',
                }}
              />
              <Typography
                variant="h6"
                gutterBottom
                sx={{
                  mt: 2,
                  color: 'primary.main',
                  position: 'relative',
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                <PersonAdd sx={{ mr: 1, fontSize: '1.2rem' }} />
                Shared With Me
              </Typography>

              {sharedSubjects.length === 0 && sharedNotes.length === 0 ? (
                <Typography variant="body1" sx={{ mt: 2 }}>
                  No content has been shared with you yet.
                </Typography>
              ) : (
                <>
                  {/* Shared Subjects Section */}
                  {sharedSubjects.length > 0 && (
                    <>
                      <Typography
                        variant="subtitle1"
                        gutterBottom
                        sx={{ mt: 2, fontWeight: 'bold' }}
                      >
                        Subjects
                      </Typography>
                      <Grid container spacing={3}>
                        {sharedSubjects.map((subject) => (
                          <Grid item xs={12} sm={6} md={4} key={subject.id}>
                            <Card
                              variant="outlined"
                              sx={{
                                height: '100%',
                                display: 'flex',
                                flexDirection: 'column',
                                justifyContent: 'space-between',
                              }}
                            >
                              <CardContent>
                                <Box
                                  sx={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    mb: 1,
                                  }}
                                >
                                  <Badge
                                    color="secondary"
                                    badgeContent={
                                      <PersonAdd fontSize="small" />
                                    }
                                    sx={{ mr: 1 }}
                                  >
                                    <Typography variant="h6" component="div">
                                      {subject.title}
                                    </Typography>
                                  </Badge>
                                </Box>
                                <Typography
                                  variant="body2"
                                  color="text.secondary"
                                >
                                  {subject.description}
                                </Typography>
                                <Typography
                                  variant="caption"
                                  color="text.secondary"
                                  sx={{ mt: 2, display: 'block' }}
                                >
                                  Shared by: {subject.sharedBy}
                                </Typography>
                                <Typography
                                  variant="caption"
                                  color="text.secondary"
                                >
                                  Shared on:{' '}
                                  {new Date(
                                    subject.sharedAt
                                  ).toLocaleDateString()}
                                </Typography>
                              </CardContent>
                              <CardActions>
                                <Button
                                  size="small"
                                  color="primary"
                                  onClick={() => handleViewNotes(subject.id)}
                                >
                                  View Notes
                                </Button>
                              </CardActions>
                            </Card>
                          </Grid>
                        ))}
                      </Grid>
                    </>
                  )}

                  {/* Shared Notes Section */}
                  {sharedNotes.length > 0 && (
                    <>
                      <Typography
                        variant="subtitle1"
                        gutterBottom
                        sx={{ mt: 4, fontWeight: 'bold' }}
                      >
                        Notes
                      </Typography>
                      <Grid container spacing={3}>
                        {sharedNotes
                          .filter((note) => note && note.id)
                          .map((note) => (
                            <Grid item xs={12} sm={6} lg={4} key={note.id}>
                              <Card
                                variant="outlined"
                                sx={{
                                  height: '100%',
                                  display: 'flex',
                                  flexDirection: 'column',
                                }}
                              >
                                <CardContent>
                                  <Box
                                    sx={{
                                      display: 'flex',
                                      alignItems: 'center',
                                    }}
                                  >
                                    <Badge
                                      color="secondary"
                                      badgeContent={
                                        <NoteIcon fontSize="small" />
                                      }
                                      sx={{ mr: 1 }}
                                    >
                                      <Typography
                                        variant="h6"
                                        component="div"
                                        gutterBottom
                                      >
                                        {note.title}
                                      </Typography>
                                    </Badge>
                                  </Box>
                                  <div
                                    dangerouslySetInnerHTML={{
                                      __html: note.content
                                        ? note.content.substring(0, 150) +
                                          (note.content.length > 150
                                            ? '...'
                                            : '')
                                        : 'No content available',
                                    }}
                                  />
                                  <Typography
                                    variant="caption"
                                    color="text.secondary"
                                    sx={{ mt: 2, display: 'block' }}
                                  >
                                    From subject:{' '}
                                    {note.subjectTitle || 'Unknown'}
                                    {!note.hasSubjectAccess && (
                                      <Tooltip title="You have access to this note, but not its parent subject">
                                        <WarningIcon
                                          fontSize="small"
                                          color="warning"
                                          sx={{
                                            ml: 1,
                                            verticalAlign: 'middle',
                                          }}
                                        />
                                      </Tooltip>
                                    )}
                                  </Typography>
                                  <Typography
                                    variant="caption"
                                    color="text.secondary"
                                  >
                                    Shared by: {note.sharedBy}
                                  </Typography>
                                </CardContent>
                                <CardActions>
                                  <Button
                                    size="small"
                                    color="primary"
                                    onClick={() =>
                                      navigate(`/shared-note/${note.id}`, {
                                        state: {
                                          noteId: note.id,
                                          isSharedNote: true,
                                        },
                                      })
                                    }
                                  >
                                    View Note
                                  </Button>
                                </CardActions>
                              </Card>
                            </Grid>
                          ))}
                      </Grid>
                    </>
                  )}
                </>
              )}
            </Box>

            {/* Section for content shared BY the user */}
            <Box
              sx={{
                mt: 6,
                p: 3,
                borderRadius: 2,
                position: 'relative',
                overflow: 'hidden',
                background: 'linear-gradient(135deg, #f0f7ff 0%, #e0f0ff 100%)',
                boxShadow: '0 2px 8px rgba(0,90,255,0.1)',
              }}
            >
              <Box
                sx={{
                  position: 'absolute',
                  right: 0,
                  top: 0,
                  height: '100%',
                  width: '200px',
                  opacity: 0.1,
                  backgroundImage: 'url(/soton_2.png)',
                  backgroundSize: 'contain',
                  backgroundRepeat: 'no-repeat',
                  backgroundPosition: 'right center',
                }}
              />
              <Typography
                variant="h6"
                gutterBottom
                sx={{
                  color: 'primary.main',
                  position: 'relative',
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                <ShareIcon sx={{ mr: 1, fontSize: '1.2rem' }} />
                Shared By Me
                {sharedByMeItems.length > 0 && (
                  <Chip
                    size="small"
                    label={`${sharedByMeItems.length} item${
                      sharedByMeItems.length === 1 ? '' : 's'
                    }`}
                    color="primary"
                    sx={{ ml: 2, height: 24 }}
                  />
                )}
              </Typography>

              {sharedByMeItems.length === 0 ? (
                <Typography variant="body1" sx={{ mt: 2 }}>
                  You haven't shared any content with others yet.
                </Typography>
              ) : (
                <Grid container spacing={3}>
                  {sharedByMeItems.map((item) => (
                    <Grid item xs={12} sm={6} md={4} key={item.id}>
                      <Card
                        variant="outlined"
                        sx={{
                          height: '100%',
                          display: 'flex',
                          flexDirection: 'column',
                          justifyContent: 'space-between',
                          borderColor: 'primary.light',
                          '&:hover': {
                            borderColor: 'primary.main',
                            boxShadow: '0 2px 8px rgba(0,120,255,0.1)',
                          },
                        }}
                      >
                        <CardContent>
                          <Box
                            sx={{
                              display: 'flex',
                              alignItems: 'center',
                              mb: 1,
                              borderBottom: '1px solid',
                              borderColor: 'primary.light',
                              pb: 1,
                            }}
                          >
                            <ShareIcon color="primary" sx={{ mr: 1 }} />
                            <Typography variant="h6" component="div" noWrap>
                              {item.itemTitle || 'Unnamed Item'}
                            </Typography>
                          </Box>
                          <Chip
                            label={
                              item.itemType === 'subject' ? 'Subject' : 'Note'
                            }
                            size="small"
                            color="secondary"
                            sx={{ mb: 2 }}
                          />
                          {item.itemType === 'note' && !item.subjectId && (
                            <Chip
                              icon={<WarningIcon />}
                              label="Subject not found"
                              size="small"
                              color="warning"
                              sx={{ mb: 2, ml: 1 }}
                            />
                          )}
                          {item.accessType && (
                            <Typography variant="body2" color="text.secondary">
                              Access:{' '}
                              {item.accessType === 'email'
                                ? 'Specific User'
                                : 'Public'}
                            </Typography>
                          )}
                          {item.sharedWith && (
                            <Typography
                              variant="body2"
                              color="text.secondary"
                              sx={{ mt: 1 }}
                            >
                              Shared with: {item.sharedWith}
                            </Typography>
                          )}
                          <Typography
                            variant="caption"
                            color="text.secondary"
                            sx={{ mt: 2, display: 'block' }}
                          >
                            Shared on:{' '}
                            {(() => {
                              try {
                                const date = new Date(item.createdAt);
                                return isNaN(date.getTime())
                                  ? 'Unknown date'
                                  : date.toLocaleDateString();
                              } catch (e) {
                                return 'Unknown date';
                              }
                            })()}
                          </Typography>
                        </CardContent>
                        <CardActions>
                          {item.itemType === 'subject' ? (
                            <Button
                              size="small"
                              color="primary"
                              onClick={() =>
                                navigate(`/subject/${item.itemId}`)
                              }
                            >
                              View Subject
                            </Button>
                          ) : (
                            <Button
                              size="small"
                              color="primary"
                              onClick={() => {
                                if (!item.subjectId) {
                                  setError(
                                    'Subject ID not found for this note. Unable to view.'
                                  );
                                  return;
                                }
                                navigate(`/shared-note/${item.itemId}`, {
                                  state: {
                                    noteId: item.itemId,
                                    isSharedNote: true,
                                  },
                                });
                              }}
                              disabled={!item.subjectId}
                            >
                              View Note
                            </Button>
                          )}
                          <Button
                            size="small"
                            color="error"
                            onClick={() =>
                              removeSharing(item.id)
                                .then(() => {
                                  setSharedByMeItems((prev) =>
                                    prev.filter((i) => i.id !== item.id)
                                  );
                                })
                                .catch((err) => setError(err.message))
                            }
                          >
                            Unshare
                          </Button>
                        </CardActions>
                      </Card>
                    </Grid>
                  ))}
                </Grid>
              )}
            </Box>
          </>
        );
        break;
      case 'tags':
        mainContent = renderTagsView();
        break;
      case 'recent':
        mainContent = (
          <Container sx={{ py: 4 }}>
            <Typography variant="h4" component="h1" gutterBottom>
              Recent Notes
            </Typography>
            <Grid container spacing={3}>
              {loading ? (
                <CircularProgress sx={{ mx: 'auto', mt: 4 }} />
              ) : error ? (
                <Typography
                  color="error"
                  sx={{ width: '100%', textAlign: 'center' }}
                >
                  {error}
                </Typography>
              ) : (
                renderRecentNotes()
              )}
            </Grid>
          </Container>
        );
        break;
      default:
        mainContent = null;
    }
  }

  return (
    <Box sx={{ display: 'flex' }}>
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
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            {activeView === 'dashboard'
              ? 'Dashboard'
              : activeView === 'subjects'
              ? 'My Subjects'
              : activeView === 'shared'
              ? 'Shared Content'
              : activeView === 'tags'
              ? 'Tags'
              : 'Recent Notes'}
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', mr: 2 }}>
            <img
              src="/soton_2.png"
              alt="University of Southampton"
              style={{ height: '32px', marginRight: '16px' }}
            />
          </Box>
          <IconButton
            color="inherit"
            aria-label="account of current user"
            aria-controls="menu-appbar"
            aria-haspopup="true"
            edge="end"
          >
            <Avatar sx={{ width: 32, height: 32 }}>
              {currentUser.email?.charAt(0).toUpperCase() || 'U'}
            </Avatar>
          </IconButton>
        </Toolbar>
      </AppBar>

      {/* Sidebar component with proper props */}
      <Sidebar
        mobileOpen={mobileOpen}
        handleDrawerToggle={handleDrawerToggle}
        subjects={subjects}
        activeView={activeView}
        sharedItemsCount={totalSharedCount}
        tagsCount={tags.length}
      />

      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          width: { sm: `calc(100% - ${drawerWidth}px)` },
          mt: 8,
        }}
      >
        <Box
          sx={{
            mb: 4,
            p: 3,
            borderRadius: 2,
            position: 'relative',
            overflow: 'hidden',
            background: 'linear-gradient(135deg, #f5f7fa 0%, #e4e8f0 100%)',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          }}
        >
          <Box
            sx={{
              position: 'absolute',
              right: 0,
              top: 0,
              height: '100%',
              width: '200px',
              opacity: 0.1,
              backgroundImage: 'url(/soton_2.png)',
              backgroundSize: 'contain',
              backgroundRepeat: 'no-repeat',
              backgroundPosition: 'right center',
            }}
          />
          <Typography variant="h4" component="h1" gutterBottom>
            Welcome, {currentUser?.email?.split('@')[0]}!
          </Typography>
          <Typography variant="subtitle1" gutterBottom>
            Organize your notes by subject and keep track of your learning
            journey.
          </Typography>
          {error && (
            <Typography variant="body2" color="error">
              {error}
            </Typography>
          )}

          {/* View selector buttons */}
          <Box sx={{ mt: 2, mb: 3, display: 'flex', gap: 2 }}>
            <Button
              variant={activeView === 'dashboard' ? 'contained' : 'outlined'}
              onClick={() => handleSwitchView('dashboard')}
            >
              Dashboard
            </Button>
            <Button
              variant={activeView === 'subjects' ? 'contained' : 'outlined'}
              onClick={() => handleSwitchView('subjects')}
            >
              My Subjects
            </Button>
            <Button
              variant={activeView === 'shared' ? 'contained' : 'outlined'}
              onClick={() => handleSwitchView('shared')}
            >
              Shared Content
            </Button>
            <Button
              variant={activeView === 'tags' ? 'contained' : 'outlined'}
              onClick={() => handleSwitchView('tags')}
            >
              Tags
            </Button>
            <Button
              variant={activeView === 'recent' ? 'contained' : 'outlined'}
              onClick={() => handleSwitchView('recent')}
            >
              Recent Notes
            </Button>
          </Box>
        </Box>

        {mainContent}

        <Fab
          color="primary"
          aria-label="add"
          onClick={handleAddSubject}
          sx={{ position: 'fixed', bottom: 24, right: 24 }}
        >
          <Add />
        </Fab>

        {/* New Subject Dialog */}
        <Dialog open={openDialog} onClose={handleCloseDialog}>
          <DialogTitle>Create New Subject</DialogTitle>
          <DialogContent>
            <TextField
              autoFocus
              margin="dense"
              id="title"
              label="Subject Title"
              type="text"
              fullWidth
              variant="outlined"
              value={newSubject.title}
              onChange={(e) =>
                setNewSubject({ ...newSubject, title: e.target.value })
              }
              sx={{ mb: 2 }}
            />
            <TextField
              margin="dense"
              id="description"
              label="Description"
              type="text"
              fullWidth
              variant="outlined"
              multiline
              rows={3}
              value={newSubject.description}
              onChange={(e) =>
                setNewSubject({ ...newSubject, description: e.target.value })
              }
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseDialog}>Cancel</Button>
            <Button onClick={handleCreateSubject} variant="contained">
              Create
            </Button>
          </DialogActions>
        </Dialog>

        {/* Edit Subject Dialog */}
        <Dialog open={editDialogOpen} onClose={handleCloseEditDialog}>
          <DialogTitle>Edit Subject</DialogTitle>
          <DialogContent>
            <TextField
              autoFocus
              margin="dense"
              id="edit-title"
              label="Subject Title"
              type="text"
              fullWidth
              variant="outlined"
              value={editSubject?.title || ''}
              onChange={(e) =>
                setEditSubject({ ...editSubject, title: e.target.value })
              }
              sx={{ mb: 2 }}
            />
            <TextField
              margin="dense"
              id="edit-description"
              label="Subject Description"
              type="text"
              fullWidth
              variant="outlined"
              multiline
              rows={3}
              value={editSubject?.description || ''}
              onChange={(e) =>
                setEditSubject({ ...editSubject, description: e.target.value })
              }
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseEditDialog}>Cancel</Button>
            <Button onClick={handleUpdateSubject} variant="contained">
              Update
            </Button>
          </DialogActions>
        </Dialog>

        {/* Share Dialog */}
        {currentShareItem && (
          <ShareDialog
            open={shareDialogOpen}
            onClose={handleCloseShareDialog}
            itemType={currentShareItem.itemType}
            itemTitle={currentShareItem.title}
            itemId={currentShareItem.id}
            onShare={handleShare}
          />
        )}
      </Box>
    </Box>
  );
}
