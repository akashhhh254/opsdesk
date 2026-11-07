import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  User as FirebaseUser,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  setPersistence,
  browserLocalPersistence,
  signOut as fbSignOut,
  sendPasswordResetEmail,
  sendEmailVerification,
  updateProfile,
} from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { auth, db, createGoogleProvider } from '../lib/firebase.ts';
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
  signInWithGoogle: (options?: { forceConsent?: boolean; useRedirect?: boolean }) => Promise<void>;
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

  // Dispatches application-controlled security login alert email
  const dispatchLoginAlert = (fbUser: FirebaseUser, profile: User) => {
    const targetEmail = fbUser.email || profile.email;
    if (!targetEmail) return;

    api
      .sendLoginAlert({
        email: targetEmail,
        displayName: fbUser.displayName || profile.name,
        providerId: fbUser.providerData[0]?.providerId || 'google.com',
        deviceInfo: {
          userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
          platform: typeof navigator !== 'undefined' ? navigator.platform : '',
          language: typeof navigator !== 'undefined' ? navigator.language : '',
          screenResolution:
            typeof window !== 'undefined' ? `${window.screen.width}x${window.screen.height}` : '',
        },
        loginTime: new Date().toISOString(),
      })
      .then((res) => {
        if (res?.message) {
          console.info('[Security Notification]', res.message);
        }
      })
      .catch((e) => console.warn('Login alert background notification warning:', e));
  };

  // Sync profile from Firestore or provision profile
  const fetchOrCreateProfile = async (fbUser: FirebaseUser): Promise<User> => {
    const isSuperAdmin = fbUser.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase();
    const defaultRole: UserRole = isSuperAdmin ? 'admin' : 'agency';
    const defaultAgencyId = isSuperAdmin ? '' : 'ag_skyline';

    const fallbackProfile: User = {
      id: fbUser.uid,
      name:
        fbUser.displayName ||
        fbUser.email?.split('@')[0] ||
        (isSuperAdmin ? 'Akash Thakare (Admin)' : 'Operations User'),
      email: fbUser.email || '',
      role: defaultRole,
      agencyId: defaultAgencyId,
      region: 'EMEA',
      specialization: isSuperAdmin ? ['Urgent Triage', 'Global Ops'] : [],
      avatarUrl: fbUser.photoURL || undefined,
    };

    try {
      const userDocRef = doc(db, 'users', fbUser.uid);
      const snap = await getDoc(userDocRef);

      if (snap.exists()) {
        const data = snap.data() as User;
        const updates: Partial<User> = {};

        // Auto-grant admin role if email matches the configured admin account
        if (isSuperAdmin && data.role !== 'admin') {
          updates.role = 'admin';
        }
        // Sync profile photo from Google if not yet populated
        if (fbUser.photoURL && !data.avatarUrl) {
          updates.avatarUrl = fbUser.photoURL;
        }

        if (Object.keys(updates).length > 0) {
          updateDoc(userDocRef, updates).catch(console.warn);
          return { ...data, ...updates };
        }
        return data;
      }

      // Provision new user profile in Firestore
      const docPayload: Record<string, any> = {
        id: fallbackProfile.id,
        name: fallbackProfile.name,
        email: fallbackProfile.email,
        role: fallbackProfile.role,
        agencyId: fallbackProfile.agencyId || '',
        region: fallbackProfile.region || 'EMEA',
        specialization:
          fallbackProfile.specialization && fallbackProfile.specialization.length > 0
            ? fallbackProfile.specialization
            : [],
        avatarUrl: fallbackProfile.avatarUrl || '',
        providerId: fbUser.providerData[0]?.providerId || 'google.com',
        createdAt: new Date().toISOString(),
      };

      // Strict sanitize: strip any undefined keys
      const sanitizedPayload: Record<string, any> = {};
      for (const [key, value] of Object.entries(docPayload)) {
        if (value !== undefined) {
          sanitizedPayload[key] = value;
        }
      }

      await setDoc(userDocRef, sanitizedPayload);
      return fallbackProfile;
    } catch (err: any) {
      console.warn(
        'Firestore user profile offline/unreachable, operating with authenticated session profile:',
        err?.message || err
      );
      return fallbackProfile;
    }
  };

  useEffect(() => {
    // 1. Enforce browser local persistence
    setPersistence(auth, browserLocalPersistence).catch(console.warn);

    // 2. Check for redirect authentication result (for mobile or pop-up blocked environments)
    getRedirectResult(auth)
      .then(async (cred) => {
        if (cred?.user) {
          const profile = await fetchOrCreateProfile(cred.user);
          setUserProfile(profile);
          api.setCurrentUserId(profile.id);
          dispatchLoginAlert(cred.user, profile);
        }
      })
      .catch((err) => {
        if (err.code && err.code !== 'auth/null-user') {
          console.warn('Redirect authentication callback:', err.code, err.message);
        }
      });

    // 3. Monitor ongoing auth state changes
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
          console.warn('Authentication profile synchronization warning:', err);
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
      dispatchLoginAlert(cred.user, profile);
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
      dispatchLoginAlert(cred.user, profile);
    } catch (err: any) {
      setError(mapAuthError(err.code || err.message));
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const signInWithGoogle = async (options?: { forceConsent?: boolean; useRedirect?: boolean }) => {
    setError(null);
    setIsLoading(true);
    const provider = createGoogleProvider(options?.forceConsent);

    try {
      if (options?.useRedirect) {
        await signInWithRedirect(auth, provider);
        return;
      }

      const cred = await signInWithPopup(auth, provider);
      const profile = await fetchOrCreateProfile(cred.user);
      setUserProfile(profile);
      api.setCurrentUserId(profile.id);
      dispatchLoginAlert(cred.user, profile);
    } catch (err: any) {
      console.warn('Google OAuth login error:', err.code, err.message);
      if (err.code === 'auth/popup-blocked') {
        setError('Popup was blocked by your browser. Please allow popups or use "Sign In with Redirect" below.');
      } else if (err.code === 'auth/popup-closed-by-user') {
        setError('Google sign-in was closed before selecting an account.');
      } else {
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
    const updatePayload: Record<string, any> = {
      role: newRole,
      updatedAt: new Date().toISOString(),
    };
    if (region) {
      updatePayload.region = region;
    }
    await updateDoc(userDocRef, updatePayload);
    if (userProfile && userProfile.id === userId) {
      setUserProfile({ ...userProfile, role: newRole, ...(region ? { region } : {}) });
    }
  };

  const isEmailVerified = Boolean(
    firebaseUser?.emailVerified ||
      firebaseUser?.providerData.some((p) => p.providerId === 'google.com')
  );

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
      return 'The Google sign-in popup was blocked by your browser. Please allow popups or use Redirect mode.';
    case 'auth/popup-closed-by-user':
      return 'Google sign-in was closed before completing account selection.';
    case 'auth/cancelled-popup-request':
      return 'Previous sign-in popup was superseded. Please select your account again.';
    case 'auth/unauthorized-domain':
      return 'This domain is not authorized for Google OAuth in your Firebase project. Please add this domain to Authorized Domains in Firebase Authentication Settings.';
    case 'auth/operation-not-allowed':
      return 'Google sign-in provider is not enabled in Firebase Authentication console.';
    case 'auth/account-exists-with-different-credential':
      return 'An account already exists with the same email address using another login method. Please sign in with your original method.';
    case 'auth/network-request-failed':
      return 'Network error. Please check your internet connection and retry.';
    default:
      return codeOrMsg || 'Authentication failed. Please try again.';
  }
}
