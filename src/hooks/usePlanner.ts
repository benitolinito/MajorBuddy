import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import {
  PlannerState,
  AcademicYear,
  Course,
  CourseDefaults,
  CourseLibrary,
  PlannerConfig,
  Term,
  TermName,
  TermSystem,
  PlannerPlan,
  PlanType,
  NewCourseInput,
  PlanInput,
  DistributiveRequirement,
  ShareLinkAccess,
} from '@/types/planner';
import { getDefaultColorId, normalizeColorHex } from '@/lib/tagColors';
import { DEFAULT_PLAN_NAME, ensureUniquePlanName } from '@/lib/plannerProfiles';

const generateId = () => Math.random().toString(36).substring(2, 9);
const CONFIG_STORAGE_KEY = 'plannerSetup';
const COURSE_STORAGE_KEY = 'plannerCourseCatalog';
const COURSE_LIBRARIES_STORAGE_KEY = 'plannerCourseLibraries';
const ACTIVE_COURSE_LIBRARY_STORAGE_KEY = 'plannerActiveCourseLibraryId';
const COURSE_DEFAULTS_STORAGE_KEY = 'plannerCourseDefaults';
const DISTRIBUTIVES_STORAGE_KEY = 'plannerDistributives';
const DISTRIBUTIVE_REQUIREMENTS_STORAGE_KEY = 'plannerDistributiveRequirements';
const PLANS_STORAGE_KEY = 'plannerPlans';
const YEARS_STORAGE_KEY = 'plannerAcademicYears';
const PLAN_PROFILES_STORAGE_KEY = 'plannerPlanProfiles';
const COLOR_PALETTE_STORAGE_KEY = 'plannerColorPalette';
const PLAN_SHARE_STORAGE_KEY = 'plannerPlanShares';
const DEFAULT_COURSE_LIBRARY_NAME = 'Main Library';
const DEFAULT_MAJOR_CREDITS = 48;
const DEFAULT_MINOR_CREDITS = 24;
const DEFAULT_COURSE_CREDITS = 3;
const PLANNER_STORAGE_KEYS = [
  CONFIG_STORAGE_KEY,
  COURSE_STORAGE_KEY,
  COURSE_LIBRARIES_STORAGE_KEY,
  ACTIVE_COURSE_LIBRARY_STORAGE_KEY,
  COURSE_DEFAULTS_STORAGE_KEY,
  DISTRIBUTIVES_STORAGE_KEY,
  DISTRIBUTIVE_REQUIREMENTS_STORAGE_KEY,
  PLANS_STORAGE_KEY,
  YEARS_STORAGE_KEY,
  PLAN_PROFILES_STORAGE_KEY,
  COLOR_PALETTE_STORAGE_KEY,
  PLAN_SHARE_STORAGE_KEY,
];

export const clearPlannerStorage = () => {
  if (typeof window === 'undefined') return;
  PLANNER_STORAGE_KEYS.forEach((key) => localStorage.removeItem(key));
};

const persistJson = (key: string, value: unknown) => {
  if (typeof window === 'undefined') return;
  localStorage.setItem(key, JSON.stringify(value));
};

const persistPalette = (palette: string[]) => {
  persistJson(COLOR_PALETTE_STORAGE_KEY, palette);
};

const persistCourseDefaults = (defaults: CourseDefaults) => {
  persistJson(COURSE_DEFAULTS_STORAGE_KEY, defaults);
};

type PlanShareMeta = { shareId: string | null; linkAccess?: ShareLinkAccess; ownerId?: string | null };

const normalizeShareMeta = (value: unknown): PlanShareMeta | null => {
  if (!value || typeof value !== 'object') return null;
  const record = value as { shareId?: unknown; linkAccess?: unknown; ownerId?: unknown };
  const shareId = typeof record.shareId === 'string' && record.shareId.trim().length ? record.shareId.trim() : null;
  const linkAccess = record.linkAccess === 'viewer' || record.linkAccess === 'editor' || record.linkAccess === 'none'
    ? (record.linkAccess as ShareLinkAccess)
    : undefined;
  const ownerId = isNonEmptyString(record.ownerId) ? record.ownerId.trim() : null;
  if (!shareId && !linkAccess && !ownerId) return shareId === null ? { shareId: null } : null;
  return { shareId, linkAccess, ownerId };
};

const loadShareMetaMap = (): Record<string, PlanShareMeta> => {
  const raw = loadJson<Record<string, unknown>>(PLAN_SHARE_STORAGE_KEY, {});
  if (!raw || typeof raw !== 'object') return {};
  return Object.entries(raw).reduce<Record<string, PlanShareMeta>>((acc, [key, value]) => {
    const normalized = normalizeShareMeta(value);
    if (normalized) {
      acc[key] = normalized;
    }
    return acc;
  }, {});
};

const persistShareMetaMap = (map: Record<string, PlanShareMeta>) => {
  persistJson(PLAN_SHARE_STORAGE_KEY, map);
};

const isNonEmptyString = (value: unknown): value is string =>
  typeof value === 'string' && value.trim().length > 0;

const loadJson = <T>(key: string, fallback: T): T => {
  if (typeof window === 'undefined') return fallback;
  const raw = localStorage.getItem(key);
  if (!raw) return fallback;

  try {
    const parsed = JSON.parse(raw);
    return parsed as T;
  } catch {
    return fallback;
  }
};

const normalizePalette = (value: unknown): string[] => {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  value.forEach((entry) => {
    if (typeof entry !== 'string') return;
    const normalized = normalizeColorHex(entry);
    if (normalized) seen.add(normalized);
  });
  return Array.from(seen);
};

const loadStoredPalette = (): string[] => normalizePalette(loadJson(COLOR_PALETTE_STORAGE_KEY, []));

const normalizeDistributives = (value: unknown): string[] => {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  value.forEach((item) => {
    if (isNonEmptyString(item)) {
      seen.add(item.trim());
    }
  });
  return Array.from(seen);
};

const normalizeDistributiveRequirement = (value: unknown): DistributiveRequirement => {
  if (isNonEmptyString(value)) {
    const name = value.trim();
    return {
      id: generateId(),
      name,
      classesNeeded: null,
      color: getDefaultColorId(name),
    };
  }

  const record = (value ?? {}) as Record<string, unknown>;
  const name = isNonEmptyString(record.name) ? record.name.trim() : 'Untitled distributive';
  return {
    id: isNonEmptyString(record.id) ? record.id : generateId(),
    name,
    classesNeeded: normalizeOptionalNumber(record.classesNeeded, null),
    color: isNonEmptyString(record.color) ? record.color.trim() : getDefaultColorId(name),
  };
};

const normalizeOptionalNumber = (value: unknown, fallback: number | null = null) => {
  if (value === null || value === undefined || value === '') return fallback;
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return fallback;
  return Math.max(0, numeric);
};

const normalizeCourseDefaults = (value: unknown): CourseDefaults => {
  const record = (value ?? {}) as Record<string, unknown>;
  const defaultCredits = normalizeOptionalNumber(record.defaultCredits, DEFAULT_COURSE_CREDITS) ?? DEFAULT_COURSE_CREDITS;
  return { defaultCredits };
};

const loadStoredCourseDefaults = (): CourseDefaults =>
  normalizeCourseDefaults(loadJson(COURSE_DEFAULTS_STORAGE_KEY, { defaultCredits: DEFAULT_COURSE_CREDITS }));

const normalizePlan = (value: unknown): PlannerPlan => {
  const plan = (value ?? {}) as Record<string, unknown>;
  const type: PlanType = plan.type === 'minor' ? 'minor' : 'major';
  const defaultCredits = type === 'major' ? DEFAULT_MAJOR_CREDITS : DEFAULT_MINOR_CREDITS;
  const name = isNonEmptyString(plan.name) ? plan.name.trim() : 'Untitled plan';
  const requiredCredits =
    plan.requiredCredits === undefined ? defaultCredits : normalizeOptionalNumber(plan.requiredCredits, null);
  return {
    id: isNonEmptyString(plan.id) ? plan.id : generateId(),
    name,
    type,
    requiredCredits,
    classesNeeded: normalizeOptionalNumber(plan.classesNeeded, null),
    color: isNonEmptyString(plan.color) ? plan.color.trim() : getDefaultColorId(name),
  };
};

const normalizeCourse = (value: unknown, termSystem?: TermSystem): Course => {
  const course = (value ?? {}) as Record<string, unknown>;
  const distributivesSource =
    'distributives' in course
      ? course.distributives
      : 'categories' in course
        ? course.categories
        : [];
  const distributives = normalizeDistributives(distributivesSource);
  const planIds = Array.isArray(course.planIds) ? course.planIds.filter(isNonEmptyString) : [];
  const sourceId = isNonEmptyString(course.sourceId) ? course.sourceId.trim() : undefined;
  const subject = isNonEmptyString(course.subject) ? course.subject.trim() : undefined;
  const prerequisitesSource =
    Array.isArray(course.prerequisiteIds)
      ? course.prerequisiteIds
      : Array.isArray((course as { prerequisites?: unknown }).prerequisites)
        ? (course as { prerequisites?: unknown }).prerequisites
        : [];
  const prerequisiteIds = Array.from(
    new Set(
      (prerequisitesSource as unknown[])
        .filter(isNonEmptyString)
        .map((id) => id.trim()),
    ),
  );
  const colorSource = course.distributiveColors;
  const distributiveColors =
    colorSource && typeof colorSource === 'object'
      ? distributives.reduce<Record<string, string>>((acc, label) => {
          const raw = (colorSource as Record<string, unknown>)[label];
          if (isNonEmptyString(raw)) {
            acc[label] = raw.trim();
          }
          return acc;
        }, {})
      : undefined;
  const offeredTermsSource =
    'offeredTerms' in course
      ? course.offeredTerms
      : 'offeredIn' in course
        ? course.offeredIn
        : undefined;
  const offeredTerms = normalizeOfferedTerms(offeredTermsSource, termSystem);
  return {
    id: isNonEmptyString(course.id) ? course.id : generateId(),
    sourceId,
    code: isNonEmptyString(course.code) ? course.code.trim() : 'NEW-000',
    name: isNonEmptyString(course.name) ? course.name.trim() : 'Untitled course',
    description: typeof course.description === 'string' ? course.description : undefined,
    credits: Number.isFinite(Number(course.credits)) ? Number(course.credits) : 0,
    distributives,
    distributiveColors,
    planIds,
    offeredTerms,
    subject,
    prerequisiteIds,
  };
};

const loadStoredCourses = (): Course[] => {
  const raw = loadJson<unknown>(COURSE_STORAGE_KEY, []);
  if (!Array.isArray(raw)) return [];
  return raw.map(normalizeCourse);
};

const normalizeCourseLibrary = (value: unknown, termSystem?: TermSystem): CourseLibrary => {
  const record = (value ?? {}) as Record<string, unknown>;
  const coursesSource = Array.isArray(record.courses) ? record.courses : [];
  return {
    id: isNonEmptyString(record.id) ? record.id : generateId(),
    name: isNonEmptyString(record.name) ? record.name.trim() : DEFAULT_COURSE_LIBRARY_NAME,
    courses: coursesSource.map((course) => normalizeCourse(course, termSystem)),
  };
};

