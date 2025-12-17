import { initializeApp, getApp, getApps } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

const envVar = (key: keyof ImportMetaEnv) => {
  const value = import.meta.env[key];

  if (!value) {
    throw new Error(`Missing environment variable: ${key}`);
  }

  return value;
};

// Firebase web configuration (safe to ship to the client; keys are project identifiers).
const firebaseConfig = {
  apiKey: envVar("VITE_FIREBASE_API_KEY"),
  authDomain: envVar("VITE_FIREBASE_AUTH_DOMAIN"),
  projectId: envVar("VITE_FIREBASE_PROJECT_ID"),
  storageBucket: envVar("VITE_FIREBASE_STORAGE_BUCKET"),
  messagingSenderId: envVar("VITE_FIREBASE_MESSAGING_SENDER_ID"),
  appId: envVar("VITE_FIREBASE_APP_ID"),
  measurementId: envVar("VITE_FIREBASE_MEASUREMENT_ID"),
};

// Avoid re-initializing when React Fast Refresh runs in dev.
const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

export default app;
