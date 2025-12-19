import { useEffect, useMemo, useState, type Dispatch, type SetStateAction } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { PlannerConfig, TermSystem } from "@/types/planner";
import { UNIVERSITY_SUGGESTIONS } from '@/data/universities';

const formatInitialValue = (value?: number | string | null) =>
  (value !== null && value !== undefined ? String(value) : "");

const clampNumber = (value: number, min?: number, max?: number) => {
  let nextValue = value;
  if (typeof min === "number") {
    nextValue = Math.max(min, nextValue);
  }
  if (typeof max === "number") {
    nextValue = Math.min(max, nextValue);
  }
  return nextValue;
};

const stepNumericField = (
  setter: Dispatch<SetStateAction<string>>,
  delta: number,
  fallback: number,
  min?: number,
  max?: number
) => {
  setter((previous) => {
    const parsed = Number(previous);
    const baseValue = Number.isFinite(parsed) ? parsed : fallback;
    const stepped = clampNumber(baseValue + delta, min, max);
    return String(stepped);
  });
};

type PlannerSetupDialogProps = {
  open: boolean;
  onClose?: () => void;
  onSave: (config: PlannerConfig) => void;
  initialConfig?: PlannerConfig | null;
  onReset?: () => void;
};

type StepperButtonsProps = {
  onIncrement: () => void;
  onDecrement: () => void;
  increaseLabel: string;
  decreaseLabel: string;
};

const StepperButtons = ({ onIncrement, onDecrement, increaseLabel, decreaseLabel }: StepperButtonsProps) => (
  <div className="absolute inset-y-1 right-1 flex w-8 flex-col overflow-hidden rounded-md border border-border bg-muted/40 shadow-sm focus-within:ring-1 focus-within:ring-ring">
    <button
      type="button"
      aria-label={increaseLabel}
      className="flex flex-1 items-center justify-center text-muted-foreground transition hover:bg-background hover:text-foreground focus-visible:outline-none"
      onClick={onIncrement}
    >
      <ChevronUp className="h-3 w-3" />
    </button>
    <button
      type="button"
      aria-label={decreaseLabel}
      className="flex flex-1 items-center justify-center text-muted-foreground transition hover:bg-background hover:text-foreground focus-visible:outline-none"
      onClick={onDecrement}
    >
      <ChevronDown className="h-3 w-3" />
    </button>
  </div>
);

export const PlannerSetupDialog = ({ open, onClose, onSave, initialConfig, onReset }: PlannerSetupDialogProps) => {
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
  const filteredUniversities = useMemo(() => {
    const query = university.trim().toLowerCase();
    if (!query) return [];
    const prioritySchools = [
      "Harvard University",
      "Yale University",
      "Princeton University",
      "Columbia University in the City of New York",
      "Cornell University",
      "University of Pennsylvania",
      "Brown University",
      "Dartmouth College",
      "Massachusetts Institute of Technology",
      "Stanford University",
      "University of California, Berkeley",
      "University of California-Los Angeles",
      "University of Michigan-Ann Arbor",
      "University of Chicago",
      "California Institute of Technology",
      "University of Southern California",
      "University of Texas at Austin",
      "University of Washington-Seattle Campus",
      "University of Florida",
      "Georgia Institute of Technology-Main Campus",
    ];
    const priorityMap = new Map(prioritySchools.map((name, index) => [name.toLowerCase(), index]));
    return UNIVERSITY_SUGGESTIONS.filter((school) => school.toLowerCase().includes(query))
      .sort((a, b) => {
        const aLower = a.toLowerCase();
        const bLower = b.toLowerCase();
        const aStarts = aLower.startsWith(query);
        const bStarts = bLower.startsWith(query);
        if (aStarts !== bStarts) return aStarts ? -1 : 1;
        const aPriority = priorityMap.has(aLower) ? priorityMap.get(aLower) : Infinity;
        const bPriority = priorityMap.has(bLower) ? priorityMap.get(bLower) : Infinity;
        if (aPriority !== bPriority) return aPriority - bPriority;
        return a.localeCompare(b);
      })
      .slice(0, 6);
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
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto" hideClose={!onClose}>
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
              <div className="relative">
                <Input
                  id="start-year"
                  type="number"
                  min={2000}
                  max={3000}
                  value={startYear}
                  onChange={(e) => setStartYear(e.target.value)}
                  className="pr-12"
                />
                <StepperButtons
                  increaseLabel="Increase start year"
                  decreaseLabel="Decrease start year"
                  onIncrement={() => stepNumericField(setStartYear, 1, fallbackDefaults.startYear, 2000, 3000)}
                  onDecrement={() => stepNumericField(setStartYear, -1, fallbackDefaults.startYear, 2000, 3000)}
                />
              </div>
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
              <div className="relative">
                <Input
                  id="classes-per-term"
                  type="number"
                  min={1}
                  max={10}
                  value={classesPerTerm}
                  onChange={(e) => setClassesPerTerm(e.target.value)}
                  className="pr-12"
                />
                <StepperButtons
                  increaseLabel="Increase classes per term"
                  decreaseLabel="Decrease classes per term"
                  onIncrement={() => stepNumericField(setClassesPerTerm, 1, fallbackDefaults.classesPerTerm, 1, 10)}
                  onDecrement={() => stepNumericField(setClassesPerTerm, -1, fallbackDefaults.classesPerTerm, 1, 10)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="total-credits">Credits to graduate</Label>
              <div className="relative">
                <Input
                  id="total-credits"
                  type="number"
                  min={1}
                  max={400}
                  value={totalCredits}
                  onChange={(e) => setTotalCredits(e.target.value)}
                  className="pr-12"
                />
                <StepperButtons
                  increaseLabel="Increase credits to graduate"
                  decreaseLabel="Decrease credits to graduate"
                  onIncrement={() => stepNumericField(setTotalCredits, 1, fallbackDefaults.totalCredits, 1, 400)}
                  onDecrement={() => stepNumericField(setTotalCredits, -1, fallbackDefaults.totalCredits, 1, 400)}
                />
              </div>
            </div>
          </div>

          {onReset ? (
            <div className="rounded-lg border border-border bg-muted/30 p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-semibold text-foreground">Reset schedule</p>
                  <p className="text-xs text-muted-foreground">
                    Clear planned classes and rebuild your timeline using this configuration.
                  </p>
                </div>
                <ConfirmDialog
                  title="Reset your schedule?"
                  description="This removes planned classes from every term. Your class library stays intact."
                  confirmLabel="Reset schedule"
                  cancelLabel="Keep schedule"
                  confirmVariant="destructive"
                  onConfirm={onReset}
                  trigger={
                    <Button
                      type="button"
                      variant="outline"
                      className="border-destructive/40 text-destructive hover:bg-destructive/10"
                    >
                      Reset schedule
                    </Button>
                  }
                />
              </div>
            </div>
          ) : null}

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