const normalizeCourseLibraries = (value: unknown, termSystem?: TermSystem): CourseLibrary[] => {
  if (!Array.isArray(value)) return [];
  return value.map((entry) => normalizeCourseLibrary(entry, termSystem));
};

const loadStoredCourseLibraries = (termSystem?: TermSystem): CourseLibrary[] => {
  const raw = loadJson<unknown>(COURSE_LIBRARIES_STORAGE_KEY, []);
  if (!Array.isArray(raw)) return [];
  return raw.map((entry) => normalizeCourseLibrary(entry, termSystem));
};

const loadStoredActiveCourseLibraryId = (): string | null => {
  if (typeof window === 'undefined') return null;
  const stored = localStorage.getItem(ACTIVE_COURSE_LIBRARY_STORAGE_KEY);
  return isNonEmptyString(stored) ? stored : null;
};

const persistActiveCourseLibraryId = (libraryId: string) => {
  if (typeof window === 'undefined') return;
  localStorage.setItem(ACTIVE_COURSE_LIBRARY_STORAGE_KEY, libraryId);
};

const persistCourseLibrariesStore = (libraries: CourseLibrary[]) => {
  persistJson(COURSE_LIBRARIES_STORAGE_KEY, libraries);
};

const resolveCourseLibraryState = (
  libraries: CourseLibrary[],
  fallbackCourses: Course[],
  desiredActiveId?: string | null,
): {
  courseLibraries: CourseLibrary[];
  activeCourseLibraryId: string;
  courseCatalog: Course[];
} => {
  const nextLibraries = libraries.length
    ? libraries
    : [
        {
          id: generateId(),
          name: DEFAULT_COURSE_LIBRARY_NAME,
          courses: fallbackCourses,
        },
      ];
  const hasDesired = desiredActiveId && nextLibraries.some((library) => library.id === desiredActiveId);
  const activeLibrary = hasDesired
    ? nextLibraries.find((library) => library.id === desiredActiveId)
    : nextLibraries[0];
  const activeLibraryId = activeLibrary?.id ?? nextLibraries[0]?.id ?? '';
  return {
    courseLibraries: nextLibraries,
    activeCourseLibraryId: activeLibraryId,
    courseCatalog: activeLibrary?.courses ?? [],
  };
};

const persistCourseLibraryState = (libraries: CourseLibrary[], activeLibraryId: string) => {
  const resolvedLibraries = libraries.length
    ? libraries
    : [
        {
          id: generateId(),
          name: DEFAULT_COURSE_LIBRARY_NAME,
          courses: [],
        },
      ];
  persistCourseLibrariesStore(resolvedLibraries);
  const activeLibrary =
    resolvedLibraries.find((library) => library.id === activeLibraryId) ?? resolvedLibraries[0] ?? null;
  const resolvedActiveId = activeLibrary?.id ?? '';
  persistActiveCourseLibraryId(resolvedActiveId);
  persistJson(COURSE_STORAGE_KEY, activeLibrary?.courses ?? []);
  return {
    activeLibraryId: resolvedActiveId,
    courseCatalog: activeLibrary?.courses ?? [],
  };
};

const resolveActiveLibraryContext = (state: PlannerState) => {
  const hasLibraries = Array.isArray(state.courseLibraries) && state.courseLibraries.length > 0;
  const libraries = hasLibraries
    ? state.courseLibraries
    : [
        {
          id: generateId(),
          name: DEFAULT_COURSE_LIBRARY_NAME,
          courses: state.courseCatalog ?? [],
        },
      ];
  const fallbackActive = libraries.find((library) => library.id === state.activeCourseLibraryId) ?? libraries[0];
  const activeLibraryId = fallbackActive?.id ?? libraries[0]?.id ?? '';
  const activeLibraryIndex = Math.max(
    0,
    libraries.findIndex((library) => library.id === activeLibraryId),
  );
  const activeLibrary = libraries[activeLibraryIndex] ?? libraries[0];
  return { libraries, activeLibraryId, activeLibraryIndex, activeLibrary };
};

const ensureUniqueLibraryName = (baseName: string, libraries: CourseLibrary[], excludeId?: string): string => {
  const normalizedBase = baseName.trim() || DEFAULT_COURSE_LIBRARY_NAME;
  const taken = new Set(
    libraries
      .filter((library) => library.id !== excludeId)
      .map((library) => library.name.trim().toLowerCase()),
  );
  if (!taken.has(normalizedBase.toLowerCase())) return normalizedBase;
  let suffix = 2;
  while (taken.has(`${normalizedBase} ${suffix}`.toLowerCase())) {
    suffix += 1;
  }
  return `${normalizedBase} ${suffix}`;
};

const loadStoredDistributives = (): string[] => normalizeDistributives(loadJson(DISTRIBUTIVES_STORAGE_KEY, []));

const loadStoredDistributiveRequirements = (): DistributiveRequirement[] => {
  const raw = loadJson<unknown>(DISTRIBUTIVE_REQUIREMENTS_STORAGE_KEY, []);
  if (!Array.isArray(raw)) return [];
  return raw.map(normalizeDistributiveRequirement);
};

const loadStoredPlans = (): PlannerPlan[] => {
  const raw = loadJson<unknown>(PLANS_STORAGE_KEY, []);
  if (!Array.isArray(raw)) return [];
  return raw.map(normalizePlan);
};

type PlanProfileSnapshot = PlanProfile & { snapshot: PlannerState };

const clonePlannerState = (state: PlannerState): PlannerState =>
  JSON.parse(JSON.stringify(state)) as PlannerState;

const stripScheduledCourses = (state: PlannerState): PlannerState => ({
  ...state,
  years: state.years.map((year) => ({
    ...year,
    terms: year.terms.map((term) => ({
      ...term,
      courses: [],
    })),
  })),
});

const loadStoredPlanProfiles = (): { activeId: string; profiles: PlanProfileSnapshot[] } => {
  const fallback = { activeId: '', profiles: [] as PlanProfileSnapshot[] };
  const storedPalette = loadStoredPalette();
  const raw = loadJson<unknown>(PLAN_PROFILES_STORAGE_KEY, fallback);
  if (!raw || typeof raw !== 'object') return fallback;
  if (Array.isArray(raw)) {
    return { activeId: '', profiles: [] };
  }
  const store = raw as { activeId?: unknown; profiles?: unknown };
  const activeId = isNonEmptyString(store.activeId) ? store.activeId : '';
  const profiles = Array.isArray(store.profiles)
    ? store.profiles
        .map((entry) => {
          const snapshotEntry = entry as Partial<PlanProfileSnapshot>;
          if (!snapshotEntry?.snapshot) return null;
          const id = isNonEmptyString(snapshotEntry.id) ? snapshotEntry.id : generateId();
          const name = isNonEmptyString(snapshotEntry.name) ? snapshotEntry.name : DEFAULT_PLAN_NAME;
          const shareMeta = normalizeShareMeta({
            shareId: (snapshotEntry as Record<string, unknown>).shareId,
            linkAccess: (snapshotEntry as Record<string, unknown>).shareLinkAccess,
            ownerId: (snapshotEntry as Record<string, unknown>).shareOwnerId ?? (snapshotEntry as Record<string, unknown>).ownerId,
          });
          const snapshot = snapshotEntry.snapshot as PlannerState;
          return {
            id,
            name,
            shareId: shareMeta?.shareId ?? null,
            shareLinkAccess: shareMeta?.linkAccess,
            shareOwnerId: shareMeta?.ownerId ?? null,
            snapshot: {
              ...snapshot,
              colorPalette: normalizePalette((snapshot as PlannerState)?.colorPalette ?? storedPalette),
            },
          };
        })
        .filter(Boolean) as PlanProfileSnapshot[]
    : [];
  return { activeId, profiles };
};

const persistPlanProfiles = (activeId: string, profiles: PlanProfileSnapshot[]) => {
  persistJson(PLAN_PROFILES_STORAGE_KEY, { activeId, profiles });
};

const formatYearLabel = (startYear: number) => {
  const pad = (value: number) => value.toString().slice(-2).padStart(2, '0');
  return `${pad(startYear)}-${pad(startYear + 1)}`;
};

const TERM_SEQUENCE: Record<TermSystem, TermName[]> = {
  semester: ['Fall', 'Spring', 'Summer'],
  quarter: ['Fall', 'Winter', 'Spring', 'Summer'],
};

const INITIAL_TERMS: Record<TermSystem, TermName[]> = {
  semester: ['Fall', 'Spring'],
  quarter: ['Fall', 'Winter', 'Spring'],
};

const getTermSequenceForSystem = (termSystem: TermSystem) => TERM_SEQUENCE[termSystem] ?? TERM_SEQUENCE.semester;

const sortTermsForSystem = (terms: Term[], termSystem: TermSystem) => {
  const termSequence = getTermSequenceForSystem(termSystem);
  const orderLookup = new Map(termSequence.map((name, index) => [name, index]));
  return [...terms].sort((a, b) => {
    const orderA = orderLookup.get(a.name) ?? termSequence.length;
    const orderB = orderLookup.get(b.name) ?? termSequence.length;
    if (orderA !== orderB) return orderA - orderB;
    return a.year - b.year;
  });
};

const getCalendarYearForTerm = (startYear: number, termName: TermName) => (termName === 'Fall' ? startYear : startYear + 1);

const createTerm = (termName: TermName, academicStartYear: number) => ({
  id: generateId(),
  name: termName,
  year: getCalendarYearForTerm(academicStartYear, termName),
  courses: [],
});

const isTermName = (value: unknown): value is TermName =>
  value === 'Fall' || value === 'Winter' || value === 'Spring' || value === 'Summer';

const toTermName = (value: unknown): TermName | null => {
  if (isTermName(value)) return value;
  if (typeof value !== 'string') return null;
  const normalized = value.trim().toLowerCase();
  if (normalized === 'fall') return 'Fall';
  if (normalized === 'winter') return 'Winter';
  if (normalized === 'spring') return 'Spring';
  if (normalized === 'summer') return 'Summer';
  return null;
};

const normalizeTermNameForSystem = (value: unknown, termSystem: TermSystem, fallback?: TermName): TermName => {
  const termSequence = getTermSequenceForSystem(termSystem);
  const defaultName = fallback ?? termSequence[0] ?? 'Fall';
  const normalized = toTermName(value);
  if (!normalized) return defaultName;

  if (termSystem === 'semester' && normalized === 'Winter') {
    return termSequence.includes('Summer') ? 'Summer' : defaultName;
  }

  return termSequence.includes(normalized) ? normalized : defaultName;
};

const normalizeOfferedTerms = (value: unknown, termSystem?: TermSystem): TermName[] => {
  if (!Array.isArray(value)) return [];
  const seen = new Set<TermName>();
  const allowedTerms = termSystem ? getTermSequenceForSystem(termSystem) : null;
  const fallback = allowedTerms?.[0] ?? 'Fall';
  value.forEach((entry) => {
    const normalized = toTermName(entry);
    if (!normalized) return;
    const termName = termSystem
      ? normalizeTermNameForSystem(normalized, termSystem, fallback)
      : normalized;
    if (allowedTerms && !allowedTerms.includes(termName)) return;
    seen.add(termName);
  });
  return Array.from(seen);
};

