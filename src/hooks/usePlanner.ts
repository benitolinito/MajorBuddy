import { useState, useCallback, useMemo } from 'react';
import { PlannerState, AcademicYear, Course, PlannerConfig } from '@/types/planner';

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

const createDefaultConfig = (): PlannerConfig => {
  const currentYear = new Date().getFullYear();
  return {
    startYear: currentYear,
    classesPerTerm: 4,
    totalCredits: 120,
  };
};

const createInitialYears = (startYear: number, yearsCount = 4): AcademicYear[] => {
  return Array.from({ length: yearsCount }, (_, index) => {
    const academicStartYear = startYear + index;
    return {
      id: generateId(),
      name: formatYearLabel(academicStartYear),
      startYear: academicStartYear,
      endYear: academicStartYear + 1,
      terms: [
        { id: generateId(), name: 'Fall', year: academicStartYear, courses: [] },
        { id: generateId(), name: 'Spring', year: academicStartYear + 1, courses: [] },
      ],
    };
  });
};

const createPlannerState = (
  config: PlannerConfig | null,
  courseCatalog: Course[] = COURSE_CATALOG,
  meta?: { degreeName?: string; university?: string },
): PlannerState => {
  const effectiveConfig = config ?? createDefaultConfig();
  const { startYear, totalCredits } = effectiveConfig;

  return {
    degreeName: meta?.degreeName ?? 'BS Computer Science',
    university: meta?.university ?? 'University of Technology',
    classYear: startYear + 4,
    years: createInitialYears(startYear),
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
    if (!parsed.startYear || !parsed.classesPerTerm || !parsed.totalCredits) return null;
    return {
      startYear: Number(parsed.startYear),
      classesPerTerm: Number(parsed.classesPerTerm),
      totalCredits: Number(parsed.totalCredits),
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
    setState((prev) => ({
      ...prev,
      years: prev.years.map((year) => {
        if (year.id !== yearId) return year;
        const lastTerm = year.terms[year.terms.length - 1];
        const newTermName = lastTerm?.name === 'Fall' ? 'Spring' : lastTerm?.name === 'Spring' ? 'Summer' : 'Fall';
        const baseYear = lastTerm?.year ?? year.startYear ?? new Date().getFullYear();
        const newYear = newTermName === 'Fall' ? baseYear + 1 : baseYear;
        return {
          ...year,
          terms: [...year.terms, { id: generateId(), name: newTermName, year: newYear, courses: [] }],
        };
      }),
    }));
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
        { degreeName: prev.degreeName, university: prev.university },
      )
    );
  }, []);

  const applySnapshot = useCallback((snapshot: PlannerState) => {
    const storedConfig = loadStoredConfig();
    const fallbackStartYear = snapshot.years?.[0]?.startYear ?? snapshot.years?.[0]?.terms?.[0]?.year ?? createDefaultConfig().startYear;
    const normalizedConfig =
      snapshot.config ??
      storedConfig ??
      {
        startYear: fallbackStartYear,
        classesPerTerm: createDefaultConfig().classesPerTerm,
        totalCredits: snapshot.requirements?.totalCredits ?? createDefaultConfig().totalCredits,
      };

    persistConfig(normalizedConfig);
    setHasConfig(true);

    setState({
      ...snapshot,
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
        { degreeName: prev.degreeName, university: prev.university },
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
