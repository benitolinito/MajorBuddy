import { useMemo } from "react";
import { ChevronDown, Copy, FileDown, FileSpreadsheet, FileText, FileType } from "lucide-react";
import { AcademicYear, PlannerPlan } from "@/types/planner";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/use-toast";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import {
  buildScheduleRows,
  buildMarkdownTable,
  buildCsvContent,
  createScheduleFileName,
  triggerCsvDownload,
  triggerPdfDownload,
  triggerXlsxDownload,
} from "@/lib/scheduleExport";

type ExportScheduleDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  years: AcademicYear[];
  plans: PlannerPlan[];
  degreeName: string;
  university: string;
};

export const ExportScheduleDialog = ({
  open,
  onOpenChange,
  years,
  plans,
  degreeName,
  university,
}: ExportScheduleDialogProps) => {
  const scheduleRows = useMemo(() => buildScheduleRows(years, plans), [years, plans]);
  const markdownTable = useMemo(() => buildMarkdownTable(scheduleRows), [scheduleRows]);
  const csvContent = useMemo(() => buildCsvContent(scheduleRows), [scheduleRows]);
  const fileName = useMemo(() => createScheduleFileName(degreeName, university), [degreeName, university]);

  const handleDownloadCsv = () => {
    triggerCsvDownload(csvContent, fileName);
    toast({
      title: "CSV exported",
      description: "Check your downloads for the schedule export.",
    });
  };

  const handleDownloadPdf = () => {
    triggerPdfDownload(scheduleRows, fileName);
    toast({
      title: "PDF exported",
      description: "A print-ready report is in your downloads.",
    });
  };

  const handleDownloadXlsx = () => {
    triggerXlsxDownload(scheduleRows, fileName);
    toast({
      title: "Spreadsheet ready",
      description: "Open the .xlsx to tweak or share your plan.",
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

  const exportOptions = [
    {
      key: "pdf",
      title: "PDF report",
      onClick: handleDownloadPdf,
      icon: FileDown,
      detail: `${fileName}.pdf`,
    },
    {
      key: "xlsx",
      title: "Excel / Sheets",
      onClick: handleDownloadXlsx,
      icon: FileSpreadsheet,
      detail: `${fileName}.xlsx`,
    },
    {
      key: "csv",
      title: "CSV export",
      onClick: handleDownloadCsv,
      icon: FileType,
      detail: `${fileName}.csv`,
    },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Export your schedule</DialogTitle>
          <DialogDescription>
            Choose a download format or copy markdown without wading through extra cards.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex flex-col gap-3 rounded-lg border bg-muted/40 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <p className="text-sm font-semibold text-foreground">Download formats</p>
              <p className="text-xs text-muted-foreground">Pick CSV, XLSX, or PDF from a single dropdown.</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button>
                    <FileDown className="mr-2 h-4 w-4" />
                    Download
                    <ChevronDown className="ml-2 h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-64">
                  {exportOptions.map((option) => {
                    const Icon = option.icon;
                    return (
                      <DropdownMenuItem
                        key={option.key}
                        className="flex items-start gap-3 py-2"
                        onSelect={() => option.onClick()}
                      >
                        <Icon className="mt-0.5 h-4 w-4 text-muted-foreground" />
                        <div className="flex flex-col">
                          <span className="text-sm font-medium text-foreground">{option.title}</span>
                          <span className="text-xs text-muted-foreground">{option.detail}</span>
                        </div>
                      </DropdownMenuItem>
                    );
                  })}
                </DropdownMenuContent>
              </DropdownMenu>
              <Button variant="secondary" size="sm" onClick={handleCopyMarkdown}>
                <Copy className="mr-2 h-4 w-4" />
                Copy markdown
              </Button>
            </div>
          </div>

          <div className="rounded-lg border bg-card/60">
            <div className="flex items-start justify-between gap-3 border-b p-3">
              <div className="flex items-center gap-2">
                <span className="rounded-md bg-background p-2 text-primary">
                  <FileText className="h-4 w-4" />
                </span>
                <div>
                  <p className="text-sm font-semibold text-foreground">Markdown preview</p>
                  <p className="text-xs text-muted-foreground">Shorter snippet, ready to paste anywhere.</p>
                </div>
              </div>
            </div>
            <Textarea
              readOnly
              value={markdownTable}
              className="min-h-[200px] rounded-b-lg border-0 bg-transparent font-mono text-xs leading-relaxed shadow-none focus-visible:ring-0 focus-visible:ring-offset-0"
            />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