const inferAcademicStartYear = (year: AcademicYear, fallbackStartYear: number): number => {
  if (Number.isFinite(Number(year?.startYear))) return Number(year.startYear);

  const derived = (year?.terms ?? []).reduce<number | null>((result, term) => {
    const termYear = Number(term?.year);
    if (!Number.isFinite(termYear)) return result;
    const normalizedName = toTermName(term?.name) ?? 'Fall';
    const academicYear = normalizedName === 'Fall' ? termYear : termYear - 1;
    return result == null ? academicYear : Math.min(result, academicYear);
  }, null);

  return derived ?? fallbackStartYear;
};

const convertSemesterYearsToQuarter = (years: AcademicYear[], fallbackStartYear: number): AcademicYear[] => {
  if (!Array.isArray(years)) return [];

  return years.map((year) => {
    const academicStartYear = inferAcademicStartYear(year, fallbackStartYear);
    const normalizedTerms = Array.isArray(year?.terms)
      ? year.terms.map((term) => {
          const termName = normalizeTermNameForSystem(term?.name, 'quarter');
          const termYear = Number.isFinite(Number(term?.year))
            ? Number(term.year)
            : getCalendarYearForTerm(academicStartYear, termName);
          return { ...term, name: termName, year: termYear };
        })
      : [];
    const hasWinter = normalizedTerms.some((term) => term.name === 'Winter');

    if (!hasWinter) {
      const springTerm = normalizedTerms.find((term) => term.name === 'Spring');
      const winterTerm: Term = {
        id: generateId(),
        name: 'Winter',
        year: getCalendarYearForTerm(academicStartYear, 'Winter'),
        courses: springTerm?.courses ?? [],
      };

      const termsWithWinter = [
        ...normalizedTerms.map((term) => (term.name === 'Spring' ? { ...term, courses: [] } : term)),
        winterTerm,
      ];

      return {
        ...year,
        startYear: Number.isFinite(Number(year?.startYear)) ? Number(year.startYear) : academicStartYear,
        endYear: Number.isFinite(Number(year?.endYear)) ? Number(year.endYear) : academicStartYear + 1,
        terms: sortTermsForSystem(termsWithWinter, 'quarter'),
      };
    }

    return {
      ...year,
      startYear: Number.isFinite(Number(year?.startYear)) ? Number(year.startYear) : academicStartYear,
      endYear: Number.isFinite(Number(year?.endYear)) ? Number(year.endYear) : academicStartYear + 1,
      terms: sortTermsForSystem(normalizedTerms, 'quarter'),
    };
  });
};

const loadStoredYears = (): AcademicYear[] | null => {
  if (typeof window === 'undefined') return null;
  const raw = localStorage.getItem(YEARS_STORAGE_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as AcademicYear[]) : null;
  } catch {
    return null;
  }
};

const sanitizeYears = (provided: AcademicYear[] | null | undefined, config: PlannerConfig): AcademicYear[] => {
  if (!provided?.length) {
    return createInitialYears(config.startYear, config.termSystem);
  }

  const defaultTermName = getTermSequenceForSystem(config.termSystem)[0] ?? 'Fall';

  return provided.map((year, index) => {
    const fallbackStart = Number.isFinite(Number(year?.startYear)) ? Number(year?.startYear) : config.startYear + index;
    const normalizedTerms = Array.isArray(year?.terms) && year.terms.length
      ? year.terms.map((term) => {
          const termName = normalizeTermNameForSystem(term?.name, config.termSystem, defaultTermName);
          const termYear = Number.isFinite(Number(term?.year))
            ? Number(term.year)
            : getCalendarYearForTerm(fallbackStart, termName);
          const courses = Array.isArray(term?.courses)
            ? term.courses.map((course) => normalizeCourse(course, config.termSystem))
            : [];
          return {
            id: isNonEmptyString(term?.id) ? term.id : generateId(),
            name: termName,
            year: termYear,
            courses,
          };
        })
      : createInitialYears(fallbackStart, config.termSystem, 1)[0].terms;

    return {
      id: isNonEmptyString(year?.id) ? year.id : generateId(),
      name: isNonEmptyString(year?.name) ? year.name : formatYearLabel(fallbackStart),
      startYear: fallbackStart,
      endYear: Number.isFinite(Number(year?.endYear)) ? Number(year.endYear) : fallbackStart + 1,
      terms: sortTermsForSystem(normalizedTerms, config.termSystem),
    };
  });
};

const createDefaultConfig = (): PlannerConfig => {
  const currentYear = new Date().getFullYear();
  return {
    startYear: currentYear,
    classesPerTerm: 0,
    totalCredits: 0,
    termSystem: 'semester',
    planName: '',
    university: '',
    universityLogo: null,
  };
};

const sanitizeSnapshotForPlanner = (snapshot: PlannerState): PlannerState => {
  const config = snapshot.config ?? createDefaultConfig();
  const termSystem = config.termSystem;
  const normalizedRequirements =
    snapshot.distributiveRequirements?.map(normalizeDistributiveRequirement) ?? [];
  const normalizedDistributives = normalizeDistributives([
    ...(snapshot.distributives ?? []),
    ...normalizedRequirements.map((req) => req.name),
  ]);
  const normalizedPlans = snapshot.plans?.map(normalizePlan) ?? [];
  const normalizedPalette = normalizePalette(snapshot.colorPalette ?? []);
  const normalizedCourseDefaults = normalizeCourseDefaults(snapshot.courseDefaults ?? loadStoredCourseDefaults());
  const normalizedCatalog = (snapshot.courseCatalog ?? []).map((course) => normalizeCourse(course, termSystem));
  const normalizedLibraries = normalizeCourseLibraries(snapshot.courseLibraries, termSystem);
  const { courseLibraries, activeCourseLibraryId, courseCatalog } = resolveCourseLibraryState(
    normalizedLibraries,
    normalizedCatalog,
    snapshot.activeCourseLibraryId,
  );
  return {
    ...snapshot,
    courseCatalog,
    courseLibraries,
    activeCourseLibraryId,
    distributiveRequirements: normalizedRequirements,
    distributives: normalizedDistributives,
    plans: normalizedPlans,
    colorPalette: normalizedPalette,
    courseDefaults: normalizedCourseDefaults,
    years: sanitizeYears(snapshot.years, config),
  };
};

const createInitialYears = (startYear: number, termSystem: TermSystem, yearsCount = 4): AcademicYear[] => {
  const termOrder = INITIAL_TERMS[termSystem] ?? INITIAL_TERMS.semester;
  return Array.from({ length: yearsCount }, (_, index) => {
    const academicStartYear = startYear + index;
    return {
      id: generateId(),
      name: formatYearLabel(academicStartYear),
      startYear: academicStartYear,
      endYear: academicStartYear + 1,
      terms: termOrder.map((name) => createTerm(name, academicStartYear)),
    };
  });
};

const ensureDefaultTermsForReset = (
  terms: Term[] | undefined,
  academicStartYear: number,
  termSystem: TermSystem,
): Term[] => {
  const defaultTerms = INITIAL_TERMS[termSystem] ?? INITIAL_TERMS.semester;
  const primaryTermName = defaultTerms[0] ?? 'Fall';
  const normalizedExisting = Array.isArray(terms)
    ? terms.map((term) => {
        const name = normalizeTermNameForSystem(term?.name, termSystem, primaryTermName);
        const termYear = Number.isFinite(Number(term?.year))
          ? Number(term.year)
          : getCalendarYearForTerm(academicStartYear, name);
        return {
          ...term,
          name,
          year: termYear,
          courses: [],
        };
      })
    : [];

  const termByName = new Map<TermName, Term>();
  normalizedExisting.forEach((term) => {
    termByName.set(term.name, term);
  });

  defaultTerms.forEach((name) => {
    if (!termByName.has(name)) {
      termByName.set(name, createTerm(name, academicStartYear));
    }
  });

  return sortTermsForSystem(Array.from(termByName.values()), termSystem);
};

const rebuildYearsForReset = (
  existingYears: AcademicYear[],
  config: PlannerConfig,
  options?: { preserveUnmatched?: boolean },
): AcademicYear[] => {
  const baseYears = createInitialYears(config.startYear, config.termSystem);
  const targetCount = Math.max(existingYears.length, baseYears.length);
  const templates = createInitialYears(config.startYear, config.termSystem, targetCount);
  const yearByStart = new Map<number, AcademicYear>();

  existingYears.forEach((year) => {
    if (!year) return;
    const startYear = Number(year.startYear);
    if (Number.isFinite(startYear)) {
      yearByStart.set(startYear, year);
    }
  });

  const rebuilt = templates.map((template, index) => {
    const existing = yearByStart.get(template.startYear);
    const terms = ensureDefaultTermsForReset(existing?.terms, template.startYear, config.termSystem);

    return {
      ...template,
      ...(existing ?? {}),
      id: existing?.id ?? existingYears[index]?.id ?? template.id,
      name: isNonEmptyString(existing?.name) ? existing.name : template.name,
      startYear: template.startYear,
      endYear: Number.isFinite(Number(existing?.endYear)) ? Number(existing?.endYear) : template.endYear,
      terms,
    };
  });

  const coveredYears = new Set(rebuilt.map((year) => year.startYear));
  const extraYears = existingYears
    .filter((year) => Number.isFinite(Number(year.startYear)) && !coveredYears.has(Number(year.startYear)))
    .map((year) => {
      const startYear = Number(year.startYear);
      const endYear = Number.isFinite(Number(year.endYear)) ? Number(year.endYear) : startYear + 1;
      return {
        ...year,
        name: isNonEmptyString(year.name) ? year.name : formatYearLabel(startYear),
        startYear,
        endYear,
        terms: ensureDefaultTermsForReset(year.terms, startYear, config.termSystem),
      };
    });

  const includeExtras = options?.preserveUnmatched !== false;
  const combined = includeExtras ? [...rebuilt, ...extraYears] : rebuilt;
  return combined.sort((a, b) => a.startYear - b.startYear);
};

type PlannerMeta = { degreeName?: string; university?: string; universityLogo?: string | null };

