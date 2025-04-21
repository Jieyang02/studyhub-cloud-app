import axios from 'axios';
import { getAuth } from 'firebase/auth';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000/api';

// Helper function to get auth token
const getAuthToken = async () => {
  const auth = getAuth();
  const user = auth.currentUser;
  if (user) {
    const token = await user.getIdToken();
    return token;
  }
  throw new Error('User not authenticated');
};

/**
 * Get all unique tags for the current user
 */
export const getAllTags = async () => {
  try {
    const token = await getAuthToken();
    const response = await axios.get(`${API_URL}/tags`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return response.data;
  } catch (error) {
    console.error('Error getting tags:', error);
    throw error;
  }
};

/**
 * Get all notes with a specific tag
 */
export const getNotesByTag = async (tag) => {
  try {
    const token = await getAuthToken();
    const response = await axios.get(`${API_URL}/tags/${tag}/notes`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return response.data;
  } catch (error) {
    console.error(`Error getting notes for tag ${tag}:`, error);
    throw error;
  }
};

/**
 * Add a tag to a note
 */
export const addTagToNote = async (noteId, tag) => {
  try {
    const token = await getAuthToken();
    const response = await axios.post(
      `${API_URL}/tags/${noteId}/${tag}`,
      {},
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );
    return response.data;
  } catch (error) {
    console.error('Error adding tag to note:', error);
    throw error;
  }
};

/**
 * Remove a tag from a note
 */
export const removeTagFromNote = async (noteId, tag) => {
  try {
    const token = await getAuthToken();
    const response = await axios.delete(`${API_URL}/tags/${noteId}/${tag}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return response.data;
  } catch (error) {
    console.error('Error removing tag from note:', error);
    throw error;
  }
};
