import { initializeApp, getApp, getApps } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

const defaultFirebaseConfig = {
  apiKey: "AIzaSyAHHUZmFe7Vj17b9qchggxTBph3TolFgI4",
  authDomain: "majorbuddy-d1f3c.firebaseapp.com",
  projectId: "majorbuddy-d1f3c",
  storageBucket: "majorbuddy-d1f3c.firebasestorage.app",
  messagingSenderId: "864903227058",
  appId: "1:864903227058:web:2e4b9525557125aad6cbab",
  measurementId: "G-G0RDY96WJN",
} as const;

const envVar = (key: keyof ImportMetaEnv, fallback?: string) => {
  const value = import.meta.env[key];

  if (value && value.length > 0) {
    return value;
  }

  if (fallback) {
    return fallback;
  }

  throw new Error(`Missing environment variable: ${key}`);
};

// Firebase web configuration (safe to ship to the client; keys are project identifiers).
const firebaseConfig = {
  apiKey: envVar("VITE_FIREBASE_API_KEY", defaultFirebaseConfig.apiKey),
  authDomain: envVar("VITE_FIREBASE_AUTH_DOMAIN", defaultFirebaseConfig.authDomain),
  projectId: envVar("VITE_FIREBASE_PROJECT_ID", defaultFirebaseConfig.projectId),
  storageBucket: envVar("VITE_FIREBASE_STORAGE_BUCKET", defaultFirebaseConfig.storageBucket),
  messagingSenderId: envVar("VITE_FIREBASE_MESSAGING_SENDER_ID", defaultFirebaseConfig.messagingSenderId),
  appId: envVar("VITE_FIREBASE_APP_ID", defaultFirebaseConfig.appId),
  measurementId: envVar("VITE_FIREBASE_MEASUREMENT_ID", defaultFirebaseConfig.measurementId),
};

// Avoid re-initializing when React Fast Refresh runs in dev.
const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

export default app;
