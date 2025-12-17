import { useState, useCallback, useMemo } from 'react';
import { PlannerState, AcademicYear, Course, PlannerConfig, TermName, TermSystem } from '@/types/planner';

const generateId = () => Math.random().toString(36).substring(2, 9);
const CONFIG_STORAGE_KEY = 'plannerSetup';

const COURSE_CATALOG: Course[] = [
  { id: 'cs101', code: 'CS101', name: 'Intro to Computer Science', credits: 4, categories: ['Major', 'Core'] },
  { id: 'math101', code: 'MATH101', name: 'Calculus I', credits: 4, categories: ['Major', 'Math'] },
  { id: 'eng101', code: 'ENG101', name: 'English Composition', credits: 3, categories: ['GenEd'] },
  { id: 'hist101', code: 'HIST101', name: 'World History', credits: 3, categories: ['GenEd'] },
  { id: 'cs102', code: 'CS102', name: 'Data Structures', credits: 4, categories: ['Major', 'Core'] },
  { id: 'math102', code: 'MATH102', name: 'Calculus II', credits: 4, categories: ['Major', 'Math'] },
  { id: 'phys101', code: 'PHYS101', name: 'General Physics I', credits: 4, categories: ['Science'] },
  { id: 'cs201', code: 'CS201', name: 'Algorithms', credits: 4, categories: ['Major', 'Core'] },
  { id: 'cs202', code: 'CS202', name: 'Computer Architecture', credits: 4, categories: ['Major'] },
  { id: 'art101', code: 'ART101', name: 'Art History', credits: 3, categories: ['Elective'] },
  { id: 'cs301', code: 'CS301', name: 'Operating Systems', credits: 4, categories: ['Major', 'Core'] },
  { id: 'cs302', code: 'CS302', name: 'Database Systems', credits: 3, categories: ['Major', 'Elective'] },
];

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

const createPlannerState = (
  config: PlannerConfig | null,
  courseCatalog: Course[] = COURSE_CATALOG,
  meta?: { degreeName?: string; university?: string },
): PlannerState => {
  const defaults = createDefaultConfig();
  const effectiveConfig = config ? { ...defaults, ...config } : defaults;
  const { startYear, totalCredits, termSystem, planName, university } = effectiveConfig;

  return {
    degreeName: meta?.degreeName ?? planName,
    university: meta?.university ?? university,
    classYear: startYear + 4,
    years: createInitialYears(startYear, termSystem),
    requirements: {
      totalCredits,
      majorCore: 48,
      genEd: 30,
    },
    courseCatalog,
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
  const [state, setState] = useState<PlannerState>(() => createPlannerState(initialConfig));
  const [hasConfig, setHasConfig] = useState(Boolean(initialConfig));

  const addCourseToTerm = useCallback((yearId: string, termId: string, course: Course) => {
    setState((prev) => ({
      ...prev,
      years: prev.years.map((year) =>
        year.id === yearId
          ? {
              ...year,
              terms: year.terms.map((term) =>
                term.id === termId
                  ? { ...term, courses: [...term.courses, { ...course, id: generateId() }] }
                  : term
              ),
            }
          : year
      ),
    }));
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
    let totalCredits = 0;
    let majorCore = 0;
    let genEd = 0;

    state.years.forEach((year) => {
      year.terms.forEach((term) => {
        term.courses.forEach((course) => {
          totalCredits += course.credits;
          if (course.categories.includes('Core') || course.categories.includes('Major')) {
            majorCore += course.credits;
          }
          if (course.categories.includes('GenEd')) {
            genEd += course.credits;
          }
        });
      });
    });

    return { totalCredits, majorCore, genEd };
  }, [state.years]);

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
        prev.courseCatalog?.length ? prev.courseCatalog : COURSE_CATALOG,
        {
          degreeName: prev.config?.planName ?? prev.degreeName,
          university: prev.config?.university ?? prev.university,
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

    setState({
      ...snapshot,
      degreeName: snapshot.degreeName ?? normalizedConfig.planName,
      university: snapshot.university ?? normalizedConfig.university,
      classYear: snapshot.classYear ?? normalizedConfig.startYear + 4,
      config: normalizedConfig,
      courseCatalog: snapshot.courseCatalog?.length ? snapshot.courseCatalog : COURSE_CATALOG,
      years: snapshot.years.map((year, index) => {
        const startYear = year.startYear ?? year.terms?.[0]?.year ?? (normalizedConfig.startYear + index);
        return {
          ...year,
          name: year.name || formatYearLabel(startYear),
          startYear,
          endYear: year.endYear ?? startYear + 1,
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
        prev.courseCatalog?.length ? prev.courseCatalog : COURSE_CATALOG,
        { degreeName: config.planName, university: config.university },
      )
    );
  }, []);

  return {
    state,
    addCourseToTerm,
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
