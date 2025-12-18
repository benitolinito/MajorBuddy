import { doc, getDoc, getFirestore, serverTimestamp, setDoc } from "firebase/firestore";
import app from "@/firebaseClient";
import { PlannerState } from "@/types/planner";

export type PlannerSnapshot = PlannerState;

const db = getFirestore(app);
const plannerDoc = (uid: string) => doc(db, "users", uid, "plannerV2", "current");
const sanitizeSnapshot = (snapshot: PlannerSnapshot): PlannerSnapshot =>
  JSON.parse(JSON.stringify(snapshot));

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
