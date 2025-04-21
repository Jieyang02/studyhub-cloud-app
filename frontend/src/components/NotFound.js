import React from 'react';
import { Box, Typography, Button, Container, Paper } from '@mui/material';
import { useNavigate } from 'react-router-dom';

export default function NotFound() {
  const navigate = useNavigate();

  return (
    <Container maxWidth="md" sx={{ py: 8 }}>
      <Paper sx={{ p: 4, textAlign: 'center' }}>
        <Typography variant="h4" component="h1" gutterBottom>
          404 - Page Not Found
        </Typography>

        <Typography variant="body1" paragraph>
          The page you are looking for doesn't exist or has been moved.
        </Typography>

        <Box sx={{ mt: 4 }}>
          <Button
            variant="contained"
            onClick={() => navigate('/dashboard')}
            sx={{ mx: 1 }}
          >
            Go to Dashboard
          </Button>
        </Box>
      </Paper>
    </Container>
  );
}
