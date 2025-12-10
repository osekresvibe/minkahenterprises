
import { initializeApp, type FirebaseApp, getApps } from 'firebase/app';
import { 
  getAuth, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  sendPasswordResetEmail,
  type Auth,
  type User
} from 'firebase/auth';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || `${import.meta.env.VITE_FIREBASE_PROJECT_ID}.firebaseapp.com`,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || `${import.meta.env.VITE_FIREBASE_PROJECT_ID}.firebasestorage.app`,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
};

let app: FirebaseApp | null = null;
let auth: Auth | null = null;

export function initializeFirebase() {
  if (!app) {
    // Check if Firebase is already initialized (prevents duplicate app error during HMR)
    const existingApps = getApps();
    if (existingApps.length > 0) {
      app = existingApps[0];
      auth = getAuth(app);
    } else {
      console.log('Initializing Firebase with config:', {
        apiKey: firebaseConfig.apiKey ? '***' : 'MISSING',
        projectId: firebaseConfig.projectId || 'MISSING',
        appId: firebaseConfig.appId ? '***' : 'MISSING'
      });

      app = initializeApp(firebaseConfig);
      auth = getAuth(app);
    }
  }
  return { app, auth: auth! };
}

export function getFirebaseAuth(): Auth {
  if (!auth) {
    const { auth: initializedAuth } = initializeFirebase();
    return initializedAuth;
  }
  return auth;
}

// Track initialization errors
export let initError: string | null = null;

// Initialize on module load
try {
  initializeFirebase();
} catch (error) {
  initError = error instanceof Error ? error.message : 'Failed to initialize Firebase';
  console.error('Firebase initialization error:', error);
}

// Sign in with email and password
export async function signInWithEmail(email: string, password: string): Promise<User | null> {
  try {
    const auth = getFirebaseAuth();
    const result = await signInWithEmailAndPassword(auth, email, password);
    return result.user;
  } catch (error) {
    console.error('Error signing in with email:', error);
    throw error;
  }
}

// Sign up with email and password
export async function signUpWithEmail(email: string, password: string): Promise<User | null> {
  try {
    const auth = getFirebaseAuth();
    const result = await createUserWithEmailAndPassword(auth, email, password);
    return result.user;
  } catch (error) {
    console.error('Error signing up with email:', error);
    throw error;
  }
}

// Reset password
export async function resetPassword(email: string): Promise<void> {
  try {
    const auth = getFirebaseAuth();
    await sendPasswordResetEmail(auth, email);
  } catch (error) {
    console.error('Error sending password reset email:', error);
    throw error;
  }
}
