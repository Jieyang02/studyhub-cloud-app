import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  Container,
  Paper,
  Typography,
  Box,
  Button,
  TextField,
  Divider,
  Alert,
  Snackbar,
  CircularProgress,
  Grid,
  Avatar,
  LinearProgress,
  Tooltip,
} from '@mui/material';
import {
  PersonOutline,
  Email,
  VerifiedUser,
  Lock,
  ArrowBack,
  Timer as TimerIcon,
} from '@mui/icons-material';
import { updateProfile, updateEmail, updatePassword } from 'firebase/auth';

// Cooldown time in seconds
const VERIFICATION_EMAIL_COOLDOWN = 60;

export default function Profile() {
  const { currentUser, logout, resendVerificationEmail } = useAuth();
  const navigate = useNavigate();

  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [openSnackbar, setOpenSnackbar] = useState(false);

  // Cooldown state
  const [cooldownActive, setCooldownActive] = useState(false);
  const [cooldownTimeLeft, setCooldownTimeLeft] = useState(0);

  // Initialize form with current user data
  useEffect(() => {
    if (currentUser) {
      setDisplayName(currentUser.displayName || '');
      setEmail(currentUser.email || '');
    }
  }, [currentUser]);

  // Check for existing cooldown on component mount
  useEffect(() => {
    const lastSentTime = localStorage.getItem('lastVerificationEmailSent');
    if (lastSentTime) {
      const timePassed = (Date.now() - parseInt(lastSentTime)) / 1000;
      if (timePassed < VERIFICATION_EMAIL_COOLDOWN) {
        const timeLeft = Math.ceil(VERIFICATION_EMAIL_COOLDOWN - timePassed);
        setCooldownTimeLeft(timeLeft);
        setCooldownActive(true);
      }
    }
  }, []);

  // Cooldown timer
  useEffect(() => {
    let timer;
    if (cooldownActive && cooldownTimeLeft > 0) {
      timer = setTimeout(() => {
        setCooldownTimeLeft(cooldownTimeLeft - 1);
      }, 1000);
    } else if (cooldownTimeLeft === 0 && cooldownActive) {
      setCooldownActive(false);
    }

    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [cooldownActive, cooldownTimeLeft]);

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Only update if there are changes
      if (displayName !== currentUser.displayName) {
        await updateProfile(currentUser, { displayName });
      }

      // Update email if changed
      if (email !== currentUser.email) {
        await updateEmail(currentUser, email);
        setSuccessMessage(
          'Profile updated successfully! Please verify your new email.'
        );
      } else {
        setSuccessMessage('Profile updated successfully!');
      }

      setOpenSnackbar(true);
    } catch (error) {
      setError('Failed to update profile: ' + error.message);
    }

    setLoading(false);
  };

  const handleUpdatePassword = async (e) => {
    e.preventDefault();

    if (password !== passwordConfirm) {
      return setError('Passwords do not match');
    }

    if (password.length < 6) {
      return setError('Password should be at least 6 characters');
    }

    setLoading(true);
    setError('');

    try {
      await updatePassword(currentUser, password);
      setPassword('');
      setPasswordConfirm('');
      setSuccessMessage('Password updated successfully!');
      setOpenSnackbar(true);
    } catch (error) {
      setError('Failed to update password: ' + error.message);
    }

    setLoading(false);
  };

  const handleResendVerification = async () => {
    // Check if cooldown is active
    if (cooldownActive) {
      setError(
        `Please wait ${cooldownTimeLeft} seconds before requesting another verification email.`
      );
      return;
    }

    try {
      await resendVerificationEmail();

      // Set cooldown
      localStorage.setItem('lastVerificationEmailSent', Date.now().toString());
      setCooldownTimeLeft(VERIFICATION_EMAIL_COOLDOWN);
      setCooldownActive(true);

      setError('');
      setSuccessMessage('Verification email sent! Please check your inbox.');
      setOpenSnackbar(true);
    } catch (error) {
      setError('Failed to send verification email: ' + error.message);
    }
  };

  const handleSnackbarClose = () => {
    setOpenSnackbar(false);
  };

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Button
        startIcon={<ArrowBack />}
        onClick={() => navigate('/dashboard')}
        sx={{ mb: 3 }}
      >
        Back to Dashboard
      </Button>

      <Paper elevation={3} sx={{ p: 4, borderRadius: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
          <Avatar
            sx={{ width: 80, height: 80, mr: 3, bgcolor: 'primary.main' }}
          >
            {displayName ? displayName[0].toUpperCase() : <PersonOutline />}
          </Avatar>
          <Box>
            <Typography variant="h4" gutterBottom>
              Profile Settings
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <Email fontSize="small" sx={{ mr: 1 }} />
              <Typography variant="body1">{currentUser?.email}</Typography>
              {currentUser?.emailVerified ? (
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    ml: 2,
                    color: 'success.main',
                  }}
                >
                  <VerifiedUser fontSize="small" sx={{ mr: 0.5 }} />
                  <Typography variant="body2">Verified</Typography>
                </Box>
              ) : (
                <Box sx={{ display: 'flex', alignItems: 'center', ml: 2 }}>
                  <Typography variant="body2" color="error" sx={{ mr: 1 }}>
                    Not verified
                  </Typography>
                  {cooldownActive ? (
                    <Tooltip
                      title={`Resend available in ${cooldownTimeLeft} seconds`}
                    >
                      <Box
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          width: 150,
                        }}
                      >
                        <TimerIcon
                          fontSize="small"
                          sx={{ mr: 1, color: 'text.secondary' }}
                        />
                        <LinearProgress
                          variant="determinate"
                          sx={{ flexGrow: 1 }}
                          value={
                            ((VERIFICATION_EMAIL_COOLDOWN - cooldownTimeLeft) /
                              VERIFICATION_EMAIL_COOLDOWN) *
                            100
                          }
                        />
                      </Box>
                    </Tooltip>
                  ) : (
                    <Button
                      size="small"
                      variant="outlined"
                      onClick={handleResendVerification}
                    >
                      Resend verification
                    </Button>
                  )}
                </Box>
              )}
            </Box>
          </Box>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        <Grid container spacing={4}>
          <Grid item xs={12} md={6}>
            <Typography
              variant="h6"
              gutterBottom
              sx={{ display: 'flex', alignItems: 'center' }}
            >
              <PersonOutline sx={{ mr: 1 }} /> Personal Information
            </Typography>
            <Box component="form" onSubmit={handleUpdateProfile} noValidate>
              <TextField
                margin="normal"
                required
                fullWidth
                label="Display Name"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
              />
              <TextField
                margin="normal"
                required
                fullWidth
                label="Email Address"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <Button
                type="submit"
                fullWidth
                variant="contained"
                sx={{ mt: 3 }}
                disabled={loading}
              >
                {loading ? <CircularProgress size={24} /> : 'Save Changes'}
              </Button>
            </Box>
          </Grid>

          <Grid item xs={12} md={6}>
            <Typography
              variant="h6"
              gutterBottom
              sx={{ display: 'flex', alignItems: 'center' }}
            >
              <Lock sx={{ mr: 1 }} /> Update Password
            </Typography>
            <Box component="form" onSubmit={handleUpdatePassword} noValidate>
              <TextField
                margin="normal"
                required
                fullWidth
                label="New Password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <TextField
                margin="normal"
                required
                fullWidth
                label="Confirm New Password"
                type="password"
                value={passwordConfirm}
                onChange={(e) => setPasswordConfirm(e.target.value)}
              />
              <Button
                type="submit"
                fullWidth
                variant="contained"
                sx={{ mt: 3 }}
                disabled={loading}
              >
                {loading ? <CircularProgress size={24} /> : 'Update Password'}
              </Button>
            </Box>
          </Grid>
        </Grid>

        <Divider sx={{ my: 4 }} />

        <Box sx={{ display: 'flex', justifyContent: 'center' }}>
          <Button
            variant="outlined"
            color="error"
            onClick={async () => {
              await logout();
              navigate('/login');
            }}
          >
            Log Out
          </Button>
        </Box>
      </Paper>

      <Snackbar
        open={openSnackbar}
        autoHideDuration={6000}
        onClose={handleSnackbarClose}
      >
        <Alert
          onClose={handleSnackbarClose}
          severity="success"
          sx={{ width: '100%' }}
        >
          {successMessage}
        </Alert>
      </Snackbar>
    </Container>
  );
}