const createPlannerState = (
  config: PlannerConfig | null,
  options?: {
    courseCatalog?: Course[];
    courseLibraries?: CourseLibrary[];
    activeCourseLibraryId?: string | null;
    distributives?: string[];
    distributiveRequirements?: DistributiveRequirement[];
    plans?: PlannerPlan[];
    meta?: PlannerMeta;
    years?: AcademicYear[];
    colorPalette?: string[];
    courseDefaults?: CourseDefaults;
  },
): PlannerState => {
  const defaults = createDefaultConfig();
  const effectiveConfig = config ? { ...defaults, ...config } : defaults;
  const normalizedConfig: PlannerConfig = {
    ...effectiveConfig,
    universityLogo: effectiveConfig.universityLogo ?? null,
  };
  const { startYear, totalCredits, termSystem, planName, university, universityLogo } = normalizedConfig;
  const fallbackCatalog = options?.courseCatalog?.map((course) => normalizeCourse(course, termSystem)) ?? loadStoredCourses();
  const normalizedCourseLibraries = options?.courseLibraries?.length
    ? options.courseLibraries.map((library) => normalizeCourseLibrary(library, termSystem))
    : loadStoredCourseLibraries(termSystem);
  const desiredActiveLibraryId = options?.activeCourseLibraryId ?? loadStoredActiveCourseLibraryId();
  const {
    courseCatalog,
    courseLibraries,
    activeCourseLibraryId,
  } = resolveCourseLibraryState(normalizedCourseLibraries, fallbackCatalog, desiredActiveLibraryId ?? undefined);
  const distributiveRequirements =
    options?.distributiveRequirements?.map(normalizeDistributiveRequirement) ??
    loadStoredDistributiveRequirements();
  const distributives = normalizeDistributives([
    ...(options?.distributives ?? loadStoredDistributives()),
    ...distributiveRequirements.map((req) => req.name),
  ]);
  const plans = options?.plans?.map(normalizePlan) ?? [];
  const years = sanitizeYears(options?.years ?? loadStoredYears(), effectiveConfig);
  const colorPalette = normalizePalette(options?.colorPalette ?? loadStoredPalette());
  const courseDefaults = normalizeCourseDefaults(options?.courseDefaults ?? loadStoredCourseDefaults());

  return {
    degreeName: options?.meta?.degreeName ?? planName,
    university: options?.meta?.university ?? university,
    universityLogo: options?.meta?.universityLogo ?? universityLogo ?? null,
    classYear: startYear + 4,
    years,
    requirements: {
      totalCredits,
      majorCore: 48,
      genEd: 30,
    },
    courseCatalog,
    courseLibraries,
    activeCourseLibraryId,
    distributives,
    distributiveRequirements,
    plans,
    colorPalette,
    courseDefaults,
    config: normalizedConfig,
  };
};

const buildInitialPlanner = () => {
  const storedShareMeta = loadShareMetaMap();
  const storedProfiles = loadStoredPlanProfiles();
  if (storedProfiles.profiles.length > 0) {
    const profileSnapshots = new Map<string, PlannerState>();
    storedProfiles.profiles.forEach((profile) => {
      profileSnapshots.set(profile.id, sanitizeSnapshotForPlanner(profile.snapshot));
    });
    const activeId = profileSnapshots.has(storedProfiles.activeId)
      ? storedProfiles.activeId
      : storedProfiles.profiles[0]?.id ?? '';
    const fallbackState =
      profileSnapshots.get(activeId) ??
      createPlannerState(loadStoredConfig(), {
        courseCatalog: loadStoredCourses(),
        distributives: loadStoredDistributives(),
        distributiveRequirements: loadStoredDistributiveRequirements(),
        plans: loadStoredPlans(),
        years: sanitizeYears(loadStoredYears(), createDefaultConfig()),
      });

    const planProfilesWithShare = storedProfiles.profiles.map(({ id, name, shareId, shareLinkAccess, shareOwnerId }) => {
      const normalizedShare = normalizeShareMeta({
        shareId: shareId ?? storedShareMeta[id]?.shareId,
        linkAccess: shareLinkAccess ?? storedShareMeta[id]?.linkAccess,
        ownerId: shareOwnerId ?? storedShareMeta[id]?.ownerId,
      });
      return {
        id,
        name,
        shareId: normalizedShare?.shareId ?? null,
        shareLinkAccess: normalizedShare?.linkAccess,
        shareOwnerId: normalizedShare?.ownerId ?? null,
      };
    });

    return {
      state: clonePlannerState(fallbackState),
      hasConfig: Boolean(fallbackState.config),
      planProfiles: planProfilesWithShare,
      activePlanProfileId: activeId || storedProfiles.profiles[0]?.id || '',
      profileSnapshots,
      shareMeta: planProfilesWithShare.reduce<Record<string, PlanShareMeta>>((acc, profile) => {
        acc[profile.id] = {
          shareId: profile.shareId ?? null,
          linkAccess: profile.shareLinkAccess,
          ownerId: profile.shareOwnerId,
        };
        return acc;
      }, {}),
    };
  }

  const initialConfig = loadStoredConfig();
  const initialYears = sanitizeYears(loadStoredYears(), initialConfig ?? createDefaultConfig());
  const initialCourses = loadStoredCourses();
  const initialDistributives = loadStoredDistributives();
  const initialDistributiveRequirements = loadStoredDistributiveRequirements();
  const initialPlans = loadStoredPlans();

  const initialState = createPlannerState(initialConfig, {
    courseCatalog: initialCourses,
    distributives: initialDistributives,
    distributiveRequirements: initialDistributiveRequirements,
    plans: initialPlans,
    years: initialYears,
  });
  const profileId = generateId();
  const profileName = initialState.degreeName || initialState.config?.planName || DEFAULT_PLAN_NAME;
  const fallbackShareMeta = Object.values(storedShareMeta).find((meta): meta is PlanShareMeta => Boolean(meta));
  const initialShareMeta = storedShareMeta[profileId] ?? fallbackShareMeta ?? { shareId: null, ownerId: null };

  return {
    state: initialState,
    hasConfig: Boolean(initialConfig),
    planProfiles: [{ id: profileId, name: profileName, shareId: initialShareMeta.shareId ?? null, shareLinkAccess: initialShareMeta.linkAccess, shareOwnerId: initialShareMeta.ownerId }],
    activePlanProfileId: profileId,
    profileSnapshots: new Map<string, PlannerState>([[profileId, initialState]]),
    shareMeta: { [profileId]: initialShareMeta },
  };
};

const loadStoredConfig = (): PlannerConfig | null => {
  if (typeof window === 'undefined') return null;
  const raw = localStorage.getItem(CONFIG_STORAGE_KEY);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as Partial<PlannerConfig>;
    if (parsed.startYear == null || parsed.classesPerTerm == null || parsed.totalCredits == null) return null;
    const defaults = createDefaultConfig();
    const logo = typeof parsed.universityLogo === 'string' && parsed.universityLogo.trim().length
      ? parsed.universityLogo.trim()
      : null;
    return {
      startYear: Number(parsed.startYear),
      classesPerTerm: Number(parsed.classesPerTerm),
      totalCredits: Number(parsed.totalCredits),
      termSystem: parsed.termSystem === 'quarter' ? 'quarter' : defaults.termSystem,
      planName:
        typeof parsed.planName === 'string' && parsed.planName.trim()
          ? parsed.planName.trim()
          : defaults.planName,
      university:
        typeof parsed.university === 'string' && parsed.university.trim()
          ? parsed.university.trim()
          : defaults.university,
      universityLogo: logo,
    };
  } catch {
    return null;
  }
};

const persistConfig = (config: PlannerConfig) => {
  if (typeof window === 'undefined') return;
  localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(config));
};

type PlanProfileManagerParams = {
  initialPlanProfiles: PlanProfile[];
  initialActiveId: string;
  initialSnapshots: Map<string, PlannerState>;
  initialShareMeta: Record<string, PlanShareMeta>;
  state: PlannerState;
  setPlannerState: React.Dispatch<React.SetStateAction<PlannerState>>;
  setHasConfig: React.Dispatch<React.SetStateAction<boolean>>;
};

