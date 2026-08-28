import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { db } from './firebase';

const AUTH_DOC_PATH = 'settings';
const AUTH_DOC_ID = 'adminAuth';
const LOCAL_AUTH_CACHE_KEY = 'portal_admin_auth_cache';

export interface AdminCredentials {
  username: string;
  password: string;
  updatedAt?: number;
}

// Initial defaults to seed into Firestore if the doc doesn't exist yet
const INITIAL_FIREBASE_USERNAME = 'Katariya77';
const INITIAL_FIREBASE_PASS = 'kr!shn@77';

let cachedCredentials: AdminCredentials | null = null;

// Try to restore from local cache on startup
try {
  const local = localStorage.getItem(LOCAL_AUTH_CACHE_KEY);
  if (local) {
    cachedCredentials = JSON.parse(local);
  }
} catch {
  // ignore
}

/**
 * Ensures the credentials document exists in Firebase Firestore.
 * If not present, creates it with the requested username and password.
 */
export async function ensureFirestoreAdminAuth(): Promise<AdminCredentials> {
  try {
    const docRef = doc(db, AUTH_DOC_PATH, AUTH_DOC_ID);
    const snap = await getDoc(docRef);

    if (snap.exists()) {
      const data = snap.data() as AdminCredentials;
      if (data.username && data.password) {
        cachedCredentials = { username: data.username, password: data.password };
        localStorage.setItem(LOCAL_AUTH_CACHE_KEY, JSON.stringify(cachedCredentials));
        return cachedCredentials;
      }
    }

    // If document does not exist, seed it into Firebase Firestore
    const initialData: AdminCredentials = {
      username: INITIAL_FIREBASE_USERNAME,
      password: INITIAL_FIREBASE_PASS,
      updatedAt: Date.now(),
    };
    await setDoc(docRef, initialData, { merge: true });
    cachedCredentials = initialData;
    localStorage.setItem(LOCAL_AUTH_CACHE_KEY, JSON.stringify(initialData));
    return initialData;
  } catch (err) {
    console.warn('Firestore admin auth check error, using local fallback:', err);
    if (!cachedCredentials) {
      cachedCredentials = {
        username: INITIAL_FIREBASE_USERNAME,
        password: INITIAL_FIREBASE_PASS,
      };
    }
    return cachedCredentials;
  }
}

// Run Firestore auto-sync listener
try {
  const docRef = doc(db, AUTH_DOC_PATH, AUTH_DOC_ID);
  onSnapshot(
    docRef,
    (snap) => {
      if (snap.exists()) {
        const data = snap.data() as AdminCredentials;
        if (data.username && data.password) {
          cachedCredentials = { username: data.username, password: data.password };
          localStorage.setItem(LOCAL_AUTH_CACHE_KEY, JSON.stringify(cachedCredentials));
        }
      } else {
        // Auto-seed if missing
        setDoc(docRef, {
          username: INITIAL_FIREBASE_USERNAME,
          password: INITIAL_FIREBASE_PASS,
          updatedAt: Date.now(),
        }).catch(() => {});
      }
    },
    (err) => console.warn('Admin auth snapshot error:', err)
  );
} catch (e) {
  // ignore
}

/**
 * Verify credentials against Firebase Firestore
 */
export async function verifyAdminAuth(
  enteredUsername: string,
  enteredPass: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const creds = await ensureFirestoreAdminAuth();
    const cleanUser = enteredUsername.trim();
    const cleanPass = enteredPass.trim();

    if (!cleanUser || !cleanPass) {
      return { success: false, error: 'Please enter both username and password.' };
    }

    // Match username (case-insensitive) and password (exact)
    if (
      cleanUser.toLowerCase() === creds.username.toLowerCase() &&
      cleanPass === creds.password
    ) {
      return { success: true };
    }

    return { success: false, error: 'Incorrect username or password.' };
  } catch (err) {
    // Fallback comparison with cache
    if (cachedCredentials) {
      if (
        enteredUsername.trim().toLowerCase() === cachedCredentials.username.toLowerCase() &&
        enteredPass.trim() === cachedCredentials.password
      ) {
        return { success: true };
      }
    }
    return { success: false, error: 'Authentication failed. Please check credentials.' };
  }
}

/**
 * Update Admin Username and Password in Firebase Firestore
 */
export async function updateAdminAuthInFirestore(
  newUsername: string,
  newPass: string
): Promise<{ success: boolean; error?: string }> {
  const cleanUser = newUsername.trim();
  const cleanPass = newPass.trim();

  if (!cleanUser || !cleanPass) {
    return { success: false, error: 'Username and password cannot be empty.' };
  }

  try {
    const docRef = doc(db, AUTH_DOC_PATH, AUTH_DOC_ID);
    const updated: AdminCredentials = {
      username: cleanUser,
      password: cleanPass,
      updatedAt: Date.now(),
    };
    await setDoc(docRef, updated, { merge: true });
    cachedCredentials = updated;
    localStorage.setItem(LOCAL_AUTH_CACHE_KEY, JSON.stringify(updated));
    return { success: true };
  } catch (err) {
    console.error('Error updating admin auth in Firestore:', err);
    return { success: false, error: 'Failed to update credentials in database.' };
  }
}

export function getCurrentCachedUsername(): string {
  return cachedCredentials?.username || INITIAL_FIREBASE_USERNAME;
}
