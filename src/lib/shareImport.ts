import { PlannerState } from "@/types/planner";
import { ShareLinkAccess } from "./sharePlanStore";

export const SHARED_IMPORT_STORAGE_KEY = "planner-shared-import";

export type SharedImportPayload = {
  snapshot: PlannerState;
  planName?: string | null;
  shareId?: string | null;
  linkAccess?: ShareLinkAccess;
};

export const storeSharedImport = (payload: SharedImportPayload) => {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(SHARED_IMPORT_STORAGE_KEY, JSON.stringify(payload));
  } catch (error) {
    console.error("Unable to stash shared plan", error);
  }
};

export const consumeSharedImport = (): SharedImportPayload | null => {
  if (typeof window === "undefined") return null;
  const raw = sessionStorage.getItem(SHARED_IMPORT_STORAGE_KEY);
  if (!raw) return null;
  sessionStorage.removeItem(SHARED_IMPORT_STORAGE_KEY);
  try {
    const parsed = JSON.parse(raw) as SharedImportPayload;
    if (!parsed?.snapshot) return null;
    return parsed;
  } catch (error) {
    console.error("Unable to read shared plan", error);
    return null;
  }
};
