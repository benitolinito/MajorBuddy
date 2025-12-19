export type TermName = 'Fall' | 'Winter' | 'Spring' | 'Summer';

export type TermSystem = 'semester' | 'quarter';

export type PlanType = 'major' | 'minor';

export type ShareRole = 'viewer' | 'editor';
export type ShareLinkAccess = ShareRole | 'none';

export interface PlannerPlan {
  id: string;
  name: string;
  type: PlanType;
  requiredCredits: number | null;
  classesNeeded?: number | null;
  color?: string | null;
}

export interface Course {
  id: string;
  sourceId?: string;
  code: string;
  name: string;
  description?: string;
  credits: number;
  distributives: string[];
  distributiveColors?: Record<string, string>;
  planIds: string[];
  offeredTerms?: TermName[];
}

export interface NewCourseInput {
  code: string;
  name: string;
  description?: string;
  credits: number;
  distributives: string[];
  distributiveColors?: Record<string, string>;
  planIds: string[];
  offeredTerms?: TermName[];
}

export interface Term {
  id: string;
  name: TermName;
  year: number;
  courses: Course[];
}

export interface AcademicYear {
  id: string;
  name: string;
  startYear: number;
  endYear: number;
  terms: Term[];
}

export interface DegreeRequirements {
  totalCredits: number;
  majorCore: number;
  genEd: number;
}

export interface PlannerConfig {
  startYear: number;
  classesPerTerm: number;
  totalCredits: number;
  termSystem: TermSystem;
  planName: string;
  university: string;
}

export interface PlannerState {
  degreeName: string;
  university: string;
  classYear: number;
  years: AcademicYear[];
  requirements: DegreeRequirements;
  courseCatalog: Course[];
  distributives: string[];
  plans: PlannerPlan[];
  colorPalette: string[];
  config?: PlannerConfig;
}

export type PlanProfile = {
  id: string;
  name: string;
  shareId?: string | null;
  shareLinkAccess?: ShareLinkAccess;
};

export type CourseDropSource = {
  yearId: string;
  termId: string;
  courseId?: string;
};

export type CourseDropOptions = {
  targetIndex?: number;
  source?: CourseDropSource;
};

export type PlanInput = {
  name: string;
  type: PlanType;
  requiredCredits?: number | null;
  classesNeeded?: number | null;
  color?: string | null;
};
