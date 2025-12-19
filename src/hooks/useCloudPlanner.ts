import { useCallback, useEffect, useRef, useState } from "react";
import {
  User,
  createUserWithEmailAndPassword,
  deleteUser,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
} from "firebase/auth";

import { PlannerSnapshot, deletePlannerSnapshot, loadPlannerSnapshot, savePlannerSnapshot } from "@/cloudPlanStore";
import { auth, googleProvider } from "@/firebaseClient";

type UseCloudPlannerArgs = {
  state: PlannerSnapshot;
  applySnapshot: (snapshot: PlannerSnapshot) => void;
};

const SAVE_DEBOUNCE_MS = 1200;

const getErrorMessage = (error: unknown, fallback: string) =>
  error instanceof Error ? error.message : fallback;

export const useCloudPlanner = ({ state, applySnapshot }: UseCloudPlannerArgs) => {
  const [user, setUser] = useState<User | null>(null);
  const [cloudStatus, setCloudStatus] = useState("");
  const [cloudSaving, setCloudSaving] = useState(false);
  const [cloudLoading, setCloudLoading] = useState(false);
  const [authBusy, setAuthBusy] = useState(false);
  const hasLoadedRef = useRef(false);
  const saveTimerRef = useRef<number | null>(null);
  const userRef = useRef<User | null>(null);

  useEffect(() => {
    userRef.current = user;
  }, [user]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (nextUser) => {
      setUser(nextUser);
      if (!nextUser) {
        setCloudStatus("");
        hasLoadedRef.current = false;
      }
    });
    return unsubscribe;
  }, []);

  const signInWithGoogle = useCallback(async () => {
    setAuthBusy(true);
    setCloudStatus("Signing in with Google...");
    try {
      const credential = await signInWithPopup(auth, googleProvider);
      setUser(credential.user);
      setCloudStatus("Signed in. Syncing your plan...");
    } catch (error) {
      const message = getErrorMessage(error, "Could not sign in");
      setCloudStatus(message);
      throw new Error(message);
    } finally {
      setAuthBusy(false);
    }
  }, []);

  const signInWithEmail = useCallback(async (email: string, password: string) => {
    setAuthBusy(true);
    setCloudStatus("Signing in...");
    try {
      const credential = await signInWithEmailAndPassword(auth, email, password);
      setUser(credential.user);
      setCloudStatus("Signed in. Syncing your plan...");
    } catch (error) {
      const message = getErrorMessage(error, "Could not sign in with email");
      setCloudStatus(message);
      throw new Error(message);
    } finally {
      setAuthBusy(false);
    }
  }, []);

  const registerWithEmail = useCallback(async (email: string, password: string) => {
    setAuthBusy(true);
    setCloudStatus("Creating your account...");
    try {
      const credential = await createUserWithEmailAndPassword(auth, email, password);
      setUser(credential.user);
      setCloudStatus("Account created. Syncing your plan...");
    } catch (error) {
      const message = getErrorMessage(error, "Could not create your account");
      setCloudStatus(message);
      throw new Error(message);
    } finally {
      setAuthBusy(false);
    }
  }, []);

  const signOutUser = useCallback(async () => {
    setAuthBusy(true);
    setCloudStatus("Signing out...");
    try {
      await signOut(auth);
      setCloudStatus("Signed out.");
      hasLoadedRef.current = false;
    } catch (error) {
      setCloudStatus(getErrorMessage(error, "Could not sign out"));
    } finally {
      setAuthBusy(false);
    }
  }, []);

  const loadSnapshot = useCallback(
    async (activeUser: User) => {
      setCloudLoading(true);
      setCloudStatus("Loading your saved plan...");
      try {
        const saved = await loadPlannerSnapshot(activeUser.uid);
        if (saved) {
          applySnapshot(saved);
          setCloudStatus("Plan synced.");
        } else {
          setCloudStatus("No saved plan yet.");
        }
      } catch (error) {
        setCloudStatus(getErrorMessage(error, "Could not load saved plan"));
      } finally {
        hasLoadedRef.current = true;
        setCloudLoading(false);
      }
    },
    [applySnapshot],
  );

  useEffect(() => {
    if (!user) return;
    loadSnapshot(user);
  }, [user, loadSnapshot]);

  useEffect(() => {
    if (!user || !hasLoadedRef.current) return;
    if (saveTimerRef.current) {
      window.clearTimeout(saveTimerRef.current);
    }
    const uid = user.uid;
    saveTimerRef.current = window.setTimeout(async () => {
      if (!userRef.current || userRef.current.uid !== uid) return;
      setCloudSaving(true);
      setCloudStatus("Saving changes...");
      try {
        await savePlannerSnapshot(uid, state);
        setCloudStatus("All changes saved.");
      } catch (error) {
        setCloudStatus(getErrorMessage(error, "Could not save plan"));
      } finally {
        setCloudSaving(false);
      }
    }, SAVE_DEBOUNCE_MS);

    return () => {
      if (saveTimerRef.current) {
        window.clearTimeout(saveTimerRef.current);
      }
    };
  }, [state, user]);

  const deletePlannerData = useCallback(async () => {
    const currentUser = userRef.current;
    if (!currentUser) return;
    setCloudStatus("Deleting your planner data...");
    try {
      await deletePlannerSnapshot(currentUser.uid);
      setCloudStatus("Planner data deleted.");
    } catch (error) {
      const message = getErrorMessage(error, "Could not delete planner data");
      setCloudStatus(message);
      throw new Error(message);
    }
  }, []);

  const deleteAccount = useCallback(async () => {
    const currentUser = userRef.current;
    if (!currentUser) {
      throw new Error("You need to be signed in to delete your account.");
    }
    setAuthBusy(true);
    setCloudStatus("Deleting your account...");
    try {
      await deletePlannerSnapshot(currentUser.uid);
      await deleteUser(currentUser);
      hasLoadedRef.current = false;
      setUser(null);
      setCloudStatus("Account deleted.");
    } catch (error) {
      const message = getErrorMessage(error, "Could not delete account");
      setCloudStatus(message);
      throw new Error(message);
    } finally {
      setAuthBusy(false);
    }
  }, []);

  return {
    user,
    cloudStatus,
    cloudSaving,
    cloudLoading,
    authBusy,
    signInWithGoogle,
    signInWithEmail,
    registerWithEmail,
    signOut: signOutUser,
    deletePlannerData,
    deleteAccount,
  };
};
