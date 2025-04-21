import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { Editor } from '@tinymce/tinymce-react';
import {
  Box,
  Typography,
  Button,
  Divider,
  List,
  Card,
  CardContent,
  CircularProgress,
  Paper,
  TextField,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Fab,
  AppBar,
  Toolbar,
  Avatar,
  Tooltip,
  Chip,
  Grid,
  Menu,
  MenuItem,
  ButtonGroup,
  InputAdornment,
  Autocomplete,
} from '@mui/material';
import {
  ArrowBack,
  Edit,
  Delete,
  NoteAdd,
  Menu as MenuIcon,
  Share as ShareIcon,
  Image as ImageIcon,
  YouTube as VideoIcon,
  AttachFile,
  Link as LinkIcon,
  InsertDriveFile,
  AddCircleOutline,
  Close,
  LocalOffer as TagIcon,
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import {
  getSubjectById,
  getNotes,
  createNote,
  deleteNote,
  getAllSubjects,
  updateNote,
  getNoteById,
} from '../services/subjectService';
import { shareItem, getItemShares } from '../services/sharingService';
import { uploadFile, deleteFile } from '../services/storageService';
import {
  getAllTags,
  addTagToNote,
  removeTagFromNote,
} from '../services/tagService';
import Sidebar from './Sidebar';
import ShareDialog from './ShareDialog';

// Sidebar width
const drawerWidth = 240;

// Media types
const MEDIA_TYPES = {
  IMAGE: 'image',
  VIDEO: 'video',
  FILE: 'file',
  LINK: 'link',
};

export default function SubjectDetail({
  isShared = false,
  isSharedNote: propIsSharedNote = false,
}) {
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();
  const params = useParams();
  const subjectId = params.subjectId;
  const location = useLocation();
  const [subject, setSubject] = useState(null);
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [mobileOpen, setMobileOpen] = useState(false);
  const [openDialog, setOpenDialog] = useState(false);

  // State to track if we're viewing a shared note, initialized from props
  const [isSharedNote, setIsSharedNote] = useState(propIsSharedNote);

  // If we're viewing a shared note directly, extract the noteId from URL
  const noteIdFromUrl = isSharedNote ? params.noteId : null;

  // For viewing a specific note
  const [selectedNote, setSelectedNote] = useState(null);
  const [viewNoteDialogOpen, setViewNoteDialogOpen] = useState(false);

  // For editing a note
  const [editingNoteId, setEditingNoteId] = useState(null);
  const [newNote, setNewNote] = useState({
    title: '',
    content: '',
    subjectId: subjectId,
    mediaItems: [],
    tags: [],
  });
  const [editingNote, setEditingNote] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [allSubjects, setAllSubjects] = useState([]);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [temporaryUploads, setTemporaryUploads] = useState([]); // Track unsaved uploads

  // Tag-related state
  const [availableTags, setAvailableTags] = useState([]);
  const [newTag, setNewTag] = useState('');

  // Media embed states
  const [mediaAnchorEl, setMediaAnchorEl] = useState(null);
  const [mediaType, setMediaType] = useState(null);
  const [mediaUrl, setMediaUrl] = useState('');
  const [mediaTitle, setMediaTitle] = useState('');
  const fileInputRef = useRef(null);

  // Share state
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [currentShareItem, setCurrentShareItem] = useState(null);
  const [sharedNotes, setSharedNotes] = useState([]);

  // Permission-related state
  const [sharePermissions, setSharePermissions] = useState({}); // Tracks permissions for shared items

  // Create a reference for the TinyMCE editor
  const editorRef = useRef(null);

  // Add this new useEffect to inject additional fixes for TinyMCE dialogs
  useEffect(() => {
    // Create a style element to inject additional fixes
    const style = document.createElement('style');
    style.id = 'tinymce-dialog-fixes';
    style.textContent = `
      /* Ensure dialogs are on top and interactive */
      .tox-dialog {
        position: fixed !important;
      }
      
      /* Make sure input fields in dialogs are clickable */
      .tox-dialog input,
      .tox-dialog textarea,
      .tox-dialog select,
      .tox-dialog button,
      .tox-dialog .tox-listbox {
        pointer-events: auto !important;
        position: relative !important;
        z-index: 2500 !important;
      }
      
      /* Fix image dialog fields specifically */
      .tox-dialog__body-content .tox-form__group input {
        pointer-events: auto !important;
        z-index: 2500 !important;
      }
      
      /* Ensure the dialog stays above other elements */
      body.tox-dialog__disable-scroll .tox-dialog-wrap {
        z-index: 2400 !important;
      }
    `;

    // Append to head if it doesn't exist already
    if (!document.getElementById('tinymce-dialog-fixes')) {
      document.head.appendChild(style);
    }

    return () => {
      // Clean up the style element when component unmounts
      if (document.getElementById('tinymce-dialog-fixes')) {
        document.head.removeChild(style);
      }
    };
  }, []);

  useEffect(() => {
    // Initial cleanup to remove any lingering TinyMCE instances
    if (window.tinymce) {
      console.log('Cleaning up existing TinyMCE instances on component mount');
      if (typeof window.tinymceGlobalCleanup === 'function') {
        window.tinymceGlobalCleanup();
      }
    }

    // Set up an interval to check for and clean up any orphaned TinyMCE elements
    const cleanupInterval = setInterval(() => {
      // Only clean up if the dialog is closed and we have TinyMCE elements
      if (!openDialog && window.tinymce) {
        const elements = document.querySelectorAll(
          '.tox-tinymce-aux, .tox-silver-sink, .tox-dialog-wrap'
        );
        if (elements.length > 0) {
          console.warn('Found orphaned TinyMCE elements, cleaning up');
          if (typeof window.tinymceGlobalCleanup === 'function') {
            window.tinymceGlobalCleanup();
          }
        }
      }
    }, 5000); // Check every 5 seconds

    return () => {
      // Clear the interval when component unmounts
      clearInterval(cleanupInterval);

      // Only clean up TinyMCE instances when the component is unmounting
      // This ensures we don't destroy the editor when it might still be in use
      if (window.tinymce) {
        console.log('Component unmounting, cleaning up TinyMCE');
        if (typeof window.tinymceGlobalCleanup === 'function') {
          window.tinymceGlobalCleanup();
        }
      }
    };
  }, [openDialog]); // Re-run when dialog state changes

  useEffect(() => {
    const fetchSubjectDetails = async () => {
      setLoading(true);
      setError('');

      try {
        let fetchedSubject = null;
        let fetchedNotes = [];
        let fetchedAllSubjects = [];

        // If opening a specific note from location state
        const openNoteId = location.state?.openNote;

        // Handle shared note directly
        if (isSharedNote && (noteIdFromUrl || openNoteId)) {
          // Determine which note ID to use
          const noteId = noteIdFromUrl || openNoteId;

          // Fetch the shared note first
          const sharedNote = await getNoteById(noteId);
          if (!sharedNote) {
            throw new Error('Note not found or you do not have access');
          }

          // Get the sharing details including permissions
          const noteShares = await getItemShares(noteId, 'note');
          if (noteShares && noteShares.length > 0) {
            // Set permissions for this note
            setSharePermissions({
              [noteId]: noteShares[0].permissions || {
                view: true,
                edit: false,
                comment: false,
                download: true,
                share: false,
              },
            });
          }

          // Try to fetch the parent subject, but don't fail if we can't access it
          try {
            fetchedSubject = await getSubjectById(sharedNote.subjectId);
          } catch (subjectError) {
            console.warn(
              `Could not access parent subject: ${subjectError.message}`
            );
            // Create a minimal "dummy" subject just to display the note
            fetchedSubject = {
              id: sharedNote.subjectId,
              title: 'Shared Note',
              description:
                'You have access to this note, but not its parent subject.',
              createdBy: 'unknown',
              createdAt: sharedNote.createdAt,
            };
          }

          fetchedNotes = [sharedNote]; // Just show this note

          // Auto-open the note view
          setSelectedNote(sharedNote);
          setViewNoteDialogOpen(true);

          // Clear the location state to prevent it from persisting
          if (location.state?.openNote) {
            const newState = { ...location.state };
            delete newState.openNote;
            window.history.replaceState(newState, document.title);
          }
        }
        // Get shared subject directly
        else if (isShared && subjectId) {
          // Get the sharing details including permissions
          const subjectShares = await getItemShares(subjectId, 'subject');
          if (subjectShares && subjectShares.length > 0) {
            // Set permissions for this subject
            setSharePermissions({
              [subjectId]: subjectShares[0].permissions || {
                view: true,
                edit: false,
                comment: false,
                download: true,
                share: false,
              },
            });
          }

          fetchedSubject = await getSubjectById(subjectId);
          fetchedNotes = await getNotes(subjectId);
        }
        // Normal flow - get subject and its notes
        else {
          fetchedSubject = await getSubjectById(subjectId);
          fetchedNotes = await getNotes(subjectId);
        }

        // Get all subjects for sidebar
        fetchedAllSubjects = await getAllSubjects();

        // Get shares for notes in this subject to determine which are shared
        const sharedNotesArray = [];
        const permissionsMap = { ...sharePermissions };

        for (const note of fetchedNotes) {
          try {
            const noteShares = await getItemShares(note.id, 'note');
            if (noteShares.length > 0) {
              sharedNotesArray.push({
                id: note.id,
                shareType: noteShares[0].shareType,
                sharedWith: noteShares[0].sharedWith || [],
              });

              // Store permissions for each note
              permissionsMap[note.id] = noteShares[0].permissions || {
                view: true,
                edit: false,
                comment: false,
                download: true,
                share: false,
              };
            }
          } catch (err) {
            console.error(`Failed to get shares for note ${note.id}:`, err);
          }
        }

        setSubject(fetchedSubject);
        setNotes(fetchedNotes);
        setAllSubjects(fetchedAllSubjects);
        setSharedNotes(sharedNotesArray);
        setSharePermissions(permissionsMap);

        // Reset new note with current subject ID
        setNewNote((prev) => ({
          ...prev,
          subjectId: fetchedSubject.id,
        }));

        setLoading(false);
      } catch (err) {
        console.error('Error fetching subject details:', err);
        setError(err.message || 'Failed to load subject details');
        setLoading(false);
      }
    };

    if (subjectId) {
      fetchSubjectDetails();
    }
  }, [subjectId, currentUser.uid, isShared, isSharedNote, noteIdFromUrl]);

  useEffect(() => {
    // Check if we have a note to open from navigation state
    if (location.state?.openNote) {
      const noteId = location.state.openNote;
      // Clear the location state to prevent it from persisting
      window.history.replaceState({}, document.title);
      // Find and open the note after data is loaded
      if (!loading && notes.length > 0) {
        const note = notes.find((n) => n.id === noteId);
        if (note) {
          setSelectedNote(note);
          setViewNoteDialogOpen(true);
        }
      }
    }
  }, [location.state, notes, loading]);

  // Handle the isSharedNote value passed through location state
  useEffect(() => {
    if (location.state?.isSharedNote) {
      // We're opening a shared note, set isSharedNote to true
      setIsSharedNote(true);

      // Clear the location state to prevent it from persisting
      const newState = { ...location.state };
      delete newState.isSharedNote;
      window.history.replaceState(newState, document.title);
    }
  }, [location.state]);

  useEffect(() => {
    // Fetch all tags for autocomplete
    const fetchTags = async () => {
      try {
        const tags = await getAllTags();
        setAvailableTags(tags);
      } catch (error) {
        console.error('Error fetching tags:', error);
      }
    };

    fetchTags();
  }, []);

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const handleBack = () => {
    navigate('/dashboard', { state: { view: 'dashboard' } });
  };

  const handleAddNote = () => {
    // Check if user has edit permission for the subject
    if (!hasPermission(subjectId, 'edit')) {
      alert("You don't have permission to add notes to this subject.");
      return;
    }

    // If we were already editing a note, reset the state
    if (isEditing || newNote.content) {
      console.log('Resetting editor for new note');
      setNewNote({
        title: '',
        content: '',
        mediaItems: [],
        tags: [],
      });
    }

    setIsEditing(false);
    setEditingNote(null);
    // Open the dialog
    setOpenDialog(true);
  };

  const handleEditNote = (noteId) => {
    // If not owner, check edit permission
    if (!hasPermission(noteId, 'edit')) {
      alert("You don't have permission to edit this note.");
      return;
    }

    const noteToEdit = notes.find((note) => note.id === noteId);
    if (noteToEdit) {
      // If we were already editing another note, we need to reset
      if (isEditing && editingNote && editingNote.id !== noteId) {
        // Clear any unsaved changes
        console.log('Switching to a different note, resetting editor content');
      }

      setEditingNote(noteToEdit);
      setNewNote({
        title: noteToEdit.title,
        content: noteToEdit.content,
        mediaItems: noteToEdit.mediaItems || [],
        tags: noteToEdit.tags || [],
      });
      setIsEditing(true);
      setOpenDialog(true);
    }
  };

  // Enhanced handleCloseDialog function with proper TinyMCE cleanup
  const handleCloseDialog = () => {
    // Clean up temporary uploads if the user cancels
    if (temporaryUploads.length > 0) {
      console.log(`Cleaning up ${temporaryUploads.length} unsaved uploads`);
      temporaryUploads.forEach(async (url) => {
        try {
          await deleteFile(url);
        } catch (err) {
          console.error(`Failed to delete temporary file ${url}:`, err);
        }
      });
      setTemporaryUploads([]);
    }

    // Clean up TinyMCE properly to prevent "is" property errors
    if (window.tinymce) {
      try {
        // Save content before cleanup
        const content = editorRef.current?.getContent();

        // Execute the global cleanup function from index.html
        if (typeof window.tinymceGlobalCleanup === 'function') {
          window.tinymceGlobalCleanup();
        }

        // Clean up TinyMCE dialog elements that might cause issues
        const elements = document.querySelectorAll(
          '.tox-tinymce-aux, .tox-silver-sink, .tox-dialog-wrap'
        );
        elements.forEach((el) => {
          try {
            el.parentNode.removeChild(el);
          } catch (e) {
            // Element might not be a direct child of body
          }
        });

        // Clear the editor reference
        editorRef.current = null;
      } catch (e) {
        console.warn('Error during TinyMCE cleanup:', e);
      }
    }

    // Reset state
    setOpenDialog(false);
  };

  const handleCreateNote = async () => {
    if (!newNote.title) {
      setError('Note title is required');
      return;
    }

    if (!newNote.content) {
      setError('Note content is required');
      return;
    }

    try {
      if (isEditing && editingNote) {
        // Update existing note
        const updatedNote = await updateNote(editingNote.id, {
          title: newNote.title,
          content: newNote.content,
          subjectId: subjectId,
          mediaItems: newNote.mediaItems || [],
          tags: newNote.tags || [],
        });

        // Update state with the edited note
        setNotes((prevNotes) =>
          prevNotes.map((note) =>
            note.id === updatedNote.id ? updatedNote : note
          )
        );
      } else {
        // Create new note
        const noteData = {
          title: newNote.title,
          content: newNote.content,
          subjectId: subjectId,
          mediaItems: newNote.mediaItems || [],
          tags: newNote.tags || [],
        };

        const createdNote = await createNote(noteData);
        setNotes((prev) => [...prev, createdNote]);
      }

      // Clear the temporary uploads list without deleting files
      // since they are now properly linked to a saved note
      setTemporaryUploads([]);

      // Close the dialog but don't reset the editor state
      setOpenDialog(false);

      // Reset editing state
      setEditingNote(null);
      setIsEditing(false);
    } catch (err) {
      console.error(`Failed to ${isEditing ? 'update' : 'create'} note:`, err);
      setError(
        err.message || `Failed to ${isEditing ? 'update' : 'create'} note`
      );
    }
  };

  const handleDeleteNote = async (noteId) => {
    // If not owner, check edit permission
    if (!hasPermission(noteId, 'edit')) {
      alert("You don't have permission to delete this note.");
      return;
    }

    try {
      const noteToDelete = notes.find((n) => n.id === noteId);

      // Delete any uploaded files associated with this note
      if (noteToDelete?.mediaItems?.length > 0) {
        for (const media of noteToDelete.mediaItems) {
          if (
            media.type === MEDIA_TYPES.IMAGE ||
            media.type === MEDIA_TYPES.FILE
          ) {
            try {
              await deleteFile(media.url);
            } catch (err) {
              console.error(`Failed to delete file ${media.url}:`, err);
            }
          }
        }
      }

      // Delete note via API
      await deleteNote(noteId);

      // Update local state
      setNotes((prev) => prev.filter((note) => note.id !== noteId));
    } catch (err) {
      console.error('Failed to delete note:', err);
      setError(err.message || 'Failed to delete note');
    }
  };

  const handleViewNote = (noteId) => {
    const note = notes.find((n) => n.id === noteId);
    if (note) {
      setSelectedNote(note);
      setViewNoteDialogOpen(true);
    }
  };

  const handleCloseViewNoteDialog = () => {
    setViewNoteDialogOpen(false);
    setSelectedNote(null);
  };

  // Media embed functionality
  const handleMediaButtonClick = (event) => {
    setMediaAnchorEl(event.currentTarget);
  };

  const handleMediaMenuClose = () => {
    setMediaAnchorEl(null);
  };

  const handleMediaTypeSelect = (type) => {
    setMediaType(type);
    setMediaUrl('');
    setMediaTitle('');
    handleMediaMenuClose();

    if (type === MEDIA_TYPES.IMAGE || type === MEDIA_TYPES.FILE) {
      fileInputRef.current.click();
    }
  };

  const handleFileSelect = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      setUploadLoading(true);
      const fileName = `${Date.now()}_${file.name}`;
      const path = `notes/${currentUser.uid}/${subjectId}/${fileName}`;

      const uploadedUrl = await uploadFile(file, path, (progress) => {
        console.log(`File upload progress: ${progress}%`);
      });

      // Track this URL as a temporary upload
      setTemporaryUploads((prev) => [...prev, uploadedUrl]);

      // Add the new media item
      const newMediaItem = {
        type: file.type.startsWith('image/')
          ? MEDIA_TYPES.IMAGE
          : MEDIA_TYPES.FILE,
        url: uploadedUrl,
        title: file.name,
        createdAt: new Date().toISOString(),
      };

      setNewNote((prev) => ({
        ...prev,
        mediaItems: [...(prev.mediaItems || []), newMediaItem],
      }));

      setUploadLoading(false);
    } catch (err) {
      console.error('Failed to upload file:', err);
      setError(err.message || 'Failed to upload file');
      setUploadLoading(false);
    }

    // Reset file input
    e.target.value = null;
  };

  const handleAddLink = () => {
    if (!mediaUrl) return;

    const newMediaItem = {
      type: mediaType,
      url: mediaUrl,
      title: mediaTitle || mediaUrl,
      createdAt: new Date().toISOString(),
    };

    setNewNote((prev) => ({
      ...prev,
      mediaItems: [...(prev.mediaItems || []), newMediaItem],
    }));

    // Reset
    setMediaType(null);
    setMediaUrl('');
    setMediaTitle('');
  };

  const handleRemoveMedia = (index) => {
    setNewNote((prev) => {
      const updatedMediaItems = [...prev.mediaItems];
      updatedMediaItems.splice(index, 1);
      return {
        ...prev,
        mediaItems: updatedMediaItems,
      };
    });
  };

  // Render media preview
  const renderMediaPreview = (media, index) => {
    switch (media.type) {
      case MEDIA_TYPES.IMAGE:
        return (
          <Box
            key={index}
            sx={{ position: 'relative', mb: 2, maxWidth: '100%' }}
          >
            <img
              src={media.url}
              alt={media.title}
              style={{
                maxWidth: '100%',
                maxHeight: '200px',
                borderRadius: '4px',
              }}
            />
            <IconButton
              size="small"
              sx={{
                position: 'absolute',
                top: 5,
                right: 5,
                bgcolor: 'rgba(255,255,255,0.7)',
              }}
              onClick={() => handleRemoveMedia(index)}
            >
              <Close fontSize="small" />
            </IconButton>
            <Typography variant="caption" display="block" sx={{ mt: 0.5 }}>
              {media.title}
            </Typography>
          </Box>
        );
      case MEDIA_TYPES.VIDEO:
        return (
          <Box key={index} sx={{ position: 'relative', mb: 2 }}>
            <iframe
              width="100%"
              height="200"
              src={media.url}
              title={media.title}
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            ></iframe>
            <IconButton
              size="small"
              sx={{
                position: 'absolute',
                top: 5,
                right: 5,
                bgcolor: 'rgba(255,255,255,0.7)',
              }}
              onClick={() => handleRemoveMedia(index)}
            >
              <Close fontSize="small" />
            </IconButton>
            <Typography variant="caption" display="block" sx={{ mt: 0.5 }}>
              {media.title}
            </Typography>
          </Box>
        );
      case MEDIA_TYPES.LINK:
        return (
          <Box
            key={index}
            sx={{
              position: 'relative',
              mb: 2,
              p: 2,
              border: '1px solid #ddd',
              borderRadius: '4px',
            }}
          >
            <IconButton
              size="small"
              sx={{ position: 'absolute', top: 5, right: 5 }}
              onClick={() => handleRemoveMedia(index)}
            >
              <Close fontSize="small" />
            </IconButton>
            <Typography
              variant="body2"
              component="div"
              sx={{ display: 'flex', alignItems: 'center' }}
            >
              <LinkIcon fontSize="small" sx={{ mr: 1 }} />
              <a href={media.url} target="_blank" rel="noopener noreferrer">
                {media.title || media.url}
              </a>
            </Typography>
          </Box>
        );
      case MEDIA_TYPES.FILE:
        return (
          <Box
            key={index}
            sx={{
              position: 'relative',
              mb: 2,
              p: 2,
              border: '1px solid #ddd',
              borderRadius: '4px',
            }}
          >
            <IconButton
              size="small"
              sx={{ position: 'absolute', top: 5, right: 5 }}
              onClick={() => handleRemoveMedia(index)}
            >
              <Close fontSize="small" />
            </IconButton>
            <Typography
              variant="body2"
              component="div"
              sx={{ display: 'flex', alignItems: 'center' }}
            >
              <InsertDriveFile fontSize="small" sx={{ mr: 1 }} />
              <a
                href={media.url}
                target="_blank"
                rel="noopener noreferrer"
                download
              >
                {media.title}
              </a>
            </Typography>
          </Box>
        );
      default:
        return null;
    }
  };

  // Render media in note card
  const renderNoteMedia = (mediaItems) => {
    if (!mediaItems || mediaItems.length === 0) return null;

    return (
      <Box sx={{ mt: 2 }}>
        <Grid container spacing={2}>
          {mediaItems.map((media, index) => {
            switch (media.type) {
              case MEDIA_TYPES.IMAGE:
                return (
                  <Grid item xs={12} sm={6} md={4} key={index}>
                    <Box sx={{ position: 'relative' }}>
                      <img
                        src={media.url}
                        alt={media.title}
                        style={{
                          width: '100%',
                          height: '140px',
                          objectFit: 'cover',
                          borderRadius: '4px',
                        }}
                      />
                      <Box
                        sx={{
                          position: 'absolute',
                          bottom: 0,
                          left: 0,
                          right: 0,
                          p: 1,
                          bgcolor: 'rgba(0,0,0,0.5)',
                          borderBottomLeftRadius: '4px',
                          borderBottomRightRadius: '4px',
                        }}
                      >
                        <Typography
                          variant="caption"
                          color="white"
                          sx={{
                            textOverflow: 'ellipsis',
                            overflow: 'hidden',
                            whiteSpace: 'nowrap',
                            display: 'block',
                          }}
                        >
                          {media.title}
                        </Typography>
                      </Box>
                    </Box>
                  </Grid>
                );
              case MEDIA_TYPES.VIDEO:
                return (
                  <Grid item xs={12} sm={6} md={4} key={index}>
                    <Box sx={{ position: 'relative' }}>
                      <Box
                        sx={{
                          bgcolor: '#000',
                          borderRadius: '4px',
                          height: '140px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <VideoIcon sx={{ fontSize: 40, color: '#f44336' }} />
                      </Box>
                      <Box
                        sx={{
                          position: 'absolute',
                          bottom: 0,
                          left: 0,
                          right: 0,
                          p: 1,
                          bgcolor: 'rgba(0,0,0,0.5)',
                          borderBottomLeftRadius: '4px',
                          borderBottomRightRadius: '4px',
                        }}
                      >
                        <Typography
                          variant="caption"
                          color="white"
                          sx={{
                            textOverflow: 'ellipsis',
                            overflow: 'hidden',
                            whiteSpace: 'nowrap',
                            display: 'block',
                          }}
                        >
                          {media.title}
                        </Typography>
                      </Box>
                    </Box>
                  </Grid>
                );
              case MEDIA_TYPES.LINK:
                return (
                  <Grid item xs={12} sm={6} md={4} key={index}>
                    <Box
                      sx={{
                        p: 2,
                        border: '1px solid #ddd',
                        borderRadius: '4px',
                        height: '140px',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'center',
                      }}
                    >
                      <LinkIcon color="primary" sx={{ fontSize: 30, mb: 1 }} />
                      <Typography
                        variant="body2"
                        sx={{
                          textOverflow: 'ellipsis',
                          overflow: 'hidden',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        <a
                          href={media.url}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          {media.title || media.url}
                        </a>
                      </Typography>
                    </Box>
                  </Grid>
                );
              case MEDIA_TYPES.FILE:
                return (
                  <Grid item xs={12} sm={6} md={4} key={index}>
                    <Box
                      sx={{
                        p: 2,
                        border: '1px solid #ddd',
                        borderRadius: '4px',
                        height: '140px',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'center',
                      }}
                    >
                      <InsertDriveFile
                        color="primary"
                        sx={{ fontSize: 30, mb: 1 }}
                      />
                      <Typography
                        variant="body2"
                        sx={{
                          textOverflow: 'ellipsis',
                          overflow: 'hidden',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        <a
                          href={media.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          download
                        >
                          {media.title}
                        </a>
                      </Typography>
                    </Box>
                  </Grid>
                );
              default:
                return null;
            }
          })}
        </Grid>
      </Box>
    );
  };

  // Sharing functionality
  const handleOpenShareDialog = (note) => {
    // Check if user has reshare permission
    if (note.id && !hasPermission(note.id, 'share')) {
      alert("You don't have permission to reshare this content.");
      return;
    }

    setCurrentShareItem({
      ...note,
      itemType: 'note',
    });
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

      // Update the notes array to show sharing status
      if (shareData.itemType === 'note') {
        const updatedNotes = notes.map((note) => {
          if (note.id === shareData.itemId) {
            return {
              ...note,
              isShared: true,
              shareType: shareData.shareType,
              sharedWith: shareData.sharedWith || [],
            };
          }
          return note;
        });
        setNotes(updatedNotes);

        // Update the sharedNotes array
        const updatedSharedNotes = [...sharedNotes];
        const existingIndex = updatedSharedNotes.findIndex(
          (n) => n.id === shareData.itemId
        );

        if (existingIndex >= 0) {
          updatedSharedNotes[existingIndex] = {
            ...updatedSharedNotes[existingIndex],
            shareType: shareData.shareType,
            sharedWith: shareData.sharedWith || [],
          };
        } else {
          updatedSharedNotes.push({
            id: shareData.itemId,
            shareType: shareData.shareType,
            sharedWith: shareData.sharedWith || [],
          });
        }

        setSharedNotes(updatedSharedNotes);
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

  // Function to render sharing status of a note
  const renderShareStatus = (note) => {
    if (!note.isShared) return null;

    return (
      <Box sx={{ mt: 1, display: 'flex', alignItems: 'center' }}>
        <ShareIcon fontSize="small" color="primary" sx={{ mr: 1 }} />
        <Typography variant="caption" color="primary">
          {note.shareType === 'public'
            ? 'Shared publicly'
            : `Shared with ${note.sharedWith?.length || 0} people`}
        </Typography>
      </Box>
    );
  };

  // Calculate the count of shared items for the sidebar
  const sharedItemsCount = sharedNotes?.length || 0;

  // Safely display HTML content
  const createMarkup = (htmlContent) => {
    return { __html: htmlContent };
  };

  // Check if the user has a specific permission for an item
  const hasPermission = (itemId, permission) => {
    // If the user is the owner, they have all permissions
    const isOwner = subject && subject.createdBy === currentUser.uid;
    if (isOwner) return true;

    // Otherwise check the permissions from the share
    return sharePermissions[itemId]?.[permission] || false;
  };

  // Modify the rendering of note action buttons to check permissions
  const renderNoteActions = (note) => {
    const canEdit = hasPermission(note.id, 'edit');
    const canShare = hasPermission(note.id, 'share');

    return (
      <Box>
        <Tooltip title={canShare ? 'Share note' : 'You cannot share this note'}>
          <span>
            <IconButton
              size="small"
              onClick={() => canShare && handleOpenShareDialog(note)}
              color={note.isShared ? 'primary' : 'default'}
              disabled={!canShare}
            >
              <ShareIcon fontSize="small" />
            </IconButton>
          </span>
        </Tooltip>
        <Tooltip title={canEdit ? 'Edit note' : 'You cannot edit this note'}>
          <span>
            <IconButton
              size="small"
              onClick={() => canEdit && handleEditNote(note.id)}
              disabled={!canEdit}
            >
              <Edit fontSize="small" />
            </IconButton>
          </span>
        </Tooltip>
        <Tooltip
          title={canEdit ? 'Delete note' : 'You cannot delete this note'}
        >
          <span>
            <IconButton
              size="small"
              onClick={() => canEdit && handleDeleteNote(note.id)}
              disabled={!canEdit}
            >
              <Delete fontSize="small" />
            </IconButton>
          </span>
        </Tooltip>
      </Box>
    );
  };

  // First let's add the canShareSubject function if it's not already there
  const canShareSubject = () => {
    // If user is owner, they can share
    const isOwner = subject && subject.createdBy === currentUser.uid;
    if (isOwner) return true;

    // Check permissions for the subject
    return sharePermissions[subjectId]?.['share'] || false;
  };

  // Create a main content element to reuse in different states
  const renderMainContent = () => {
    // Loading state
    if (loading) {
      return (
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            height: 'calc(100vh - 64px)',
          }}
        >
          <CircularProgress />
        </Box>
      );
    }

    // Error state
    if (error) {
      return (
        <>
          <Typography variant="h5" color="error" component="div">
            {error}
          </Typography>
          <Button startIcon={<ArrowBack />} onClick={handleBack} sx={{ mt: 2 }}>
            Back to Dashboard
          </Button>
        </>
      );
    }

    // Not found state
    if (!subject) {
      return (
        <>
          <Typography variant="h5" component="div">
            Subject not found
          </Typography>
          <Button startIcon={<ArrowBack />} onClick={handleBack} sx={{ mt: 2 }}>
            Back to Dashboard
          </Button>
        </>
      );
    }

    // Normal state with subject data
    return (
      <>
        <Paper elevation={3} sx={{ p: 3 }}>
          <Box sx={{ mb: 3 }}>
            <Typography variant="h4" component="h1" gutterBottom>
              {subject.title}
            </Typography>
            <Typography variant="body1" paragraph>
              {subject.description}
            </Typography>
            <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
              <Tooltip
                title={
                  canShareSubject()
                    ? 'Share this subject'
                    : "You don't have permission to share this subject"
                }
              >
                <span>
                  {' '}
                  {/* Wrap in span to allow tooltip on disabled button */}
                  <Button
                    variant="outlined"
                    color="primary"
                    startIcon={<ShareIcon />}
                    onClick={() =>
                      canShareSubject() &&
                      handleOpenShareDialog({
                        ...subject,
                        itemType: 'subject',
                      })
                    }
                    disabled={!canShareSubject()}
                  >
                    Share Subject
                  </Button>
                </span>
              </Tooltip>
            </Box>
          </Box>

          <Divider sx={{ my: 2 }} />

          <Box sx={{ width: '100%' }}>
            <Typography variant="h5" component="h2" gutterBottom>
              Notes
            </Typography>

            {notes.length === 0 ? (
              <Typography variant="body1" sx={{ mt: 2, mb: 2 }}>
                No notes yet. Create your first note to get started!
              </Typography>
            ) : (
              <List sx={{ width: '100%', p: 0 }}>
                {notes.map((note) => (
                  <Card key={note.id} variant="outlined" sx={{ mb: 2 }}>
                    <CardContent>
                      <Box
                        sx={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'flex-start',
                        }}
                      >
                        <Typography variant="h6" component="div">
                          {note.title}
                          {note.isShared && (
                            <Chip
                              icon={<ShareIcon fontSize="small" />}
                              label={
                                note.shareType === 'public'
                                  ? 'Public'
                                  : 'Shared'
                              }
                              color="primary"
                              size="small"
                              variant="outlined"
                              sx={{ ml: 1 }}
                            />
                          )}
                        </Typography>
                        {renderNoteActions(note)}
                      </Box>

                      {/* Render formatted HTML content safely */}
                      <Box
                        sx={{ mt: 1, overflow: 'hidden', maxHeight: '150px' }}
                        dangerouslySetInnerHTML={createMarkup(
                          note.content.length > 500
                            ? note.content.substring(0, 500) + '...'
                            : note.content
                        )}
                      />

                      {/* Render media items */}
                      {renderNoteMedia(note.mediaItems)}

                      {/* Display tags */}
                      <Box
                        sx={{
                          mt: 2,
                          display: 'flex',
                          flexWrap: 'wrap',
                          gap: 0.5,
                        }}
                      >
                        {note.tags && note.tags.length > 0 ? (
                          <>
                            {note.tags.map((tag) => (
                              <Chip
                                key={tag}
                                size="small"
                                label={tag}
                                icon={<TagIcon fontSize="small" />}
                                onDelete={() =>
                                  handleRemoveTagFromExistingNote(note.id, tag)
                                }
                                sx={{ mr: 0.5, mb: 0.5 }}
                              />
                            ))}

                            {/* Add tag button */}
                            <Chip
                              icon={<AddCircleOutline fontSize="small" />}
                              label="Add Tag"
                              size="small"
                              color="primary"
                              variant="outlined"
                              onClick={() => {
                                const tag = prompt('Enter a tag:');
                                if (tag && tag.trim()) {
                                  handleAddTagToExistingNote(
                                    note.id,
                                    tag.trim()
                                  );
                                }
                              }}
                              sx={{ mr: 0.5, mb: 0.5 }}
                            />
                          </>
                        ) : (
                          <Button
                            startIcon={<TagIcon />}
                            size="small"
                            variant="text"
                            onClick={() => {
                              const tag = prompt('Enter a tag:');
                              if (tag && tag.trim()) {
                                handleAddTagToExistingNote(note.id, tag.trim());
                              }
                            }}
                          >
                            Add Tags
                          </Button>
                        )}
                      </Box>

                      {renderShareStatus(note)}
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        sx={{ mt: 2, display: 'block' }}
                      >
                        Last updated:{' '}
                        {new Date(note.updatedAt).toLocaleDateString()}
                      </Typography>
                      {(note.content.length > 500 ||
                        (note.mediaItems && note.mediaItems.length > 0)) && (
                        <Button
                          size="small"
                          variant="text"
                          onClick={() => handleViewNote(note.id)}
                          sx={{ mt: 1 }}
                        >
                          Read More
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </List>
            )}
          </Box>
        </Paper>

        {/* Show the Fab button only if user has edit permission */}
        {hasPermission(subjectId, 'edit') && (
          <Fab
            color="primary"
            aria-label="add"
            onClick={handleAddNote}
            sx={{ position: 'fixed', bottom: 24, right: 24 }}
          >
            <AddCircleOutline />
          </Fab>
        )}
      </>
    );
  };

  // Update the useEffect for component unmounting
  useEffect(() => {
    // Clean up function to prevent TinyMCE errors when unmounted
    return () => {
      // Ensure we properly clean up TinyMCE when component unmounts
      if (window.tinymce) {
        try {
          // Try the global cleanup function first
          if (typeof window.tinymceGlobalCleanup === 'function') {
            window.tinymceGlobalCleanup();
          } else {
            // Fall back to manual cleanup
            window.tinymce.remove();

            // Remove any lingering TinyMCE elements
            const elements = document.querySelectorAll(
              '.tox-tinymce-aux, .tox-silver-sink, .tox-dialog-wrap, .tox-tinymce'
            );
            elements.forEach((el) => {
              try {
                if (el.parentNode) {
                  el.parentNode.removeChild(el);
                }
              } catch (e) {
                // Element might not be a direct child of body
              }
            });

            // Remove event listeners
            if (typeof window.tinymce.dom?.Event?.unbind === 'function') {
              window.tinymce.dom.Event.unbind(window);
              window.tinymce.dom.Event.unbind(document);
            }

            // Clear any active editor
            window.tinymce.activeEditor = null;
          }
        } catch (e) {
          console.warn('Error during final TinyMCE cleanup:', e);
        }
      }
    };
  }, []);

  const handleAddTag = () => {
    if (!newTag.trim()) return;

    // For new notes
    if (!editingNote) {
      if (!newNote.tags.includes(newTag)) {
        setNewNote({
          ...newNote,
          tags: [...newNote.tags, newTag.trim()],
        });
      }
    }
    // For existing notes
    else {
      if (!editingNote.tags.includes(newTag)) {
        setEditingNote({
          ...editingNote,
          tags: [...(editingNote.tags || []), newTag.trim()],
        });
      }
    }

    setNewTag('');
  };

  const handleRemoveTag = (tag) => {
    // For new notes
    if (!editingNote) {
      setNewNote({
        ...newNote,
        tags: newNote.tags.filter((t) => t !== tag),
      });
    }
    // For existing notes
    else {
      setEditingNote({
        ...editingNote,
        tags: (editingNote.tags || []).filter((t) => t !== tag),
      });
    }
  };

  const handleAddTagToExistingNote = async (noteId, tag) => {
    try {
      await addTagToNote(noteId, tag);

      // Update the notes list to reflect the new tag
      setNotes(
        notes.map((note) => {
          if (note.id === noteId) {
            return {
              ...note,
              tags: [...(note.tags || []), tag],
            };
          }
          return note;
        })
      );

      // Also update selected note if it's open
      if (selectedNote && selectedNote.id === noteId) {
        setSelectedNote({
          ...selectedNote,
          tags: [...(selectedNote.tags || []), tag],
        });
      }
    } catch (error) {
      console.error('Error adding tag to note:', error);
      setError('Failed to add tag. Please try again.');
    }
  };

  const handleRemoveTagFromExistingNote = async (noteId, tag) => {
    try {
      await removeTagFromNote(noteId, tag);

      // Update the notes list to reflect the removed tag
      setNotes(
        notes.map((note) => {
          if (note.id === noteId) {
            return {
              ...note,
              tags: (note.tags || []).filter((t) => t !== tag),
            };
          }
          return note;
        })
      );

      // Also update selected note if it's open
      if (selectedNote && selectedNote.id === noteId) {
        setSelectedNote({
          ...selectedNote,
          tags: (selectedNote.tags || []).filter((t) => t !== tag),
        });
      }
    } catch (error) {
      console.error('Error removing tag from note:', error);
      setError('Failed to remove tag. Please try again.');
    }
  };

  return (
    <Box sx={{ display: 'flex' }}>
      {/* Add a container for the dialog to prevent aria-hidden issues */}
      <div id="note-dialog-container"></div>

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
          <Button
            color="inherit"
            startIcon={<ArrowBack />}
            onClick={handleBack}
            sx={{ mr: 2 }}
          >
            Back
          </Button>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            {subject ? subject.title : 'Subject Details'}
          </Typography>
          <Tooltip
            title={
              hasPermission(subjectId, 'edit')
                ? 'Add New Note'
                : "You don't have permission to add notes"
            }
          >
            <span>
              <IconButton
                color="inherit"
                aria-label="add note"
                edge="end"
                onClick={handleAddNote}
                disabled={!hasPermission(subjectId, 'edit')}
              >
                <NoteAdd />
              </IconButton>
            </span>
          </Tooltip>
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

      {/* Use the shared Sidebar component */}
      <Sidebar
        mobileOpen={mobileOpen}
        handleDrawerToggle={handleDrawerToggle}
        subjects={allSubjects}
        currentSubjectId={subjectId}
        activeView="subjects"
        sharedItemsCount={sharedItemsCount}
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
        {renderMainContent()}

        {/* Create/Edit Note Dialog */}
        <Dialog
          open={openDialog}
          onClose={handleCloseDialog}
          fullWidth
          maxWidth="md"
          disableEnforceFocus
          keepMounted
          aria-labelledby="note-dialog-title"
          hideBackdrop
          sx={{
            '& .MuiBackdrop-root': {
              backgroundColor: 'rgba(0, 0, 0, 0.1)',
              backdropFilter: 'blur(1px)',
            },
          }}
          slotProps={{
            backdrop: { style: { opacity: 0.1 } },
          }}
        >
          <DialogTitle id="note-dialog-title">
            {isEditing ? 'Edit Note' : 'Create New Note'}
          </DialogTitle>
          <DialogContent>
            <TextField
              autoFocus
              margin="dense"
              id="title"
              label="Note Title"
              type="text"
              fullWidth
              variant="outlined"
              value={newNote.title}
              onChange={(e) =>
                setNewNote({ ...newNote, title: e.target.value })
              }
              sx={{ mb: 2 }}
            />

            {/* Upload progress */}
            {uploadLoading && (
              <Box sx={{ display: 'flex', alignItems: 'center', mt: 1, mb: 2 }}>
                <CircularProgress size={24} sx={{ mr: 2 }} />
                <Typography variant="body2">Uploading file...</Typography>
              </Box>
            )}

            {/* Add fixed container for TinyMCE toolbar */}
            <div
              id="tinymce-toolbar-container"
              style={{ zIndex: 2000, position: 'relative' }}
            ></div>

            {/* TinyMCE Editor with built-in media handling */}
            <Box sx={{ mb: 2, mt: 3 }}>
              {openDialog && (
                <Editor
                  apiKey="ycbg5ptto1w43fnyhxwgyy0wgds7fnp6w5lqughi6w47j1g9" // Free community API key
                  value={newNote.content}
                  onEditorChange={(content, editor) => {
                    // Only update the content property without re-rendering the whole editor
                    if (content !== newNote.content) {
                      setNewNote((prevNote) => ({
                        ...prevNote,
                        content,
                      }));
                    }
                  }}
                  init={{
                    height: 400,
                    menubar: false, // Changed to false to reduce button attribute issues
                    fixed_toolbar_container: '#tinymce-toolbar-container',
                    inline: false,
                    remove_trailing_brs: true,
                    convert_urls: false,
                    entity_encoding: 'raw',
                    add_unload_trigger: false, // Prevent browser history pollution
                    plugins: [
                      'advlist',
                      'autolink',
                      'lists',
                      'link',
                      'image',
                      'charmap',
                      'preview',
                      'anchor',
                      'searchreplace',
                      'visualblocks',
                      'code',
                      'fullscreen',
                      'insertdatetime',
                      'media',
                      'table',
                      'help',
                      'wordcount',
                    ],
                    toolbar:
                      'undo redo | formatselect | ' +
                      'bold italic forecolor backcolor | alignleft aligncenter ' +
                      'alignright alignjustify | bullist numlist outdent indent | ' +
                      'removeformat | image media link | help',
                    content_style:
                      'body { font-family:Helvetica,Arial,sans-serif; font-size:14px } ' +
                      'img { max-width: 100%; height: auto; }',

                    // Add custom CSS to fix z-index issues with dialogs
                    content_css: '/tinymce-fixes.css',

                    // Fix for accessibility issues
                    a11y_advanced_options: true,
                    accessibility_focus: true,

                    // Fix for button attribute issue
                    elementpath: false, // Avoid non-boolean attribute issues
                    statusbar: false, // Avoid non-boolean attribute issues
                    branding: false, // Remove TinyMCE branding
                    promotion: false, // Remove promotion button

                    // Button handling fixes
                    extended_valid_elements:
                      'button[type|name|value|class|id|onclick|style]',
                    custom_elements: '~button',

                    // Button-related attribute settings
                    allow_html_in_named_anchor: true,
                    valid_children:
                      '+body[style],+body[script],+div[button|span|h1|h2|h3|h4|h5]',

                    // Dialog settings with correct attribute types
                    dialog_type: 'modal',

                    // Fix aria focus issues
                    setup: function (editor) {
                      // Store reference to the editor
                      editorRef.current = editor;

                      // Fix for aria-hidden issues
                      editor.on('init', function () {
                        try {
                          // Remove aria-hidden from ancestor elements containing focused elements
                          const fixAriaHidden = () => {
                            const focusedElement = document.activeElement;
                            if (
                              focusedElement &&
                              editor.getContainer().contains(focusedElement)
                            ) {
                              // Find ancestors with aria-hidden
                              let parent = focusedElement.parentElement;
                              while (parent) {
                                if (
                                  parent.getAttribute('aria-hidden') === 'true'
                                ) {
                                  parent.removeAttribute('aria-hidden');
                                }
                                parent = parent.parentElement;
                              }
                            }
                          };

                          // Apply fix when focus changes
                          editor.on('focus', fixAriaHidden);

                          // Add focus event listener to document
                          document.addEventListener('focusin', fixAriaHidden);

                          // Clean up listener when editor is removed
                          editor.on('remove', function () {
                            document.removeEventListener(
                              'focusin',
                              fixAriaHidden
                            );
                          });
                        } catch (e) {
                          console.warn(
                            'Failed to set up accessibility fixes:',
                            e
                          );
                        }
                      });

                      // Add a cleanup handler
                      editor.on('remove', function () {
                        console.log('Editor is being removed - cleanup');
                        if (editorRef.current === editor) {
                          editorRef.current = null;
                        }
                      });
                    },

                    // File picker callback implementation with improved error handling
                    file_picker_callback: function (callback, value, meta) {
                      // Create file input
                      const input = document.createElement('input');
                      input.setAttribute('type', 'file');

                      // Set accept type based on request
                      if (meta.filetype === 'image') {
                        input.setAttribute('accept', 'image/*');
                      } else if (meta.filetype === 'media') {
                        input.setAttribute('accept', 'video/*');
                      } else {
                        input.setAttribute('accept', '*/*');
                      }

                      // Define the file change handler
                      input.onchange = async function () {
                        try {
                          const file = this.files[0];
                          if (!file) return;

                          setUploadLoading(true);
                          const fileName = `${Date.now()}_${file.name}`;
                          const path = `notes/${currentUser.uid}/${subjectId}/${fileName}`;

                          const uploadedUrl = await uploadFile(
                            file,
                            path,
                            (progress) => {
                              console.log(`File upload progress: ${progress}%`);
                            }
                          );

                          // Track this URL as a temporary upload
                          setTemporaryUploads((prev) => [...prev, uploadedUrl]);

                          // Call the callback with the URL
                          if (meta.filetype === 'image') {
                            callback(uploadedUrl, { title: file.name });
                          } else {
                            callback(uploadedUrl, { title: file.name });
                          }

                          setUploadLoading(false);
                        } catch (error) {
                          console.error('File upload failed:', error);
                          setError(error.message || 'Failed to upload file');
                          setUploadLoading(false);
                          alert(
                            `Upload failed: ${error.message || 'Unknown error'}`
                          );
                        }
                      };

                      // Trigger the file input click
                      input.click();
                    },
                  }}
                />
              )}
            </Box>

            {/* Tags Input Section */}
            <Box sx={{ mt: 3 }}>
              <Typography variant="subtitle1" gutterBottom>
                Tags
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <Autocomplete
                  freeSolo
                  options={availableTags}
                  value={newTag}
                  onChange={(event, newValue) => setNewTag(newValue || '')}
                  onInputChange={(event, newInputValue) =>
                    setNewTag(newInputValue)
                  }
                  sx={{ flexGrow: 1, mr: 1 }}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      variant="outlined"
                      size="small"
                      placeholder="Add tags..."
                      fullWidth
                    />
                  )}
                />
                <Button
                  variant="contained"
                  size="small"
                  onClick={handleAddTag}
                  disabled={!newTag.trim()}
                >
                  Add
                </Button>
              </Box>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                {(isEditing ? editingNote?.tags : newNote.tags)?.map((tag) => (
                  <Chip
                    key={tag}
                    label={tag}
                    size="small"
                    onDelete={() => handleRemoveTag(tag)}
                    sx={{ m: 0.5 }}
                  />
                ))}
              </Box>
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseDialog} color="primary">
              Cancel
            </Button>
            <Button onClick={handleCreateNote} color="primary">
              Save
            </Button>
          </DialogActions>
        </Dialog>
      </Box>

      {/* Add ShareDialog component to render */}
      <ShareDialog
        open={shareDialogOpen}
        onClose={handleCloseShareDialog}
        itemType={currentShareItem?.itemType || 'note'}
        itemTitle={currentShareItem?.title || ''}
        itemId={currentShareItem?.id || ''}
        onShare={handleShare}
      />

      {/* View Note Dialog */}
      <Dialog
        open={viewNoteDialogOpen}
        onClose={handleCloseViewNoteDialog}
        maxWidth="md"
        fullWidth
      >
        {selectedNote && (
          <>
            <DialogTitle>
              {selectedNote.title}
              {selectedNote.isShared && (
                <Chip
                  icon={<ShareIcon fontSize="small" />}
                  label={
                    selectedNote.shareType === 'public' ? 'Public' : 'Shared'
                  }
                  color="primary"
                  size="small"
                  variant="outlined"
                  sx={{ ml: 1 }}
                />
              )}
            </DialogTitle>
            <DialogContent>
              {/* Tags */}
              {selectedNote.tags && selectedNote.tags.length > 0 && (
                <Box
                  sx={{ mb: 2, display: 'flex', flexWrap: 'wrap', gap: 0.5 }}
                >
                  {selectedNote.tags.map((tag) => (
                    <Chip
                      key={tag}
                      size="small"
                      label={tag}
                      icon={<TagIcon fontSize="small" />}
                      sx={{ mr: 0.5, mb: 0.5 }}
                    />
                  ))}
                </Box>
              )}

              {/* Note Content */}
              <Box
                sx={{ mt: 2 }}
                dangerouslySetInnerHTML={createMarkup(selectedNote.content)}
              />

              {/* Media Items */}
              {selectedNote.mediaItems &&
                selectedNote.mediaItems.length > 0 && (
                  <Box sx={{ mt: 3 }}>
                    <Typography variant="h6" gutterBottom>
                      Attachments
                    </Typography>
                    {renderNoteMedia(selectedNote.mediaItems)}
                  </Box>
                )}

              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ mt: 3, display: 'block' }}
              >
                Created: {new Date(selectedNote.createdAt).toLocaleString()}
                {selectedNote.createdAt !== selectedNote.updatedAt &&
                  ` (Updated: ${new Date(
                    selectedNote.updatedAt
                  ).toLocaleString()})`}
              </Typography>
            </DialogContent>
            <DialogActions>
              <Button onClick={handleCloseViewNoteDialog}>Close</Button>
              {selectedNote.createdBy === currentUser?.uid && (
                <Button
                  color="primary"
                  onClick={() => {
                    handleCloseViewNoteDialog();
                    handleEditNote(selectedNote.id);
                  }}
                >
                  Edit
                </Button>
              )}
            </DialogActions>
          </>
        )}
      </Dialog>
    </Box>
  );
}
