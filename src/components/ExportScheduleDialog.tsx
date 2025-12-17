import { useMemo } from "react";
import { Copy, Download } from "lucide-react";
import { AcademicYear, PlannerPlan } from "@/types/planner";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/use-toast";

type ExportScheduleDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  years: AcademicYear[];
  plans: PlannerPlan[];
  degreeName: string;
  university: string;
};

type ScheduleRow = {
  academicYear: string;
  termLabel: string;
  courseCode: string;
  courseName: string;
  credits: number | "";
  plans: string;
  distributives: string;
};

const escapeCsvValue = (value: string | number | "") => {
  const normalized = `${value ?? ""}`;
  if (normalized === "") return "";
  const escaped = normalized.replace(/"/g, '""');
  return /[",\n]/.test(escaped) ? `"${escaped}"` : escaped;
};

const formatCourseCell = (row: ScheduleRow) => {
  if (row.courseCode === "—") return row.courseName;
  return `\`${row.courseCode}\` ${row.courseName}`;
};

const createFileName = (degreeName: string, university: string) => {
  const base = `${degreeName || "schedule"}-${university || "plan"}`;
  const safe = base.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  return safe || "schedule-plan";
};

export const ExportScheduleDialog = ({
  open,
  onOpenChange,
  years,
  plans,
  degreeName,
  university,
}: ExportScheduleDialogProps) => {
  const scheduleRows = useMemo(() => {
    const planLookup = new Map(plans.map((plan) => [plan.id, plan.name]));
    const rows: ScheduleRow[] = [];

    years.forEach((year) => {
      year.terms.forEach((term) => {
        if (term.courses.length === 0) {
          rows.push({
            academicYear: year.name,
            termLabel: `${term.name} ${term.year}`,
            courseCode: "—",
            courseName: "No courses planned",
            credits: "",
            plans: "",
            distributives: "",
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
            plans: course.planIds.map((id) => planLookup.get(id) ?? "Unlabeled").join(", "),
            distributives: course.distributives.join(", "),
          });
        });
      });
    });

    return rows;
  }, [years, plans]);

  const markdownTable = useMemo(() => {
    const header = [
      "| Year | Term | Course | Credits | Plans | Distributives |",
      "| --- | --- | --- | --- | --- | --- |",
    ].join("\n");

    const rows = scheduleRows.length
      ? scheduleRows
          .map((row) => {
            const course = formatCourseCell(row);
            const credits = row.credits === "" ? "—" : row.credits;
            const plansCell = row.plans || "—";
            const distributives = row.distributives || "—";
            return `| ${row.academicYear} | ${row.termLabel} | ${course} | ${credits} | ${plansCell} | ${distributives} |`;
          })
          .join("\n")
      : "| — | — | — | — | — | — |";

    return `${header}\n${rows}`;
  }, [scheduleRows]);

  const csvContent = useMemo(() => {
    const header = "Academic Year,Term,Course Code,Course Name,Credits,Plans,Distributives";
    const body = scheduleRows
      .map((row) =>
        [
          escapeCsvValue(row.academicYear),
          escapeCsvValue(row.termLabel),
          escapeCsvValue(row.courseCode),
          escapeCsvValue(row.courseName),
          escapeCsvValue(row.credits),
          escapeCsvValue(row.plans),
          escapeCsvValue(row.distributives),
        ].join(","),
      )
      .join("\n");

    return body ? `${header}\n${body}` : `${header}\n`;
  }, [scheduleRows]);

  const fileName = useMemo(() => createFileName(degreeName, university), [degreeName, university]);

  const handleDownloadCsv = () => {
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${fileName}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    toast({
      title: "CSV exported",
      description: "Check your downloads for the schedule export.",
    });
  };

  const handleCopyMarkdown = async () => {
    const content = markdownTable.trim();
    if (!content) return;

    if (typeof navigator === "undefined" || !navigator.clipboard) {
      toast({
        title: "Clipboard unavailable",
        description: "Select the markdown text and copy it manually.",
        variant: "destructive",
      });
      return;
    }

    try {
      await navigator.clipboard.writeText(content);
      toast({
        title: "Markdown copied",
        description: "Your plan table is ready to paste.",
      });
    } catch (error) {
      console.error("Failed to copy markdown", error);
      toast({
        title: "Copy failed",
        description: "Select the markdown text above and copy it manually.",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Export your schedule</DialogTitle>
          <DialogDescription>
            Save a CSV for spreadsheets or grab a markdown table for docs without retyping your plan.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 lg:grid-cols-5">
          <div className="lg:col-span-2 space-y-3 rounded-xl border border-border bg-muted/40 p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-foreground">CSV download</p>
                <p className="text-xs text-muted-foreground">Includes year, term, courses, credits, plans, and tags.</p>
              </div>
              <Button size="sm" onClick={handleDownloadCsv}>
                <Download className="mr-2 h-4 w-4" />
                Download CSV
              </Button>
            </div>
            <div className="rounded-lg border border-dashed border-border bg-background p-3 text-xs text-muted-foreground">
              <div className="flex justify-between">
                <span>File name</span>
                <span className="font-semibold text-foreground">{fileName}.csv</span>
              </div>
              <div className="flex justify-between">
                <span>Rows exported</span>
                <span className="font-semibold text-foreground">{scheduleRows.length}</span>
              </div>
              <div className="mt-2 text-[11px] text-muted-foreground">
                Plan: {degreeName} • {university}
              </div>
            </div>
          </div>

          <div className="lg:col-span-3 space-y-3 rounded-xl border border-border bg-card/40 p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-foreground">Markdown table</p>
                <p className="text-xs text-muted-foreground">Copy and paste into docs, notes, or tickets.</p>
              </div>
              <Button variant="secondary" size="sm" onClick={handleCopyMarkdown}>
                <Copy className="mr-2 h-4 w-4" />
                Copy markdown
              </Button>
            </div>
            <Textarea
              readOnly
              value={markdownTable}
              className="min-h-[260px] font-mono text-xs"
            />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
