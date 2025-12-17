export type YearName = 'Freshman' | 'Sophomore' | 'Junior' | 'Senior';

export type TermName = 'Fall' | 'Spring' | 'Summer';

export type CategoryName = 'Major' | 'Core' | 'Math' | 'GenEd' | 'Science' | 'Elective';

export interface Course {
  id: string;
  code: string;
  name: string;
  credits: number;
  categories: CategoryName[];
}

export interface Term {
  id: string;
  name: TermName;
  year: number;
  courses: Course[];
}

export interface AcademicYear {
  id: string;
  name: YearName;
  terms: Term[];
}

export interface DegreeRequirements {
  totalCredits: number;
  majorCore: number;
  genEd: number;
}

export interface PlannerState {
  degreeName: string;
  university: string;
  classYear: number;
  years: AcademicYear[];
  requirements: DegreeRequirements;
  courseCatalog: Course[];
}

export const CATEGORY_COLORS: Record<CategoryName, string> = {
  Major: 'bg-category-major',
  Core: 'bg-category-core',
  Math: 'bg-category-math',
  GenEd: 'bg-category-gened',
  Science: 'bg-category-science',
  Elective: 'bg-category-elective',
};

export const CATEGORY_TEXT_COLORS: Record<CategoryName, string> = {
  Major: 'text-category-major',
  Core: 'text-category-core',
  Math: 'text-category-math',
  GenEd: 'text-category-gened',
  Science: 'text-category-science',
  Elective: 'text-category-elective',
};