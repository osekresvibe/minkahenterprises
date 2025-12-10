
import React, { createContext, useContext, useEffect, useState } from 'react';
import { 
  signInWithPopup, 
  GoogleAuthProvider,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  type User as FirebaseUser
} from 'firebase/auth';
import { initializeFirebase } from '@/lib/firebase';

interface User {
  id: number;
  username: string;
  email: string;
  role: string;
  churchId: number | null;
  firebaseUid?: string;
  profileImageUrl?: string;
  displayName?: string;
}

interface AuthContextType {
  user: User | null;
  firebaseUser: FirebaseUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  signInWithGoogle: () => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Initialize Firebase and set up auth state listener
  useEffect(() => {
    const { auth } = initializeFirebase();
    
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      console.log('Firebase auth state changed:', fbUser ? 'User logged in' : 'User logged out');
      setFirebaseUser(fbUser);
      
      if (fbUser) {
        await fetchUserData(fbUser);
      } else {
        setUser(null);
        setIsLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const fetchUserData = async (fbUser: FirebaseUser) => {
    try {
      const idToken = await fbUser.getIdToken();
      const response = await fetch('/api/auth/user', {
        headers: {
          'Authorization': `Bearer ${idToken}`
        }
      });

      if (response.ok) {
        const userData = await response.json();
        setUser(userData);
      } else {
        console.error('Failed to fetch user data:', await response.text());
        setUser(null);
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  const signInWithGoogle = async () => {
    try {
      const { auth } = initializeFirebase();
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      console.log('Google sign-in successful:', result.user.email);
      await fetchUserData(result.user);
    } catch (error: any) {
      console.error('Error signing in with Google:', error);
      throw new Error(error.message || 'Failed to sign in with Google');
    }
  };

  const signInWithEmail = async (email: string, password: string) => {
    try {
      const { auth } = initializeFirebase();
      const result = await signInWithEmailAndPassword(auth, email, password);
      console.log('Email sign-in successful:', result.user.email);
      await fetchUserData(result.user);
    } catch (error: any) {
      console.error('Error signing in with email:', error);
      throw new Error(error.message || 'Failed to sign in');
    }
  };

  const signUpWithEmail = async (email: string, password: string) => {
    try {
      const { auth } = initializeFirebase();
      const result = await createUserWithEmailAndPassword(auth, email, password);
      console.log('Email sign-up successful:', result.user.email);
      await fetchUserData(result.user);
    } catch (error: any) {
      console.error('Error signing up with email:', error);
      throw new Error(error.message || 'Failed to sign up');
    }
  };

  const logout = async () => {
    try {
      const { auth } = initializeFirebase();
      await signOut(auth);
      setUser(null);
      setFirebaseUser(null);
    } catch (error) {
      console.error('Error signing out:', error);
      throw error;
    }
  };

  const refreshUser = async () => {
    if (firebaseUser) {
      await fetchUserData(firebaseUser);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        firebaseUser,
        isAuthenticated: !!user,
        isLoading,
        signInWithGoogle,
        signInWithEmail,
        signUpWithEmail,
        logout,
        refreshUser
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useFirebaseAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useFirebaseAuth must be used within an AuthProvider");
  }
  return context;
}
