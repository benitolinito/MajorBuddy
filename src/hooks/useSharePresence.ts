import { useEffect, useMemo, useRef, useState } from "react";
import {
  collection,
  deleteDoc,
  doc,
  getFirestore,
  onSnapshot,
  serverTimestamp,
  setDoc,
  updateDoc,
} from "firebase/firestore";
import app from "@/firebaseClient";

export type PresencePeer = {
  id: string;
  label: string;
  photoUrl?: string | null;
  isSelf?: boolean;
};

const HEARTBEAT_MS = 20000;
const STALE_MS = 60000;

const db = getFirestore(app);

const generateSessionId = () => {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID().replace(/-/g, "").slice(0, 12);
  }
  return Math.random().toString(36).slice(2, 14);
};

const getGuestLabel = () => {
  if (typeof window === "undefined") return "Guest";
  const storageKey = "planner-presence-guest-label";
  const existing = sessionStorage.getItem(storageKey);
  if (existing) return existing;
  const generated = `Guest ${Math.floor(Math.random() * 900 + 100)}`;
  try {
    sessionStorage.setItem(storageKey, generated);
  } catch (error) {
    console.debug("Unable to persist guest label", error);
  }
  return generated;
};

const coerceLastActive = (value: unknown) => {
  if (typeof value === "number") return value;
  if (value && typeof value === "object" && "toMillis" in value && typeof (value as { toMillis?: () => number }).toMillis === "function") {
    return (value as { toMillis: () => number }).toMillis();
  }
  return 0;
};

export const useSharePresence = ({
  shareId,
  userId,
  label,
  photoUrl,
}: {
  shareId?: string | null;
  userId?: string | null;
  label?: string | null;
  photoUrl?: string | null;
}) => {
  const [peers, setPeers] = useState<PresencePeer[]>([]);
  const sessionIdRef = useRef<string>(generateSessionId());
  const cleanupRef = useRef<(() => void) | null>(null);
  const heartbeatRef = useRef<number | null>(null);

  const resolvedLabel = useMemo(() => {
    if (label && label.trim()) return label.trim();
    return getGuestLabel();
  }, [label]);

  useEffect(() => {
    const activeShareId = shareId?.trim();
    if (!activeShareId) {
      setPeers([]);
      if (cleanupRef.current) cleanupRef.current();
      return () => {};
    }

    const sessionId = sessionIdRef.current || generateSessionId();
    sessionIdRef.current = sessionId;
    const presenceDoc = doc(db, "plannerShares", activeShareId, "presence", sessionId);
    let unsub: (() => void) | null = null;
    let destroyed = false;

    const ensurePresence = async () => {
      try {
        await setDoc(
          presenceDoc,
          {
            uid: userId ?? null,
            label: resolvedLabel,
            photoUrl: photoUrl ?? null,
            lastActive: Date.now(),
            updatedAt: serverTimestamp(),
            createdAt: serverTimestamp(),
          },
          { merge: true },
        );
      } catch (error) {
        console.debug("Unable to establish presence", error);
      }
    };

    ensurePresence();

    if (heartbeatRef.current) {
      window.clearInterval(heartbeatRef.current);
      heartbeatRef.current = null;
    }

    heartbeatRef.current = window.setInterval(async () => {
      try {
        await updateDoc(presenceDoc, { lastActive: Date.now(), updatedAt: serverTimestamp(), label: resolvedLabel, photoUrl: photoUrl ?? null });
      } catch (error) {
        try {
          await setDoc(
            presenceDoc,
            {
              uid: userId ?? null,
              label: resolvedLabel,
              photoUrl: photoUrl ?? null,
              lastActive: Date.now(),
              updatedAt: serverTimestamp(),
            },
            { merge: true },
          );
        } catch (setError) {
          console.debug("Unable to refresh presence", setError ?? error);
        }
      }
    }, HEARTBEAT_MS);

    unsub = onSnapshot(collection(db, "plannerShares", activeShareId, "presence"), (snapshot) => {
      const now = Date.now();
      const activePeers = snapshot.docs
        .map((entry) => {
          const data = entry.data() as Record<string, unknown>;
          const lastActive = coerceLastActive(data.lastActive);
          if (now - lastActive > STALE_MS) return null;
          return {
            id: entry.id,
            label: (typeof data.label === "string" && data.label.trim()) ? (data.label as string).trim() : "Guest",
            photoUrl: typeof data.photoUrl === "string" && data.photoUrl.trim() ? (data.photoUrl as string) : null,
            isSelf: entry.id === sessionId,
          } satisfies PresencePeer;
        })
        .filter(Boolean) as PresencePeer[];
      setPeers(activePeers);
    });

    const cleanup = () => {
      if (destroyed) return;
      destroyed = true;
      if (unsub) unsub();
      if (heartbeatRef.current) {
        window.clearInterval(heartbeatRef.current);
        heartbeatRef.current = null;
      }
      deleteDoc(presenceDoc).catch(() => undefined);
    };

    const handleBeforeUnload = () => {
      deleteDoc(presenceDoc).catch(() => undefined);
    };

    if (typeof window !== "undefined") {
      window.addEventListener("beforeunload", handleBeforeUnload);
    }

    cleanupRef.current = () => {
      if (typeof window !== "undefined") {
        window.removeEventListener("beforeunload", handleBeforeUnload);
      }
      cleanup();
    };

    return cleanupRef.current;
  }, [shareId, userId, resolvedLabel, photoUrl]);

  const orderedPeers = useMemo(() => [...peers].sort((a, b) => Number(b.isSelf) - Number(a.isSelf)), [peers]);

  return {
    peers: orderedPeers,
    count: orderedPeers.length,
  };
};
