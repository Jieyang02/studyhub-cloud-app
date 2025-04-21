import { auth } from '../firebase/config';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000/api';

// Helper function to get the authentication token
const getAuthToken = async () => {
  const currentUser = auth.currentUser;
  if (!currentUser) {
    throw new Error('User not authenticated');
  }

  return await currentUser.getIdToken();
};

// Helper function to make authenticated API requests
const apiRequest = async (endpoint, options = {}) => {
  const token = await getAuthToken();

  const headers = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
    ...options.headers,
  };

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.detail || `API request failed: ${response.status}`);
  }

  return await response.json();
};

// Share a subject or note
export const shareItem = async (shareData) => {
  return await apiRequest('/shares', {
    method: 'POST',
    body: JSON.stringify(shareData),
  });
};

// Get shares for a specific item
export const getItemShares = async (itemId, itemType) => {
  return await apiRequest(`/shares/${itemType}/${itemId}`);
};

// Get items shared with the current user
export const getSharedWithUser = async () => {
  return await apiRequest('/shares/with-me');
};

// Get public items of a specific type
export const getPublicItems = async (itemType) => {
  return await apiRequest(`/shares/public?itemType=${itemType}`);
};

// Update sharing settings
export const updateShareSettings = async (shareId, updatedSettings) => {
  return await apiRequest(`/shares/${shareId}`, {
    method: 'PUT',
    body: JSON.stringify(updatedSettings),
  });
};

// Remove sharing
export const removeSharing = async (shareId) => {
  return await apiRequest(`/shares/${shareId}`, {
    method: 'DELETE',
  });
};

// Get items shared by the current user
export const getItemsSharedByMe = async () => {
  return await apiRequest('/shares/by-me');
};
