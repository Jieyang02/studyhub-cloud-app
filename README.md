# StudyHub Cloud App

StudyHub is a cloud-based application for organizing study materials by subject and sharing notes with others.

## Project Structure

The project is divided into two main parts:

- **Frontend**: React application with Material-UI
- **Backend**: FastAPI backend with Firebase/Firestore integration

## Setup Instructions

### Prerequisites

- Node.js (v14+)
- Python 3.8+
- Firebase account with Firestore enabled
- Git

### 1. Firebase Setup

#### Create a Firebase Project

1. Go to the [Firebase Console](https://console.firebase.google.com/)
2. Click "Add project" and follow the steps to create a new project
3. Once created, click "Continue" to access the project dashboard

#### Enable Firestore

1. In the Firebase Console, navigate to "Firestore Database" in the left sidebar
2. Click "Create database"
3. Choose "Start in production mode" and select a region close to your users
4. Click "Enable"

#### Set Up Authentication

1. In the Firebase Console, navigate to "Authentication" in the left sidebar
2. Click "Get started"
3. Enable "Email/Password" provider by clicking on it and toggling the switch
4. Click "Save"

#### Generate Service Account Key

1. In the Firebase Console, navigate to Project Settings (gear icon in the top left)
2. Go to the "Service accounts" tab
3. Click "Generate new private key"
4. Save the downloaded JSON file as `serviceAccountKey.json` in the `backend` directory

#### Configure Frontend Firebase

1. In the Firebase Console, navigate to Project Settings
2. Under "Your apps", click the web icon (`</>`)
3. Register your app with a nickname (e.g., "StudyHub Web")
4. Copy the Firebase configuration object that appears

Create a `.env` file in the `frontend` directory with the following content, replacing `YOUR_FIREBASE_CONFIG` with the values from the Firebase configuration:

```
REACT_APP_FIREBASE_API_KEY=your-api-key
REACT_APP_FIREBASE_AUTH_DOMAIN=your-auth-domain
REACT_APP_FIREBASE_PROJECT_ID=your-project-id
REACT_APP_FIREBASE_STORAGE_BUCKET=your-storage-bucket
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=your-messaging-sender-id
REACT_APP_FIREBASE_APP_ID=your-app-id
REACT_APP_API_URL=http://localhost:8000/api
```

### 2. Backend Setup

1. Navigate to the backend directory:

   ```
   cd backend
   ```

2. Ensure you have the service account key:

   ```
   ls serviceAccountKey.json
   ```

   If the file doesn't exist, follow the "Generate Service Account Key" steps above.

3. Create a Python virtual environment:

   ```
   python -m venv venv
   ```

4. Activate the virtual environment:

   - On Windows:
     ```
     venv\Scripts\activate
     ```
   - On macOS/Linux:
     ```
     source venv/bin/activate
     ```

5. Install the required dependencies:

   ```
   pip install -r requirements.txt
   ```

6. Ensure the `.env` file exists in the `backend` directory with the following content:

   ```
   FIREBASE_CREDENTIALS_PATH=serviceAccountKey.json
   CORS_ORIGIN=http://localhost:3000
   PORT=8000
   ```

7. Start the backend server:

   ```
   cd app
   uvicorn main:app --reload
   ```

   The API will be available at http://localhost:8000 and the Swagger UI at http://localhost:8000/docs

### 3. Frontend Setup

1. Navigate to the frontend directory:

   ```
   cd frontend
   ```

2. Install dependencies:

   ```
   npm install
   ```

3. Start the development server:

   ```
   npm start
   ```

   The application will be available at http://localhost:3000

## Database Structure

Firestore collections:

### `subjects`

- `id`: auto-generated
- `title`: string
- `description`: string (optional)
- `createdBy`: string (user ID)
- `createdAt`: timestamp
- `updatedAt`: timestamp

### `notes`

- `id`: auto-generated
- `title`: string
- `content`: string
- `subjectId`: string (reference to subject)
- `createdBy`: string (user ID)
- `createdAt`: timestamp
- `updatedAt`: timestamp
- `isShared`: boolean
- `shareType`: string (null, 'public', 'specific')
- `sharedWith`: array of strings (email addresses)

### `shares`

- `id`: auto-generated
- `itemId`: string (ID of shared item)
- `itemType`: string ('subject' or 'note')
- `shareType`: string ('public' or 'specific')
- `sharedWith`: array of strings (email addresses)
- `sharedBy`: string (user ID)
- `sharedAt`: timestamp
- `updatedAt`: timestamp
- `message`: string (optional)

## API Endpoints

The backend provides the following API endpoints:

### Subjects

- `GET /api/subjects`: Get all subjects for the current user
- `GET /api/subjects/{subject_id}`: Get a specific subject
- `POST /api/subjects`: Create a new subject
- `PUT /api/subjects/{subject_id}`: Update a subject
- `DELETE /api/subjects/{subject_id}`: Delete a subject and all its notes
- `GET /api/subjects/{subject_id}/notes`: Get all notes for a subject

### Notes

- `GET /api/notes`: Get recent notes for the current user
- `GET /api/notes/{note_id}`: Get a specific note
- `POST /api/notes`: Create a new note
- `PUT /api/notes/{note_id}`: Update a note
- `DELETE /api/notes/{note_id}`: Delete a note

### Shares

- `GET /api/shares/with-me`: Get items shared with the current user
- `GET /api/shares/by-me`: Get items shared by the current user
- `GET /api/shares/{item_type}/{item_id}`: Get sharing information for a specific item
- `POST /api/shares`: Share an item
- `DELETE /api/shares/{share_id}`: Remove sharing

## License

This project is licensed under the MIT License.
