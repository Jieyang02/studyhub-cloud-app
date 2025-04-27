import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useSidebar } from '../contexts/SidebarContext'; // Add this import
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
  DialogContentText,
  TextField,
  Fab,
  Badge,
  Tooltip,
  Container,
  Chip,
  Pagination,
  Stack,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  InputAdornment,
  Paper,
  Collapse,
  Divider,
  InputBase,
} from '@mui/material';
import {
  Add,
  Menu as MenuIcon,
  Share as ShareIcon,
  PersonAdd,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Note as NoteIcon,
  Warning as WarningIcon,
  LocalOffer as TagIcon,
  Search as SearchIcon,
  FilterList as FilterIcon,
  ExpandMore,
  ExpandLess,
  SortByAlpha,
  Tune,
  Clear as ClearIcon,
  Download,
  Comment,
  Visibility as VisibilityIcon,
  ManageAccounts as ManageAccountsIcon,
  School,
  Analytics,
  Settings,
  Add as AddIcon,
  Tune as TuneIcon,
} from '@mui/icons-material';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  getAllSubjects,
  getUserSubjects,
  createSubject,
  getSubjectById,
  updateSubject,
  deleteSubject,
  getNoteById,
  getSubjectTitleById,
  searchContent,
  shareSubject,
} from '../services/subjectService';
import {
  shareItem,
  getSharedWithUser,
  getItemsSharedByMe,
  getItemShares,
} from '../services/sharingService';
import { getAllTags, getNotesByTag } from '../services/tagService';
import Sidebar from './Sidebar';
import ShareDialog from './ShareDialog';
import AccessLevelDialog from './AccessLevelDialog';
import { getUserByUid } from '../services/userService';

// Sidebar width
const drawerWidth = 240;

// API URL for backend requests
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000/api';

// Create standardized card component functions at the top of the file, after all imports and constants

// Helper function to safely get subject title
const getFormattedSubjectTitle = (
  subjectId,
  subjectTitles,
  fallbackTitle = null
) => {
  if (!subjectId) return null;

  // Check if we have this subject title in our state dictionary
  if (subjectTitles && subjectTitles[subjectId]) {
    return subjectTitles[subjectId];
  }

  // Return the fallback title if provided
  if (fallbackTitle) return fallbackTitle;

  // Return appropriate fallback based on subject ID format
  if (subjectId.length > 15) {
    return 'Associated Subject';
  }

  return `Subject ${subjectId.substring(0, 8)}`;
};

// Helper function to safely format dates - add this after existing imports
const formatSharedDate = (dateString) => {
  if (!dateString) return null;

  try {
    // Handle Firestore timestamp objects with _seconds property
    if (typeof dateString === 'object' && dateString._seconds) {
      const date = new Date(dateString._seconds * 1000);
      if (!isNaN(date.getTime())) {
        return date.toLocaleDateString();
      }
    }

    // Handle regular string dates or other formats
    const date = new Date(dateString);
    if (!isNaN(date.getTime())) {
      return date.toLocaleDateString();
    }

    console.warn(`Invalid date format encountered:`, dateString);
    return null;
  } catch (error) {
    console.warn(`Error formatting date:`, error);
    return null;
  }
};

// Helper component for consistent Subject card styling
const SubjectCard = ({
  subject,
  onViewNotes,
  onEdit,
  onDelete,
  onShare,
  showActions = true,
  showOwner = false,
  ownerInfo = null,
  permissions = null, // Add permissions parameter
}) => {
  // Determine what actions are available based on permissions
  const canEdit = permissions?.edit || (showActions && onEdit);
  const canDelete = permissions?.delete || (showActions && onDelete);
  const canShare = permissions?.share || (showActions && onShare);
  const canDownload = permissions?.download !== false; // Default to true if not specified

  // Check if subject is shared
  const isShared =
    subject.isShared ||
    subject.shareType ||
    (subject.sharedWith && subject.sharedWith.length > 0);

  // Render sharing status indicator
  const renderShareStatus = () => {
    if (!isShared) return null;

    return (
      <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
        <ShareIcon fontSize="small" color="primary" sx={{ mr: 1 }} />
        <Typography
          variant="caption"
          color="primary"
          sx={{ fontSize: { xs: '0.7rem', sm: '0.75rem' } }}
        >
          {subject.shareType === 'public'
            ? 'Shared publicly'
            : `Shared with ${subject.sharedWith?.length || 0} people`}
        </Typography>
      </Box>
    );
  };

  return (
    <Card
      variant="outlined"
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        transition: 'all 0.2s ease',
        '&:hover': {
          boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
          transform: { xs: 'none', sm: 'translateY(-4px)' },
        },
      }}
    >
      <CardContent sx={{ pb: 1, flexGrow: 1 }}>
        <Typography
          variant="h6"
          component="div"
          gutterBottom
          sx={{
            fontSize: { xs: '1rem', sm: '1.25rem' },
            wordBreak: 'break-word',
          }}
        >
          {subject.title}
        </Typography>

        {subject.description && (
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{
              mb: 2,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              fontSize: { xs: '0.75rem', sm: '0.875rem' },
            }}
          >
            {subject.description}
          </Typography>
        )}

        {showOwner && ownerInfo && (
          <Box sx={{ display: 'flex', alignItems: 'center', mt: 2 }}>
            <Avatar sx={{ width: 24, height: 24, mr: 1 }}>
              {ownerInfo.name?.charAt(0) || ownerInfo.email?.charAt(0) || 'U'}
            </Avatar>
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ fontSize: { xs: '0.7rem', sm: '0.75rem' } }}
            >
              {ownerInfo.name || ownerInfo.email || 'Unknown user'}
            </Typography>
          </Box>
        )}

        {renderShareStatus()}
      </CardContent>

      <CardActions
        sx={{
          p: { xs: 1, sm: 2 },
          pt: 0,
          justifyContent:
            canEdit || canDelete || canShare || canDownload
              ? 'space-between'
              : 'flex-start',
          flexWrap: { xs: 'wrap', sm: 'nowrap' },
        }}
      >
        <Button
          size="small"
          color="primary"
          onClick={() => onViewNotes(subject.id)}
          startIcon={<NoteIcon fontSize="small" />}
          sx={{
            mb: { xs: 1, sm: 0 },
            fontSize: { xs: '0.75rem', sm: '0.8125rem' },
          }}
        >
          View Notes
        </Button>

        {(canEdit || canDelete || canShare || canDownload) && (
          <Box
            sx={{
              display: 'flex',
              width: { xs: '100%', sm: 'auto' },
              justifyContent: { xs: 'flex-end', sm: 'flex-start' },
            }}
          >
            {canEdit && (
              <Tooltip title="Edit subject">
                <IconButton
                  size="small"
                  color="primary"
                  onClick={() => onEdit(subject)}
                  sx={{ ml: 1 }}
                >
                  <EditIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            )}

            {canDelete && (
              <Tooltip title="Delete subject">
                <IconButton
                  size="small"
                  color="error"
                  onClick={() => onDelete(subject.id)}
                  sx={{ ml: 1 }}
                >
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            )}

            {canShare && (
              <Tooltip title="Share this subject">
                <IconButton
                  size="small"
                  color={isShared ? 'primary' : 'secondary'}
                  onClick={() => onShare({ ...subject, itemType: 'subject' })}
                  sx={{ ml: 1 }}
                >
                  <ShareIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            )}
          </Box>
        )}
      </CardActions>
    </Card>
  );
};

