"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import {
  getFirebaseAuth,
  onAuthStateChanged,
  signInWithGoogle as firebaseSignIn,
  signOut as firebaseSignOut,
  FIREBASE_ENABLED,
  type FirebaseUser,
} from "@/lib/firebase";

/** DB user linked to the Firebase user */
export interface AppUser {
  id: number;
  name: string;
  slug: string;
  avatarUrl: string | null;
  role: string;
  firebaseUid: string;
}

const ADMIN_UIDS = (process.env.NEXT_PUBLIC_ADMIN_UIDS ?? "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

// Email-based admin allow-list — kept in sync with auth-server.ts.
// applegorillappa@gmail.com is always an admin; NEXT_PUBLIC_ADMIN_EMAILS adds more.
const ADMIN_EMAILS = [
  "applegorillappa@gmail.com",
  ...(process.env.NEXT_PUBLIC_ADMIN_EMAILS ?? "").split(","),
]
  .map((s) => s.trim().toLowerCase())
  .filter(Boolean);

interface AuthContextValue {
  /** Firebase user (null = not signed in) */
  firebaseUser: FirebaseUser | null;
  /** DB user (null = not linked yet or not signed in) */
  appUser: AppUser | null;
  /** True while checking initial auth state */
  loading: boolean;
  /** True if the current user is an admin */
  isAdmin: boolean;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  firebaseUser: null,
  appUser: null,
  loading: true,
  isAdmin: false,
  signIn: async () => {},
  signOut: async () => {},
});

export function useAuth(): AuthContextValue {
  return useContext(AuthContext);
}

async function linkUser(firebaseUser: FirebaseUser): Promise<AppUser | null> {
  try {
    const idToken = await firebaseUser.getIdToken();
    const res = await fetch("/api/auth/link-user", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${idToken}`,
      },
      body: JSON.stringify({
        firebaseUid: firebaseUser.uid,
        email: firebaseUser.email,
        displayName: firebaseUser.displayName,
        photoURL: firebaseUser.photoURL,
      }),
    });
    if (!res.ok) return null;
    return (await res.json()) as AppUser;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [appUser, setAppUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);

  // Listen to Firebase auth state changes
  useEffect(() => {
    const auth = getFirebaseAuth();
    if (!auth) { setLoading(false); return; }

    // Safety net: if Firebase never responds within 8s, unblock the UI
    const timeout = setTimeout(() => setLoading(false), 8000);

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      clearTimeout(timeout);
      setFirebaseUser(user);
      if (user) {
        const linked = await linkUser(user);
        setAppUser(linked);
      } else {
        setAppUser(null);
      }
      setLoading(false);
    });
    return () => { clearTimeout(timeout); unsubscribe(); };
  }, []);

  const signIn = useCallback(async () => {
    if (!FIREBASE_ENABLED) { console.warn("Firebase Auth not configured"); return; }
    try {
      const user = await firebaseSignIn();
      if (!user) return;
      const linked = await linkUser(user);
      setAppUser(linked);
    } catch (error) {
      console.error("Sign in failed:", error);
    }
  }, []);

  const signOut = useCallback(async () => {
    await firebaseSignOut();
    setAppUser(null);
  }, []);

  const isAdmin =
    !!firebaseUser &&
    (ADMIN_UIDS.includes(firebaseUser.uid) ||
      (firebaseUser.emailVerified &&
        !!firebaseUser.email &&
        ADMIN_EMAILS.includes(firebaseUser.email.toLowerCase())));

  return (
    <AuthContext.Provider
      value={{ firebaseUser, appUser, loading, isAdmin, signIn, signOut }}
    >
      {children}
    </AuthContext.Provider>
  );
}