const usePlanProfilesManager = ({
  initialPlanProfiles,
  initialActiveId,
  initialSnapshots,
  initialShareMeta,
  state,
  setPlannerState,
  setHasConfig,
}: PlanProfileManagerParams) => {
  const shareMetaInitial: Record<string, PlanShareMeta> = {};
  initialPlanProfiles.forEach((profile) => {
    const meta = initialShareMeta[profile.id];
    if (meta) {
      shareMetaInitial[profile.id] = { shareId: meta.shareId ?? null, linkAccess: meta.linkAccess, ownerId: meta.ownerId };
    } else if (profile.shareId || profile.shareLinkAccess) {
      shareMetaInitial[profile.id] = {
        shareId: profile.shareId ?? null,
        linkAccess: profile.shareLinkAccess,
        ownerId: profile.shareOwnerId,
      };
    }
  });
  Object.entries(initialShareMeta).forEach(([id, meta]) => {
    if (!shareMetaInitial[id]) {
      shareMetaInitial[id] = { shareId: meta.shareId ?? null, linkAccess: meta.linkAccess, ownerId: meta.ownerId };
    }
  });

  const shareMetaRef = useRef<Record<string, PlanShareMeta>>(shareMetaInitial);

  const [planProfiles, setPlanProfiles] = useState<PlanProfile[]>(() =>
    initialPlanProfiles.map((profile) => ({
      ...profile,
      shareId: profile.shareId ?? shareMetaRef.current[profile.id]?.shareId ?? null,
      shareLinkAccess: profile.shareLinkAccess ?? shareMetaRef.current[profile.id]?.linkAccess,
      shareOwnerId: profile.shareOwnerId ?? shareMetaRef.current[profile.id]?.ownerId,
    })),
  );
  const [activePlanProfileId, setActivePlanProfileId] = useState<string>(initialActiveId);
  const profileSnapshotsRef = useRef<Map<string, PlannerState>>(initialSnapshots);
  const latestStateRef = useRef(state);

  useEffect(() => {
    latestStateRef.current = state;
  }, [state]);

  const persistShareMeta = useCallback(() => {
    persistShareMetaMap(shareMetaRef.current);
  }, []);

  useEffect(() => {
    persistShareMeta();
  }, [persistShareMeta]);

  const selectPlanProfile = useCallback(
    (profileId: string) => {
      if (!profileId || profileId === activePlanProfileId) return;
      const snapshot = profileSnapshotsRef.current.get(profileId);
      if (!snapshot) return;
      setActivePlanProfileId(profileId);
      setPlannerState(clonePlannerState(snapshot));
      setHasConfig(Boolean(snapshot.config));
    },
    [activePlanProfileId, setHasConfig, setPlannerState],
  );

  const createPlanProfile = useCallback(
    (name: string, options?: { fromProfileId?: string; startBlank?: boolean }) => {
      const baseProfileId = options?.fromProfileId ?? activePlanProfileId;
      const sourceSnapshot =
        profileSnapshotsRef.current.get(baseProfileId) ??
        profileSnapshotsRef.current.get(activePlanProfileId) ??
        latestStateRef.current;

      const snapshotBase = clonePlannerState(sourceSnapshot);
      const snapshot = options?.startBlank ? stripScheduledCourses(snapshotBase) : snapshotBase;
      const profileName = ensureUniquePlanName(
        name || snapshot.degreeName || snapshot.config?.planName || DEFAULT_PLAN_NAME,
        planProfiles,
      );
      const newProfile: PlanProfile = { id: generateId(), name: profileName, shareId: null, shareOwnerId: null };

      profileSnapshotsRef.current.set(newProfile.id, snapshot);
      shareMetaRef.current[newProfile.id] = { shareId: null, ownerId: null };
      persistShareMeta();
      setPlanProfiles((prev) => [...prev, newProfile]);
      setActivePlanProfileId(newProfile.id);
      setPlannerState(snapshot);
      setHasConfig(Boolean(snapshot.config));
      return newProfile;
    },
    [activePlanProfileId, planProfiles, persistShareMeta, setHasConfig, setPlannerState],
  );

  const renamePlanProfile = useCallback((profileId: string, nextName: string) => {
    const normalizedName = nextName.trim();
    if (!normalizedName) return;
    setPlanProfiles((prev) => {
      const existing = prev.filter((profile) => profile.id !== profileId);
      const updatedName = ensureUniquePlanName(normalizedName, existing);
      return prev.map((profile) => (profile.id === profileId ? { ...profile, name: updatedName } : profile));
    });
  }, []);

  const setPlanShareMeta = useCallback(
    (profileId: string, meta: Partial<PlanShareMeta>) => {
      if (!profileId) return;
      const current = shareMetaRef.current[profileId] ?? { shareId: null, ownerId: null };
    const next: PlanShareMeta = {
      shareId: meta.shareId === undefined ? current.shareId ?? null : meta.shareId ?? null,
      linkAccess: meta.linkAccess === undefined ? current.linkAccess : meta.linkAccess,
      ownerId: meta.ownerId === undefined ? current.ownerId ?? null : meta.ownerId ?? null,
    };
    shareMetaRef.current = { ...shareMetaRef.current, [profileId]: next };
    persistShareMeta();
    setPlanProfiles((prev) =>
      prev.map((profile) =>
        profile.id === profileId ? { ...profile, shareId: next.shareId, shareLinkAccess: next.linkAccess, shareOwnerId: next.ownerId } : profile,
      ),
    );
    },
    [persistShareMeta],
  );

  const deletePlanProfile = useCallback(
    (profileId: string) => {
      setPlanProfiles((prev) => {
        if (prev.length <= 1) return prev;
        const remaining = prev.filter((profile) => profile.id !== profileId);
        if (remaining.length === prev.length) return prev;
        profileSnapshotsRef.current.delete(profileId);
        const nextShareMeta = { ...shareMetaRef.current };
        delete nextShareMeta[profileId];
        shareMetaRef.current = nextShareMeta;
        persistShareMeta();

        if (profileId === activePlanProfileId) {
          const nextProfile = remaining[0];
          const nextSnapshot =
            profileSnapshotsRef.current.get(nextProfile.id) ??
            profileSnapshotsRef.current.get(activePlanProfileId) ??
            latestStateRef.current;
          setPlannerState(clonePlannerState(nextSnapshot));
          setHasConfig(Boolean(nextSnapshot.config));
          setActivePlanProfileId(nextProfile.id);
        }

        return remaining;
      });
    },
    [activePlanProfileId, persistShareMeta, setHasConfig, setPlannerState],
  );

  const getCoursePlacement = useCallback(
    (course: Course | { id: string; sourceId?: string }) => {
      const sourceId = course.sourceId ?? course.id;
      if (!sourceId) return null;
      for (const year of latestStateRef.current.years) {
        for (const term of year.terms) {
          const match = term.courses.find((item) => (item.sourceId ?? item.id) === sourceId);
          if (match) {
            return {
              yearId: year.id,
              yearName: year.name,
              termId: term.id,
              termName: term.name,
              termYear: term.year,
            };
          }
        }
      }
      return null;
    },
    [],
  );

  const resetPlanProfiles = useCallback(
    (payload: {
      planProfiles: PlanProfile[];
      activePlanProfileId: string;
      profileSnapshots: Map<string, PlannerState>;
      nextState: PlannerState;
      hasConfig: boolean;
      shareMeta?: Record<string, PlanShareMeta>;
    }) => {
      profileSnapshotsRef.current = new Map(payload.profileSnapshots);
      latestStateRef.current = clonePlannerState(payload.nextState);
      shareMetaRef.current = payload.shareMeta ?? {};
      persistShareMeta();
      setPlanProfiles(payload.planProfiles);
      setActivePlanProfileId(payload.activePlanProfileId);
      setPlannerState(clonePlannerState(payload.nextState));
      setHasConfig(payload.hasConfig);
    },
    [persistShareMeta, setHasConfig, setPlannerState],
  );

  useEffect(() => {
    if (!activePlanProfileId) return;
    const activeSnapshot = clonePlannerState(state);
    profileSnapshotsRef.current.set(activePlanProfileId, activeSnapshot);

    const snapshotPayload: PlanProfileSnapshot[] = planProfiles.map((profile) => {
      const snapshot = profileSnapshotsRef.current.get(profile.id) ?? activeSnapshot;
      return { ...profile, snapshot: clonePlannerState(snapshot) };
    });

    persistPlanProfiles(activePlanProfileId, snapshotPayload);
  }, [activePlanProfileId, planProfiles, state]);

  return {
    planProfiles,
    activePlanProfileId,
    selectPlanProfile,
    createPlanProfile,
    renamePlanProfile,
    deletePlanProfile,
    getCoursePlacement,
    resetPlanProfiles,
    setPlanShareMeta,
  };
};

