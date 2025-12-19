import { AcademicYear, PlannerPlan } from '@/types/planner';

export type ScheduleRow = {
  academicYear: string;
  termLabel: string;
  courseCode: string;
  courseName: string;
  credits: number | '';
  plans: string;
  distributives: string;
};

const escapeCsvValue = (value: string | number | '') => {
  const normalized = `${value ?? ''}`;
  if (normalized === '') return '';
  const escaped = normalized.replace(/"/g, '""');
  return /[",\n]/.test(escaped) ? `"${escaped}"` : escaped;
};

const formatCourseCell = (row: ScheduleRow) => {
  if (row.courseCode === '—') return row.courseName;
  return `\`${row.courseCode}\` ${row.courseName}`;
};

export const buildScheduleRows = (years: AcademicYear[], plans: PlannerPlan[]): ScheduleRow[] => {
  const planLookup = new Map(plans.map((plan) => [plan.id, plan.name]));
  const rows: ScheduleRow[] = [];

  years.forEach((year) => {
    year.terms.forEach((term) => {
      if (term.courses.length === 0) {
        rows.push({
          academicYear: year.name,
          termLabel: `${term.name} ${term.year}`,
          courseCode: '—',
          courseName: 'No courses planned',
          credits: '',
          plans: '',
          distributives: '',
        });
        return;
      }

      term.courses.forEach((course) => {
        rows.push({
          academicYear: year.name,
          termLabel: `${term.name} ${term.year}`,
          courseCode: course.code,
          courseName: course.name,
          credits: course.credits,
          plans: course.planIds.map((id) => planLookup.get(id) ?? 'Unlabeled').join(', '),
          distributives: course.distributives.join(', '),
        });
      });
    });
  });

  return rows;
};

export const buildMarkdownTable = (rows: ScheduleRow[]): string => {
  const header = [
    '| Year | Term | Course | Credits | Plans | Distributives |',
    '| --- | --- | --- | --- | --- | --- |',
  ].join('\n');

  const body = rows.length
    ? rows
        .map((row) => {
          const course = formatCourseCell(row);
          const credits = row.credits === '' ? '—' : row.credits;
          const plansCell = row.plans || '—';
          const distributives = row.distributives || '—';
          return `| ${row.academicYear} | ${row.termLabel} | ${course} | ${credits} | ${plansCell} | ${distributives} |`;
        })
        .join('\n')
    : '| — | — | — | — | — | — |';

  return `${header}\n${body}`;
};

export const buildCsvContent = (rows: ScheduleRow[]): string => {
  const header = 'Academic Year,Term,Course Code,Course Name,Credits,Plans,Distributives';
  const body = rows
    .map((row) =>
      [
        escapeCsvValue(row.academicYear),
        escapeCsvValue(row.termLabel),
        escapeCsvValue(row.courseCode),
        escapeCsvValue(row.courseName),
        escapeCsvValue(row.credits),
        escapeCsvValue(row.plans),
        escapeCsvValue(row.distributives),
      ].join(','),
    )
    .join('\n');

  return body ? `${header}\n${body}` : `${header}\n`;
};

export const createScheduleFileName = (degreeName: string, university: string): string => {
  const base = `${degreeName || 'schedule'}-${university || 'plan'}`;
  const safe = base.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  return safe || 'schedule-plan';
};

export const triggerCsvDownload = (csvContent: string, fileName: string) => {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${fileName}.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
};
