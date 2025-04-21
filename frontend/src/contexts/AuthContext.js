import { createContext, useContext, useState, useEffect } from 'react';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  sendEmailVerification,
  updateProfile,
} from 'firebase/auth';
import { auth } from '../firebase/config';

const AuthContext = createContext();

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  async function signup(email, password, displayName = '') {
    const result = await createUserWithEmailAndPassword(auth, email, password);

    // If display name is provided, update the user profile
    if (displayName) {
      await updateProfile(result.user, { displayName });
    }

    await sendEmailVerification(result.user);
    return result;
  }

  async function resendVerificationEmail() {
    // First check if we're in cooldown period
    const lastSentTime = localStorage.getItem('lastVerificationEmailSent');
    if (lastSentTime) {
      const timePassed = (Date.now() - parseInt(lastSentTime)) / 1000;
      const VERIFICATION_EMAIL_COOLDOWN = 60; // Same as in components
      if (timePassed < VERIFICATION_EMAIL_COOLDOWN) {
        const timeLeft = Math.ceil(VERIFICATION_EMAIL_COOLDOWN - timePassed);
        throw new Error(
          `Please wait ${timeLeft} seconds before requesting another verification email.`
        );
      }
    }

    if (currentUser && !currentUser.emailVerified) {
      // Set the timestamp for cooldown tracking
      localStorage.setItem('lastVerificationEmailSent', Date.now().toString());
      return sendEmailVerification(currentUser);
    }
    throw new Error('No user found or email already verified');
  }

  async function login(email, password) {
    const result = await signInWithEmailAndPassword(auth, email, password);

    // Check if email is verified
    if (!result.user.emailVerified) {
      // Sign out user immediately
      await signOut(auth);
      throw new Error(
        'Please verify your email before logging in. Check your inbox for a verification link or request a new one.'
      );
    }

    return result;
  }

  function logout() {
    return signOut(auth);
  }

  function resetPassword(email) {
    return sendPasswordResetEmail(auth, email);
  }

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      // If user exists but email is not verified, sign them out
      if (user && !user.emailVerified) {
        signOut(auth);
        setCurrentUser(null);
      } else {
        setCurrentUser(user);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const value = {
    currentUser,
    signup,
    login,
    logout,
    resetPassword,
    resendVerificationEmail,
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}
