import { initializeApp, getApp, getApps } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

// Firebase web configuration (safe to ship to the client; keys are project identifiers).
const firebaseConfig = {
  apiKey: "AIzaSyAHHUZmFe7Vj17b9qchggxTBph3TolFgI4",
  authDomain: "majorbuddy-d1f3c.firebaseapp.com",
  projectId: "majorbuddy-d1f3c",
  storageBucket: "majorbuddy-d1f3c.firebasestorage.app",
  messagingSenderId: "864903227058",
  appId: "1:864903227058:web:2e4b9525557125aad6cbab",
  measurementId: "G-G0RDY96WJN",
};

// Avoid re-initializing when React Fast Refresh runs in dev.
const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

export default app;
