import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Typography,
  Box,
  Chip,
  IconButton,
  FormControlLabel,
  Radio,
  RadioGroup,
  FormControl,
  Divider,
  Switch,
  FormGroup,
  Tooltip,
} from '@mui/material';
import {
  Close,
  ContentCopy,
  Send,
  Edit,
  Comment,
  Download,
  Share as ShareIcon,
  Visibility,
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';

const ShareDialog = ({
  open,
  onClose,
  itemType,
  itemTitle,
  itemId,
  onShare,
}) => {
  const { currentUser } = useAuth();
  const [email, setEmail] = useState('');
  const [emails, setEmails] = useState([]);
  const [shareType, setShareType] = useState('private'); // private, specific, public
  const [copied, setCopied] = useState(false);
  const [shareMessage, setShareMessage] = useState('');

  // Permission states
  const [permissions, setPermissions] = useState({
    view: true, // Always true when shared
    edit: false, // Can recipients edit the content?
    comment: false, // Can recipients add comments?
    download: true, // Can recipients download content?
    share: false, // Can recipients reshare the content?
  });

  // Generate a shareable link
  const shareableLink = `${window.location.origin}/${itemType}/${itemId}/shared`;

  const handleAddEmail = () => {
    if (email && !emails.includes(email)) {
      setEmails([...emails, email]);
      setEmail('');
    }
  };

  const handleRemoveEmail = (emailToRemove) => {
    setEmails(emails.filter((e) => e !== emailToRemove));
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareableLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShareTypeChange = (event) => {
    setShareType(event.target.value);
  };

  const handlePermissionChange = (event) => {
    setPermissions({
      ...permissions,
      [event.target.name]: event.target.checked,
    });
  };

  const handleSubmit = () => {
    // Collect sharing information
    const shareData = {
      itemId,
      itemType,
      shareType,
      sharedWith: shareType === 'specific' ? emails : [],
      sharedBy: currentUser.uid,
      sharedAt: new Date().toISOString(),
      message: shareMessage,
      permissions: permissions,
    };

    onShare(shareData);
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>
        Share {itemType === 'subject' ? 'Subject' : 'Note'}
        <IconButton
          aria-label="close"
          onClick={onClose}
          sx={{ position: 'absolute', right: 8, top: 8 }}
        >
          <Close />
        </IconButton>
      </DialogTitle>
      <DialogContent>
        <Typography variant="h6" gutterBottom>
          {itemTitle}
        </Typography>

        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle1" gutterBottom>
            Sharing Options
          </Typography>
          <FormControl component="fieldset">
            <RadioGroup
              name="shareType"
              value={shareType}
              onChange={handleShareTypeChange}
            >
              <FormControlLabel
                value="private"
                control={<Radio />}
                label="Private - Only you can access"
              />
              <FormControlLabel
                value="specific"
                control={<Radio />}
                label="Share with specific people"
              />
              <FormControlLabel
                value="public"
                control={<Radio />}
                label="Public - Anyone with the link can access"
              />
            </RadioGroup>
          </FormControl>
        </Box>

        {shareType === 'specific' && (
          <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle1" gutterBottom>
              Add People
            </Typography>
            <Box sx={{ display: 'flex', mb: 2 }}>
              <TextField
                fullWidth
                label="Email address"
                variant="outlined"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter email address"
                size="small"
              />
              <Button
                variant="contained"
                sx={{ ml: 1 }}
                onClick={handleAddEmail}
                disabled={!email}
              >
                Add
              </Button>
            </Box>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
              {emails.map((e) => (
                <Chip
                  key={e}
                  label={e}
                  onDelete={() => handleRemoveEmail(e)}
                  size="small"
                />
              ))}
            </Box>
          </Box>
        )}

        {shareType !== 'private' && (
          <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle1" gutterBottom>
              Permissions
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Set what people with access can do with this {itemType}
            </Typography>
            <FormGroup>
              <FormControlLabel
                control={
                  <Switch
                    checked={permissions.view}
                    disabled={true} // View is always enabled
                    name="view"
                  />
                }
                label={
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <Visibility fontSize="small" sx={{ mr: 1 }} />
                    <Typography variant="body2">View</Typography>
                  </Box>
                }
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={permissions.download}
                    onChange={handlePermissionChange}
                    name="download"
                  />
                }
                label={
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <Download fontSize="small" sx={{ mr: 1 }} />
                    <Typography variant="body2">Download</Typography>
                  </Box>
                }
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={permissions.comment}
                    onChange={handlePermissionChange}
                    name="comment"
                  />
                }
                label={
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <Comment fontSize="small" sx={{ mr: 1 }} />
                    <Typography variant="body2">Comment</Typography>
                  </Box>
                }
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={permissions.edit}
                    onChange={handlePermissionChange}
                    name="edit"
                  />
                }
                label={
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <Edit fontSize="small" sx={{ mr: 1 }} />
                    <Typography variant="body2">Edit</Typography>
                    <Tooltip title="Allow recipients to make changes to the content">
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        sx={{ ml: 1 }}
                      >
                        (Use with caution)
                      </Typography>
                    </Tooltip>
                  </Box>
                }
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={permissions.share}
                    onChange={handlePermissionChange}
                    name="share"
                  />
                }
                label={
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <ShareIcon fontSize="small" sx={{ mr: 1 }} />
                    <Typography variant="body2">Reshare</Typography>
                  </Box>
                }
              />
            </FormGroup>
          </Box>
        )}

        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle1" gutterBottom>
            Add a Message (Optional)
          </Typography>
          <TextField
            fullWidth
            multiline
            rows={3}
            variant="outlined"
            placeholder="Write a message to the recipients"
            value={shareMessage}
            onChange={(e) => setShareMessage(e.target.value)}
          />
        </Box>

        {shareType !== 'private' && (
          <Box sx={{ mb: 2 }}>
            <Typography variant="subtitle1" gutterBottom>
              Shareable Link
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <TextField
                fullWidth
                variant="outlined"
                value={shareableLink}
                InputProps={{ readOnly: true }}
                size="small"
              />
              <IconButton color="primary" onClick={handleCopyLink}>
                <ContentCopy />
              </IconButton>
            </Box>
            {copied && (
              <Typography variant="caption" color="success.main" sx={{ mt: 1 }}>
                Link copied to clipboard!
              </Typography>
            )}
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" onClick={handleSubmit} startIcon={<Send />}>
          {shareType === 'private' ? 'Save' : 'Share'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ShareDialog;
