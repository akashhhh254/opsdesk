import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  User as FirebaseUser,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  signOut as fbSignOut,
  sendPasswordResetEmail,
  sendEmailVerification,
  updateProfile,
} from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { auth, db, googleProvider } from '../lib/firebase.ts';
import { User, UserRole, Region } from '../types/index.ts';
import { api } from '../services/api.ts';

interface AuthContextType {
  firebaseUser: FirebaseUser | null;
  userProfile: User | null;
  currentUser: User | null;
  allUsers: User[];
  isLoading: boolean;
  error: string | null;
  isEmailVerified: boolean;
  signInWithEmail: (email: string, pass: string) => Promise<void>;
  signUpWithEmail: (email: string, pass: string, name: string, agencyName?: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  sendPasswordReset: (email: string) => Promise<void>;
  resendVerificationEmail: () => Promise<void>;
  signOut: () => Promise<void>;
  updateUserRole: (userId: string, newRole: UserRole, region?: Region) => Promise<void>;
  clearError: () => void;
  // RBAC flags
  isAgency: boolean;
  isAgent: boolean;
  isManager: boolean;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const ADMIN_EMAIL = 'akashthakare157@gmail.com';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [userProfile, setUserProfile] = useState<User | null>(null);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.getUsers().then(({ users }) => setAllUsers(users)).catch(console.error);
  }, []);

  // Sync profile from Firestore or provision profile
  const fetchOrCreateProfile = async (fbUser: FirebaseUser): Promise<User> => {
    const userDocRef = doc(db, 'users', fbUser.uid);
    const snap = await getDoc(userDocRef);

    if (snap.exists()) {
      const data = snap.data() as User;
      // Auto-grant admin role if email matches the configured admin account
      if (fbUser.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase() && data.role !== 'admin') {
        const adminProfile: User = { ...data, role: 'admin' };
        await updateDoc(userDocRef, { role: 'admin' });
        return adminProfile;
      }
      return data;
    }

    // Provision new user profile
    const isSuperAdmin = fbUser.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase();
    const defaultRole: UserRole = isSuperAdmin ? 'admin' : 'agency';
    const defaultAgencyId = isSuperAdmin ? undefined : 'ag_skyline';

    const newProfile: User = {
      id: fbUser.uid,
      name: fbUser.displayName || fbUser.email?.split('@')[0] || 'Operations User',
      email: fbUser.email || '',
      role: defaultRole,
      agencyId: defaultAgencyId,
      region: 'EMEA',
      specialization: isSuperAdmin ? ['Urgent Triage', 'Global Ops'] : undefined,
    };

    await setDoc(userDocRef, {
      ...newProfile,
      createdAt: new Date().toISOString(),
    });

    return newProfile;
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      setIsLoading(true);
      setError(null);
      if (fbUser) {
        setFirebaseUser(fbUser);
        try {
          const profile = await fetchOrCreateProfile(fbUser);
          setUserProfile(profile);
          api.setCurrentUserId(profile.id);
        } catch (err: any) {
          console.error('Failed to load user profile from Firestore:', err);
          setError('Failed to load profile. Please verify your connection.');
        }
      } else {
        setFirebaseUser(null);
        setUserProfile(null);
        api.setCurrentUserId('');
      }
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signInWithEmail = async (email: string, pass: string) => {
    setError(null);
    setIsLoading(true);
    try {
      const cred = await signInWithEmailAndPassword(auth, email, pass);
      const profile = await fetchOrCreateProfile(cred.user);
      setUserProfile(profile);
      api.setCurrentUserId(profile.id);
    } catch (err: any) {
      setError(mapAuthError(err.code || err.message));
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const signUpWithEmail = async (email: string, pass: string, name: string, agencyName?: string) => {
    setError(null);
    setIsLoading(true);
    try {
      const cred = await createUserWithEmailAndPassword(auth, email, pass);
      await updateProfile(cred.user, { displayName: name });
      
      // Send verification email
      try {
        await sendEmailVerification(cred.user);
      } catch (e) {
        console.warn('Could not dispatch verification email immediately:', e);
      }

      const profile = await fetchOrCreateProfile(cred.user);
      setUserProfile(profile);
      api.setCurrentUserId(profile.id);
    } catch (err: any) {
      setError(mapAuthError(err.code || err.message));
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const signInWithGoogle = async () => {
    setError(null);
    setIsLoading(true);
    try {
      const cred = await signInWithPopup(auth, googleProvider);
      const profile = await fetchOrCreateProfile(cred.user);
      setUserProfile(profile);
      api.setCurrentUserId(profile.id);
    } catch (err: any) {
      if (err.code !== 'auth/popup-closed-by-user') {
        setError(mapAuthError(err.code || err.message));
      }
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const sendPasswordReset = async (email: string) => {
    setError(null);
    try {
      await sendPasswordResetEmail(auth, email);
    } catch (err: any) {
      setError(mapAuthError(err.code || err.message));
      throw err;
    }
  };

  const resendVerificationEmail = async () => {
    if (!auth.currentUser) return;
    try {
      await sendEmailVerification(auth.currentUser);
    } catch (err: any) {
      setError(mapAuthError(err.code || err.message));
      throw err;
    }
  };

  const signOut = async () => {
    setIsLoading(true);
    try {
      await fbSignOut(auth);
      setFirebaseUser(null);
      setUserProfile(null);
      api.setCurrentUserId('');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const updateUserRole = async (userId: string, newRole: UserRole, region?: Region) => {
    const userDocRef = doc(db, 'users', userId);
    await updateDoc(userDocRef, {
      role: newRole,
      ...(region ? { region } : {}),
      updatedAt: new Date().toISOString(),
    });
    if (userProfile && userProfile.id === userId) {
      setUserProfile({ ...userProfile, role: newRole, ...(region ? { region } : {}) });
    }
  };

  const isEmailVerified = Boolean(firebaseUser?.emailVerified || firebaseUser?.providerData.some(p => p.providerId === 'google.com'));

  const isAgency = userProfile?.role === 'agency';
  const isAgent = userProfile?.role === 'agent';
  const isManager = userProfile?.role === 'escalation_manager';
  const isAdmin = userProfile?.role === 'admin';

  return (
    <AuthContext.Provider
      value={{
        firebaseUser,
        userProfile,
        currentUser: userProfile,
        allUsers,
        isLoading,
        error,
        isEmailVerified,
        signInWithEmail,
        signUpWithEmail,
        signInWithGoogle,
        sendPasswordReset,
        resendVerificationEmail,
        signOut,
        updateUserRole,
        clearError: () => setError(null),
        isAgency,
        isAgent,
        isManager,
        isAdmin,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

function mapAuthError(codeOrMsg: string): string {
  switch (codeOrMsg) {
    case 'auth/invalid-email':
      return 'Please enter a valid email address.';
    case 'auth/user-disabled':
      return 'This user account has been disabled. Please contact operations support.';
    case 'auth/user-not-found':
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
      return 'Invalid email or password. Please double check and try again.';
    case 'auth/email-already-in-use':
      return 'An account with this email address already exists. Please log in.';
    case 'auth/weak-password':
      return 'Password should be at least 6 characters.';
    case 'auth/popup-blocked':
      return 'The Google sign-in popup was blocked by your browser. Please allow popups.';
    case 'auth/network-request-failed':
      return 'Network error. Please check your internet connection and retry.';
    default:
      return codeOrMsg || 'Authentication failed. Please try again.';
  }
}