export const usePlanner = () => {
  const initialLoad = useMemo(() => buildInitialPlanner(), []);

  const [state, setState] = useState<PlannerState>(() => initialLoad.state);
  const [hasConfig, setHasConfig] = useState(Boolean(initialLoad.hasConfig));
  const {
    planProfiles,
    activePlanProfileId,
    selectPlanProfile,
    createPlanProfile,
    renamePlanProfile,
    deletePlanProfile,
    resetPlanProfiles,
    getCoursePlacement,
    setPlanShareMeta,
  } = usePlanProfilesManager({
    initialPlanProfiles: initialLoad.planProfiles,
    initialActiveId: initialLoad.activePlanProfileId,
    initialSnapshots: initialLoad.profileSnapshots,
    initialShareMeta: initialLoad.shareMeta ?? {},
    state,
    setPlannerState: setState,
    setHasConfig,
  });

  const clampIndex = (length: number, index?: number) => {
    if (index == null || Number.isNaN(index)) return length;
    return Math.max(0, Math.min(index, length));
  };

  const addCourseToTerm = useCallback((yearId: string, termId: string, course: Course, targetIndex?: number) => {
    setState((prev) => {
      const termSystem = prev.config?.termSystem ?? createDefaultConfig().termSystem;
      const normalizedCourse = normalizeCourse(course, termSystem);
      const validPlanIds = normalizedCourse.planIds.filter((id) => prev.plans.some((plan) => plan.id === id));
      const courseWithPlans = {
        ...normalizedCourse,
        planIds: validPlanIds,
        sourceId: normalizedCourse.sourceId ?? normalizedCourse.id,
      };

      return {
        ...prev,
        years: prev.years.map((year) =>
          year.id === yearId
            ? {
                ...year,
                terms: year.terms.map((term) =>
                  term.id === termId
                    ? (() => {
                        const insertionIndex = clampIndex(term.courses.length, targetIndex);
                        const nextCourses = [...term.courses];
                        nextCourses.splice(insertionIndex, 0, { ...courseWithPlans, id: generateId() });
                        return { ...term, courses: nextCourses };
                      })()
                    : term
                ),
              }
            : year
        ),
      };
    });
  }, []);

  useEffect(() => {
    persistJson(YEARS_STORAGE_KEY, state.years);
  }, [state.years]);

  const setCourseDefaultCredits = useCallback((credits: number) => {
    const normalized = normalizeOptionalNumber(credits, DEFAULT_COURSE_CREDITS) ?? DEFAULT_COURSE_CREDITS;
    setState((prev) => {
      const nextDefaults: CourseDefaults = { ...prev.courseDefaults, defaultCredits: normalized };
      persistCourseDefaults(nextDefaults);
      return { ...prev, courseDefaults: nextDefaults };
    });
  }, []);

  const addCourseToCatalog = useCallback((courseInput: NewCourseInput) => {
    const courseId = generateId();
    let normalizedCourse: Course | null = null;

    setState((prev) => {
      const termSystem = prev.config?.termSystem ?? createDefaultConfig().termSystem;
      normalizedCourse = normalizeCourse({ ...courseInput, id: courseId }, termSystem);
      const validPlanIds = normalizedCourse.planIds.filter((id) => prev.plans.some((plan) => plan.id === id));
      const courseWithPlans = { ...normalizedCourse, planIds: validPlanIds };
      const { libraries, activeLibraryId, activeLibraryIndex, activeLibrary } = resolveActiveLibraryContext(prev);
      const updatedCatalog = [...activeLibrary.courses, courseWithPlans];
      const updatedLibrary: CourseLibrary = { ...activeLibrary, courses: updatedCatalog };
      const updatedLibraries = libraries.map((library, index) =>
        index === activeLibraryIndex ? updatedLibrary : library,
      );
      const updatedDistributives = normalizeDistributives([...prev.distributives, ...courseWithPlans.distributives]);
      const persisted = persistCourseLibraryState(updatedLibraries, activeLibraryId);
      persistJson(DISTRIBUTIVES_STORAGE_KEY, updatedDistributives);

      return {
        ...prev,
        courseCatalog: persisted.courseCatalog,
        courseLibraries: updatedLibraries,
        activeCourseLibraryId: persisted.activeLibraryId,
        distributives: updatedDistributives,
      };
    });

    return (
      normalizedCourse ??
      normalizeCourse({ ...courseInput, id: courseId }, createDefaultConfig().termSystem)
    );
  }, []);

  const updateCourseInCatalog = useCallback((courseId: string, courseInput: NewCourseInput) => {
    setState((prev) => {
      const termSystem = prev.config?.termSystem ?? createDefaultConfig().termSystem;
      const normalizedCourse = normalizeCourse({ ...courseInput, id: courseId }, termSystem);
      const validPlanIds = normalizedCourse.planIds.filter((id) => prev.plans.some((plan) => plan.id === id));
      const courseWithPlans: Course = {
        ...normalizedCourse,
        planIds: validPlanIds,
        id: courseId,
        sourceId: normalizedCourse.sourceId ?? courseId,
      };
      const mergeCourseMetadata = (existing: Course): Course => ({
        ...existing,
        code: courseWithPlans.code,
        name: courseWithPlans.name,
        description: courseWithPlans.description,
        credits: courseWithPlans.credits,
        distributives: courseWithPlans.distributives,
        distributiveColors: courseWithPlans.distributiveColors,
        planIds: courseWithPlans.planIds,
        offeredTerms: courseWithPlans.offeredTerms,
        subject: courseWithPlans.subject,
        prerequisiteIds: courseWithPlans.prerequisiteIds,
        sourceId: existing.sourceId ?? courseWithPlans.sourceId,
      });

      const { libraries, activeLibraryId, activeLibraryIndex, activeLibrary } = resolveActiveLibraryContext(prev);
      const updatedCatalog = activeLibrary.courses.map((course) =>
        course.id === courseId ? courseWithPlans : course
      );
      const updatedLibrary: CourseLibrary = { ...activeLibrary, courses: updatedCatalog };
      const updatedLibraries = libraries.map((library, index) =>
        index === activeLibraryIndex ? updatedLibrary : library,
      );
      const updatedDistributives = normalizeDistributives([...prev.distributives, ...courseWithPlans.distributives]);

      const updatedYears = prev.years.map((year) => ({
        ...year,
        terms: year.terms.map((term) => ({
          ...term,
          courses: term.courses.map((course) => {
            const matchesSource = course.id === courseId || course.sourceId === courseId;
            const matchesLegacy = !course.sourceId && course.code === courseWithPlans.code;
            return matchesSource || matchesLegacy ? mergeCourseMetadata(course) : course;
          }),
        })),
      }));

      const persisted = persistCourseLibraryState(updatedLibraries, activeLibraryId);
      persistJson(DISTRIBUTIVES_STORAGE_KEY, updatedDistributives);

      return {
        ...prev,
        courseCatalog: persisted.courseCatalog,
        courseLibraries: updatedLibraries,
        activeCourseLibraryId: persisted.activeLibraryId,
        distributives: updatedDistributives,
        years: updatedYears,
      };
    });
  }, []);

  const removeCourseFromCatalog = useCallback((courseId: string) => {
    setState((prev) => {
      const { libraries, activeLibraryId, activeLibraryIndex, activeLibrary } = resolveActiveLibraryContext(prev);
      const updatedCatalog = activeLibrary.courses.filter((course) => course.id !== courseId);
      const cleanedCatalog = updatedCatalog.map((course) => ({
        ...course,
        prerequisiteIds: (course.prerequisiteIds ?? []).filter((id) => id !== courseId),
      }));
      const updatedLibrary: CourseLibrary = { ...activeLibrary, courses: cleanedCatalog };
      const updatedLibraries = libraries.map((library, index) =>
        index === activeLibraryIndex ? updatedLibrary : library,
      );
      const removedCourse = activeLibrary.courses.find((course) => course.id === courseId);
      const updatedYears = prev.years.map((year) => ({
        ...year,
        terms: year.terms.map((term) => ({
          ...term,
          courses: term.courses
            .filter((course) => {
              if (course.id === courseId || course.sourceId === courseId) return false;
              if (!course.sourceId && removedCourse && course.code === removedCourse.code) return false;
              return true;
            })
            .map((course) => ({
              ...course,
              prerequisiteIds: (course.prerequisiteIds ?? []).filter((id) => id !== courseId),
            })),
        })),
      }));

      const persisted = persistCourseLibraryState(updatedLibraries, activeLibraryId);

      return {
        ...prev,
        courseCatalog: persisted.courseCatalog,
        courseLibraries: updatedLibraries,
        activeCourseLibraryId: persisted.activeLibraryId,
        years: updatedYears,
      };
    });
  }, []);

  const selectCourseLibrary = useCallback((libraryId?: string) => {
    setState((prev) => {
      const hadLibraries = prev.courseLibraries.length > 0;
      const libraries = hadLibraries
        ? prev.courseLibraries
        : [
            {
              id: generateId(),
              name: DEFAULT_COURSE_LIBRARY_NAME,
              courses: prev.courseCatalog,
            },
          ];
      const target = libraries.find((library) => library.id === libraryId) ?? libraries[0];
      if (!target) return prev;
      if (hadLibraries && target.id === prev.activeCourseLibraryId) {
        return prev;
      }
      const persisted = persistCourseLibraryState(libraries, target.id);
      return {
        ...prev,
        courseLibraries: libraries,
        activeCourseLibraryId: persisted.activeLibraryId,
        courseCatalog: persisted.courseCatalog,
      };
    });
  }, []);

  const createCourseLibrary = useCallback((name?: string) => {
    let createdLibrary: CourseLibrary | null = null;
    setState((prev) => {
      const libraries = prev.courseLibraries.length
        ? prev.courseLibraries
        : [
            {
              id: generateId(),
              name: DEFAULT_COURSE_LIBRARY_NAME,
              courses: prev.courseCatalog,
            },
          ];
      const label = ensureUniqueLibraryName(name?.trim() || 'Class Library', libraries);
      createdLibrary = { id: generateId(), name: label, courses: [] };
      const nextLibraries = [...libraries, createdLibrary];
      const persisted = persistCourseLibraryState(nextLibraries, createdLibrary.id);
      return {
        ...prev,
        courseLibraries: nextLibraries,
        activeCourseLibraryId: persisted.activeLibraryId,
        courseCatalog: persisted.courseCatalog,
      };
    });
    return createdLibrary;
  }, []);

  const renameCourseLibrary = useCallback((libraryId: string, nextName: string) => {
    const normalized = nextName.trim();
    if (!normalized) return;
    setState((prev) => {
      const libraries = prev.courseLibraries.length
        ? prev.courseLibraries
        : [
            {
              id: generateId(),
              name: DEFAULT_COURSE_LIBRARY_NAME,
              courses: prev.courseCatalog,
            },
          ];
      const targetIndex = libraries.findIndex((library) => library.id === libraryId);
      if (targetIndex === -1) return prev;
      const nextLibraries = libraries.map((library, index) =>
        index === targetIndex
          ? { ...library, name: ensureUniqueLibraryName(normalized, libraries, library.id) }
          : library,
      );
      const persisted = persistCourseLibraryState(nextLibraries, prev.activeCourseLibraryId);
      return {
        ...prev,
        courseLibraries: nextLibraries,
        activeCourseLibraryId: persisted.activeLibraryId,
        courseCatalog: persisted.courseCatalog,
      };
    });
  }, []);

  const deleteCourseLibrary = useCallback((libraryId: string) => {
    setState((prev) => {
      const libraries = prev.courseLibraries.length
        ? prev.courseLibraries
        : [
            {
              id: generateId(),
              name: DEFAULT_COURSE_LIBRARY_NAME,
              courses: prev.courseCatalog,
            },
          ];
      if (libraries.length <= 1) return prev;
      const remaining = libraries.filter((library) => library.id !== libraryId);
      if (remaining.length === libraries.length) return prev;
      const nextActiveId = prev.activeCourseLibraryId === libraryId ? remaining[0].id : prev.activeCourseLibraryId;
      const persisted = persistCourseLibraryState(remaining, nextActiveId);
      return {
        ...prev,
        courseLibraries: remaining,
        activeCourseLibraryId: persisted.activeLibraryId,
        courseCatalog: persisted.courseCatalog,
      };
    });
  }, []);

  const addDistributive = useCallback((label: string) => {
    const normalized = label.trim();
    if (!normalized) return '';
    let nextDistributives: string[] = [];
    setState((prev) => {
      if (prev.distributives.includes(normalized)) {
        nextDistributives = prev.distributives;
        return prev;
      }
      nextDistributives = [...prev.distributives, normalized];
      persistJson(DISTRIBUTIVES_STORAGE_KEY, nextDistributives);
      return { ...prev, distributives: nextDistributives };
    });
    return normalized;
  }, []);

  const addDistributiveRequirement = useCallback(
    (input: { name: string; classesNeeded?: number | null; color?: string | null }) => {
      const normalizedName = input.name?.trim();
      if (!normalizedName) return null;

      const classesNeeded =
        Number.isFinite(Number(input.classesNeeded)) && Number(input.classesNeeded) > 0
          ? Math.max(0, Number(input.classesNeeded))
          : null;

      const inputColor =
        typeof input.color === 'string' && input.color.trim() ? input.color.trim() : getDefaultColorId(normalizedName);
      const resolvedColor = normalizeColorHex(inputColor) ?? inputColor;

      let created: DistributiveRequirement | null = null;

      setState((prev) => {
        const existing = prev.distributiveRequirements.find(
          (req) => req.name.toLowerCase() === normalizedName.toLowerCase(),
        );
        if (existing) {
          created = existing;
          return prev;
        }

        const nextRequirement: DistributiveRequirement = {
          id: generateId(),
          name: normalizedName,
          classesNeeded,
          color: resolvedColor,
        };

        const nextRequirements = [...prev.distributiveRequirements, nextRequirement];
        const nextDistributives = normalizeDistributives([...prev.distributives, normalizedName]);

        persistJson(DISTRIBUTIVE_REQUIREMENTS_STORAGE_KEY, nextRequirements);
        persistJson(DISTRIBUTIVES_STORAGE_KEY, nextDistributives);

        created = nextRequirement;
        return {
          ...prev,
          distributiveRequirements: nextRequirements,
          distributives: nextDistributives,
        };
      });

      return created;
    },
    [],
  );

  const updateDistributiveRequirement = useCallback(
    (id: string, updates: { classesNeeded?: number | null; color?: string | null }) => {
      setState((prev) => {
        let changed = false;

        const nextRequirements = prev.distributiveRequirements.map((req) => {
          if (req.id !== id) return req;

          const nextClasses =
            updates.classesNeeded === undefined
              ? req.classesNeeded
              : Number.isFinite(Number(updates.classesNeeded)) && Number(updates.classesNeeded) > 0
                ? Math.max(0, Number(updates.classesNeeded))
                : null;

          const colorInput = updates.color === undefined ? req.color : updates.color;
          const resolvedColor =
            colorInput === null
              ? null
              : normalizeColorHex(colorInput ?? undefined) ??
                (typeof colorInput === 'string' && colorInput.trim() ? colorInput.trim() : getDefaultColorId(req.name));

          changed = true;
          return {
            ...req,
            classesNeeded: nextClasses,
            color: resolvedColor,
          };
        });

        if (!changed) return prev;

        persistJson(DISTRIBUTIVE_REQUIREMENTS_STORAGE_KEY, nextRequirements);
        return { ...prev, distributiveRequirements: nextRequirements };
      });
    },
    [],
  );

  const removeDistributiveRequirement = useCallback((id: string) => {
    setState((prev) => {
      const nextRequirements = prev.distributiveRequirements.filter((req) => req.id !== id);
      if (nextRequirements.length === prev.distributiveRequirements.length) return prev;
      persistJson(DISTRIBUTIVE_REQUIREMENTS_STORAGE_KEY, nextRequirements);
      return { ...prev, distributiveRequirements: nextRequirements };
    });
  }, []);

  const addColorToPalette = useCallback((color: string) => {
    const normalized = normalizeColorHex(color);
    if (!normalized) return '';
    let added = normalized;
    setState((prev) => {
      const nextPalette = normalizePalette(prev.colorPalette ?? []);
      if (nextPalette.includes(normalized)) return prev;
      const updated = [...nextPalette, normalized];
      persistPalette(updated);
      added = normalized;
      return { ...prev, colorPalette: updated };
    });
    return added;
  }, []);

  const addPlan = useCallback((input: PlanInput) => {
    const normalizedName = input.name.trim();
    if (!normalizedName) return null;
    const type: PlanType = input.type === 'minor' ? 'minor' : 'major';
    const creditsTarget =
      Number.isFinite(Number(input.requiredCredits)) && Number(input.requiredCredits) > 0
        ? Math.max(0, Number(input.requiredCredits))
        : null;
    const classTarget =
      Number.isFinite(Number(input.classesNeeded)) && Number(input.classesNeeded) > 0
        ? Math.max(0, Number(input.classesNeeded))
        : null;
    const inputColor =
      typeof input.color === 'string' && input.color.trim() ? input.color.trim() : getDefaultColorId(normalizedName);
    const resolvedColor = normalizeColorHex(inputColor) ?? inputColor;
    let createdPlan: PlannerPlan | null = null;
    setState((prev) => {
      const existing = prev.plans.find(
        (plan) => plan.name.toLowerCase() === normalizedName.toLowerCase() && plan.type === type
      );
      if (existing) {
        createdPlan = existing;
        return prev;
      }
      const nextPlan: PlannerPlan = {
        id: generateId(),
        name: normalizedName,
        type,
        requiredCredits: creditsTarget,
        classesNeeded: classTarget,
        color: resolvedColor,
      };
      const updatedPlans = [...prev.plans, nextPlan];
      createdPlan = nextPlan;
      persistJson(PLANS_STORAGE_KEY, updatedPlans);
      return { ...prev, plans: updatedPlans };
    });
    return createdPlan;
  }, []);

  const updatePlan = useCallback((planId: string, updates: PlanInput) => {
    setState((prev) => {
      const updatedPlans = prev.plans.map((plan) => {
        if (plan.id !== planId) return plan;
        const normalizedName = updates.name?.trim() ? updates.name.trim() : plan.name;
        const type: PlanType = updates.type === 'minor' ? 'minor' : updates.type === 'major' ? 'major' : plan.type;
        const creditsTarget =
          Number.isFinite(Number(updates.requiredCredits)) && Number(updates.requiredCredits) > 0
            ? Math.max(0, Number(updates.requiredCredits))
            : null;
        const classTarget =
          Number.isFinite(Number(updates.classesNeeded)) && Number(updates.classesNeeded) > 0
            ? Math.max(0, Number(updates.classesNeeded))
            : null;
        const inputColor =
          typeof updates.color === 'string' && updates.color.trim()
            ? updates.color.trim()
            : plan.color ?? getDefaultColorId(normalizedName);
        const resolvedColor = normalizeColorHex(inputColor) ?? inputColor;
        return {
          ...plan,
          name: normalizedName,
          type,
          requiredCredits: creditsTarget,
          classesNeeded: classTarget ?? plan.classesNeeded ?? null,
          color: resolvedColor,
        };
      });
      persistJson(PLANS_STORAGE_KEY, updatedPlans);
      return { ...prev, plans: updatedPlans };
    });
  }, []);

  const moveCourseBetweenTerms = useCallback(
    ({
      sourceYearId,
      sourceTermId,
      courseId,
      targetYearId,
      targetTermId,
      targetIndex,
    }: {
      sourceYearId: string;
      sourceTermId: string;
      courseId: string;
      targetYearId: string;
      targetTermId: string;
      targetIndex?: number;
    }) => {
      if (!courseId) return;
      setState((prev) => {
        let movingCourse: Course | null = null;

        const yearsAfterRemoval = prev.years.map((year) => {
          if (year.id !== sourceYearId) return year;
          return {
            ...year,
            terms: year.terms.map((term) => {
              if (term.id !== sourceTermId) return term;
              const remaining = term.courses.filter((course) => {
                if (course.id === courseId) {
                  movingCourse = course;
                  return false;
                }
                return true;
              });
              return { ...term, courses: remaining };
            }),
          };
        });

        if (!movingCourse) {
          return prev;
        }

        const updatedYears = yearsAfterRemoval.map((year) => {
          if (year.id !== targetYearId) return year;
          return {
            ...year,
            terms: year.terms.map((term) => {
              if (term.id !== targetTermId) return term;
              const insertionIndex = clampIndex(term.courses.length, targetIndex);
              const nextCourses = [...term.courses];
              nextCourses.splice(insertionIndex, 0, movingCourse as Course);
              return { ...term, courses: nextCourses };
            }),
          };
        });

        return {
          ...prev,
          years: updatedYears,
        };
      });
    },
    [],
  );

  const updatePlanRequirement = useCallback((planId: string, requiredCredits: number) => {
    const normalizedCredits = Math.max(0, Number(requiredCredits) || 0);
    setState((prev) => {
      const updatedPlans = prev.plans.map((plan) =>
        plan.id === planId ? { ...plan, requiredCredits: normalizedCredits } : plan
      );
      persistJson(PLANS_STORAGE_KEY, updatedPlans);
      return { ...prev, plans: updatedPlans };
    });
  }, []);

  const removePlan = useCallback((planId: string) => {
    setState((prev) => {
      const updatedPlans = prev.plans.filter((plan) => plan.id !== planId);
      const updatedLibraries = (prev.courseLibraries.length ? prev.courseLibraries : [
        {
          id: generateId(),
          name: DEFAULT_COURSE_LIBRARY_NAME,
          courses: prev.courseCatalog,
        },
      ]).map((library) => ({
        ...library,
        courses: library.courses.map((course) => ({
          ...course,
          planIds: course.planIds.filter((id) => id !== planId),
        })),
      }));
      const persisted = persistCourseLibraryState(updatedLibraries, prev.activeCourseLibraryId);
      const updatedYears = prev.years.map((year) => ({
        ...year,
        terms: year.terms.map((term) => ({
          ...term,
          courses: term.courses.map((course) => ({
            ...course,
            planIds: course.planIds.filter((id) => id !== planId),
          })),
        })),
      }));
      persistJson(PLANS_STORAGE_KEY, updatedPlans);
      return {
        ...prev,
        plans: updatedPlans,
        courseCatalog: persisted.courseCatalog,
        courseLibraries: updatedLibraries,
        activeCourseLibraryId: persisted.activeLibraryId,
        years: updatedYears,
      };
    });
  }, []);

  const removeCourse = useCallback((yearId: string, termId: string, courseId: string) => {
    setState((prev) => ({
      ...prev,
      years: prev.years.map((year) =>
        year.id === yearId
          ? {
              ...year,
              terms: year.terms.map((term) =>
                term.id === termId
                  ? { ...term, courses: term.courses.filter((c) => c.id !== courseId) }
                  : term
              ),
            }
          : year
      ),
    }));
  }, []);

  const removeTerm = useCallback((yearId: string, termId: string) => {
    setState((prev) => {
      const termSystem = prev.config?.termSystem ?? createDefaultConfig().termSystem;
      return {
        ...prev,
        years: prev.years.map((year) => {
          if (year.id !== yearId) return year;
          const remainingTerms = year.terms.filter((term) => term.id !== termId);
          return {
            ...year,
            terms: sortTermsForSystem(remainingTerms, termSystem),
          };
        }),
      };
    });
  }, []);

  const addTerm = useCallback((yearId: string) => {
    setState((prev) => {
      const termSystem = prev.config?.termSystem ?? createDefaultConfig().termSystem;
      const maxTerms = termSystem === 'quarter' ? 4 : 3;
      const targetYear = prev.years.find((year) => year.id === yearId);
      if (!targetYear || targetYear.terms.length >= maxTerms) {
        return prev;
      }
      const termSequence = TERM_SEQUENCE[termSystem] ?? TERM_SEQUENCE.semester;
      const termLimit = termSystem === "quarter" ? 4 : termSequence.length;
      return {
        ...prev,
        years: prev.years.map((year) => {
          if (year.id !== yearId) return year;

          if (year.terms.length >= termLimit) {
            return year;
          }

          const existingNames = targetYear.terms.map((t) => t.name);
          const nextTermName =
            termSequence.find((name) => !existingNames.includes(name)) ?? termSequence[termSequence.length - 1];
          const academicStart = Number.isFinite(targetYear.startYear)
            ? targetYear.startYear
            : createDefaultConfig().startYear;
          const newTerm = createTerm(nextTermName, academicStart);

          return {
            ...year,
            terms: sortTermsForSystem([...year.terms, newTerm], termSystem),
          };
        }),
      };
    });
  }, []);

  const addYear = useCallback(() => {
    setState((prev) => {
      const termSystem = prev.config?.termSystem ?? createDefaultConfig().termSystem;
      const baseYear = Number.isFinite(prev.config?.startYear)
        ? Number(prev.config?.startYear)
        : createDefaultConfig().startYear;
      const lastStartYear = prev.years.length
        ? prev.years.reduce(
            (max, year) => (Number.isFinite(year.startYear) ? Math.max(max, year.startYear) : max),
            baseYear
          )
        : baseYear - 1;
      const nextStartYear = lastStartYear + 1;
      const newYear: AcademicYear = {
        id: generateId(),
        name: formatYearLabel(nextStartYear),
        startYear: nextStartYear,
        endYear: nextStartYear + 1,
        terms: INITIAL_TERMS[termSystem].map((name) => createTerm(name, nextStartYear)),
      };

      return {
        ...prev,
        years: [...prev.years, newYear],
        classYear: Math.max(prev.classYear, newYear.endYear),
      };
    });
  }, []);

  const removeYear = useCallback((yearId: string) => {
    setState((prev) => {
      if (prev.years.length <= 1) return prev;
      const remainingYears = prev.years.filter((year) => year.id !== yearId);
      if (remainingYears.length === prev.years.length || remainingYears.length === 0) return prev;
      const maxEndYear = remainingYears.reduce((max, year) => {
        const candidate = Number.isFinite(year.endYear)
          ? Number(year.endYear)
          : Number.isFinite(year.startYear)
            ? Number(year.startYear) + 1
            : max;
        return Math.max(max, candidate);
      }, 0);

      const nextClassYear = maxEndYear > 0 ? maxEndYear : prev.classYear;

      return {
        ...prev,
        years: remainingYears,
        classYear: nextClassYear,
      };
    });
  }, []);

  const stats = useMemo(() => {
    const planProgressMap = new Map<string, { scheduled: number; total: number; scheduledCredits: number }>();
    const distributiveLookup = new Map<string, string>();
    const distributiveProgressMap = new Map<string, { scheduled: number; total: number }>();

    state.distributiveRequirements.forEach((req) => {
      distributiveLookup.set(req.name.toLowerCase(), req.id);
      distributiveProgressMap.set(req.id, { scheduled: 0, total: 0 });
    });

    state.plans.forEach((plan) => {
      planProgressMap.set(plan.id, { scheduled: 0, total: 0, scheduledCredits: 0 });
    });

    state.courseCatalog.forEach((course) => {
      course.planIds.forEach((planId) => {
        if (!planProgressMap.has(planId)) return;
        const entry = planProgressMap.get(planId);
        if (entry) {
          planProgressMap.set(planId, { ...entry, total: entry.total + 1 });
        }
      });

      course.distributives.forEach((label) => {
        const reqId = distributiveLookup.get(label.toLowerCase());
        if (!reqId) return;
        const entry = distributiveProgressMap.get(reqId);
        if (!entry) return;
        distributiveProgressMap.set(reqId, { ...entry, total: entry.total + 1 });
      });
    });

    let totalCredits = 0;

    state.years.forEach((year) => {
      year.terms.forEach((term) => {
        term.courses.forEach((course) => {
          totalCredits += course.credits;
          course.planIds.forEach((id) => {
            const entry = planProgressMap.get(id);
            if (!entry) return;
            planProgressMap.set(id, {
              ...entry,
              scheduled: entry.scheduled + 1,
              scheduledCredits: entry.scheduledCredits + course.credits,
            });
          });

          course.distributives.forEach((label) => {
            const reqId = distributiveLookup.get(label.toLowerCase());
            if (!reqId) return;
            const entry = distributiveProgressMap.get(reqId);
            if (!entry) return;
            distributiveProgressMap.set(reqId, {
              ...entry,
              scheduled: entry.scheduled + 1,
            });
          });
        });
      });
    });

    return {
      totalCredits,
      planProgress: Object.fromEntries(planProgressMap),
      distributiveProgress: Object.fromEntries(distributiveProgressMap),
    };
  }, [state.years, state.plans, state.courseCatalog, state.distributiveRequirements]);

  const getTermCredits = useCallback((yearId: string, termId: string) => {
    const year = state.years.find((y) => y.id === yearId);
    if (!year) return 0;
    const term = year.terms.find((t) => t.id === termId);
    if (!term) return 0;
    return term.courses.reduce((total, course) => total + course.credits, 0);
  }, [state.years]);

  const reset = useCallback(() => {
    setState((prev) => {
      const config = prev.config ?? loadStoredConfig() ?? createDefaultConfig();
      const restoredYears = rebuildYearsForReset(prev.years, config);
      const nextState = createPlannerState(config, {
        courseCatalog: prev.courseCatalog,
        courseLibraries: prev.courseLibraries,
        activeCourseLibraryId: prev.activeCourseLibraryId,
        distributives: prev.distributives,
        distributiveRequirements: prev.distributiveRequirements,
        plans: prev.plans,
        years: restoredYears,
        colorPalette: prev.colorPalette,
        courseDefaults: prev.courseDefaults,
        meta: {
          degreeName: prev.degreeName,
          university: prev.university,
          universityLogo: prev.universityLogo ?? prev.config?.universityLogo ?? null,
        },
      });

      const classYear = nextState.years.reduce(
        (max, year) =>
          Number.isFinite(Number(year.endYear)) ? Math.max(max, Number(year.endYear)) : max,
        config.startYear + Math.max(nextState.years.length, 4),
      );

      return { ...nextState, classYear };
    });
  }, []);

  const resetPlannerState = useCallback(() => {
    clearPlannerStorage();
    const fresh = buildInitialPlanner();
    resetPlanProfiles({
      planProfiles: fresh.planProfiles,
      activePlanProfileId: fresh.activePlanProfileId,
      profileSnapshots: fresh.profileSnapshots,
      nextState: fresh.state,
      hasConfig: Boolean(fresh.hasConfig),
      shareMeta: fresh.shareMeta ?? {},
    });
  }, [resetPlanProfiles]);

  const applySnapshot = useCallback((snapshot: PlannerState) => {
    const defaults = createDefaultConfig();
    const storedConfig = loadStoredConfig();
    const fallbackStartYear = snapshot.years?.[0]?.startYear ?? snapshot.years?.[0]?.terms?.[0]?.year ?? defaults.startYear;
    const normalizedConfig: PlannerConfig = {
      startYear: snapshot.config?.startYear ?? storedConfig?.startYear ?? fallbackStartYear,
      classesPerTerm: snapshot.config?.classesPerTerm ?? storedConfig?.classesPerTerm ?? defaults.classesPerTerm,
      totalCredits:
        snapshot.config?.totalCredits ??
        storedConfig?.totalCredits ??
        snapshot.requirements?.totalCredits ??
        defaults.totalCredits,
      termSystem: snapshot.config?.termSystem ?? storedConfig?.termSystem ?? defaults.termSystem,
      planName: snapshot.config?.planName ?? snapshot.degreeName ?? storedConfig?.planName ?? defaults.planName,
      university: snapshot.config?.university ?? snapshot.university ?? storedConfig?.university ?? defaults.university,
      universityLogo:
        snapshot.config?.universityLogo ??
        snapshot.universityLogo ??
        storedConfig?.universityLogo ??
        defaults.universityLogo ??
        null,
    };

    persistConfig(normalizedConfig);
    setHasConfig(true);

    const normalizeCatalogForSystem = (courses: Course[] | undefined | null) =>
      (courses ?? []).map((course) => normalizeCourse(course, normalizedConfig.termSystem));

    const normalizedCatalog = snapshot.courseCatalog?.length
      ? normalizeCatalogForSystem(snapshot.courseCatalog)
      : normalizeCatalogForSystem(loadStoredCourses());
    const normalizedDistributiveRequirements = snapshot.distributiveRequirements?.length
      ? snapshot.distributiveRequirements.map(normalizeDistributiveRequirement)
      : loadStoredDistributiveRequirements();
    const normalizedDistributives = snapshot.distributives?.length
      ? normalizeDistributives(snapshot.distributives)
      : loadStoredDistributives();
    const mergedDistributives = normalizeDistributives([
      ...normalizedDistributives,
      ...normalizedDistributiveRequirements.map((req) => req.name),
    ]);
    const normalizedPlans = snapshot.plans?.length ? snapshot.plans.map(normalizePlan) : loadStoredPlans();
    const normalizedPalette =
      snapshot.colorPalette?.length ? normalizePalette(snapshot.colorPalette) : loadStoredPalette();
    const normalizedCourseDefaults = snapshot.courseDefaults
      ? normalizeCourseDefaults(snapshot.courseDefaults)
      : loadStoredCourseDefaults();
    const planIdSet = new Set(normalizedPlans.map((plan) => plan.id));
    const sanitizedCatalog = normalizedCatalog.map((course) => ({
      ...course,
      planIds: course.planIds.filter((id) => planIdSet.has(id)),
    }));
    const normalizedCourseLibraries = snapshot.courseLibraries?.length
      ? snapshot.courseLibraries.map((library) => normalizeCourseLibrary(library, normalizedConfig.termSystem))
      : loadStoredCourseLibraries(normalizedConfig.termSystem);
    const libraryState = resolveCourseLibraryState(
      normalizedCourseLibraries,
      sanitizedCatalog,
      snapshot.activeCourseLibraryId ?? loadStoredActiveCourseLibraryId() ?? undefined,
    );
    const persistedLibraries = persistCourseLibraryState(
      libraryState.courseLibraries,
      libraryState.activeCourseLibraryId,
    );

    persistJson(DISTRIBUTIVE_REQUIREMENTS_STORAGE_KEY, normalizedDistributiveRequirements);
    persistJson(DISTRIBUTIVES_STORAGE_KEY, mergedDistributives);
    persistJson(PLANS_STORAGE_KEY, normalizedPlans);
    persistPalette(normalizedPalette);
    persistCourseDefaults(normalizedCourseDefaults);

    setState({
      ...snapshot,
      degreeName: snapshot.degreeName ?? normalizedConfig.planName,
      university: snapshot.university ?? normalizedConfig.university,
      universityLogo: snapshot.universityLogo ?? normalizedConfig.universityLogo ?? null,
      classYear: snapshot.classYear ?? normalizedConfig.startYear + 4,
      config: normalizedConfig,
      courseCatalog: persistedLibraries.courseCatalog,
      courseLibraries: libraryState.courseLibraries,
      activeCourseLibraryId: persistedLibraries.activeLibraryId,
      distributiveRequirements: normalizedDistributiveRequirements,
      distributives: mergedDistributives,
      plans: normalizedPlans,
      colorPalette: normalizedPalette,
      courseDefaults: normalizedCourseDefaults,
      years: snapshot.years.map((year, index) => {
        const startYear = year.startYear ?? year.terms?.[0]?.year ?? (normalizedConfig.startYear + index);
        const defaultTermName = getTermSequenceForSystem(normalizedConfig.termSystem)[0] ?? 'Fall';
        const orderedTerms = sortTermsForSystem(
          (year.terms ?? []).map((term) => {
            const termName = normalizeTermNameForSystem(term?.name, normalizedConfig.termSystem, defaultTermName);
            const termYear = Number.isFinite(Number(term?.year))
              ? Number(term.year)
              : getCalendarYearForTerm(startYear, termName);
            return {
              ...term,
              name: termName,
              year: termYear,
              courses: term.courses?.map((course) => {
                const normalizedCourse = normalizeCourse(course, normalizedConfig.termSystem);
                return {
                  ...normalizedCourse,
                  planIds: normalizedCourse.planIds.filter((id) => planIdSet.has(id)),
                };
              }) ?? [],
            };
          }),
          normalizedConfig.termSystem
        );
        return {
          ...year,
          name: year.name || formatYearLabel(startYear),
          startYear,
          endYear: year.endYear ?? startYear + 1,
          terms: orderedTerms,
        };
      }),
    });
  }, []);

  const configurePlanner = useCallback((config: PlannerConfig) => {
    const normalizedConfig: PlannerConfig = {
      ...config,
      universityLogo: config.universityLogo ?? null,
    };
    persistConfig(normalizedConfig);
    setHasConfig(true);
    setState((prev) => {
      const previousTermSystem: TermSystem = prev.config?.termSystem ?? 'semester';
      const convertedYears =
        previousTermSystem === 'semester' && normalizedConfig.termSystem === 'quarter'
          ? convertSemesterYearsToQuarter(prev.years, normalizedConfig.startYear)
          : prev.years;
      const alignedYears = rebuildYearsForReset(convertedYears, normalizedConfig, { preserveUnmatched: false }).map(
        (year, index) => ({
          ...year,
          id: prev.years[index]?.id ?? year.id,
        }),
      );

      return createPlannerState(
        normalizedConfig,
        {
          courseCatalog: prev.courseCatalog,
          courseLibraries: prev.courseLibraries,
          activeCourseLibraryId: prev.activeCourseLibraryId,
          distributives: prev.distributives,
          distributiveRequirements: prev.distributiveRequirements,
          plans: prev.plans,
          years: alignedYears,
          colorPalette: prev.colorPalette,
          courseDefaults: prev.courseDefaults,
          meta: {
            degreeName: normalizedConfig.planName,
            university: normalizedConfig.university,
            universityLogo: normalizedConfig.universityLogo ?? prev.universityLogo ?? null,
          },
        },
      );
    });
  }, []);

  return {
    state,
    courseLibraries: state.courseLibraries,
    activeCourseLibraryId: state.activeCourseLibraryId,
    planProfiles,
    activePlanProfileId,
    getCoursePlacement,
    addCourseToTerm,
    moveCourseBetweenTerms,
    addCourseToCatalog,
    updateCourseInCatalog,
    removeCourseFromCatalog,
    selectCourseLibrary,
    createCourseLibrary,
    renameCourseLibrary,
    deleteCourseLibrary,
    setCourseDefaultCredits,
    createPlanProfile,
    selectPlanProfile,
    renamePlanProfile,
    deletePlanProfile,
    addDistributive,
    addDistributiveRequirement,
    updateDistributiveRequirement,
    removeDistributiveRequirement,
    addPlan,
    updatePlan,
    removePlan,
    removeCourse,
    removeTerm,
    addTerm,
    addYear,
    removeYear,
    getTermCredits,
    stats,
    colorPalette: state.colorPalette,
    addColorToPalette,
    reset,
    resetPlannerState,
    applySnapshot,
    configurePlanner,
    hasConfig,
    setPlanShareMeta,
  };
};
