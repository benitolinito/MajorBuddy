import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PlannerConfig } from "@/types/planner";

type PlannerSetupDialogProps = {
  open: boolean;
  onClose?: () => void;
  onSave: (config: PlannerConfig) => void;
  initialConfig?: PlannerConfig | null;
};

export const PlannerSetupDialog = ({ open, onClose, onSave, initialConfig }: PlannerSetupDialogProps) => {
  const defaultConfig = useMemo(() => {
    const currentYear = new Date().getFullYear();
    return {
      startYear: initialConfig?.startYear ?? currentYear,
      classesPerTerm: initialConfig?.classesPerTerm ?? 4,
      totalCredits: initialConfig?.totalCredits ?? 120,
    };
  }, [initialConfig]);

  const [startYear, setStartYear] = useState(defaultConfig.startYear);
  const [classesPerTerm, setClassesPerTerm] = useState(defaultConfig.classesPerTerm);
  const [totalCredits, setTotalCredits] = useState(defaultConfig.totalCredits);

  useEffect(() => {
    setStartYear(defaultConfig.startYear);
    setClassesPerTerm(defaultConfig.classesPerTerm);
    setTotalCredits(defaultConfig.totalCredits);
  }, [defaultConfig]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const sanitizedStartYear = Number.isFinite(Number(startYear)) ? Number(startYear) : defaultConfig.startYear;
    const sanitizedClasses = Number.isFinite(Number(classesPerTerm)) ? Number(classesPerTerm) : defaultConfig.classesPerTerm;
    const sanitizedCredits = Number.isFinite(Number(totalCredits)) ? Number(totalCredits) : defaultConfig.totalCredits;

    onSave({
      startYear: sanitizedStartYear,
      classesPerTerm: Math.max(1, sanitizedClasses),
      totalCredits: Math.max(1, sanitizedCredits),
    });
  };

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && onClose?.()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Set up your planner</DialogTitle>
          <DialogDescription>
            Tell us how you want to plan so we can build the right term layout. We&apos;ll remember this on your device
            for next time.
          </DialogDescription>
        </DialogHeader>

        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <Label htmlFor="start-year">Starting academic year</Label>
            <Input
              id="start-year"
              type="number"
              min={2000}
              max={3000}
              value={startYear}
              onChange={(e) => setStartYear(Number(e.target.value))}
            />
            <p className="text-xs text-muted-foreground">
              We&apos;ll label each year as <span className="font-medium">25-26, 26-27</span> based on this start year.
            </p>
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
                onChange={(e) => setClassesPerTerm(Number(e.target.value))}
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
                onChange={(e) => setTotalCredits(Number(e.target.value))}
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