// Helper component for consistent Note card styling
const NoteCard = ({
  note,
  subjects = [],
  onViewNote,
  onEdit, // Add onEdit parameter
  onDelete, // Add onDelete parameter
  onShare, // Add onShare parameter
  showSubject = true,
  showOwner = false,
  ownerInfo = null,
  showTags = true,
  permissions = null, // Add permissions parameter
  contentPreview = null, // Add content preview parameter
}) => {
  // Determine what actions are available based on permissions
  const canEdit = permissions?.edit || Boolean(onEdit);
  const canDelete = permissions?.delete || Boolean(onDelete);
  const canShare = permissions?.share || Boolean(onShare);
  const canDownload = permissions?.download !== false; // Default to true if not specified
  const canComment = permissions?.comment || false;

  const getSubjectName = () => {
    if (note.subjectTitle) return note.subjectTitle;

    // Try to find the subject in the passed subjects array
    const subject = subjects.find((s) => s.id === note.subjectId);
    if (subject) return subject.title;

    // If we're in a shared context, we might have partial info
    // Return a more user-friendly label if we just have the ID
    if (note.subjectId) {
      // Check if it's a Firebase-style ID (looks random)
      if (note.subjectId.length > 15) {
        return `Shared Subject`;
      }
      return `Subject ${note.subjectId}`;
    }

    return 'Unknown Subject';
  };

  return (
    <Card
      variant="outlined"
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        transition: 'all 0.2s ease',
        '&:hover': {
          boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
          transform: { xs: 'none', sm: 'translateY(-4px)' },
        },
      }}
    >
      <CardContent
        sx={{
          flexGrow: 1,
          pb: { xs: 0.5, sm: 1 },
          px: { xs: 1.5, sm: 2 },
          pt: { xs: 1.5, sm: 2 },
        }}
      >
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
          }}
        >
          <Typography
            variant="h6"
            component="h3"
            gutterBottom
            sx={{
              fontSize: { xs: '1rem', sm: '1.25rem' },
              wordBreak: 'break-word',
            }}
          >
            {note.title || 'Untitled Note'}
          </Typography>
          {showTags && note.tags && note.tags.length > 0 && (
            <Chip
              size="small"
              label={note.tags[0]}
              color="primary"
              sx={{
                fontSize: { xs: '0.7rem', sm: '0.75rem' },
                height: { xs: 22, sm: 24 },
              }}
            />
          )}
        </Box>

        {showSubject && (
          <Typography
            variant="body2"
            color="text.secondary"
            gutterBottom
            sx={{
              mt: 1,
              fontSize: { xs: '0.75rem', sm: '0.875rem' },
            }}
          >
            Subject: {getSubjectName()}
          </Typography>
        )}

        {/* Display content preview if available */}
        {contentPreview && (
          <Box
            sx={{
              mt: 2,
              mb: 2,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              display: '-webkit-box',
              WebkitLineClamp: 3,
              WebkitBoxOrient: 'vertical',
              fontSize: { xs: '0.75rem', sm: '0.875rem' },
              color: 'text.secondary',
              lineHeight: 1.5,
            }}
          >
            {contentPreview}
          </Box>
        )}

        {showTags && note.tags && note.tags.length > 1 && (
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 1 }}>
            {note.tags.slice(1).map((tag, index) => (
              <Chip
                key={index}
                size="small"
                label={tag}
                sx={{
                  height: { xs: 20, sm: 24 },
                  fontSize: { xs: '0.7rem', sm: '0.75rem' },
                }}
                variant="outlined"
              />
            ))}
          </Box>
        )}

        {showOwner && ownerInfo && (
          <Box sx={{ mt: 'auto', pt: 1 }}>
            <Typography
              variant="caption"
              color="text.secondary"
              display="block"
              sx={{ fontSize: { xs: '0.7rem', sm: '0.75rem' } }}
            >
              {`Owned by: ${
                ownerInfo.name ||
                ownerInfo.email ||
                ownerInfo.owner ||
                'Unknown user'
              }`}
            </Typography>
            {ownerInfo.sharedAt && (
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ fontSize: { xs: '0.7rem', sm: '0.75rem' } }}
              >
                Shared on:{' '}
                {formatSharedDate(ownerInfo.sharedAt) || 'Unknown date'}
              </Typography>
            )}
            {permissions && (
              <Typography
                variant="caption"
                color="text.secondary"
                display="block"
                sx={{ fontSize: { xs: '0.7rem', sm: '0.75rem' } }}
              >
                {`Access: ${
                  permissions.edit
                    ? 'Edit'
                    : permissions.comment
                    ? 'Comment'
                    : 'View'
                }`}
              </Typography>
            )}
          </Box>
        )}
      </CardContent>

      <CardActions
        sx={{
          p: { xs: 1, sm: 2 },
          pt: { xs: 0.5, sm: 0 },
          display: 'flex',
          justifyContent: 'space-between',
          flexWrap: { xs: 'wrap', sm: 'nowrap' },
        }}
      >
        <Button
          size="small"
          color="primary"
          onClick={() => onViewNote(note)}
          startIcon={<NoteIcon fontSize="small" />}
          sx={{
            fontSize: { xs: '0.75rem', sm: '0.8125rem' },
            mb: { xs: 1, sm: 0 },
          }}
        >
          View Note
        </Button>

        {(canEdit || canDelete || canShare || canDownload || canComment) && (
          <Box
            sx={{
              display: 'flex',
              width: { xs: '100%', sm: 'auto' },
              justifyContent: { xs: 'flex-end', sm: 'flex-start' },
            }}
          >
            {canEdit && onEdit && (
              <Tooltip title="Edit note">
                <IconButton
                  size="small"
                  color="primary"
                  onClick={() => onEdit(note)}
                  sx={{ ml: 1 }}
                >
                  <EditIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            )}

            {canComment && (
              <Tooltip title="Add comments">
                <IconButton
                  size="small"
                  color="primary"
                  onClick={() => onViewNote(note, 'comment')}
                  sx={{ ml: 1 }}
                >
                  <Comment fontSize="small" />
                </IconButton>
              </Tooltip>
            )}

            {canDelete && onDelete && (
              <Tooltip title="Delete note">
                <IconButton
                  size="small"
                  color="error"
                  onClick={() => onDelete(note.id)}
                  sx={{ ml: 1 }}
                >
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            )}

            {canShare && onShare && (
              <Tooltip title="Share this note">
                <IconButton
                  size="small"
                  color="secondary"
                  onClick={() => onShare({ ...note, itemType: 'note' })}
                  sx={{ ml: 1 }}
                >
                  <ShareIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            )}

            {canDownload && (
              <Tooltip title="Download note content">
                <IconButton
                  size="small"
                  color="primary"
                  onClick={() =>
                    window.open(`/api/notes/${note.id}/download`, '_blank')
                  }
                  sx={{ ml: 1 }}
                >
                  <Download fontSize="small" />
                </IconButton>
              </Tooltip>
            )}
          </Box>
        )}
      </CardActions>
    </Card>
  );
};

