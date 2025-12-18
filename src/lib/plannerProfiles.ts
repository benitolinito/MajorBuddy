import { PlanProfile } from '@/types/planner';

export const DEFAULT_PLAN_NAME = 'My plan';

const toCanonical = (value: string) => value.trim().toLowerCase();

export const ensureUniquePlanName = (name: string, existing: PlanProfile[]): string => {
  const fallback = name.trim() || DEFAULT_PLAN_NAME;
  const canonicalExisting = new Set(existing.map((profile) => toCanonical(profile.name)));
  if (!canonicalExisting.has(toCanonical(fallback))) {
    return fallback;
  }

  let suffix = 2;
  let nextName = `${fallback} ${suffix}`;
  while (canonicalExisting.has(toCanonical(nextName))) {
    suffix += 1;
    nextName = `${fallback} ${suffix}`;
  }
  return nextName;
};

export const buildDuplicatePlanName = (sourceName: string | undefined, existing: PlanProfile[]) => {
  const base = sourceName?.trim() || DEFAULT_PLAN_NAME;
  return ensureUniquePlanName(`${base} copy`, existing);
};

export const getSuggestedPlanName = (existing: PlanProfile[]) =>
  ensureUniquePlanName(`Plan ${existing.length + 1}`, existing);
