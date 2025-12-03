import { initializeApp, type FirebaseApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged, type User, type Auth } from "firebase/auth";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: `${import.meta.env.VITE_FIREBASE_PROJECT_ID}.firebaseapp.com`,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: `${import.meta.env.VITE_FIREBASE_PROJECT_ID}.firebasestorage.app`,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let initError: Error | null = null;

try {
  if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
    throw new Error("Firebase configuration is missing. Please check environment variables.");
  }
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
} catch (error) {
  console.error("Firebase initialization error:", error);
  initError = error instanceof Error ? error : new Error("Failed to initialize Firebase");
}

export { auth, initError };

const googleProvider = new GoogleAuthProvider();

export async function signInWithGoogle(): Promise<User | null> {
  if (!auth) {
    throw new Error("Firebase is not initialized");
  }
  try {
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
  } catch (error) {
    console.error("Error signing in with Google:", error);
    throw error;
  }
}

export async function logOut(): Promise<void> {
  if (!auth) {
    console.warn("Firebase is not initialized, skipping logout");
    return;
  }
  try {
    await signOut(auth);
  } catch (error) {
    console.error("Error signing out:", error);
    throw error;
  }
}

export function onAuthChange(callback: (user: User | null) => void) {
  if (!auth) {
    console.warn("Firebase is not initialized");
    callback(null);
    return () => {};
  }
  return onAuthStateChanged(auth, callback);
}

export async function getIdToken(): Promise<string | null> {
  if (!auth) return null;
  const user = auth.currentUser;
  if (!user) return null;
  return user.getIdToken();
}