export default function Dashboard({ initialView }) {
  const { currentUser, logout } = useAuth();
  const { loadSubjects } = useSidebar(); // Add this line to get the loadSubjects function
  const navigate = useNavigate();
  const location = useLocation();
  const [subjects, setSubjects] = useState([]);
  const [sharedSubjects, setSharedSubjects] = useState([]);
  const [sharedByMeItems, setSharedByMeItems] = useState([]);
  const [sharedNotes, setSharedNotes] = useState([]);
  // Add these back but we won't use them for the Tag page
  const [tags, setTags] = useState([]);
  const [selectedTag, setSelectedTag] = useState(null);
  const [notesByTag, setNotesByTag] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sharedContentLoading, setSharedContentLoading] = useState(false);
  const [error, setError] = useState('');
  const [mobileOpen, setMobileOpen] = useState(false);
  const [openDialog, setOpenDialog] = useState(false);
  const [newSubject, setNewSubject] = useState({ title: '', description: '' });
  const [editSubject, setEditSubject] = useState(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [activeView, setActiveView] = useState(initialView || 'dashboard');
  const [useMockData, setUseMockData] = useState(false);

  // Pagination state
  const [subjectsPage, setSubjectsPage] = useState(1);
  const [notesPage, setNotesPage] = useState(1);
  const [sharedContentPage, setSharedContentPage] = useState(1);
  const [taggedNotesPage, setTaggedNotesPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(6);

  // Share dialog state
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [currentShareItem, setCurrentShareItem] = useState(null);

  // New state variables
  const [subjectTitles, setSubjectTitles] = useState({});
  const [userEmails, setUserEmails] = useState({});

  // Calculate badge count for shared items
  const sharedWithMeCount = sharedSubjects.length + sharedNotes.length;
  const totalSharedCount = sharedWithMeCount + sharedByMeItems.length;

  // Search and filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [filterOptions, setFilterOptions] = useState({
    sortBy: 'alphabetical', // Changed from 'recent' to 'alphabetical'
    filterByTag: null,
    contentType: 'all', // Options: all, subjects, notes
  });
  const [filteredSubjects, setFilteredSubjects] = useState([]);
  const [filteredNotes, setFilteredNotes] = useState([]);
  const [searchResults, setSearchResults] = useState(null);
  const [isSearching, setIsSearching] = useState(false);

  // New state for improved filter UI
  const [filtersExpanded, setFiltersExpanded] = useState(false);
  const [activeFilterCount, setActiveFilterCount] = useState(0);

  const [sharedNoteContents, setSharedNoteContents] = useState({});

  // Inside the Dashboard component, add new state for the unshare dialog
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [subjectToDelete, setSubjectToDelete] = useState(null);

  // Access level dialog state
  const [accessLevelDialogOpen, setAccessLevelDialogOpen] = useState(false);
  const [currentAccessItem, setCurrentAccessItem] = useState(null);

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
        // Remove tags fetching code
        // if (activeView === 'tags' || activeView === 'dashboard') {
        //   const userTags = await getAllTags();
        //   setTags(userTags);
        //
        //   // If a tag is selected, fetch notes for that tag
        //   if (selectedTag && activeView === 'tags') {
        //     const taggedNotes = await getNotesByTag(selectedTag);
        //     setNotesByTag(taggedNotes);
        //   }
        // }

        let fetchedSubjects;
        if (activeView === 'subjects') {
          fetchedSubjects = await getUserSubjects();
          setSubjects(fetchedSubjects);
        } else if (activeView === 'shared') {
          // Fetch user's own subjects to identify owned content
          setSharedContentLoading(true);
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
              // Enhanced date validation
              let validCreatedAt;
              try {
                const createdAt =
                  item.createdAt || item.sharedAt || new Date().toISOString();
                const date = new Date(createdAt);
                validCreatedAt = isNaN(date.getTime())
                  ? new Date().toISOString()
                  : createdAt;
              } catch (err) {
                console.warn(
                  `Error processing date for item ${item.itemId}:`,
                  err
                );
                validCreatedAt = new Date().toISOString();
              }

              let itemTitle = item.itemTitle || 'Unnamed Item';
              let subjectId = item.subjectId;
              let subjectTitle = null;

              // Get full details based on item type
              if (item.itemType === 'note') {
                try {
                  const noteData = await getNoteById(item.itemId);
                  if (noteData) {
                    itemTitle = noteData.title || itemTitle;
                    subjectId = noteData.subjectId || subjectId;
                    subjectTitle = noteData.subjectTitle || null;
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
                subjectTitle,
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

          // Process shared subjects and notes in parallel
          const [sharedSubjectsData, sharedNotesData] = await Promise.all([
            // Process subjects shared with the user
            Promise.all(
              sharedWithMeItems
                .filter((item) => item.itemType === 'subject')
                .map(async (item) => {
                  try {
                    const subjectData = await getSubjectById(item.itemId);
                    if (!subjectData) return null;

                    return {
                      ...subjectData,
                      sharedBy: item.sharedBy || 'Unknown',
                      sharedAt: item.sharedAt || new Date().toISOString(),
                      itemType: 'subject',
                      permissions: item.permissions || {
                        view: true,
                        edit: false,
                        comment: false,
                        download: true,
                        share: false,
                      },
                    };
                  } catch (err) {
                    console.error(
                      `Error fetching shared subject ${item.itemId}:`,
                      err
                    );
                    return null;
                  }
                })
            ),

            // Process notes shared with the user
            Promise.all(
              sharedWithMeItems
                .filter((item) => item.itemType === 'note')
                .map(async (item) => {
                  try {
                    const noteData = await getNoteById(item.itemId);
                    if (
                      !noteData ||
                      userOwnedSubjectIds.has(noteData.subjectId)
                    ) {
                      return null;
                    }

                    // Try to get the subject title for this note
                    let subjectTitle = null;
                    if (noteData.subjectId && !noteData.subjectTitle) {
                      try {
                        subjectTitle = await getSubjectTitleById(
                          noteData.subjectId
                        );
                        if (subjectTitle) {
                          // Store this for future reference
                          setSubjectTitles((prev) => ({
                            ...prev,
                            [noteData.subjectId]: subjectTitle,
                          }));
                        }
                      } catch (err) {
                        console.warn(
                          `Unable to fetch subject title for ${noteData.subjectId}:`,
                          err
                        );
                      }
                    }

                    return {
                      ...noteData,
                      sharedBy: item.sharedBy || 'Unknown',
                      sharedAt: item.sharedAt || new Date().toISOString(),
                      itemType: 'note',
                      subjectTitle: noteData.subjectTitle || subjectTitle,
                      permissions: item.permissions || {
                        view: true,
                        edit: false,
                        comment: false,
                        download: true,
                        share: false,
                      },
                    };
                  } catch (err) {
                    console.error(
                      `Error fetching shared note ${item.itemId}:`,
                      err
                    );
                    return null;
                  }
                })
            ),
          ]);

          // Filter out null results
          const validSubjects = sharedSubjectsData.filter(
            (subject) => subject !== null
          );
          const validNotes = sharedNotesData.filter((note) => note !== null);

          setSharedSubjects(validSubjects);
          setSharedNotes(validNotes);
          setSharedContentLoading(false);
        } else if (activeView !== 'tags') {
          // Dashboard view - fetch all types of content
          const [allSubjects, sharedWithMeData, sharedByMeData, userTags] =
            await Promise.all([
              getAllSubjects(),
              getSharedWithUser(),
              getItemsSharedByMe(),
              getAllTags(),
            ]);

          setSubjects(allSubjects);
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
  }, [activeView, currentUser?.uid]);

  useEffect(() => {
    const loadAdditionalData = async () => {
      try {
        setSharedContentLoading(true); // Add this line

        // Load subject titles for notes without subject access
        const titlePromises = [];
        const titleMap = {};

        // Load user emails for shared by/owned by fields
        const emailPromises = [];
        const emailMap = {};

        // Keep track of UIDs that need to be processed
        const userIds = new Set();
        const subjectIds = new Set();

        // First pass - find all user IDs that need emails and subject IDs that need titles
        sharedNotes.forEach((note) => {
          if (
            note.subjectId &&
            !note.subjectTitle &&
            !subjectTitles[note.subjectId]
          ) {
            // Add to the set of subject IDs to process
            subjectIds.add(note.subjectId);
          }

          if (
            note.sharedBy &&
            typeof note.sharedBy === 'string' &&
            !userEmails[note.sharedBy] &&
            note.sharedBy.indexOf('@') === -1
          ) {
            // Add to the set of IDs to process
            userIds.add(note.sharedBy);
          }
        });

        // Also process subject IDs from shared items
        sharedByMeItems.forEach((item) => {
          if (
            item.itemType === 'note' &&
            item.subjectId &&
            !subjectTitles[item.subjectId]
          ) {
            subjectIds.add(item.subjectId);
          }
        });

        console.log(
          `Processing ${userIds.size} user IDs to get email addresses`
        );
        console.log(`Processing ${subjectIds.size} subject IDs to get titles`);

        // Process all subject IDs
        for (const subjectId of subjectIds) {
          titlePromises.push(
            getSubjectTitleById(subjectId)
              .then((title) => {
                console.log(`Got title for subject ${subjectId}: ${title}`);
                titleMap[subjectId] =
                  title || `Subject ${subjectId.substring(0, 6)}...`;
              })
              .catch((error) => {
                console.error(
                  `Failed to get title for subject ${subjectId}:`,
                  error
                );
                // Provide a fallback with a shortened subject ID
                titleMap[subjectId] = `Subject ${subjectId.substring(0, 6)}...`;
              })
          );
        }

        // Process all user IDs
        for (const userId of userIds) {
          emailPromises.push(
            getUserByUid(userId)
              .then((email) => {
                console.log(`Got email for ${userId}: ${email}`);
                emailMap[userId] = email;
              })
              .catch((error) => {
                console.error(`Failed to get email for ${userId}:`, error);
                // Provide a user-friendly fallback with a shortened UID
                emailMap[userId] = `User ${userId.substring(0, 6)}...`;
              })
          );
        }

        // Wait for all promises to resolve, but don't let failures stop the whole process
        if (titlePromises.length > 0 || emailPromises.length > 0) {
          await Promise.allSettled([...titlePromises, ...emailPromises]);

          if (Object.keys(titleMap).length > 0) {
            setSubjectTitles((prev) => ({ ...prev, ...titleMap }));
          }

          if (Object.keys(emailMap).length > 0) {
            setUserEmails((prev) => ({ ...prev, ...emailMap }));
          }
        }
      } catch (error) {
        console.error('Error in loadAdditionalData:', error);
        // Silently handle errors to prevent UI disruption
      } finally {
        setSharedContentLoading(false); // Add this line
      }
    };

    if (sharedNotes.length > 0 || sharedByMeItems.length > 0) {
      loadAdditionalData();
    }
  }, [sharedNotes, sharedByMeItems]);

  // Load shared note contents for preview
  useEffect(() => {
    const loadNoteContents = async () => {
      // Get unique note IDs from both shared with me and shared by me sections
      const sharedWithMeNoteIds = sharedNotes.map((note) => note.id);
      const sharedByMeNoteIds = sharedByMeItems
        .filter((item) => item.itemType === 'note')
        .map((item) => item.itemId);

      // Create a unique set of all note IDs to fetch content for
      const allNoteIds = [
        ...new Set([...sharedWithMeNoteIds, ...sharedByMeNoteIds]),
      ];

      // Create promises for all notes
      const noteContentPromises = allNoteIds.map(async (noteId) => {
        try {
          const noteData = await getNoteById(noteId);
          if (noteData && noteData.content) {
            // Process HTML content for preview - strip tags and limit length
            const plainText = noteData.content.replace(/<[^>]*>/g, ' ');
            return {
              id: noteId,
              content:
                plainText.length > 300
                  ? plainText.substring(0, 300) + '...'
                  : plainText,
            };
          }
          return { id: noteId, content: null };
        } catch (err) {
          console.error(`Error fetching note content for ${noteId}:`, err);
          return { id: noteId, content: null };
        }
      });

      const contentResults = await Promise.all(noteContentPromises);
      const contentMap = {};

      contentResults.forEach((result) => {
        if (result.content) {
          contentMap[result.id] = result.content;
        } else {
          contentMap[result.id] = 'No preview available';
        }
      });

      setSharedNoteContents(contentMap);
    };

    // Only run if we have notes to load content for
    if (
      sharedNotes.length > 0 ||
      sharedByMeItems.some((item) => item.itemType === 'note')
    ) {
      loadNoteContents();
    }
  }, [sharedNotes, sharedByMeItems]);

  // Helper function to get the authentication token
  const getAuthToken = async () => {
    if (!currentUser) {
      throw new Error('User not authenticated');
    }

    return await currentUser.getIdToken();
  };

  // Helper function to get subject title
  const getSubjectTitle = (note) => {
    if (note.subjectTitle) return note.subjectTitle;
    if (note.subjectId && subjectTitles[note.subjectId])
      return subjectTitles[note.subjectId];
    return note.subjectId ? `Subject ${note.subjectId}` : 'Unknown';
  };

  // Helper function to get user email
  const getUserEmail = (userId) => {
    if (!userId) return 'Unknown User';

    // If it's already an email, return it
    if (userId.indexOf('@') !== -1) return userId;

    // If we have the email in our state
    if (userEmails[userId] && userEmails[userId].indexOf('@') !== -1) {
      return userEmails[userId];
    }

    // Fallback to a more user-friendly format
    return userEmails[userId] || `User ${userId.substring(0, 6)}...`;
  };

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  // eslint-disable-next-line no-unused-vars
  async function handleLogout() {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Failed to log out', error);
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
    // Reset pagination when switching views
    setSubjectsPage(1);
    setNotesPage(1);
    setSharedContentPage(1);
    setTaggedNotesPage(1);
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
      let result;

      // Determine if we're sharing a subject or a note
      if (shareData.itemType === 'subject') {
        // Use the subject-specific sharing endpoint
        result = await shareSubject(shareData.itemId, {
          shareType: shareData.shareType,
          sharedWith: shareData.sharedWith || [],
          message: shareData.message || '',
          permissions: shareData.permissions || {
            view: true,
            edit: false,
            comment: false,
            download: true,
            share: false,
          },
          createShareRecord: true,
        });
      } else {
        // Use the general sharing endpoint for notes
        result = await shareItem(shareData);
      }

      console.log('Sharing result:', result);

      // Update local state to reflect the change
      if (shareData.itemType === 'subject') {
        setSubjects((prevSubjects) =>
          prevSubjects.map((s) =>
            s.id === shareData.itemId
              ? {
                  ...s,
                  isShared: true,
                  shareType: shareData.shareType,
                  sharedWith: shareData.sharedWith || [],
                }
              : s
          )
        );
      }

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
    // Open confirmation dialog instead of deleting immediately
    setSubjectToDelete(subjectId);
    setDeleteConfirmOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!subjectToDelete) return;

    try {
      await deleteSubject(subjectToDelete);
      setSubjects((prevSubjects) =>
        prevSubjects.filter((s) => s.id !== subjectToDelete)
      );

      // Refresh the sidebar to reflect the deleted subject
      await loadSubjects();

      // Close the dialog
      setDeleteConfirmOpen(false);
      setSubjectToDelete(null);
    } catch (err) {
      console.error('Failed to delete subject:', err);
      setError(err.message || 'Failed to delete subject');
      // Close the dialog even if there's an error
      setDeleteConfirmOpen(false);
      setSubjectToDelete(null);
    }
  };

  const handleCancelDelete = () => {
    setDeleteConfirmOpen(false);
    setSubjectToDelete(null);
  };

  const handleSearchChange = (event) => {
    setSearchTerm(event.target.value);
  };

  // Handle clearing search
  const handleClearSearch = () => {
    setSearchTerm('');
  };

  // Handle filter change
  const handleFilterChange = (filterType, value) => {
    setFilterOptions((prev) => ({
      ...prev,
      [filterType]: value,
    }));
  };

  // New handler for filter expand/collapse
  const toggleFiltersExpanded = () => {
    setFiltersExpanded(!filtersExpanded);
  };

  // Add filter clear function
  const clearAllFilters = () => {
    setSearchTerm('');
    setFilterOptions({
      sortBy: 'alphabetical', // Changed from 'recent' to 'alphabetical'
      filterByTag: null,
      contentType: 'all',
    });
  };

  // Completely redesigned search and filter component
  const renderSearchAndFilter = () => {
    return (
      <Box sx={{ mb: 3 }}>
        {/* Main search bar and filter button row */}
        <Paper
          elevation={1}
          sx={{
            p: { xs: 1, sm: 1.5 },
            borderRadius: '12px',
            display: 'flex',
            alignItems: 'center',
            gap: { xs: 0.5, sm: 1 },
            flexWrap: { xs: 'wrap', sm: 'nowrap' },
            transition: 'all 0.2s',
            '&:hover': {
              boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
            },
          }}
        >
          <TextField
            fullWidth
            variant="outlined"
            placeholder="Search subjects and notes..."
            value={searchTerm}
            onChange={handleSearchChange}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  {isSearching ? (
                    <CircularProgress size={20} />
                  ) : (
                    <SearchIcon color="action" />
                  )}
                </InputAdornment>
              ),
              endAdornment: searchTerm && (
                <InputAdornment position="end">
                  <IconButton size="small" onClick={handleClearSearch}>
                    <ClearIcon fontSize="small" />
                  </IconButton>
                </InputAdornment>
              ),
              sx: {
                borderRadius: '10px',
                '& fieldset': {
                  borderColor: 'transparent',
                  transition: 'all 0.2s',
                },
                '&:hover fieldset': {
                  borderColor: 'divider',
                },
                '&.Mui-focused fieldset': {
                  borderColor: 'primary.main',
                  borderWidth: '1px',
                },
                bgcolor: 'action.hover',
                pr: 1,
              },
            }}
            size="small"
            sx={{ mb: { xs: 1, sm: 0 }, flexGrow: 1 }}
          />
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              width: { xs: '100%', sm: 'auto' },
            }}
          >
            <Tooltip title="Filters">
              <Badge
                badgeContent={activeFilterCount}
                color="primary"
                sx={{
                  '& .MuiBadge-badge': {
                    right: 6,
                    top: 8,
                  },
                }}
              >
                <Button
                  variant={filtersExpanded ? 'contained' : 'outlined'}
                  color="primary"
                  onClick={toggleFiltersExpanded}
                  startIcon={<Tune />}
                  endIcon={filtersExpanded ? <ExpandLess /> : <ExpandMore />}
                  sx={{
                    borderRadius: '10px',
                    minWidth: { xs: '40px', sm: '120px' },
                    px: { xs: 1, sm: 2 },
                    flexGrow: { xs: 1, sm: 0 },
                  }}
                >
                  <Box sx={{ display: { xs: 'none', sm: 'block' } }}>
                    Filters
                  </Box>
                </Button>
              </Badge>
            </Tooltip>

            {activeFilterCount > 0 && (
              <Tooltip title="Clear all filters">
                <IconButton
                  size="small"
                  onClick={clearAllFilters}
                  sx={{ ml: -0.5 }}
                >
                  <ClearIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            )}
          </Box>
        </Paper>

        {/* Expandable filters section - more responsive */}
        <Collapse in={filtersExpanded} timeout="auto" unmountOnExit>
          <Paper
            elevation={0}
            sx={{
              mt: 1,
              p: { xs: 1.5, sm: 2 },
              borderRadius: '12px',
              border: '1px solid',
              borderColor: 'divider',
            }}
          >
            <Grid container spacing={{ xs: 1, sm: 2 }}>
              <Grid item xs={12} sm={6} md={4}>
                <Typography
                  variant="subtitle2"
                  gutterBottom
                  sx={{
                    fontWeight: 'medium',
                    display: 'flex',
                    alignItems: 'center',
                    fontSize: { xs: '0.8rem', sm: '0.875rem' },
                  }}
                >
                  <SortByAlpha sx={{ fontSize: { xs: 16, sm: 18 }, mr: 1 }} />
                  Sort By
                </Typography>
                <FormControl fullWidth size="small" variant="outlined">
                  <Select
                    value={filterOptions.sortBy}
                    onChange={(e) =>
                      handleFilterChange('sortBy', e.target.value)
                    }
                    displayEmpty
                    sx={{
                      borderRadius: '10px',
                      bgcolor: 'background.paper',
                      fontSize: { xs: '0.8rem', sm: '0.875rem' },
                    }}
                  >
                    <MenuItem value="alphabetical">Alphabetical (A-Z)</MenuItem>
                    <MenuItem value="newest">Newest First</MenuItem>
                    <MenuItem value="oldest">Oldest First</MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12} sm={6} md={4}>
                <Typography
                  variant="subtitle2"
                  gutterBottom
                  sx={{
                    fontWeight: 'medium',
                    display: 'flex',
                    alignItems: 'center',
                    fontSize: { xs: '0.8rem', sm: '0.875rem' },
                  }}
                >
                  <TagIcon sx={{ fontSize: { xs: 16, sm: 18 }, mr: 1 }} />
                  Filter by Tag
                </Typography>
                <FormControl fullWidth size="small" variant="outlined">
                  <Select
                    value={filterOptions.filterByTag || ''}
                    onChange={(e) =>
                      handleFilterChange('filterByTag', e.target.value || null)
                    }
                    displayEmpty
                    sx={{
                      borderRadius: '10px',
                      bgcolor: 'background.paper',
                      fontSize: { xs: '0.8rem', sm: '0.875rem' },
                    }}
                    renderValue={(selected) =>
                      selected ? (
                        <Chip
                          size="small"
                          label={selected}
                          icon={<TagIcon fontSize="small" />}
                          onDelete={() =>
                            handleFilterChange('filterByTag', null)
                          }
                          sx={{ height: 24 }}
                        />
                      ) : (
                        <Typography
                          color="text.secondary"
                          sx={{ fontSize: { xs: '0.8rem', sm: '0.875rem' } }}
                        >
                          All Tags
                        </Typography>
                      )
                    }
                  >
                    <MenuItem value="">
                      <em>All Tags</em>
                    </MenuItem>
                    {tags.map((tag) => (
                      <MenuItem key={tag} value={tag}>
                        {tag}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12} sm={6} md={4}>
                <Typography
                  variant="subtitle2"
                  gutterBottom
                  sx={{
                    fontWeight: 'medium',
                    display: 'flex',
                    alignItems: 'center',
                    fontSize: { xs: '0.8rem', sm: '0.875rem' },
                  }}
                >
                  <FilterIcon sx={{ fontSize: { xs: 16, sm: 18 }, mr: 1 }} />
                  Content Type
                </Typography>
                <FormControl fullWidth size="small" variant="outlined">
                  <Select
                    value={filterOptions.contentType}
                    onChange={(e) =>
                      handleFilterChange('contentType', e.target.value)
                    }
                    displayEmpty
                    sx={{
                      borderRadius: '10px',
                      bgcolor: 'background.paper',
                      fontSize: { xs: '0.8rem', sm: '0.875rem' },
                    }}
                  >
                    <MenuItem value="all">All Content</MenuItem>
                    <MenuItem value="subjects">Subjects Only</MenuItem>
                    <MenuItem value="notes">Notes Only</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
            </Grid>

            {/* Filter summary - shows active filters as chips */}
            {activeFilterCount > 0 && (
              <Box sx={{ mt: 2, display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{
                    mr: 1,
                    display: 'flex',
                    alignItems: 'center',
                    fontSize: { xs: '0.75rem', sm: '0.875rem' },
                  }}
                >
                  Active filters:
                </Typography>

                <Box
                  sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, flex: 1 }}
                >
                  {filterOptions.sortBy !== 'alphabetical' && (
                    <Chip
                      size="small"
                      label={`Sort: ${filterOptions.sortBy}`}
                      onDelete={() =>
                        handleFilterChange('sortBy', 'alphabetical')
                      }
                      color="primary"
                      variant="outlined"
                      sx={{
                        height: { xs: 22, sm: 24 },
                        fontSize: { xs: '0.7rem', sm: '0.75rem' },
                      }}
                    />
                  )}

                  {filterOptions.filterByTag && (
                    <Chip
                      size="small"
                      icon={<TagIcon fontSize="small" />}
                      label={filterOptions.filterByTag}
                      onDelete={() => handleFilterChange('filterByTag', null)}
                      color="primary"
                      variant="outlined"
                      sx={{
                        height: { xs: 22, sm: 24 },
                        fontSize: { xs: '0.7rem', sm: '0.75rem' },
                      }}
                    />
                  )}

                  {filterOptions.contentType !== 'all' && (
                    <Chip
                      size="small"
                      icon={<FilterIcon fontSize="small" />}
                      label={
                        filterOptions.contentType === 'subjects'
                          ? 'Subjects Only'
                          : 'Notes Only'
                      }
                      onDelete={() => handleFilterChange('contentType', 'all')}
                      color="primary"
                      variant="outlined"
                      sx={{
                        height: { xs: 22, sm: 24 },
                        fontSize: { xs: '0.7rem', sm: '0.75rem' },
                      }}
                    />
                  )}

                  {searchTerm && (
                    <Chip
                      size="small"
                      icon={<SearchIcon fontSize="small" />}
                      label={`"${searchTerm}"`}
                      onDelete={handleClearSearch}
                      color="primary"
                      variant="outlined"
                      sx={{
                        height: { xs: 22, sm: 24 },
                        fontSize: { xs: '0.7rem', sm: '0.75rem' },
                      }}
                    />
                  )}
                </Box>

                <Button
                  size="small"
                  onClick={clearAllFilters}
                  startIcon={<ClearIcon fontSize="small" />}
                  sx={{
                    ml: { xs: 0, sm: 'auto' },
                    fontSize: { xs: '0.75rem', sm: '0.8125rem' },
                    mt: { xs: 1, sm: 0 },
                    width: { xs: '100%', sm: 'auto' },
                  }}
                >
                  Clear All
                </Button>
              </Box>
            )}
          </Paper>
        </Collapse>

        {/* Filter results summary */}
        {(filteredSubjects.length > 0 || filteredNotes.length > 0) &&
          searchTerm && (
            <Box
              sx={{
                mt: 2,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <Typography variant="body2" color="text.secondary">
                {isSearching ? (
                  <CircularProgress
                    size={16}
                    sx={{ mr: 1, verticalAlign: 'middle' }}
                  />
                ) : (
                  `Found ${filteredSubjects.length} subjects and ${filteredNotes.length} notes`
                )}
              </Typography>

              {activeFilterCount > 0 && (
                <Button
                  size="small"
                  color="primary"
                  onClick={clearAllFilters}
                  startIcon={<ClearIcon fontSize="small" />}
                >
                  Clear Filters
                </Button>
              )}
            </Box>
          )}
      </Box>
    );
  };

  // Render search results
  const renderSearchResults = () => {
    if (!searchTerm) {
      return null;
    }

    // No results
    if (filteredSubjects.length === 0 && filteredNotes.length === 0) {
      return (
        <Box sx={{ textAlign: 'center', py: 4 }}>
          <Typography variant="h6" color="text.secondary">
            No results found for "{searchTerm}"
          </Typography>
          <Button
            startIcon={<ClearIcon />}
            onClick={clearAllFilters}
            sx={{ mt: 2 }}
          >
            Clear Filters
          </Button>
        </Box>
      );
    }

    return (
      <Box sx={{ mb: 4 }}>
        <Typography variant="h5" component="h2" gutterBottom>
          Search Results for "{searchTerm}"
        </Typography>

        {/* Subject results */}
        {filteredSubjects.length > 0 && (
          <>
            <Typography variant="h6" gutterBottom sx={{ mt: 3 }}>
              Subjects ({filteredSubjects.length})
            </Typography>
            <Grid container spacing={3}>
              {filteredSubjects.slice(0, 6).map((subject) => (
                <Grid
                  key={subject.id}
                  sx={{
                    width: { xs: '100%', sm: '50%', md: '33.33%' },
                    p: 1.5,
                  }}
                >
                  <SubjectCard
                    subject={subject}
                    onViewNotes={handleViewNotes}
                    onEdit={handleEditSubject}
                    onDelete={handleDeleteSubject}
                    onShare={handleOpenShareDialog}
                  />
                </Grid>
              ))}
            </Grid>

            {filteredSubjects.length > 6 && (
              <Button
                onClick={() => {
                  handleSwitchView('subjects');
                  // Keep the current search term
                }}
                sx={{ mt: 1 }}
              >
                View all {filteredSubjects.length} subjects
              </Button>
            )}
          </>
        )}

        {/* Note results */}
        {filteredNotes.length > 0 && (
          <>
            <Typography variant="h6" gutterBottom sx={{ mt: 3 }}>
              Notes ({filteredNotes.length})
            </Typography>
            <Grid container spacing={3}>
              {filteredNotes.slice(0, 6).map((note) => (
                <Grid
                  key={note.id}
                  sx={{
                    width: { xs: '100%', sm: '50%', md: '33.33%' },
                    p: 1.5,
                  }}
                >
                  <NoteCard
                    note={note}
                    subjects={subjects}
                    onViewNote={() =>
                      navigate(`/subject/${note.subjectId}`, {
                        state: { openNote: note.id },
                      })
                    }
                    contentPreview={
                      sharedNoteContents[note.id] ||
                      'Loading content preview...'
                    }
                  />
                </Grid>
              ))}
            </Grid>

            {filteredNotes.length > 6 && (
              <Button
                onClick={() => {
                  handleSwitchView('recent');
                  // Keep the current search term
                }}
                sx={{ mt: 1 }}
              >
                View all {filteredNotes.length} notes
              </Button>
            )}
          </>
        )}
      </Box>
    );
  };

  // Render appropriate content based on active view
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
              Dashboard
            </Typography>

            {/* Enhanced search and filter component */}
            {renderSearchAndFilter()}
            {renderSearchResults()}

            {/* Only show dashboard cards if not searching */}
            {!searchTerm && (
              <>
                {/* Quick Stats Row */}
                <Box sx={{ mb: 4 }}>
                  <Grid container spacing={{ xs: 2, md: 3 }}>
                    {/* Total Subjects Card */}
                    <Grid
                      item
                      xs={12}
                      sm={6}
                      md={3}
                      sx={{ p: { xs: 1, sm: 1.5 } }}
                    >
                      <Paper
                        elevation={0}
                        variant="outlined"
                        sx={{
                          p: { xs: 1.5, sm: 2 },
                          borderRadius: 2,
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          textAlign: 'center',
                          bgcolor: 'rgba(25, 118, 210, 0.05)',
                          height: '100%',
                        }}
                      >
                        <School
                          sx={{
                            fontSize: { xs: 32, sm: 40 },
                            color: 'primary.main',
                            mb: 1,
                          }}
                        />
                        <Typography variant="h4" gutterBottom>
                          {subjects.length}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Total Subjects
                        </Typography>
                      </Paper>
                    </Grid>

                    {/* Shared Content Card */}
                    <Grid
                      item
                      xs={12}
                      sm={6}
                      md={3}
                      sx={{ p: { xs: 1, sm: 1.5 } }}
                    >
                      <Paper
                        elevation={0}
                        variant="outlined"
                        sx={{
                          p: { xs: 1.5, sm: 2 },
                          borderRadius: 2,
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          textAlign: 'center',
                          bgcolor: 'rgba(76, 175, 80, 0.05)',
                          height: '100%',
                        }}
                      >
                        <ShareIcon
                          sx={{
                            fontSize: { xs: 32, sm: 40 },
                            color: 'success.main',
                            mb: 1,
                          }}
                        />
                        <Typography variant="h4" gutterBottom>
                          {totalSharedCount}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Shared Items
                        </Typography>
                      </Paper>
                    </Grid>

                    {/* Tags Card */}
                    <Grid
                      item
                      xs={12}
                      sm={6}
                      md={3}
                      sx={{ p: { xs: 1, sm: 1.5 } }}
                    >
                      <Paper
                        elevation={0}
                        variant="outlined"
                        sx={{
                          p: { xs: 1.5, sm: 2 },
                          borderRadius: 2,
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          textAlign: 'center',
                          bgcolor: 'rgba(156, 39, 176, 0.05)',
                          height: '100%',
                        }}
                      >
                        <TagIcon
                          sx={{
                            fontSize: { xs: 32, sm: 40 },
                            color: 'secondary.main',
                            mb: 1,
                          }}
                        />
                        <Typography variant="h4" gutterBottom>
                          {tags.length}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Tags Used
                        </Typography>
                      </Paper>
                    </Grid>

                    {/* Last Activity */}
                    <Grid
                      item
                      xs={12}
                      sm={6}
                      md={3}
                      sx={{ p: { xs: 1, sm: 1.5 } }}
                    >
                      <Paper
                        elevation={0}
                        variant="outlined"
                        sx={{
                          p: { xs: 1.5, sm: 2 },
                          borderRadius: 2,
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          textAlign: 'center',
                          bgcolor: 'rgba(255, 152, 0, 0.05)',
                          height: '100%',
                        }}
                      >
                        <Analytics
                          sx={{
                            fontSize: { xs: 32, sm: 40 },
                            color: 'warning.main',
                            mb: 1,
                          }}
                        />
                        <Button
                          variant="outlined"
                          color="warning"
                          onClick={() => navigate('/analytics')}
                          size="small"
                          sx={{ mb: 1 }}
                        >
                          View Analytics
                        </Button>
                        <Typography variant="body2" color="text.secondary">
                          Study Progress
                        </Typography>
                      </Paper>
                    </Grid>
                  </Grid>
                </Box>

                {/* Quick Actions Section */}
                <Paper
                  elevation={0}
                  variant="outlined"
                  sx={{
                    p: { xs: 2, sm: 3 },
                    borderRadius: 2,
                    mb: 4,
                  }}
                >
                  <Typography
                    variant="h6"
                    gutterBottom
                    sx={{ display: 'flex', alignItems: 'center' }}
                  >
                    <Tune sx={{ mr: 1 }} /> Quick Actions
                  </Typography>
                  <Divider sx={{ mb: 2 }} />
                  <Grid container spacing={{ xs: 1, sm: 2 }}>
                    <Grid item xs={12} sm={6} md={3}>
                      <Button
                        fullWidth
                        variant="contained"
                        startIcon={<Add />}
                        onClick={handleAddSubject}
                        sx={{ mb: { xs: 1, sm: 2 }, py: 1 }}
                      >
                        Create New Subject
                      </Button>
                    </Grid>
                    <Grid item xs={12} sm={6} md={3}>
                      <Button
                        fullWidth
                        variant="outlined"
                        startIcon={<ShareIcon />}
                        onClick={() => handleSwitchView('shared')}
                        sx={{ mb: { xs: 1, sm: 2 }, py: 1 }}
                      >
                        View Shared Content
                      </Button>
                    </Grid>
                    <Grid item xs={12} sm={6} md={3}>
                      <Button
                        fullWidth
                        variant="outlined"
                        startIcon={<Settings />}
                        onClick={() => navigate('/profile')}
                        sx={{ mb: { xs: 1, sm: 2 }, py: 1 }}
                      >
                        Profile Settings
                      </Button>
                    </Grid>
                    <Grid item xs={12} sm={6} md={3}>
                      <Button
                        fullWidth
                        variant="outlined"
                        startIcon={<Analytics />}
                        onClick={() => navigate('/analytics')}
                        sx={{ mb: { xs: 1, sm: 2 }, py: 1 }}
                      >
                        Study Analytics
                      </Button>
                    </Grid>
                  </Grid>
                </Paper>

                {/* Recent Activity Section */}
                <Paper
                  elevation={0}
                  variant="outlined"
                  sx={{
                    p: { xs: 2, sm: 3 },
                    borderRadius: 2,
                    mb: 4,
                  }}
                >
                  <Typography
                    variant="h6"
                    gutterBottom
                    sx={{ display: 'flex', alignItems: 'center' }}
                  >
                    <VisibilityIcon sx={{ mr: 1 }} /> Recent Activity
                  </Typography>
                  <Divider sx={{ mb: 2 }} />
                  {subjects.length === 0 ? (
                    <Box sx={{ p: 2, textAlign: 'center' }}>
                      <Typography
                        variant="body1"
                        color="text.secondary"
                        gutterBottom
                      >
                        No subjects created yet
                      </Typography>
                      <Button
                        variant="contained"
                        startIcon={<Add />}
                        onClick={handleAddSubject}
                        sx={{ mt: 1 }}
                      >
                        Create Your First Subject
                      </Button>
                    </Box>
                  ) : (
                    <>
                      <Typography variant="subtitle2" gutterBottom>
                        Your Subjects
                      </Typography>
                      <Grid container spacing={{ xs: 1, sm: 2 }}>
                        {subjects.slice(0, 4).map((subject) => (
                          <Grid key={subject.id} item xs={12} sm={6} md={3}>
                            <Paper
                              variant="outlined"
                              sx={{
                                p: 2,
                                borderRadius: 2,
                                height: '100%',
                                display: 'flex',
                                flexDirection: 'column',
                                justifyContent: 'space-between',
                                cursor: 'pointer',
                                '&:hover': {
                                  boxShadow: '0 4px 8px rgba(0,0,0,0.1)',
                                  bgcolor: 'action.hover',
                                },
                              }}
                              onClick={() => handleViewNotes(subject.id)}
                            >
                              <Box>
                                <Typography
                                  variant="subtitle1"
                                  gutterBottom
                                  noWrap
                                  title={subject.title}
                                >
                                  {subject.title}
                                </Typography>
                                {subject.description && (
                                  <Typography
                                    variant="body2"
                                    color="text.secondary"
                                    sx={{
                                      mb: 1,
                                      overflow: 'hidden',
                                      textOverflow: 'ellipsis',
                                      display: '-webkit-box',
                                      WebkitLineClamp: 2,
                                      WebkitBoxOrient: 'vertical',
                                    }}
                                  >
                                    {subject.description}
                                  </Typography>
                                )}
                              </Box>
                              <Box
                                sx={{
                                  display: 'flex',
                                  justifyContent: 'flex-end',
                                  mt: 1,
                                }}
                              >
                                <IconButton
                                  size="small"
                                  color="primary"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleViewNotes(subject.id);
                                  }}
                                >
                                  <NoteIcon fontSize="small" />
                                </IconButton>
                                <IconButton
                                  size="small"
                                  color="primary"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleEditSubject(subject);
                                  }}
                                >
                                  <EditIcon fontSize="small" />
                                </IconButton>
                                <IconButton
                                  size="small"
                                  color="primary"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleOpenShareDialog({
                                      ...subject,
                                      itemType: 'subject',
                                    });
                                  }}
                                >
                                  <ShareIcon fontSize="small" />
                                </IconButton>
                              </Box>
                            </Paper>
                          </Grid>
                        ))}
                      </Grid>
                      {subjects.length > 4 && (
                        <Box
                          sx={{
                            display: 'flex',
                            justifyContent: 'flex-end',
                            mt: 2,
                          }}
                        >
                          <Button
                            variant="text"
                            endIcon={<ExpandMore />}
                            onClick={() => navigate('/subjects')}
                          >
                            View All Subjects ({subjects.length})
                          </Button>
                        </Box>
                      )}
                    </>
                  )}

                  {sharedWithMeCount > 0 && (
                    <Box sx={{ mt: 4 }}>
                      <Typography variant="subtitle2" gutterBottom>
                        Recently Shared With You
                      </Typography>
                      <Paper
                        variant="outlined"
                        sx={{
                          p: { xs: 1.5, sm: 2 },
                          borderRadius: 2,
                          background:
                            'linear-gradient(135deg, #f5f7fa 0%, #e4e8f0 100%)',
                        }}
                      >
                        <Box
                          sx={{
                            display: 'flex',
                            flexDirection: { xs: 'column', sm: 'row' },
                            alignItems: { xs: 'flex-start', sm: 'center' },
                            justifyContent: 'space-between',
                            gap: { xs: 1, sm: 0 },
                          }}
                        >
                          <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            <ShareIcon
                              color="primary"
                              sx={{ mr: 1, fontSize: '1.2rem' }}
                            />
                            <Typography>
                              {sharedSubjects.length} subjects and{' '}
                              {sharedNotes.length} notes
                            </Typography>
                          </Box>
                          <Button
                            variant="outlined"
                            size="small"
                            onClick={() => handleSwitchView('shared')}
                            sx={{ alignSelf: { xs: 'flex-start', sm: 'auto' } }}
                          >
                            View Shared
                          </Button>
                        </Box>
                      </Paper>
                    </Box>
                  )}
                </Paper>

                {/* Tags Section - Removed as requested */}
              </>
            )}
          </>
        );
        break;
      case 'subjects':
        mainContent = (
          <>
            <Typography variant="h5" component="h2" gutterBottom>
              My Subjects
            </Typography>

            {/* ... existing subject search and filter code ... */}

            {filteredSubjects.length === 0 ? (
              <Typography variant="body1" sx={{ mt: 2 }}>
                {subjects.length === 0
                  ? 'No subjects created yet. Create your first subject to get started!'
                  : 'No subjects match your search criteria.'}
              </Typography>
            ) : (
              <>
                <Grid container spacing={{ xs: 1, sm: 2, md: 3 }}>
                  {filteredSubjects
                    .slice(
                      (subjectsPage - 1) * itemsPerPage,
                      subjectsPage * itemsPerPage
                    )
                    .map((subject) => (
                      <Grid key={subject.id} item xs={12} sm={6} md={4} lg={4}>
                        <SubjectCard
                          subject={subject}
                          onViewNotes={handleViewNotes}
                          onEdit={handleEditSubject}
                          onDelete={handleDeleteSubject}
                          onShare={handleOpenShareDialog}
                        />
                      </Grid>
                    ))}
                </Grid>

                {/* Pagination controls */}
                <Box
                  sx={{
                    mt: 4,
                    display: 'flex',
                    justifyContent: 'center',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 2,
                  }}
                >
                  <Stack spacing={2} direction="row" alignItems="center">
                    <Typography variant="body2" color="text.secondary">
                      Items per page:
                    </Typography>
                    <FormControl size="small" sx={{ minWidth: 80 }}>
                      <Select
                        value={itemsPerPage}
                        onChange={(e) => {
                          setItemsPerPage(e.target.value);
                          setSubjectsPage(1); // Reset to first page when changing items per page
                        }}
                        displayEmpty
                      >
                        <MenuItem value={3}>3</MenuItem>
                        <MenuItem value={6}>6</MenuItem>
                        <MenuItem value={9}>9</MenuItem>
                        <MenuItem value={12}>12</MenuItem>
                      </Select>
                    </FormControl>
                  </Stack>

                  <Pagination
                    count={Math.ceil(filteredSubjects.length / itemsPerPage)}
                    page={subjectsPage}
                    onChange={(event, value) => setSubjectsPage(value)}
                    color="primary"
                    showFirstButton
                    showLastButton
                  />

                  <Typography variant="body2" color="text.secondary">
                    Showing{' '}
                    {Math.min(
                      (subjectsPage - 1) * itemsPerPage + 1,
                      filteredSubjects.length
                    )}{' '}
                    -{' '}
                    {Math.min(
                      subjectsPage * itemsPerPage,
                      filteredSubjects.length
                    )}{' '}
                    of {filteredSubjects.length} subjects
                  </Typography>
                </Box>
              </>
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

            {/* Add search and filter bar */}
            {renderSearchAndFilter()}
            {searchTerm && renderSearchResults()}

            {/* Only show regular content if not searching */}
            {!searchTerm && (
              <>
                {/* Section for content shared WITH the user */}
                <Box
                  sx={{
                    mb: 4,
                    p: 3,
                    borderRadius: 2,
                    position: 'relative',
                    overflow: 'hidden',
                    background:
                      'linear-gradient(135deg, #f5f7fa 0%, #e4e8f0 100%)',
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
                    <ShareIcon sx={{ mr: 1, fontSize: '1.2rem' }} />
                    Shared With Me
                  </Typography>

                  {sharedContentLoading ? (
                    <Box
                      sx={{ display: 'flex', justifyContent: 'center', py: 4 }}
                    >
                      <CircularProgress />
                    </Box>
                  ) : sharedSubjects.length === 0 &&
                    sharedNotes.length === 0 ? (
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
                            {sharedSubjects
                              .slice(
                                (sharedContentPage - 1) * itemsPerPage,
                                sharedContentPage * itemsPerPage
                              )
                              .map((subject) => (
                                <Grid
                                  key={subject.id}
                                  sx={{
                                    width: {
                                      xs: '100%',
                                      sm: '50%',
                                      md: '33.33%',
                                    },
                                    p: 1.5,
                                  }}
                                >
                                  <SubjectCard
                                    subject={subject}
                                    onViewNotes={handleViewNotes}
                                    showActions={false}
                                    showOwner={true}
                                    ownerInfo={{
                                      email: getUserEmail(subject.sharedBy),
                                      name: getUserEmail(subject.sharedBy),
                                      sharedAt: subject.sharedAt || null,
                                    }}
                                  />
                                </Grid>
                              ))}
                          </Grid>

                          {/* Pagination for shared subjects */}
                          {sharedSubjects.length > itemsPerPage && (
                            <Box
                              sx={{
                                mt: 3,
                                mb: 4,
                                display: 'flex',
                                justifyContent: 'center',
                              }}
                            >
                              <Pagination
                                count={Math.ceil(
                                  sharedSubjects.length / itemsPerPage
                                )}
                                page={sharedContentPage}
                                onChange={(event, value) =>
                                  setSharedContentPage(value)
                                }
                                color="primary"
                                size="small"
                              />
                            </Box>
                          )}
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
                              .slice(
                                (sharedContentPage - 1) * itemsPerPage,
                                sharedContentPage * itemsPerPage
                              )
                              .map((note) => (
                                <Grid
                                  key={note.id}
                                  sx={{
                                    width: {
                                      xs: '100%',
                                      sm: '50%',
                                      md: '33.33%',
                                    },
                                    p: 1.5,
                                  }}
                                >
                                  <NoteCard
                                    note={{
                                      ...note,
                                      // If we have the subject title in our state, use it
                                      subjectTitle:
                                        note.subjectTitle ||
                                        (note.subjectId &&
                                          subjectTitles[note.subjectId]),
                                    }}
                                    subjects={subjects}
                                    onViewNote={() =>
                                      navigate(`/shared-note/${note.id}`, {
                                        state: {
                                          noteId: note.id,
                                          isSharedNote: true,
                                        },
                                      })
                                    }
                                    showOwner={true}
                                    ownerInfo={{
                                      email: getUserEmail(note.sharedBy),
                                      name: getUserEmail(note.sharedBy),
                                      owner: getUserEmail(note.sharedBy),
                                      sharedAt: note.sharedAt || null,
                                    }}
                                    // Add content preview for shared notes
                                    contentPreview={
                                      sharedNoteContents[note.id] ||
                                      'Loading content preview...'
                                    }
                                  />
                                </Grid>
                              ))}
                          </Grid>

                          {/* Pagination for shared notes */}
                          {sharedNotes.length > itemsPerPage && (
                            <Box
                              sx={{
                                mt: 3,
                                mb: 4,
                                display: 'flex',
                                justifyContent: 'center',
                              }}
                            >
                              <Pagination
                                count={Math.ceil(
                                  sharedNotes.length / itemsPerPage
                                )}
                                page={sharedContentPage}
                                onChange={(event, value) =>
                                  setSharedContentPage(value)
                                }
                                color="primary"
                                size="small"
                              />
                            </Box>
                          )}
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
                    background:
                      'linear-gradient(135deg, #f0f7ff 0%, #e0f0ff 100%)',
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

                  {sharedContentLoading ? (
                    <Box
                      sx={{ display: 'flex', justifyContent: 'center', py: 4 }}
                    >
                      <CircularProgress />
                    </Box>
                  ) : sharedByMeItems.length === 0 ? (
                    <Typography variant="body1" sx={{ mt: 2 }}>
                      You haven't shared any content with others yet.
                    </Typography>
                  ) : (
                    <>
                      {/* Organize shared content by type */}
                      {/* Shared Subjects Section */}
                      {sharedByMeItems.some(
                        (item) => item.itemType === 'subject'
                      ) && (
                        <>
                          <Typography
                            variant="subtitle1"
                            gutterBottom
                            sx={{ mt: 2, fontWeight: 'bold' }}
                          >
                            Subjects
                          </Typography>
                          <Grid container spacing={3}>
                            {sharedByMeItems
                              .filter((item) => item.itemType === 'subject')
                              .map((item) => (
                                <Grid
                                  key={item.id}
                                  sx={{
                                    width: {
                                      xs: '100%',
                                      sm: '50%',
                                      md: '33.33%',
                                    },
                                    p: 1.5,
                                  }}
                                >
                                  <Card
                                    variant="outlined"
                                    sx={{
                                      height: '100%',
                                      display: 'flex',
                                      flexDirection: 'column',
                                      justifyContent: 'space-between',
                                      transition: 'all 0.2s ease',
                                      '&:hover': {
                                        boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                                        transform: 'translateY(-4px)',
                                      },
                                    }}
                                  >
                                    <CardContent sx={{ pb: 1 }}>
                                      <Typography
                                        variant="h6"
                                        component="div"
                                        gutterBottom
                                      >
                                        {item.itemTitle || 'Shared Subject'}
                                      </Typography>
                                      <Typography
                                        variant="body2"
                                        color="text.secondary"
                                        sx={{ mb: 1 }}
                                      >
                                        {item.shareType === 'public'
                                          ? 'Shared publicly'
                                          : `Shared with: ${
                                              Array.isArray(item.sharedWith)
                                                ? item.sharedWith.join(', ')
                                                : item.sharedWith ||
                                                  'Unknown recipients'
                                            }`}
                                      </Typography>

                                      <Box sx={{ mt: 'auto', pt: 1 }}>
                                        <Typography
                                          variant="caption"
                                          color="text.secondary"
                                          display="block"
                                        >
                                          Shared by you
                                        </Typography>
                                        <Typography
                                          variant="caption"
                                          color="text.secondary"
                                        >
                                          Shared on:{' '}
                                          {formatSharedDate(item.createdAt) ||
                                            'Unknown date'}
                                        </Typography>
                                      </Box>
                                    </CardContent>
                                    <CardActions
                                      sx={{
                                        p: 2,
                                        pt: 0,
                                        justifyContent: 'space-between',
                                      }}
                                    >
                                      <Button
                                        size="small"
                                        color="primary"
                                        onClick={() =>
                                          navigate(`/subject/${item.itemId}`)
                                        }
                                        startIcon={
                                          <NoteIcon fontSize="small" />
                                        }
                                      >
                                        View Notes
                                      </Button>
                                      <Button
                                        size="small"
                                        color="secondary"
                                        onClick={() =>
                                          handleOpenAccessLevelDialog({
                                            id: item.itemId,
                                            itemType: 'subject',
                                            title: item.itemTitle,
                                          })
                                        }
                                        startIcon={
                                          <ManageAccountsIcon fontSize="small" />
                                        }
                                        sx={{ ml: 1 }}
                                      >
                                        Manage Access
                                      </Button>
                                    </CardActions>
                                  </Card>
                                </Grid>
                              ))}
                          </Grid>
                        </>
                      )}

                      {/* Shared Notes Section */}
                      {sharedByMeItems.some(
                        (item) => item.itemType === 'note'
                      ) && (
                        <>
                          <Typography
                            variant="subtitle1"
                            gutterBottom
                            sx={{ mt: 4, fontWeight: 'bold' }}
                          >
                            Notes
                          </Typography>
                          <Grid container spacing={3}>
                            {sharedByMeItems
                              .filter((item) => item.itemType === 'note')
                              .map((item) => (
                                <Grid
                                  key={item.id}
                                  sx={{
                                    width: {
                                      xs: '100%',
                                      sm: '50%',
                                      md: '33.33%',
                                    },
                                    p: 1.5,
                                  }}
                                >
                                  <Card
                                    variant="outlined"
                                    sx={{
                                      height: '100%',
                                      display: 'flex',
                                      flexDirection: 'column',
                                      justifyContent: 'space-between',
                                      transition: 'all 0.2s ease',
                                      '&:hover': {
                                        boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                                        transform: 'translateY(-4px)',
                                      },
                                    }}
                                  >
                                    <CardContent sx={{ pb: 1 }}>
                                      <Typography
                                        variant="h6"
                                        component="div"
                                        gutterBottom
                                      >
                                        {item.itemTitle || 'Shared Note'}
                                      </Typography>
                                      {item.subjectId && (
                                        <Typography
                                          variant="body2"
                                          color="text.secondary"
                                          gutterBottom
                                        >
                                          Subject:{' '}
                                          {getFormattedSubjectTitle(
                                            item.subjectId,
                                            subjectTitles,
                                            item.subjectTitle
                                          )}
                                        </Typography>
                                      )}
                                      {!item.subjectId && (
                                        <Typography
                                          variant="body2"
                                          color="text.secondary"
                                          gutterBottom
                                        >
                                          <WarningIcon
                                            fontSize="small"
                                            color="warning"
                                            sx={{
                                              mr: 0.5,
                                              verticalAlign: 'middle',
                                            }}
                                          />
                                          No parent subject available
                                        </Typography>
                                      )}
                                      <Typography
                                        variant="body2"
                                        color="text.secondary"
                                        sx={{ mb: 1 }}
                                      >
                                        {item.shareType === 'public'
                                          ? 'Shared publicly'
                                          : `Shared with: ${
                                              Array.isArray(item.sharedWith)
                                                ? item.sharedWith.join(', ')
                                                : item.sharedWith ||
                                                  'Unknown recipients'
                                            }`}
                                      </Typography>

                                      {/* Content Preview - only for notes */}
                                      <Box
                                        sx={{
                                          mb: 2,
                                          overflow: 'hidden',
                                          textOverflow: 'ellipsis',
                                          display: '-webkit-box',
                                          WebkitLineClamp: 3,
                                          WebkitBoxOrient: 'vertical',
                                        }}
                                      >
                                        <div
                                          dangerouslySetInnerHTML={{
                                            __html: sharedNoteContents[
                                              item.itemId
                                            ]
                                              ? sharedNoteContents[
                                                  item.itemId
                                                ].substring(0, 150) +
                                                (sharedNoteContents[item.itemId]
                                                  .length > 150
                                                  ? '...'
                                                  : '')
                                              : 'Loading content...',
                                          }}
                                        />
                                      </Box>

                                      <Box sx={{ mt: 'auto', pt: 1 }}>
                                        <Typography
                                          variant="caption"
                                          color="text.secondary"
                                          display="block"
                                        >
                                          Shared by you
                                        </Typography>
                                        <Typography
                                          variant="caption"
                                          color="text.secondary"
                                        >
                                          Shared on:{' '}
                                          {formatSharedDate(item.createdAt) ||
                                            'Unknown date'}
                                        </Typography>
                                      </Box>
                                    </CardContent>
                                    <CardActions
                                      sx={{
                                        p: 2,
                                        pt: 0,
                                        justifyContent: 'space-between',
                                      }}
                                    >
                                      <Button
                                        size="small"
                                        color="primary"
                                        onClick={() =>
                                          navigate(
                                            `/shared-note/${item.itemId}`,
                                            {
                                              state: {
                                                noteId: item.itemId,
                                                isSharedNote: true,
                                              },
                                            }
                                          )
                                        }
                                        startIcon={
                                          <VisibilityIcon fontSize="small" />
                                        }
                                      >
                                        View Note
                                      </Button>
                                      <Button
                                        size="small"
                                        color="secondary"
                                        onClick={() =>
                                          handleOpenAccessLevelDialog({
                                            id: item.itemId,
                                            itemType: 'note',
                                            title: item.itemTitle,
                                          })
                                        }
                                        startIcon={
                                          <ManageAccountsIcon fontSize="small" />
                                        }
                                        sx={{ ml: 1 }}
                                      >
                                        Manage Access
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
              </>
            )}
          </>
        );
        break;
      default:
        mainContent = null;
    }
  }

  // Add new function to handle opening the access level dialog
  const handleOpenAccessLevelDialog = (item) => {
    setCurrentAccessItem(item);
    setAccessLevelDialogOpen(true);
  };

  // Add new function to handle closing the access level dialog
  const handleCloseAccessLevelDialog = () => {
    setAccessLevelDialogOpen(false);
    setCurrentAccessItem(null);
  };

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
              : ''}
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', mr: 2 }}>
            <img
              src="/soton_2.png"
              alt="University of Southampton"
              style={{ height: '32px', marginRight: '16px' }}
            />
          </Box>
        </Toolbar>
      </AppBar>

      {/* Sidebar component with proper props */}
      <Sidebar
        mobileOpen={mobileOpen}
        handleDrawerToggle={handleDrawerToggle}
        subjects={subjects}
        activeView={activeView}
        sharedItemsCount={totalSharedCount}
      />

      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: { xs: 1, sm: 2, md: 3 },
          width: { sm: `calc(100% - ${drawerWidth}px)` },
          mt: 8,
          overflowX: 'hidden',
          maxWidth: '100vw',
        }}
      >
        {activeView === 'dashboard' && (
          <Box
            sx={{
              mb: 4,
              p: { xs: 2, sm: 3 },
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
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={12} md={8}>
                <Typography
                  variant="h4"
                  component="h1"
                  gutterBottom
                  sx={{ fontSize: { xs: '1.75rem', sm: '2.125rem' } }}
                >
                  Welcome,{' '}
                  {currentUser?.displayName ||
                    currentUser?.email?.split('@')[0]}
                  !
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
              </Grid>
              <Grid item xs={12} md={4}>
                <Box
                  sx={{
                    display: 'flex',
                    gap: 1,
                    flexWrap: 'wrap',
                    justifyContent: { xs: 'flex-start', md: 'flex-end' },
                    mt: { xs: 1, md: 0 },
                  }}
                >
                  <Button
                    variant="contained"
                    color="primary"
                    size="small"
                    startIcon={<Add />}
                    onClick={handleAddSubject}
                    sx={{ mb: { xs: 1, sm: 0 } }}
                  >
                    New Subject
                  </Button>
                  {subjects.length > 0 && (
                    <Button
                      variant="outlined"
                      color="primary"
                      size="small"
                      onClick={() =>
                        subjects.length > 0 && handleViewNotes(subjects[0].id)
                      }
                    >
                      Latest Notes
                    </Button>
                  )}
                </Box>
              </Grid>
            </Grid>
          </Box>
        )}

        {mainContent}

        <Fab
          color="primary"
          aria-label="add"
          onClick={handleAddSubject}
          size="large"
          sx={{
            position: 'fixed',
            bottom: { xs: 16, sm: 24 },
            right: { xs: 16, sm: 24 },
            zIndex: 1050,
            display: 'flex',
            // Control the size responsively through sx prop instead
            width: { xs: 48, sm: 56 },
            height: { xs: 48, sm: 56 },
          }}
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

        {/* Access Level Dialog */}
        {currentAccessItem && (
          <AccessLevelDialog
            open={accessLevelDialogOpen}
            onClose={handleCloseAccessLevelDialog}
            item={currentAccessItem}
          />
        )}

        {/* Delete Confirmation Dialog */}
        <Dialog
          open={deleteConfirmOpen}
          onClose={handleCancelDelete}
          aria-labelledby="delete-dialog-title"
          aria-describedby="delete-dialog-description"
        >
          <DialogTitle id="delete-dialog-title">Move to Trash</DialogTitle>
          <DialogContent>
            <DialogContentText id="delete-dialog-description">
              Are you sure you want to move this subject to trash? This action
              will move the subject and all its notes to the trash. Items will
              be stored in the trash for 30 days before being permanently
              deleted. You can restore them from the trash during this period.
            </DialogContentText>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCancelDelete} color="primary">
              Cancel
            </Button>
            <Button onClick={handleConfirmDelete} color="warning" autoFocus>
              Move to Trash
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </Box>
  );
}
