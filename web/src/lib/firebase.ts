import { initializeApp, getApps, type FirebaseApp } from "firebase/app";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  type Auth,
  type User as FirebaseUser,
} from "firebase/auth";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
};

const FIREBASE_ENABLED = typeof window !== "undefined" && !!firebaseConfig.apiKey;

// Lazy-init: only create the Firebase app on the client side
let _app: FirebaseApp | null = null;
let _auth: Auth | null = null;

function getFirebaseApp(): FirebaseApp | null {
  if (!FIREBASE_ENABLED) return null;
  if (_app) return _app;
  if (getApps().length > 0) {
    _app = getApps()[0];
  } else {
    _app = initializeApp(firebaseConfig);
  }
  return _app;
}

function getFirebaseAuth(): Auth | null {
  if (!FIREBASE_ENABLED) return null;
  if (_auth) return _auth;
  const app = getFirebaseApp();
  if (!app) return null;
  _auth = getAuth(app);
  return _auth;
}

const googleProvider = new GoogleAuthProvider();

export async function signInWithGoogle(): Promise<FirebaseUser | null> {
  const auth = getFirebaseAuth();
  if (!auth) { console.warn("Firebase Auth not configured"); return null; }
  const result = await signInWithPopup(auth, googleProvider);
  return result.user;
}

export async function signOut(): Promise<void> {
  const auth = getFirebaseAuth();
  if (!auth) return;
  await firebaseSignOut(auth);
}

export { FIREBASE_ENABLED };

export { getFirebaseAuth, onAuthStateChanged };
export type { FirebaseUser };
