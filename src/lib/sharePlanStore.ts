import { arrayUnion, doc, getFirestore, serverTimestamp, setDoc, updateDoc } from "firebase/firestore";
import app from "@/firebaseClient";
import { PlannerState } from "@/types/planner";

export type ShareRole = "viewer" | "editor";
export type ShareLinkAccess = ShareRole | "none";

type CreateShareRecordInput = {
  ownerId: string;
  planName: string;
  snapshot: PlannerState;
  planProfileId?: string | null;
  linkAccess?: ShareLinkAccess;
};

type ShareInviteInput = {
  shareId: string;
  email: string;
  role: ShareRole;
  inviterId: string;
};

const db = getFirestore(app);
const shareDoc = (shareId: string) => doc(db, "plannerShares", shareId);
const sanitizeSnapshot = (snapshot: PlannerState): PlannerState =>
  JSON.parse(JSON.stringify(snapshot)) as PlannerState;

const generateShareId = () => {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID().replace(/-/g, "").slice(0, 12);
  }
  return Math.random().toString(36).slice(2, 12);
};

export const buildShareUrl = (shareId: string) => {
  const origin = typeof window !== "undefined" && window.location?.origin
    ? window.location.origin
    : "https://app.majorbuddy.com";
  return `${origin.replace(/\/$/, "")}/share/${shareId}`;
};

export const createShareRecord = async ({ ownerId, planName, snapshot, planProfileId, linkAccess = "viewer" }: CreateShareRecordInput) => {
  const shareId = generateShareId();
  await setDoc(shareDoc(shareId), {
    ownerId,
    planProfileId: planProfileId ?? null,
    planName,
    linkAccess,
    invites: [],
    snapshot: sanitizeSnapshot(snapshot),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return shareId;
};

export const updateShareLinkAccess = async (
  shareId: string,
  linkAccess: ShareLinkAccess,
  snapshot?: PlannerState,
) => {
  const payload: Record<string, unknown> = {
    linkAccess,
    updatedAt: serverTimestamp(),
  };
  if (snapshot) {
    payload.snapshot = sanitizeSnapshot(snapshot);
  }
  await updateDoc(shareDoc(shareId), payload);
};

export const addShareInvite = async ({ shareId, email, role, inviterId }: ShareInviteInput) => {
  const normalizedEmail = email.trim().toLowerCase();
  await updateDoc(shareDoc(shareId), {
    invites: arrayUnion({
      email: normalizedEmail,
      role,
      invitedBy: inviterId,
      invitedAt: serverTimestamp(),
    }),
    updatedAt: serverTimestamp(),
  });
  return normalizedEmail;
};
