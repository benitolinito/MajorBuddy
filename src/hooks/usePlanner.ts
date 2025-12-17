import { useState, useCallback, useMemo, useEffect } from 'react';
import {
  PlannerState,
  AcademicYear,
  Course,
  PlannerConfig,
  TermName,
  TermSystem,
  PlannerPlan,
  PlanType,
  NewCourseInput,
} from '@/types/planner';

const generateId = () => Math.random().toString(36).substring(2, 9);
const CONFIG_STORAGE_KEY = 'plannerSetup';
const COURSE_STORAGE_KEY = 'plannerCourseCatalog';
const DISTRIBUTIVES_STORAGE_KEY = 'plannerDistributives';
const PLANS_STORAGE_KEY = 'plannerPlans';
const YEARS_STORAGE_KEY = 'plannerAcademicYears';
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

const normalizePlan = (value: unknown): PlannerPlan => {
  const plan = (value ?? {}) as Record<string, unknown>;
  const type: PlanType = plan.type === 'minor' ? 'minor' : 'major';
  const defaultCredits = type === 'major' ? DEFAULT_MAJOR_CREDITS : DEFAULT_MINOR_CREDITS;
  return {
    id: isNonEmptyString(plan.id) ? plan.id : generateId(),
    name: isNonEmptyString(plan.name) ? plan.name.trim() : 'Untitled plan',
    type,
    requiredCredits: Number.isFinite(Number(plan.requiredCredits))
      ? Math.max(0, Number(plan.requiredCredits))
      : defaultCredits,
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
  return {
    id: isNonEmptyString(course.id) ? course.id : generateId(),
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
      terms: normalizedTerms,
    };
  });
};

const createDefaultConfig = (): PlannerConfig => {
  const currentYear = new Date().getFullYear();
  return {
    startYear: currentYear,
    classesPerTerm: 4,
    totalCredits: 120,
    termSystem: 'semester',
    planName: 'BS Computer Science',
    university: 'University of Technology',
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
  const initialConfig = loadStoredConfig();
  const initialYears = sanitizeYears(loadStoredYears(), initialConfig ?? createDefaultConfig());
  const initialCourses = loadStoredCourses();
  const initialDistributives = loadStoredDistributives();
  const initialPlans = loadStoredPlans();

  const [state, setState] = useState<PlannerState>(() =>
    createPlannerState(initialConfig, {
      courseCatalog: initialCourses,
      distributives: initialDistributives,
      plans: initialPlans,
      years: initialYears,
    })
  );
  const [hasConfig, setHasConfig] = useState(Boolean(initialConfig));

  const addCourseToTerm = useCallback((yearId: string, termId: string, course: Course) => {
    const normalizedCourse = normalizeCourse(course);
    setState((prev) => {
      const validPlanIds = normalizedCourse.planIds.filter((id) => prev.plans.some((plan) => plan.id === id));
      const courseWithPlans = { ...normalizedCourse, planIds: validPlanIds };
      return {
        ...prev,
        years: prev.years.map((year) =>
          year.id === yearId
            ? {
                ...year,
                terms: year.terms.map((term) =>
                  term.id === termId
                    ? { ...term, courses: [...term.courses, { ...courseWithPlans, id: generateId() }] }
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

  const addPlan = useCallback((name: string, type: PlanType = 'major', requiredCredits?: number) => {
    const normalizedName = name.trim();
    if (!normalizedName) return null;
    const creditsTarget =
      Number.isFinite(Number(requiredCredits)) && Number(requiredCredits) !== 0
        ? Math.max(0, Number(requiredCredits))
        : type === 'major'
          ? DEFAULT_MAJOR_CREDITS
          : DEFAULT_MINOR_CREDITS;
    let createdPlan: PlannerPlan | null = null;
    setState((prev) => {
      const existing = prev.plans.find(
        (plan) => plan.name.toLowerCase() === normalizedName.toLowerCase() && plan.type === type
      );
      if (existing) {
        createdPlan = existing;
        return prev;
      }
      const nextPlan: PlannerPlan = { id: generateId(), name: normalizedName, type, requiredCredits: creditsTarget };
      const updatedPlans = [...prev.plans, nextPlan];
      createdPlan = nextPlan;
      persistJson(PLANS_STORAGE_KEY, updatedPlans);
      return { ...prev, plans: updatedPlans };
    });
    return createdPlan;
  }, []);

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
            terms: [...year.terms, newTerm],
          };
        }),
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
    setState((prev) =>
      createPlannerState(
        prev.config ?? loadStoredConfig(),
        {
          courseCatalog: prev.courseCatalog,
          distributives: prev.distributives,
          plans: prev.plans,
          years: prev.years,
          meta: {
            degreeName: prev.config?.planName ?? prev.degreeName,
            university: prev.config?.university ?? prev.university,
          },
        },
      )
    );
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
        return {
          ...year,
          name: year.name || formatYearLabel(startYear),
          startYear,
          endYear: year.endYear ?? startYear + 1,
          terms: year.terms.map((term) => ({
            ...term,
            courses: term.courses?.map((course) => {
              const normalizedCourse = normalizeCourse(course);
              return {
                ...normalizedCourse,
                planIds: normalizedCourse.planIds.filter((id) => planIdSet.has(id)),
              };
            }) ?? [],
          })),
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
    addCourseToTerm,
    addCourseToCatalog,
    addDistributive,
    addPlan,
    removePlan,
    removeCourse,
    addTerm,
    getTermCredits,
    stats,
    reset,
    applySnapshot,
    configurePlanner,
    hasConfig,
  };
};
