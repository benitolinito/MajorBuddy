import { AcademicYear, PlannerPlan } from '@/types/planner';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { utils as xlsxUtils, writeFileXLSX } from 'xlsx';

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

export const triggerPdfDownload = (rows: ScheduleRow[], fileName: string) => {
  if (typeof window === 'undefined') return;

  const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });

  autoTable(doc, {
    styles: { fontSize: 9, cellPadding: 6 },
    headStyles: { fillColor: [0, 0, 0], textColor: [255, 255, 255] },
    columnStyles: {
      0: { cellWidth: 80 },
      1: { cellWidth: 80 },
      2: { cellWidth: 90 },
      3: { cellWidth: 170 },
      4: { cellWidth: 60, halign: 'center' },
      5: { cellWidth: 120 },
      6: { cellWidth: 110 },
    },
    head: [['Academic Year', 'Term', 'Course Code', 'Course Name', 'Credits', 'Plans', 'Distributives']],
    body: rows.map((row) => [
      row.academicYear,
      row.termLabel,
      row.courseCode === '—' ? '' : row.courseCode,
      row.courseName,
      row.credits === '' ? '—' : row.credits,
      row.plans || '—',
      row.distributives || '—',
    ]),
    foot: rows.length
      ? undefined
      : [['', '', '', 'No courses planned yet', '', '', '']],
    margin: { left: 36, right: 36, top: 48, bottom: 32 },
    didDrawPage: (data) => {
      const title = 'Plan Export';
      const subtitle = fileName;
      doc.setFontSize(14);
      doc.text(title, data.settings.margin.left, 28);
      doc.setFontSize(10);
      doc.setTextColor(100);
      doc.text(subtitle, data.settings.margin.left, 42);
    },
  });

  doc.save(`${fileName}.pdf`);
};

export const triggerXlsxDownload = (rows: ScheduleRow[], fileName: string) => {
  if (typeof window === 'undefined') return;

  const header = ['Academic Year', 'Term', 'Course Code', 'Course Name', 'Credits', 'Plans', 'Distributives'];
  const data = rows.map((row) => [
    row.academicYear,
    row.termLabel,
    row.courseCode === '—' ? '' : row.courseCode,
    row.courseName,
    row.credits === '' ? '' : row.credits,
    row.plans,
    row.distributives,
  ]);

  const worksheet = xlsxUtils.aoa_to_sheet([header, ...data]);
  const workbook = xlsxUtils.book_new();
  xlsxUtils.book_append_sheet(workbook, worksheet, 'Schedule');

  writeFileXLSX(workbook, `${fileName}.xlsx`);
};
