import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { PlannerConfig, TermSystem } from "@/types/planner";
import { UNIVERSITY_SUGGESTIONS } from '@/data/universities';

const formatInitialValue = (value?: number | string | null) =>
  (value !== null && value !== undefined ? String(value) : "");

type PlannerSetupDialogProps = {
  open: boolean;
  onClose?: () => void;
  onSave: (config: PlannerConfig) => void;
  initialConfig?: PlannerConfig | null;
};

export const PlannerSetupDialog = ({ open, onClose, onSave, initialConfig }: PlannerSetupDialogProps) => {
  const fallbackDefaults = useMemo(() => {
    const currentYear = new Date().getFullYear();
    return {
      startYear: initialConfig?.startYear ?? currentYear,
      classesPerTerm: initialConfig?.classesPerTerm ?? 4,
      totalCredits: initialConfig?.totalCredits ?? 120,
      termSystem: initialConfig?.termSystem ?? "semester",
      planName: initialConfig?.planName ?? "My Plan",
      university: initialConfig?.university ?? "University Name",
    };
  }, [initialConfig]);

  const [startYear, setStartYear] = useState(() => formatInitialValue(initialConfig?.startYear));
  const [classesPerTerm, setClassesPerTerm] = useState(() => formatInitialValue(initialConfig?.classesPerTerm));
  const [totalCredits, setTotalCredits] = useState(() => formatInitialValue(initialConfig?.totalCredits));
  const [termSystem, setTermSystem] = useState<TermSystem | "">(() => initialConfig?.termSystem ?? "");
  const [planName, setPlanName] = useState(() => initialConfig?.planName ?? "");
  const [university, setUniversity] = useState(() => initialConfig?.university ?? "");
  const [universityFocused, setUniversityFocused] = useState(false);
  const [universityQuery, setUniversityQuery] = useState('');
  const filteredUniversities = useMemo(() => {
    const query = university.trim().toLowerCase();
    if (!query) return UNIVERSITY_SUGGESTIONS.slice(0, 6);
    return UNIVERSITY_SUGGESTIONS.filter((school) => school.toLowerCase().includes(query)).slice(0, 6);
  }, [university]);

  useEffect(() => {
    setStartYear(formatInitialValue(initialConfig?.startYear));
    setClassesPerTerm(formatInitialValue(initialConfig?.classesPerTerm));
    setTotalCredits(formatInitialValue(initialConfig?.totalCredits));
    setTermSystem(initialConfig?.termSystem ?? "");
    setPlanName(initialConfig?.planName ?? "");
    setUniversity(initialConfig?.university ?? "");
  }, [initialConfig]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsedStartYear = Number(startYear);
    const parsedClasses = Number(classesPerTerm);
    const parsedCredits = Number(totalCredits);
    const sanitizedStartYear =
      Number.isFinite(parsedStartYear) && startYear.trim() !== "" ? parsedStartYear : fallbackDefaults.startYear;
    const sanitizedClasses =
      Number.isFinite(parsedClasses) && classesPerTerm.trim() !== "" ? parsedClasses : fallbackDefaults.classesPerTerm;
    const sanitizedCredits =
      Number.isFinite(parsedCredits) && totalCredits.trim() !== "" ? parsedCredits : fallbackDefaults.totalCredits;
    const normalizedPlanName = planName.trim() || fallbackDefaults.planName;
    const normalizedUniversity = university.trim() || fallbackDefaults.university;
    const normalizedTermSystem: TermSystem =
      termSystem === "quarter"
        ? "quarter"
        : termSystem === "semester"
          ? "semester"
          : fallbackDefaults.termSystem;

    onSave({
      startYear: sanitizedStartYear,
      classesPerTerm: Math.max(1, sanitizedClasses),
      totalCredits: Math.max(1, sanitizedCredits),
      termSystem: normalizedTermSystem,
      planName: normalizedPlanName,
      university: normalizedUniversity,
    });
  };

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && onClose?.()}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Set up your planner</DialogTitle>
          <DialogDescription>
            Tell us how you want to plan so we can build the right term layout. We&apos;ll remember this on your device
            for next time.
          </DialogDescription>
        </DialogHeader>

        <form className="space-y-5 pb-2" onSubmit={handleSubmit}>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="plan-name">Plan name</Label>
              <Input
                id="plan-name"
                type="text"
                value={planName}
                onChange={(e) => setPlanName(e.target.value)}
                placeholder="e.g., Math & CS"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="university">School</Label>
              <div className="relative">
                <Input
                  id="university"
                  type="text"
                  value={university}
                  onFocus={() => setUniversityFocused(true)}
                  onBlur={() => setTimeout(() => setUniversityFocused(false), 150)}
                  onChange={(e) => setUniversity(e.target.value)}
                  placeholder="e.g., Stanford University"
                  autoComplete="off"
                />
                {universityFocused && filteredUniversities.length > 0 && (
                  <div className="absolute z-10 mt-1 w-full overflow-hidden rounded-lg border border-border bg-popover shadow-lg">
                    <ul className="max-h-48 overflow-y-auto py-2 text-sm">
                      {filteredUniversities.map((school) => (
                        <li key={school}>
                          <button
                            type="button"
                            className="w-full px-3 py-1.5 text-left hover:bg-muted"
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => {
                              setUniversity(school);
                              setUniversityFocused(false);
                            }}
                          >
                            {school}
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="start-year">Starting academic year</Label>
              <Input
                id="start-year"
                type="number"
                min={2000}
                max={3000}
                value={startYear}
                onChange={(e) => setStartYear(e.target.value)}
              />
            </div>

            <div className="space-y-3">
              <Label className="block">Academic calendar</Label>
              <RadioGroup
                value={termSystem}
                onValueChange={(value) =>
                  setTermSystem(value === "quarter" ? "quarter" : value === "semester" ? "semester" : "")
                }
                className="grid grid-cols-1 gap-3 sm:grid-cols-2"
              >
                <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-border p-3 text-center">
                  <RadioGroupItem id="term-semester" value="semester" />
                  <Label htmlFor="term-semester" className="text-sm font-medium leading-none">
                    Semester
                  </Label>
                </div>
                <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-border p-3 text-center">
                  <RadioGroupItem id="term-quarter" value="quarter" />
                  <Label htmlFor="term-quarter" className="text-sm font-medium leading-none">
                    Quarter
                  </Label>
                </div>
              </RadioGroup>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="classes-per-term">Classes per term</Label>
              <Input
                id="classes-per-term"
                type="number"
                min={1}
                max={10}
                value={classesPerTerm}
                onChange={(e) => setClassesPerTerm(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="total-credits">Credits to graduate</Label>
              <Input
                id="total-credits"
                type="number"
                min={1}
                max={400}
                value={totalCredits}
                onChange={(e) => setTotalCredits(e.target.value)}
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            {onClose && (
              <Button type="button" variant="ghost" onClick={onClose}>
                Cancel
              </Button>
            )}
            <Button type="submit">Save and continue</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
