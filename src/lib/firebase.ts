import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, initializeFirestore } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// Use the database specified in the config if provided
let db: ReturnType<typeof getFirestore>;

try {
  if (firebaseConfig.firestoreDatabaseId) {
    db = initializeFirestore(app, {}, firebaseConfig.firestoreDatabaseId);
  } else {
    db = getFirestore(app);
  }
} catch {
  db = getFirestore(app);
}

export { app, db };
