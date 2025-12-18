import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ChevronsRight, Pencil } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { PlanInput, PlannerPlan, PlanType } from '@/types/planner';
import { getDefaultColorId, getTagAccentClass, getTagColorClasses } from '@/lib/tagColors';
import { TagColorPicker } from '@/components/TagColorPicker';

interface RequirementsProps {
  totalCredits: number;
  maxCredits: number;
  plans: PlannerPlan[];
  planProgress: Record<string, { scheduled: number; total: number }>;
  onAddPlan: (plan: PlanInput) => PlannerPlan | null;
  onUpdatePlan: (planId: string, plan: PlanInput) => void;
  onRemovePlan: (planId: string) => void;
  onCollapsePanel?: () => void;
}

export const RequirementsSidebar = ({
  totalCredits,
  maxCredits,
  plans,
  planProgress,
  onAddPlan,
  onUpdatePlan,
  onRemovePlan,
  onCollapsePanel,
}: RequirementsProps) => {
  const [planName, setPlanName] = useState('');
  const [planType, setPlanType] = useState<PlanType>('major');
  const [classesNeeded, setClassesNeeded] = useState('');
  const [planCredits, setPlanCredits] = useState('');
  const [colorChoice, setColorChoice] = useState<string>(() => getDefaultColorId(''));
  const [showDialog, setShowDialog] = useState(false);
  const [editingPlan, setEditingPlan] = useState<PlannerPlan | null>(null);

  const sortedPlans = useMemo(
    () => [...plans].sort((a, b) => a.name.localeCompare(b.name)),
    [plans],
  );

  const resetPlanForm = () => {
    setPlanName('');
    setPlanType('major');
    setClassesNeeded('');
    setPlanCredits('');
    setColorChoice(getDefaultColorId(''));
  };

  const normalizePositive = (value: string) => {
    if (!value.trim()) return null;
    const numeric = Number(value);
    if (!Number.isFinite(numeric) || numeric <= 0) return null;
    return Math.max(0, numeric);
  };

  const handleSavePlan = () => {
    const classTarget = normalizePositive(classesNeeded);
    if (!classTarget) return;
    if (!planName.trim()) return;
    const creditTarget = normalizePositive(planCredits);
    if (editingPlan) {
      onUpdatePlan(editingPlan.id, {
        name: planName,
        type: planType,
        classesNeeded: classTarget,
        requiredCredits: creditTarget,
        color: colorChoice,
      });
      resetPlanForm();
      setEditingPlan(null);
      setShowDialog(false);
      return;
    }
    const created = onAddPlan({
      name: planName,
      type: planType,
      classesNeeded: classTarget,
      requiredCredits: creditTarget,
      color: colorChoice,
    });
    if (created) {
      resetPlanForm();
      setShowDialog(false);
    }
  };

  const handleDialogChange = (open: boolean) => {
    setShowDialog(open);
    if (!open) {
      resetPlanForm();
      setEditingPlan(null);
    }
  };

  const canSavePlan = Boolean(planName.trim()) && Boolean(normalizePositive(classesNeeded));

  return (
    <div className="bg-card border border-border rounded-xl p-4 mb-6 space-y-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="font-semibold text-foreground mb-1">Requirements</h3>
          <p className="text-xs text-muted-foreground">
            Track overall credits and see progress for each major/minor.
          </p>
        </div>
        {onCollapsePanel && (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={onCollapsePanel}
            aria-label="Collapse requirements"
          >
            <ChevronsRight className="h-4 w-4" />
          </Button>
        )}
      </div>

      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Total Credits</span>
          <span className="font-medium text-foreground">
            {totalCredits}/{maxCredits}
          </span>
        </div>
        <div className="h-2 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-primary rounded-full transition-all"
            style={{ width: `${Math.min((totalCredits / maxCredits) * 100, 100)}%` }}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Button
          variant="secondary"
          size="sm"
          className="w-full"
          onClick={() => {
            resetPlanForm();
            setEditingPlan(null);
            setShowDialog(true);
          }}
        >
          Add major/minor
        </Button>
        <p className="text-[11px] text-muted-foreground text-center">
          Capture class counts, credits, and colors for each plan.
        </p>
      </div>

      <div className="space-y-3">
        <p className="text-xs font-medium text-muted-foreground">Majors &amp; minors</p>
        {sortedPlans.length === 0 ? (
          <div className="text-xs text-muted-foreground bg-muted/50 border border-dashed border-border rounded-lg p-3">
            Add a major or minor to track progress.
          </div>
        ) : (
          sortedPlans.map((plan) => {
            const progress = planProgress[plan.id] ?? { scheduled: 0, total: 0 };
            const { scheduled, total } = progress;
            const targetClasses =
              plan.classesNeeded && plan.classesNeeded > 0 ? plan.classesNeeded : total;
            const pct = targetClasses > 0 ? Math.min((scheduled / targetClasses) * 100, 100) : 0;
            const targetLabel = targetClasses || '—';
            const colorClass = getTagColorClasses(plan.name, plan.color);
            const accentClass = getTagAccentClass(plan.name, plan.color);
            return (
              <div
                key={plan.id}
                className="group relative rounded-2xl border border-border/70 bg-card/95 p-4 pb-8 shadow-sm"
              >
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-3 bottom-3 h-7 w-7 opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100 hover:bg-transparent focus-visible:bg-transparent"
                  onClick={() => {
                    setEditingPlan(plan);
                    setPlanName(plan.name);
                    setPlanType(plan.type);
                    setClassesNeeded(plan.classesNeeded?.toString() ?? '');
                    setPlanCredits(plan.requiredCredits?.toString() ?? '');
                    setColorChoice(plan.color ?? getDefaultColorId(''));
                    setShowDialog(true);
                  }}
                  aria-label={`Edit ${plan.name}`}
                >
                  <Pencil className="h-4 w-4 text-muted-foreground group-hover:text-primary" />
                </Button>
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full ${colorClass}`}>
                        {plan.type === 'major' ? 'Major' : 'Minor'}
                      </span>
                      <span className="text-base font-semibold text-foreground">{plan.name}</span>
                    </div>
                    <div className="flex flex-wrap gap-3 text-[11px] text-muted-foreground">
                      <span className="inline-flex items-center gap-1">
                        <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/40" aria-hidden />
                        Goal: {plan.classesNeeded ? `${plan.classesNeeded} classes` : 'Set a class goal'}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/40" aria-hidden />
                        Tagged: {total || 0}
                      </span>
                      {plan.requiredCredits ? (
                        <span className="inline-flex items-center gap-1">
                          <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/40" aria-hidden />
                          Credits: {plan.requiredCredits}
                        </span>
                      ) : null}
                    </div>
                  </div>
                </div>
                <div className="mt-4 space-y-1.5">
                  <div className="flex items-baseline justify-between">
                    <span className="text-xs text-muted-foreground">Progress</span>
                    <span className="text-sm font-semibold text-foreground">
                      {scheduled}/{targetLabel}
                    </span>
                  </div>
                  <div className="h-1.5 rounded-full bg-muted/80">
                    <div
                      className={`h-full rounded-full transition-all ${accentClass || 'bg-primary'}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    {targetClasses === 0
                      ? 'Add a class goal to see progress here.'
                      : total === 0
                        ? 'No tagged classes yet. Add one from the library to begin tracking.'
                        : `${scheduled} tagged from your library.`}
                  </p>
                </div>
              </div>
            );
          })
        )}
      </div>

      <Dialog open={showDialog} onOpenChange={handleDialogChange}>
        <DialogContent className="sm:max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingPlan ? `Edit ${editingPlan.name}` : 'Add a major or minor'}</DialogTitle>
            <DialogDescription>
              Set how many classes you need, add optional credits, and pick a color for quick tagging.
            </DialogDescription>
          </DialogHeader>

          <form
            className="space-y-4"
            onSubmit={(event) => {
              event.preventDefault();
              handleSavePlan();
            }}
          >
            <div className="flex gap-2">
              <Button
                type="button"
                variant={planType === 'major' ? 'default' : 'outline'}
                size="sm"
                className="flex-1"
                onClick={() => setPlanType('major')}
              >
                Major
              </Button>
              <Button
                type="button"
                variant={planType === 'minor' ? 'default' : 'outline'}
                size="sm"
                className="flex-1"
                onClick={() => setPlanType('minor')}
              >
                Minor
              </Button>
            </div>

            <div className="space-y-2">
              <Label htmlFor="plan-name">Plan name</Label>
              <Input
                id="plan-name"
                placeholder="e.g., Computer Science"
                value={planName}
                onChange={(e) => setPlanName(e.target.value)}
                autoFocus
              />
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="plan-classes">Classes needed</Label>
                <Input
                  id="plan-classes"
                  type="number"
                  min={1}
                  value={classesNeeded}
                  onChange={(e) => setClassesNeeded(e.target.value)}
                  required
                />
                <p className="text-[11px] text-muted-foreground">Required so we can chart progress.</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="plan-credits">Credits (optional)</Label>
                <Input
                  id="plan-credits"
                  type="number"
                  min={0}
                  value={planCredits}
                  onChange={(e) => setPlanCredits(e.target.value)}
                  placeholder="e.g., 48"
                />
                <p className="text-[11px] text-muted-foreground">Skip if you only track classes.</p>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Color</Label>
              <p className="text-[11px] text-muted-foreground">
                This color appears on plan badges in the Class Library and schedule.
              </p>
              <TagColorPicker
                value={colorChoice}
                onSelect={(colorId) => {
                  if (colorId) setColorChoice(colorId);
                }}
              />
            </div>

            <div className="flex justify-between gap-2 pt-2">
              {editingPlan ? (
                <Button type="button" variant="destructive" onClick={() => { onRemovePlan(editingPlan.id); handleDialogChange(false); }}>
                  Delete
                </Button>
              ) : (
                <span />
              )}
              <div className="flex gap-2">
                <Button type="button" variant="ghost" onClick={() => handleDialogChange(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={!canSavePlan}>
                  {editingPlan ? 'Save changes' : 'Save plan'}
                </Button>
              </div>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};
