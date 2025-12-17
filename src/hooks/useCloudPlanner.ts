import { useCallback, useEffect, useRef, useState } from "react";
import { User, onAuthStateChanged, signInWithPopup, signOut } from "firebase/auth";
import { auth, googleProvider } from "@/firebaseClient";
import { PlannerSnapshot, loadPlannerSnapshot, savePlannerSnapshot } from "@/cloudPlanStore";

type UseCloudPlannerArgs = {
  state: PlannerSnapshot;
  applySnapshot: (snapshot: PlannerSnapshot) => void;
};

const SAVE_DEBOUNCE_MS = 1200;

export const useCloudPlanner = ({ state, applySnapshot }: UseCloudPlannerArgs) => {
  const [user, setUser] = useState<User | null>(null);
  const [cloudStatus, setCloudStatus] = useState("");
  const [cloudSaving, setCloudSaving] = useState(false);
  const [cloudLoading, setCloudLoading] = useState(false);
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

  const signIn = useCallback(async () => {
    setCloudStatus("Signing in with Google...");
    try {
      const credential = await signInWithPopup(auth, googleProvider);
      setUser(credential.user);
      setCloudStatus("Signed in. Syncing your plan...");
    } catch (error) {
      setCloudStatus(error instanceof Error ? error.message : "Could not sign in");
    }
  }, []);

  const signOutUser = useCallback(async () => {
    setCloudStatus("Signing out...");
    try {
      await signOut(auth);
      setCloudStatus("Signed out.");
      hasLoadedRef.current = false;
    } catch (error) {
      setCloudStatus(error instanceof Error ? error.message : "Could not sign out");
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
        setCloudStatus(error instanceof Error ? error.message : "Could not load saved plan");
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
        setCloudStatus(error instanceof Error ? error.message : "Could not save plan");
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

  return {
    user,
    cloudStatus,
    cloudSaving,
    cloudLoading,
    signIn,
    signOut: signOutUser,
  };
};
