import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useSidebar } from '../contexts/SidebarContext';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Grid,
  Button,
  CircularProgress,
  Container,
  Paper,
  TextField,
  InputAdornment,
  IconButton,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Pagination,
  Stack,
  Chip,
  Divider,
  AppBar,
  Toolbar,
  Breadcrumbs,
  Card,
  CardContent,
  CardActions,
  Avatar,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  DialogContentText,
  Collapse,
  Badge,
} from '@mui/material';
import {
  Search as SearchIcon,
  Clear as ClearIcon,
  FilterList as FilterIcon,
  SortByAlpha,
  ArrowBack,
  Add,
  Tune,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Note as NoteIcon,
  Share as ShareIcon,
  Menu as MenuIcon,
  ExpandMore,
  ExpandLess,
  LocalOffer as TagIcon,
} from '@mui/icons-material';
import {
  getUserSubjects,
  createSubject,
  updateSubject,
  deleteSubject,
} from '../services/subjectService';
import { getAllTags } from '../services/tagService';
import Sidebar from './Sidebar';

// Sidebar width (matching Dashboard)
const drawerWidth = 240;

// Subject Card Component
const SubjectCard = ({
  subject,
  onViewNotes,
  onEdit,
  onDelete,
  onShare,
  showActions = true,
  showOwner = false,
  ownerInfo = null,
  permissions = null,
}) => {
  // Determine what actions are available based on permissions
  const canEdit = permissions?.edit || (showActions && onEdit);
  const canDelete = permissions?.delete || (showActions && onDelete);
  const canShare = permissions?.share || (showActions && onShare);
  const canDownload = permissions?.download !== false;

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

export default function AllSubjects() {
  const { currentUser } = useAuth();
  const { loadSubjects } = useSidebar();
  const navigate = useNavigate();

  // State variables
  const [subjects, setSubjects] = useState([]);
  const [filteredSubjects, setFilteredSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [mobileOpen, setMobileOpen] = useState(false);

  // Search and filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [filterOptions, setFilterOptions] = useState({
    sortBy: 'alphabetical',
    filterByTag: null,
    contentType: 'subjects', // Default to subjects only since this is the subjects page
  });
  const [isSearching, setIsSearching] = useState(false);

  // Filter UI state
  const [filtersExpanded, setFiltersExpanded] = useState(false);
  const [activeFilterCount, setActiveFilterCount] = useState(0);

  // Tag state
  const [tags, setTags] = useState([]);

  // Pagination state
  const [page, setPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(9); // Show more subjects per page here

  // Dialog states
  const [openDialog, setOpenDialog] = useState(false);
  const [newSubject, setNewSubject] = useState({ title: '', description: '' });
  const [editSubject, setEditSubject] = useState(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [subjectToDelete, setSubjectToDelete] = useState(null);

  // Fetch subjects on component mount
  useEffect(() => {
    fetchSubjects();
    fetchTags();
  }, []);

  // Calculate active filter count whenever filter options change
  useEffect(() => {
    let count = 0;
    if (filterOptions.sortBy !== 'alphabetical') count++;
    if (filterOptions.filterByTag) count++;
    if (filterOptions.contentType !== 'subjects') count++;
    if (searchTerm) count++;
    setActiveFilterCount(count);
  }, [filterOptions, searchTerm]);

  // Filter subjects when search term or filter options change
  useEffect(() => {
    if (subjects.length > 0) {
      setIsSearching(true);
      // Use a small timeout to simulate search and show loading indicator
      const timer = setTimeout(() => {
        applyFilters();
        setIsSearching(false);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [subjects, searchTerm, filterOptions]);

  // Fetch all subjects from the API
  const fetchSubjects = async () => {
    setLoading(true);
    try {
      const fetchedSubjects = await getUserSubjects();
      setSubjects(fetchedSubjects);
      setFilteredSubjects(fetchedSubjects);
      setLoading(false);
    } catch (err) {
      console.error('Failed to fetch subjects:', err);
      setError(err.message || 'Failed to fetch subjects');
      setLoading(false);
    }
  };

  // Fetch all tags from the API
  const fetchTags = async () => {
    try {
      const userTags = await getAllTags();
      setTags(userTags);
    } catch (err) {
      console.error('Failed to fetch tags:', err);
    }
  };

  // Apply search and filters to subjects
  const applyFilters = () => {
    let result = [...subjects];

    // Apply search filter
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      result = result.filter(
        (subject) =>
          subject.title.toLowerCase().includes(searchLower) ||
          (subject.description &&
            subject.description.toLowerCase().includes(searchLower))
      );
    }

    // Apply tag filter
    if (filterOptions.filterByTag) {
      result = result.filter((subject) => {
        // We need to check notes within subjects for tags
        return (
          subject.hasTags && subject.hasTags.includes(filterOptions.filterByTag)
        );
      });
    }

    // Apply sort
    switch (filterOptions.sortBy) {
      case 'alphabetical':
        result.sort((a, b) => a.title.localeCompare(b.title));
        break;
      case 'newest':
        result.sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
        break;
      case 'oldest':
        result.sort(
          (a, b) =>
            new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        );
        break;
      default:
        break;
    }

    setFilteredSubjects(result);
  };

  // Handle search input change
  const handleSearchChange = (event) => {
    setSearchTerm(event.target.value);
    setPage(1); // Reset to first page when searching
  };

  // Clear search
  const handleClearSearch = () => {
    setSearchTerm('');
    setPage(1);
  };

  // Handle filter change
  const handleFilterChange = (filterType, value) => {
    setFilterOptions((prev) => ({
      ...prev,
      [filterType]: value,
    }));
    setPage(1); // Reset to first page when filtering
  };

  // New handler for filter expand/collapse
  const toggleFiltersExpanded = () => {
    setFiltersExpanded(!filtersExpanded);
  };

  // Add filter clear function
  const clearAllFilters = () => {
    setSearchTerm('');
    setFilterOptions({
      sortBy: 'alphabetical',
      filterByTag: null,
      contentType: 'subjects',
    });
    setPage(1);
  };

  // Handle drawer toggle for mobile
  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  // Handle view notes
  const handleViewNotes = (subjectId) => {
    navigate(`/subject/${subjectId}`);
  };

  // Handle creating a new subject
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
      const subjectData = {
        title: newSubject.title,
        description: newSubject.description,
      };

      const createdSubject = await createSubject(subjectData);
      setSubjects((prev) => [...prev, createdSubject]);
      handleCloseDialog();
    } catch (err) {
      console.error('Failed to create subject:', err);
      setError(err.message || 'Failed to create subject');
    }
  };

  // Handle editing a subject
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
      const updatedSubject = await updateSubject(editSubject.id, {
        title: editSubject.title,
        description: editSubject.description || '',
      });

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

  // Handle deleting a subject
  const handleDeleteSubject = async (subjectId) => {
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
      await loadSubjects();
      setDeleteConfirmOpen(false);
      setSubjectToDelete(null);
    } catch (err) {
      console.error('Failed to delete subject:', err);
      setError(err.message || 'Failed to delete subject');
      setDeleteConfirmOpen(false);
      setSubjectToDelete(null);
    }
  };

  const handleCancelDelete = () => {
    setDeleteConfirmOpen(false);
    setSubjectToDelete(null);
  };

  const handleShare = (subject) => {
    navigate('/dashboard', {
      state: {
        view: 'shared',
        shareItem: {
          ...subject,
          itemType: 'subject',
        },
      },
    });
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
            <FilterIcon />
          </IconButton>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            All Subjects
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

      <Sidebar
        mobileOpen={mobileOpen}
        handleDrawerToggle={handleDrawerToggle}
        subjects={subjects}
        activeView="subjects"
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
        {/* Breadcrumbs and back button */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            mb: 3,
            flexWrap: 'wrap',
          }}
        >
          <Button
            startIcon={<ArrowBack />}
            onClick={() => navigate('/dashboard')}
            sx={{ mr: 2, mb: { xs: 1, sm: 0 } }}
          >
            Back to Dashboard
          </Button>

          <Breadcrumbs aria-label="breadcrumb" sx={{ flexGrow: 1 }}>
            <Typography
              color="inherit"
              onClick={() => navigate('/dashboard')}
              sx={{
                cursor: 'pointer',
                '&:hover': { textDecoration: 'underline' },
              }}
            >
              Dashboard
            </Typography>
            <Typography color="text.primary">All Subjects</Typography>
          </Breadcrumbs>

          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={handleAddSubject}
            sx={{
              ml: { xs: 0, sm: 2 },
              mt: { xs: 1, sm: 0 },
              width: { xs: '100%', sm: 'auto' },
            }}
          >
            New Subject
          </Button>
        </Box>

        {/* Header with count and info */}
        <Paper
          elevation={0}
          variant="outlined"
          sx={{
            p: { xs: 2, sm: 3 },
            mb: 3,
            borderRadius: 2,
            background: 'linear-gradient(135deg, #f5f7fa 0%, #e4e8f0 100%)',
          }}
        >
          <Grid container alignItems="center" spacing={2}>
            <Grid item xs={12}>
              <Typography variant="h5" component="h1" gutterBottom>
                All Subjects ({filteredSubjects.length})
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Browse, search and manage all your subjects from this page.
                Click on a subject to view its notes.
              </Typography>
            </Grid>
          </Grid>
        </Paper>

        {/* Search and filter bar - matching Dashboard.js */}
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
              placeholder="Search subjects..."
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
                      <MenuItem value="alphabetical">
                        Alphabetical (A-Z)
                      </MenuItem>
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
                        handleFilterChange(
                          'filterByTag',
                          e.target.value || null
                        )
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
                    Items per page
                  </Typography>
                  <FormControl fullWidth size="small" variant="outlined">
                    <Select
                      value={itemsPerPage}
                      onChange={(e) => {
                        setItemsPerPage(e.target.value);
                        setPage(1);
                      }}
                      displayEmpty
                      sx={{
                        borderRadius: '10px',
                        bgcolor: 'background.paper',
                        fontSize: { xs: '0.8rem', sm: '0.875rem' },
                      }}
                    >
                      <MenuItem value={6}>6 per page</MenuItem>
                      <MenuItem value={9}>9 per page</MenuItem>
                      <MenuItem value={12}>12 per page</MenuItem>
                      <MenuItem value={24}>24 per page</MenuItem>
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
          {filteredSubjects.length > 0 && searchTerm && (
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
                  `Found ${filteredSubjects.length} subjects`
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

        {/* Main content */}
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
            <CircularProgress />
          </Box>
        ) : error ? (
          <Typography color="error">{error}</Typography>
        ) : filteredSubjects.length === 0 ? (
          <Paper
            elevation={0}
            variant="outlined"
            sx={{
              p: 4,
              textAlign: 'center',
              borderRadius: 2,
            }}
          >
            {searchTerm ? (
              <>
                <Typography variant="h6" gutterBottom>
                  No subjects found matching "{searchTerm}"
                </Typography>
                <Button
                  startIcon={<ClearIcon />}
                  onClick={handleClearSearch}
                  sx={{ mt: 2 }}
                >
                  Clear Search
                </Button>
              </>
            ) : (
              <>
                <Typography variant="h6" gutterBottom>
                  No subjects created yet
                </Typography>
                <Button
                  variant="contained"
                  startIcon={<Add />}
                  onClick={handleAddSubject}
                  sx={{ mt: 2 }}
                >
                  Create Your First Subject
                </Button>
              </>
            )}
          </Paper>
        ) : (
          <>
            <Grid container spacing={{ xs: 1, sm: 2, md: 3 }}>
              {filteredSubjects
                .slice((page - 1) * itemsPerPage, page * itemsPerPage)
                .map((subject) => (
                  <Grid key={subject.id} item xs={12} sm={6} md={4} lg={4}>
                    <SubjectCard
                      subject={subject}
                      onViewNotes={handleViewNotes}
                      onEdit={handleEditSubject}
                      onDelete={handleDeleteSubject}
                      onShare={handleShare}
                    />
                  </Grid>
                ))}
            </Grid>

            {/* Pagination */}
            {filteredSubjects.length > itemsPerPage && (
              <Box
                sx={{
                  mt: 4,
                  mb: 2,
                  display: 'flex',
                  justifyContent: 'center',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 2,
                }}
              >
                <Pagination
                  count={Math.ceil(filteredSubjects.length / itemsPerPage)}
                  page={page}
                  onChange={(event, value) => setPage(value)}
                  color="primary"
                  showFirstButton
                  showLastButton
                  size="large"
                  siblingCount={1}
                />

                <Typography variant="body2" color="text.secondary">
                  Showing{' '}
                  {Math.min(
                    (page - 1) * itemsPerPage + 1,
                    filteredSubjects.length
                  )}{' '}
                  - {Math.min(page * itemsPerPage, filteredSubjects.length)} of{' '}
                  {filteredSubjects.length} subjects
                </Typography>
              </Box>
            )}
          </>
        )}
      </Box>
    </Box>
  );
}
