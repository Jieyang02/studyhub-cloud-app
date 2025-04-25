import React from 'react';
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { SidebarProvider } from './contexts/SidebarContext';
import Dashboard from './components/Dashboard';
import Login from './components/Login';
import Signup from './components/Signup';
import ForgotPassword from './components/ForgotPassword';
import PrivateRoute from './components/PrivateRoute';
import SubjectDetail from './components/SubjectDetail';
import Profile from './components/Profile';
import SharedNoteView from './components/SharedNoteView';
import NotFound from './components/NotFound';
import Analytics from './components/Analytics';
import MFASetup from './components/MFASetup';
import Trash from './components/Trash';
import AllSubjects from './components/AllSubjects';

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* Public routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />

          {/* Protected routes with SidebarProvider */}
          <Route element={<PrivateRoute />}>
            <Route
              path="/"
              element={
                <SidebarProvider>
                  <Navigate to="/dashboard" replace />
                </SidebarProvider>
              }
            />
            <Route
              path="/dashboard"
              element={
                <SidebarProvider>
                  <Dashboard />
                </SidebarProvider>
              }
            />
            <Route
              path="/shared"
              element={
                <SidebarProvider>
                  <Dashboard initialView="shared" />
                </SidebarProvider>
              }
            />
            <Route
              path="/subjects"
              element={
                <SidebarProvider>
                  <AllSubjects />
                </SidebarProvider>
              }
            />
            <Route
              path="/subjects/:subjectId"
              element={
                <SidebarProvider>
                  <SubjectDetail />
                </SidebarProvider>
              }
            />
            <Route
              path="/subject/:subjectId"
              element={
                <SidebarProvider>
                  <SubjectDetail />
                </SidebarProvider>
              }
            />
            <Route
              path="/subject/:subjectId/note/:noteId"
              element={
                <SidebarProvider>
                  <SubjectDetail isShared={false} />
                </SidebarProvider>
              }
            />
            <Route
              path="/shared-note/:noteId"
              element={
                <SidebarProvider>
                  <SharedNoteView />
                </SidebarProvider>
              }
            />
            <Route
              path="/profile"
              element={
                <SidebarProvider>
                  <Profile />
                </SidebarProvider>
              }
            />
            <Route
              path="/analytics"
              element={
                <SidebarProvider>
                  <Analytics />
                </SidebarProvider>
              }
            />
            <Route
              path="/mfa-setup"
              element={
                <SidebarProvider>
                  <MFASetup />
                </SidebarProvider>
              }
            />
            <Route
              path="/trash"
              element={
                <SidebarProvider>
                  <Trash />
                </SidebarProvider>
              }
            />
          </Route>

          {/* Fallback route */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
