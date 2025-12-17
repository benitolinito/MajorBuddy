import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import {
  PlannerState,
  AcademicYear,
  Course,
  PlannerConfig,
  Term,
  TermName,
  TermSystem,
  PlannerPlan,
  PlanType,
  NewCourseInput,
  PlanProfile,
  PlanInput,
} from '@/types/planner';
import { getDefaultColorId } from '@/lib/tagColors';

const generateId = () => Math.random().toString(36).substring(2, 9);
const CONFIG_STORAGE_KEY = 'plannerSetup';
const COURSE_STORAGE_KEY = 'plannerCourseCatalog';
const DISTRIBUTIVES_STORAGE_KEY = 'plannerDistributives';
const PLANS_STORAGE_KEY = 'plannerPlans';
const YEARS_STORAGE_KEY = 'plannerAcademicYears';
const PLAN_PROFILES_STORAGE_KEY = 'plannerPlanProfiles';
const DEFAULT_MAJOR_CREDITS = 48;
const DEFAULT_MINOR_CREDITS = 24;

const persistJson = (key: string, value: unknown) => {
  if (typeof window === 'undefined') return;
  localStorage.setItem(key, JSON.stringify(value));
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

const normalizeOptionalNumber = (value: unknown, fallback: number | null = null) => {
  if (value === null || value === undefined || value === '') return fallback;
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return fallback;
  return Math.max(0, numeric);
};

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

const normalizeCourse = (value: unknown): Course => {
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
  return {
    id: isNonEmptyString(course.id) ? course.id : generateId(),
    sourceId,
    code: isNonEmptyString(course.code) ? course.code.trim() : 'NEW-000',
    name: isNonEmptyString(course.name) ? course.name.trim() : 'Untitled course',
    description: typeof course.description === 'string' ? course.description : undefined,
    credits: Number.isFinite(Number(course.credits)) ? Number(course.credits) : 0,
    distributives,
    planIds,
  };
};

const loadStoredCourses = (): Course[] => {
  const raw = loadJson<unknown>(COURSE_STORAGE_KEY, []);
  if (!Array.isArray(raw)) return [];
  return raw.map(normalizeCourse);
};

const loadStoredDistributives = (): string[] => normalizeDistributives(loadJson(DISTRIBUTIVES_STORAGE_KEY, []));

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

const normalizeProfileName = (name: string, existing: PlanProfile[]): string => {
  const fallback = name.trim() || 'My plan';
  const existingNames = new Set(existing.map((profile) => profile.name.toLowerCase()));
  if (!existingNames.has(fallback.toLowerCase())) return fallback;
  let suffix = 2;
  let candidate = `${fallback} ${suffix}`;
  while (existingNames.has(candidate.toLowerCase())) {
    suffix += 1;
    candidate = `${fallback} ${suffix}`;
  }
  return candidate;
};

const loadStoredPlanProfiles = (): { activeId: string; profiles: PlanProfileSnapshot[] } => {
  const fallback = { activeId: '', profiles: [] as PlanProfileSnapshot[] };
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
          const name = isNonEmptyString(snapshotEntry.name) ? snapshotEntry.name : 'My plan';
          return {
            id,
            name,
            snapshot: snapshotEntry.snapshot as PlannerState,
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

const sortTermsForSystem = (terms: Term[], termSystem: TermSystem) => {
  const termSequence = TERM_SEQUENCE[termSystem] ?? TERM_SEQUENCE.semester;
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

  const defaultTermName = TERM_SEQUENCE[config.termSystem][0] ?? 'Fall';

  return provided.map((year, index) => {
    const fallbackStart = Number.isFinite(Number(year?.startYear)) ? Number(year?.startYear) : config.startYear + index;
    const normalizedTerms = Array.isArray(year?.terms) && year.terms.length
      ? year.terms.map((term) => {
          const termName = isTermName(term?.name) ? term.name : defaultTermName;
          const termYear = Number.isFinite(Number(term?.year))
            ? Number(term.year)
            : getCalendarYearForTerm(fallbackStart, termName);
          const courses = Array.isArray(term?.courses)
            ? term.courses.map((course) => normalizeCourse(course))
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

type PlannerMeta = { degreeName?: string; university?: string };

const createPlannerState = (
  config: PlannerConfig | null,
  options?: {
    courseCatalog?: Course[];
    distributives?: string[];
    plans?: PlannerPlan[];
    meta?: PlannerMeta;
    years?: AcademicYear[];
  },
): PlannerState => {
  const defaults = createDefaultConfig();
  const effectiveConfig = config ? { ...defaults, ...config } : defaults;
  const { startYear, totalCredits, termSystem, planName, university } = effectiveConfig;
  const courseCatalog = options?.courseCatalog?.map(normalizeCourse) ?? [];
  const distributives = normalizeDistributives(options?.distributives ?? []);
  const plans = options?.plans?.map(normalizePlan) ?? [];
  const years = sanitizeYears(options?.years ?? loadStoredYears(), effectiveConfig);

  return {
    degreeName: options?.meta?.degreeName ?? planName,
    university: options?.meta?.university ?? university,
    classYear: startYear + 4,
    years,
    requirements: {
      totalCredits,
      majorCore: 48,
      genEd: 30,
    },
    courseCatalog,
    distributives,
    plans,
    config: effectiveConfig,
  };
};

const buildInitialPlanner = () => {
  const storedProfiles = loadStoredPlanProfiles();
  if (storedProfiles.profiles.length > 0) {
    const profileSnapshots = new Map<string, PlannerState>();
    storedProfiles.profiles.forEach((profile) => {
      profileSnapshots.set(profile.id, profile.snapshot);
    });
    const activeId = profileSnapshots.has(storedProfiles.activeId)
      ? storedProfiles.activeId
      : storedProfiles.profiles[0]?.id ?? '';
    const fallbackState =
      profileSnapshots.get(activeId) ??
      createPlannerState(loadStoredConfig(), {
        courseCatalog: loadStoredCourses(),
        distributives: loadStoredDistributives(),
        plans: loadStoredPlans(),
        years: sanitizeYears(loadStoredYears(), createDefaultConfig()),
      });

    return {
      state: clonePlannerState(fallbackState),
      hasConfig: Boolean(fallbackState.config),
      planProfiles: storedProfiles.profiles.map(({ id, name }) => ({ id, name })),
      activePlanProfileId: activeId || storedProfiles.profiles[0]?.id || '',
      profileSnapshots,
    };
  }

  const initialConfig = loadStoredConfig();
  const initialYears = sanitizeYears(loadStoredYears(), initialConfig ?? createDefaultConfig());
  const initialCourses = loadStoredCourses();
  const initialDistributives = loadStoredDistributives();
  const initialPlans = loadStoredPlans();

  const initialState = createPlannerState(initialConfig, {
    courseCatalog: initialCourses,
    distributives: initialDistributives,
    plans: initialPlans,
    years: initialYears,
  });
  const profileId = generateId();
  const profileName = initialState.degreeName || initialState.config?.planName || 'My plan';

  return {
    state: initialState,
    hasConfig: Boolean(initialConfig),
    planProfiles: [{ id: profileId, name: profileName }],
    activePlanProfileId: profileId,
    profileSnapshots: new Map<string, PlannerState>([[profileId, initialState]]),
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
    };
  } catch {
    return null;
  }
};

const persistConfig = (config: PlannerConfig) => {
  if (typeof window === 'undefined') return;
  localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(config));
};

export const usePlanner = () => {
  const initialLoad = useMemo(() => buildInitialPlanner(), []);

  const [state, setState] = useState<PlannerState>(() => initialLoad.state);
  const [hasConfig, setHasConfig] = useState(Boolean(initialLoad.hasConfig));
  const [planProfiles, setPlanProfiles] = useState<PlanProfile[]>(initialLoad.planProfiles);
  const [activePlanProfileId, setActivePlanProfileId] = useState<string>(initialLoad.activePlanProfileId);
  const profileSnapshotsRef = useRef<Map<string, PlannerState>>(initialLoad.profileSnapshots);

  const clampIndex = (length: number, index?: number) => {
    if (index == null || Number.isNaN(index)) return length;
    return Math.max(0, Math.min(index, length));
  };

  const selectPlanProfile = useCallback(
    (profileId: string) => {
      if (!profileId || profileId === activePlanProfileId) return;
      const snapshot = profileSnapshotsRef.current.get(profileId);
      if (!snapshot) return;
      setActivePlanProfileId(profileId);
      setState(clonePlannerState(snapshot));
      setHasConfig(Boolean(snapshot.config));
    },
    [activePlanProfileId],
  );

  const createPlanProfile = useCallback(
    (name: string, options?: { fromProfileId?: string; startBlank?: boolean }) => {
      const baseProfileId = options?.fromProfileId ?? activePlanProfileId;
      const sourceSnapshot =
        profileSnapshotsRef.current.get(baseProfileId) ??
        profileSnapshotsRef.current.get(activePlanProfileId) ??
        state;

      const snapshotBase = clonePlannerState(sourceSnapshot);
      const snapshot = options?.startBlank ? stripScheduledCourses(snapshotBase) : snapshotBase;
      const profileName = normalizeProfileName(
        name || snapshot.degreeName || snapshot.config?.planName || 'My plan',
        planProfiles,
      );
      const newProfile: PlanProfile = { id: generateId(), name: profileName };

      profileSnapshotsRef.current.set(newProfile.id, snapshot);
      setPlanProfiles((prev) => [...prev, newProfile]);
      setActivePlanProfileId(newProfile.id);
      setState(snapshot);
      setHasConfig(Boolean(snapshot.config));
      return newProfile;
    },
    [activePlanProfileId, planProfiles, state],
  );

  const renamePlanProfile = useCallback((profileId: string, nextName: string) => {
    const normalizedName = nextName.trim();
    if (!normalizedName) return;
    setPlanProfiles((prev) => {
      const existing = prev.filter((profile) => profile.id !== profileId);
      const updatedName = normalizeProfileName(normalizedName, existing);
      return prev.map((profile) => (profile.id === profileId ? { ...profile, name: updatedName } : profile));
    });
  }, []);

  const deletePlanProfile = useCallback(
    (profileId: string) => {
      setPlanProfiles((prev) => {
        if (prev.length <= 1) return prev;
        const remaining = prev.filter((profile) => profile.id !== profileId);
        if (remaining.length === prev.length) return prev;
        profileSnapshotsRef.current.delete(profileId);

        if (profileId === activePlanProfileId) {
          const nextProfile = remaining[0];
          const nextSnapshot =
            profileSnapshotsRef.current.get(nextProfile.id) ??
            profileSnapshotsRef.current.get(activePlanProfileId) ??
            state;
          setState(clonePlannerState(nextSnapshot));
          setHasConfig(Boolean(nextSnapshot.config));
          setActivePlanProfileId(nextProfile.id);
        }

        return remaining;
      });
    },
    [activePlanProfileId, state],
  );

  const addCourseToTerm = useCallback((yearId: string, termId: string, course: Course, targetIndex?: number) => {
    const normalizedCourse = normalizeCourse(course);
    setState((prev) => {
      const validPlanIds = normalizedCourse.planIds.filter((id) => prev.plans.some((plan) => plan.id === id));
      const courseWithPlans = {
        ...normalizedCourse,
        planIds: validPlanIds,
        sourceId: normalizedCourse.sourceId ?? normalizedCourse.id,
      };
      const scheduledCourse: Course = {
        ...courseWithPlans,
        id: generateId(),
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

  useEffect(() => {
    if (!activePlanProfileId) return;
    profileSnapshotsRef.current.set(activePlanProfileId, clonePlannerState(state));
    const profilesWithSnapshots = planProfiles
      .map((profile) => {
        const snapshot = profileSnapshotsRef.current.get(profile.id);
        if (!snapshot) return null;
        return { ...profile, snapshot };
      })
      .filter(Boolean) as PlanProfileSnapshot[];
    persistPlanProfiles(activePlanProfileId, profilesWithSnapshots);
  }, [activePlanProfileId, planProfiles, state]);

  const addCourseToCatalog = useCallback((courseInput: NewCourseInput) => {
    const normalizedCourse = normalizeCourse({ ...courseInput, id: generateId() });
    setState((prev) => {
      const validPlanIds = normalizedCourse.planIds.filter((id) => prev.plans.some((plan) => plan.id === id));
      const courseWithPlans = { ...normalizedCourse, planIds: validPlanIds };
      const updatedCatalog = [...prev.courseCatalog, courseWithPlans];
      const updatedDistributives = normalizeDistributives([...prev.distributives, ...courseWithPlans.distributives]);
      persistJson(COURSE_STORAGE_KEY, updatedCatalog);
      persistJson(DISTRIBUTIVES_STORAGE_KEY, updatedDistributives);

      return {
        ...prev,
        courseCatalog: updatedCatalog,
        distributives: updatedDistributives,
      };
    });
    return normalizedCourse;
  }, []);

  const updateCourseInCatalog = useCallback((courseId: string, courseInput: NewCourseInput) => {
    setState((prev) => {
      const normalizedCourse = normalizeCourse({ ...courseInput, id: courseId });
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
        planIds: courseWithPlans.planIds,
        sourceId: existing.sourceId ?? courseWithPlans.sourceId,
      });

      const updatedCatalog = prev.courseCatalog.map((course) =>
        course.id === courseId ? courseWithPlans : course
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

      persistJson(COURSE_STORAGE_KEY, updatedCatalog);
      persistJson(DISTRIBUTIVES_STORAGE_KEY, updatedDistributives);

      return {
        ...prev,
        courseCatalog: updatedCatalog,
        distributives: updatedDistributives,
        years: updatedYears,
      };
    });
  }, []);

  const removeCourseFromCatalog = useCallback((courseId: string) => {
    setState((prev) => {
      const updatedCatalog = prev.courseCatalog.filter((course) => course.id !== courseId);
      const removedCourse = prev.courseCatalog.find((course) => course.id === courseId);
      const updatedYears = prev.years.map((year) => ({
        ...year,
        terms: year.terms.map((term) => ({
          ...term,
          courses: term.courses.filter((course) => {
            if (course.id === courseId || course.sourceId === courseId) return false;
            if (!course.sourceId && removedCourse && course.code === removedCourse.code) return false;
            return true;
          }),
        })),
      }));

      persistJson(COURSE_STORAGE_KEY, updatedCatalog);

      return {
        ...prev,
        courseCatalog: updatedCatalog,
        years: updatedYears,
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
    const resolvedColor =
      typeof input.color === 'string' && input.color.trim() ? input.color.trim() : getDefaultColorId(normalizedName);
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
      const updatedCatalog = prev.courseCatalog.map((course) => ({
        ...course,
        planIds: course.planIds.filter((id) => id !== planId),
      }));
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
      persistJson(COURSE_STORAGE_KEY, updatedCatalog);
      return {
        ...prev,
        plans: updatedPlans,
        courseCatalog: updatedCatalog,
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
      const termSequence = TERM_SEQUENCE[termSystem] ?? TERM_SEQUENCE.semester;
      return {
        ...prev,
        years: prev.years.map((year) => {
          if (year.id !== yearId) return year;

          const existingNames = year.terms.map((t) => t.name);
          const nextTermName =
            termSequence.find((name) => !existingNames.includes(name)) ?? termSequence[termSequence.length - 1];
          const academicStart = Number.isFinite(year.startYear) ? year.startYear : createDefaultConfig().startYear;
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
    const planProgressMap = new Map<string, { scheduled: number; total: number }>();
    state.plans.forEach((plan) => {
      planProgressMap.set(plan.id, { scheduled: 0, total: 0 });
    });

    state.courseCatalog.forEach((course) => {
      course.planIds.forEach((planId) => {
        if (!planProgressMap.has(planId)) return;
        const entry = planProgressMap.get(planId);
        if (entry) {
          planProgressMap.set(planId, { ...entry, total: entry.total + 1 });
        }
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
            planProgressMap.set(id, { ...entry, scheduled: entry.scheduled + 1 });
          });
        });
      });
    });

    return { totalCredits, planProgress: Object.fromEntries(planProgressMap) };
  }, [state.years, state.plans, state.courseCatalog]);

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
      const clearedYears = prev.years.map((year) => ({
        ...year,
        terms: year.terms.map((term) => ({
          ...term,
          courses: [],
        })),
      }));

      return createPlannerState(config, {
        courseCatalog: prev.courseCatalog,
        distributives: prev.distributives,
        plans: prev.plans,
        years: clearedYears,
        meta: {
          degreeName: prev.degreeName,
          university: prev.university,
        },
      });
    });
  }, []);

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
    };

    persistConfig(normalizedConfig);
    setHasConfig(true);

    const normalizedCatalog = snapshot.courseCatalog?.length
      ? snapshot.courseCatalog.map(normalizeCourse)
      : loadStoredCourses();
    const normalizedDistributives = snapshot.distributives?.length
      ? normalizeDistributives(snapshot.distributives)
      : loadStoredDistributives();
    const normalizedPlans = snapshot.plans?.length ? snapshot.plans.map(normalizePlan) : loadStoredPlans();
    const planIdSet = new Set(normalizedPlans.map((plan) => plan.id));
    const sanitizedCatalog = normalizedCatalog.map((course) => ({
      ...course,
      planIds: course.planIds.filter((id) => planIdSet.has(id)),
    }));

    persistJson(COURSE_STORAGE_KEY, sanitizedCatalog);
    persistJson(DISTRIBUTIVES_STORAGE_KEY, normalizedDistributives);
    persistJson(PLANS_STORAGE_KEY, normalizedPlans);

    setState({
      ...snapshot,
      degreeName: snapshot.degreeName ?? normalizedConfig.planName,
      university: snapshot.university ?? normalizedConfig.university,
      classYear: snapshot.classYear ?? normalizedConfig.startYear + 4,
      config: normalizedConfig,
      courseCatalog: sanitizedCatalog,
      distributives: normalizedDistributives,
      plans: normalizedPlans,
      years: snapshot.years.map((year, index) => {
        const startYear = year.startYear ?? year.terms?.[0]?.year ?? (normalizedConfig.startYear + index);
        const orderedTerms = sortTermsForSystem(
          (year.terms ?? []).map((term) => ({
            ...term,
            courses: term.courses?.map((course) => {
              const normalizedCourse = normalizeCourse(course);
              return {
                ...normalizedCourse,
                planIds: normalizedCourse.planIds.filter((id) => planIdSet.has(id)),
              };
            }) ?? [],
          })),
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
    persistConfig(config);
    setHasConfig(true);
    setState((prev) =>
      createPlannerState(
        config,
        {
          courseCatalog: prev.courseCatalog,
          distributives: prev.distributives,
          plans: prev.plans,
          years: prev.years,
          meta: { degreeName: config.planName, university: config.university },
        },
      )
    );
  }, []);

  return {
    state,
    planProfiles,
    activePlanProfileId,
    addCourseToTerm,
    moveCourseBetweenTerms,
    addCourseToCatalog,
    updateCourseInCatalog,
    removeCourseFromCatalog,
    createPlanProfile,
    selectPlanProfile,
    renamePlanProfile,
    deletePlanProfile,
    addDistributive,
    addPlan,
    removePlan,
    removeCourse,
    removeTerm,
    addTerm,
    addYear,
    removeYear,
    getTermCredits,
    stats,
    reset,
    applySnapshot,
    configurePlanner,
    hasConfig,
  };
};
