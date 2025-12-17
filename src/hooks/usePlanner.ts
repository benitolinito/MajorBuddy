import { useState, useCallback, useMemo } from 'react';
import { PlannerState, AcademicYear, Course, YearName, Term, CategoryName } from '@/types/planner';

const generateId = () => Math.random().toString(36).substring(2, 9);

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

const createInitialYears = (startYear: number): AcademicYear[] => {
  const yearNames: YearName[] = ['Freshman', 'Sophomore', 'Junior', 'Senior'];
  
  return yearNames.map((yearName, index) => ({
    id: generateId(),
    name: yearName,
    terms: [
      { id: generateId(), name: 'Fall', year: startYear + index, courses: [] },
      { id: generateId(), name: 'Spring', year: startYear + index + 1, courses: [] },
    ],
  }));
};

export const usePlanner = () => {
  const [state, setState] = useState<PlannerState>(() => {
    const years = createInitialYears(2024);
    
    // Add sample courses to Freshman year
    years[0].terms[0].courses = [
      { ...COURSE_CATALOG[0], id: generateId() },
      { ...COURSE_CATALOG[1], id: generateId() },
      { ...COURSE_CATALOG[2], id: generateId() },
    ];
    years[0].terms[1].courses = [
      { ...COURSE_CATALOG[4], id: generateId() },
      { ...COURSE_CATALOG[5], id: generateId() },
      { ...COURSE_CATALOG[3], id: generateId() },
    ];
    
    return {
      degreeName: 'BS Computer Science',
      university: 'University of Technology',
      classYear: 2028,
      years,
      requirements: {
        totalCredits: 120,
        majorCore: 48,
        genEd: 30,
      },
      courseCatalog: COURSE_CATALOG,
    };
  });

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
        const newYear = newTermName === 'Fall' ? (lastTerm?.year || 2024) + 1 : lastTerm?.year || 2024;
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
    setState((prev) => ({
      ...prev,
      years: createInitialYears(2024),
    }));
  }, []);

  const applySnapshot = useCallback((snapshot: PlannerState) => {
    setState({
      ...snapshot,
      courseCatalog: snapshot.courseCatalog?.length ? snapshot.courseCatalog : COURSE_CATALOG,
    });
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
  };
};
