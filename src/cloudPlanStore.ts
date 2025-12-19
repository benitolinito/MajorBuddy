import { deleteDoc, doc, getDoc, getFirestore, serverTimestamp, setDoc } from "firebase/firestore";
import app from "@/firebaseClient";
import { PlannerState } from "@/types/planner";

export type PlannerSnapshot = PlannerState;

const db = getFirestore(app);
const plannerDoc = (uid: string) => doc(db, "users", uid, "plannerV2", "current");

const pruneUndefined = (value: unknown): unknown => {
  if (Array.isArray(value)) {
    return value.map((item) => pruneUndefined(item));
  }
  if (value && typeof value === "object") {
    return Object.entries(value).reduce<Record<string, unknown>>((acc, [key, val]) => {
      if (val === undefined) {
        return acc;
      }
      acc[key] = pruneUndefined(val);
      return acc;
    }, {});
  }
  return value;
};

const sanitizeSnapshot = (snapshot: PlannerSnapshot): PlannerSnapshot =>
  pruneUndefined(snapshot) as PlannerSnapshot;

export const savePlannerSnapshot = async (uid: string, snapshot: PlannerSnapshot) => {
  await setDoc(plannerDoc(uid), { snapshot: sanitizeSnapshot(snapshot), updatedAt: serverTimestamp() });
};

export const loadPlannerSnapshot = async (uid: string): Promise<PlannerSnapshot | null> => {
  const snap = await getDoc(plannerDoc(uid));
  if (!snap.exists()) return null;
  const data = snap.data();
  if (!data || !("snapshot" in data)) return null;
  return data.snapshot as PlannerSnapshot;
};

export const deletePlannerSnapshot = async (uid: string) => {
  await deleteDoc(plannerDoc(uid));
};
