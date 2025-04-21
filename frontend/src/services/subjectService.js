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

// Get all subjects for the current user
export const getAllSubjects = async () => {
  return await apiRequest('/subjects');
};

// Get subject by ID
export const getSubjectById = async (subjectId) => {
  return await apiRequest(`/subjects/${subjectId}`);
};

// Get subjects created by a user
export const getUserSubjects = async () => {
  return await apiRequest('/subjects');
};

// Create a new subject
export const createSubject = async (subjectData) => {
  return await apiRequest('/subjects', {
    method: 'POST',
    body: JSON.stringify(subjectData),
  });
};

// Update a subject
export const updateSubject = async (subjectId, subjectData) => {
  return await apiRequest(`/subjects/${subjectId}`, {
    method: 'PUT',
    body: JSON.stringify(subjectData),
  });
};

// Delete a subject
export const deleteSubject = async (subjectId) => {
  return await apiRequest(`/subjects/${subjectId}`, {
    method: 'DELETE',
  });
};

// Get notes for a subject
export const getNotes = async (subjectId) => {
  return await apiRequest(`/subjects/${subjectId}/notes`);
};

// Get a specific note
export const getNoteById = async (noteId) => {
  return await apiRequest(`/notes/${noteId}`);
};

// Create a new note
export const createNote = async (noteData) => {
  return await apiRequest('/notes', {
    method: 'POST',
    body: JSON.stringify(noteData),
  });
};

// Update a note
export const updateNote = async (noteId, noteData) => {
  return await apiRequest(`/notes/${noteId}`, {
    method: 'PUT',
    body: JSON.stringify(noteData),
  });
};

// Delete a note
export const deleteNote = async (noteId) => {
  return await apiRequest(`/notes/${noteId}`, {
    method: 'DELETE',
  });
};

// Get recent notes (across all subjects)
export const getRecentNotes = async (limit = 10) => {
  return await apiRequest(`/notes?limit=${limit}`);
};
