import { storage, auth } from '../firebase/config';
import {
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject,
  uploadBytesResumable,
} from 'firebase/storage';

/**
 * Upload a file to Firebase Storage with progress tracking and retries
 * @param {File} file - The file to upload
 * @param {string} path - The path in storage where the file will be saved
 * @param {Function} onProgress - Optional callback for progress updates
 * @returns {Promise<string>} The download URL of the uploaded file
 */
export const uploadFile = async (file, path, onProgress) => {
  try {
    // Ensure user is authenticated
    if (!auth.currentUser) {
      throw new Error('User not authenticated. Please log in again.');
    }

    // Create a storage reference
    const storageRef = ref(storage, path);

    // Use resumable upload for better handling of large files and network issues
    return new Promise((resolve, reject) => {
      const uploadTask = uploadBytesResumable(storageRef, file);

      // Register three observers:
      // 1. 'state_changed' observer, called any time the state changes
      uploadTask.on(
        'state_changed',
        (snapshot) => {
          // Get upload progress
          const progress =
            (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          console.log('Upload is ' + progress + '% done');
          if (onProgress) {
            onProgress(progress);
          }

          // Log current upload state
          switch (snapshot.state) {
            case 'paused':
              console.log('Upload is paused');
              break;
            case 'running':
              console.log('Upload is running');
              break;
            default:
              break;
          }
        },
        (error) => {
          // Handle unsuccessful uploads
          console.error('Error during file upload:', error);

          // Map Firebase Storage errors to more user-friendly messages
          let errorMessage = 'Failed to upload file';
          switch (error.code) {
            case 'storage/unauthorized':
              errorMessage = "You don't have permission to upload this file";
              break;
            case 'storage/canceled':
              errorMessage = 'Upload was canceled';
              break;
            case 'storage/quota-exceeded':
              errorMessage = 'Storage quota exceeded';
              break;
            case 'storage/retry-limit-exceeded':
              errorMessage = 'Network error, retry limit exceeded';
              break;
            case 'storage/invalid-checksum':
              errorMessage = 'File corrupted during upload';
              break;
            case 'storage/server-file-wrong-size':
              errorMessage = 'File size mismatch, please try again';
              break;
            default:
              errorMessage = `Upload failed: ${error.message}`;
          }
          reject(new Error(errorMessage));
        },
        () => {
          // Handle successful uploads
          getDownloadURL(uploadTask.snapshot.ref)
            .then((downloadURL) => {
              console.log('File available at', downloadURL);
              resolve(downloadURL);
            })
            .catch((urlError) => {
              reject(
                new Error(
                  `File uploaded but failed to get URL: ${urlError.message}`
                )
              );
            });
        }
      );
    });
  } catch (error) {
    console.error('Error initiating file upload:', error);
    throw new Error(`Failed to upload file: ${error.message}`);
  }
};

/**
 * Delete a file from Firebase Storage
 * @param {string} url - The full URL of the file to delete
 * @returns {Promise<void>}
 */
export const deleteFile = async (url) => {
  try {
    // Extract the path from the URL
    // This is a simplistic approach and may need to be adjusted based on your storage URL format
    const path = decodeURIComponent(url.split('/o/')[1].split('?')[0]);

    // Create a reference to the file
    const fileRef = ref(storage, path);

    // Delete the file
    await deleteObject(fileRef);
  } catch (error) {
    console.error('Error deleting file:', error);
    throw new Error(`Failed to delete file: ${error.message}`);
  }
};

/**
 * Get the URL of a file from its path
 * @param {string} path - The path of the file in storage
 * @returns {Promise<string>} The download URL
 */
export const getFileUrl = async (path) => {
  try {
    const fileRef = ref(storage, path);
    return await getDownloadURL(fileRef);
  } catch (error) {
    console.error('Error getting file URL:', error);
    throw new Error(`Failed to get file URL: ${error.message}`);
  }
};
