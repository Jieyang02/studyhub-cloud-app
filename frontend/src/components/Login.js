import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Link, useNavigate } from 'react-router-dom';
import '../styles/auth.css';
import {
  Container,
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  Grid,
  Divider,
  Alert,
  AlertTitle,
  IconButton,
  InputAdornment,
  CircularProgress,
  Snackbar,
  LinearProgress,
} from '@mui/material';
import {
  Visibility,
  VisibilityOff,
  EmailOutlined,
  LockOutlined,
  Login as LoginIcon,
  Timer as TimerIcon,
} from '@mui/icons-material';
import {
  sendEmailVerification,
  signInWithEmailAndPassword,
} from 'firebase/auth';
import { auth } from '../firebase/config';

// Cooldown time in seconds
const VERIFICATION_EMAIL_COOLDOWN = 60;

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showVerificationHelp, setShowVerificationHelp] = useState(false);
  const [openSnackbar, setOpenSnackbar] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  // Cooldown state
  const [cooldownActive, setCooldownActive] = useState(false);
  const [cooldownTimeLeft, setCooldownTimeLeft] = useState(0);

  const { login } = useAuth();
  const navigate = useNavigate();

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

  async function handleSubmit(e) {
    e.preventDefault();

    try {
      setError('');
      setLoading(true);
      await login(email, password);
      navigate('/dashboard');
    } catch (error) {
      if (error.message.includes('verify your email')) {
        setShowVerificationHelp(true);
      }
      setError(error.message);
    }
    setLoading(false);
  }

  async function handleResendVerification() {
    // Check if cooldown is active
    if (cooldownActive) {
      setError(
        `Please wait ${cooldownTimeLeft} seconds before requesting another verification email.`
      );
      return;
    }

    try {
      // Try to sign in first to get the user object
      const userCredential = await signInWithEmailAndPassword(
        auth,
        email,
        password
      );
      await sendEmailVerification(userCredential.user);

      // Set cooldown
      localStorage.setItem('lastVerificationEmailSent', Date.now().toString());
      setCooldownTimeLeft(VERIFICATION_EMAIL_COOLDOWN);
      setCooldownActive(true);

      setError('');
      setSuccessMessage('Verification email sent! Please check your inbox.');
      setOpenSnackbar(true);
    } catch (error) {
      console.error('Error sending verification:', error);
      // Handle common errors
      if (
        error.code === 'auth/wrong-password' ||
        error.code === 'auth/user-not-found'
      ) {
        setError(
          'Please enter the correct email and password to resend verification email.'
        );
      } else if (error.code === 'auth/too-many-requests') {
        setError('Too many attempts. Please try again later.');
      } else {
        setError(
          'Failed to send verification email: ' +
            (error.message || 'Unknown error')
        );
      }
    }
  }

  const handleSnackbarClose = () => {
    setOpenSnackbar(false);
  };

  return (
    <Container
      maxWidth="sm"
      sx={{
        display: 'flex',
        minHeight: '100vh',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Paper elevation={3} sx={{ p: 4, borderRadius: 2, width: '100%' }}>
        <Box sx={{ textAlign: 'center', mb: 3 }}>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              mb: 2,
            }}
          >
            <LoginIcon
              sx={{ fontSize: '2rem', verticalAlign: 'middle', mr: 1 }}
            />
            <Typography variant="h4" component="h1">
              StudyHub
            </Typography>
          </Box>
          <Box sx={{ mb: 2 }}>
            <img
              src="/soton.png"
              alt="University of Southampton"
              style={{ maxWidth: '200px', height: 'auto' }}
            />
          </Box>
          <Typography variant="h5" gutterBottom>
            Welcome Back
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Sign in to continue to your dashboard
          </Typography>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            <AlertTitle>Error</AlertTitle>
            {error}
          </Alert>
        )}

        {showVerificationHelp && (
          <Alert severity="warning" sx={{ mb: 3 }}>
            <AlertTitle>Email Verification Required</AlertTitle>
            <Typography variant="body2" paragraph>
              You need to verify your email before logging in. Please check your
              inbox for the verification link.
            </Typography>
            {cooldownActive ? (
              <Box sx={{ width: '100%', mt: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  <TimerIcon
                    fontSize="small"
                    sx={{ mr: 1, color: 'text.secondary' }}
                  />
                  <Typography variant="body2" color="text.secondary">
                    Resend available in {cooldownTimeLeft} seconds
                  </Typography>
                </Box>
                <LinearProgress
                  variant="determinate"
                  value={
                    ((VERIFICATION_EMAIL_COOLDOWN - cooldownTimeLeft) /
                      VERIFICATION_EMAIL_COOLDOWN) *
                    100
                  }
                />
              </Box>
            ) : (
              <Button
                size="small"
                variant="outlined"
                onClick={handleResendVerification}
                sx={{ mt: 1 }}
              >
                Resend Verification Email
              </Button>
            )}
          </Alert>
        )}

        <Box component="form" onSubmit={handleSubmit} noValidate>
          <TextField
            margin="normal"
            required
            fullWidth
            id="email"
            label="Email Address"
            name="email"
            autoComplete="email"
            autoFocus
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <EmailOutlined />
                </InputAdornment>
              ),
            }}
          />
          <TextField
            margin="normal"
            required
            fullWidth
            name="password"
            label="Password"
            type={showPassword ? 'text' : 'password'}
            id="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <LockOutlined />
                </InputAdornment>
              ),
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    aria-label="toggle password visibility"
                    onClick={() => setShowPassword(!showPassword)}
                    edge="end"
                  >
                    {showPassword ? <VisibilityOff /> : <Visibility />}
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />

          <Grid container justifyContent="flex-end" sx={{ mt: 1, mb: 2 }}>
            <Grid item>
              <Link to="/forgot-password" style={{ textDecoration: 'none' }}>
                <Typography variant="body2" color="primary">
                  Forgot password?
                </Typography>
              </Link>
            </Grid>
          </Grid>

          <Button
            type="submit"
            fullWidth
            variant="contained"
            sx={{ py: 1.5, mb: 2 }}
            disabled={loading}
            startIcon={loading ? <CircularProgress size={20} /> : <LoginIcon />}
          >
            {loading ? 'Logging in...' : 'Sign In'}
          </Button>

          <Divider sx={{ my: 2 }}>
            <Typography variant="body2" color="text.secondary">
              OR
            </Typography>
          </Divider>

          <Box sx={{ textAlign: 'center', mt: 2 }}>
            <Typography variant="body2">
              Don't have an account?{' '}
              <Link to="/signup" style={{ textDecoration: 'none' }}>
                <Typography
                  component="span"
                  variant="body2"
                  color="primary"
                  fontWeight="bold"
                >
                  Sign Up
                </Typography>
              </Link>
            </Typography>
          </Box>
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
