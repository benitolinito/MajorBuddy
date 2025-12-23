import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ChevronsRight, Pencil } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { DistributiveRequirement, PlanInput, PlannerPlan, PlanType } from '@/types/planner';
import {
  getDefaultColorId,
  getTagAccentClass,
  getTagAccentStyle,
  getTagColorClasses,
  getTagColorStyle,
} from '@/lib/tagColors';
import { TagColorPicker } from '@/components/TagColorPicker';

interface RequirementsProps {
  totalCredits: number;
  maxCredits: number;
  plans: PlannerPlan[];
  planProgress: Record<string, { scheduled: number; total: number; scheduledCredits: number }>;
  distributiveRequirements: DistributiveRequirement[];
  distributiveProgress: Record<string, { scheduled: number; total: number }>;
  onAddPlan: (plan: PlanInput) => PlannerPlan | null;
  onUpdatePlan: (planId: string, plan: PlanInput) => void;
  onRemovePlan: (planId: string) => void;
  onAddDistributive: (input: { name: string; classesNeeded?: number | null; color?: string | null }) => DistributiveRequirement | null;
  onUpdateDistributive: (id: string, updates: { classesNeeded?: number | null; color?: string | null }) => void;
  onRemoveDistributive: (id: string) => void;
  colorPalette: string[];
  onAddPaletteColor: (hex: string) => string | void;
  onCollapsePanel?: () => void;
  isMobile?: boolean;
}

export const RequirementsSidebar = ({
  totalCredits,
  maxCredits,
  plans,
  planProgress,
  distributiveRequirements,
  distributiveProgress,
  onAddPlan,
  onUpdatePlan,
  onRemovePlan,
  onAddDistributive,
  onUpdateDistributive,
  onRemoveDistributive,
  colorPalette,
  onAddPaletteColor,
  onCollapsePanel,
  isMobile = false,
}: RequirementsProps) => {
  const [planName, setPlanName] = useState('');
  const [planType, setPlanType] = useState<PlanType>('major');
  const [classesNeeded, setClassesNeeded] = useState('');
  const [planCredits, setPlanCredits] = useState('');
  const [colorChoice, setColorChoice] = useState<string>(() => getDefaultColorId(''));
  const [showDialog, setShowDialog] = useState(false);
  const [editingPlan, setEditingPlan] = useState<PlannerPlan | null>(null);
  const [distributiveName, setDistributiveName] = useState('');
  const [distributiveClasses, setDistributiveClasses] = useState('');
  const [distributiveColor, setDistributiveColor] = useState<string>(() => getDefaultColorId(''));
  const [showDistributiveDialog, setShowDistributiveDialog] = useState(false);
  const [editingDistributive, setEditingDistributive] = useState<DistributiveRequirement | null>(null);
  const colorHelperText =
    'Colors appear on badges in the Class Library and across your schedule, so pick something easy to spot.';

  const sortedPlans = useMemo(
    () => [...plans].sort((a, b) => a.name.localeCompare(b.name)),
    [plans],
  );

  const sortedDistributives = useMemo(
    () => [...distributiveRequirements].sort((a, b) => a.name.localeCompare(b.name)),
    [distributiveRequirements],
  );

  const resetPlanForm = () => {
    setPlanName('');
    setPlanType('major');
    setClassesNeeded('');
    setPlanCredits('');
    setColorChoice(getDefaultColorId(''));
  };

  const resetDistributiveForm = () => {
    setDistributiveName('');
    setDistributiveClasses('');
    setDistributiveColor(getDefaultColorId(''));
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

  const handleSaveDistributive = () => {
    const classTarget = normalizePositive(distributiveClasses);
    if (!distributiveName.trim()) return;
    if (!classTarget) return;

    if (editingDistributive) {
      onUpdateDistributive(editingDistributive.id, {
        classesNeeded: classTarget,
        color: distributiveColor,
      });
      resetDistributiveForm();
      setEditingDistributive(null);
      setShowDistributiveDialog(false);
      return;
    }

    const created = onAddDistributive({
      name: distributiveName,
      classesNeeded: classTarget,
      color: distributiveColor,
    });
    if (created) {
      resetDistributiveForm();
      setShowDistributiveDialog(false);
    }
  };

  const handleDialogChange = (open: boolean) => {
    setShowDialog(open);
    if (!open) {
      resetPlanForm();
      setEditingPlan(null);
    }
  };

  const handleDistributiveDialogChange = (open: boolean) => {
    setShowDistributiveDialog(open);
    if (!open) {
      resetDistributiveForm();
      setEditingDistributive(null);
    }
  };

  const canSavePlan = Boolean(planName.trim()) && Boolean(normalizePositive(classesNeeded));
  const canSaveDistributive = Boolean(distributiveName.trim()) && Boolean(normalizePositive(distributiveClasses));
  const containerClassName = isMobile
    ? 'bg-card border border-border rounded-xl p-4 space-y-4'
    : 'flex h-full flex-col space-y-4';

  return (
    <div className={containerClassName}>
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="font-semibold text-foreground mb-1">Requirements</h3>
          <p className="text-xs text-muted-foreground">
            {/* Track overall credits and see progress for each major/minor. */}
          </p>
        </div>
        {onCollapsePanel && !isMobile && (
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
        <Button
          variant="outline"
          size="sm"
          className="w-full"
          onClick={() => {
            resetDistributiveForm();
            setEditingDistributive(null);
            setDistributiveName('');
            setShowDistributiveDialog(true);
          }}
        >
          Add distributive
        </Button>
      </div>

      <div className="space-y-3">
        <p className="text-xs font-medium text-muted-foreground">Majors &amp; minors</p>
        {sortedPlans.length === 0 ? (
          <div className="text-xs text-muted-foreground bg-muted/50 border border-dashed border-border rounded-lg p-3">
            Add a major or minor to track here.
          </div>
        ) : (
          sortedPlans.map((plan) => {
            const progress = planProgress[plan.id] ?? { scheduled: 0, total: 0, scheduledCredits: 0 };
            const { scheduled, total, scheduledCredits } = progress;
            const targetClasses =
              plan.classesNeeded && plan.classesNeeded > 0 ? plan.classesNeeded : total;
            const pct = targetClasses > 0 ? Math.min((scheduled / targetClasses) * 100, 100) : 0;
            const targetLabel = targetClasses || '—';
            const colorClass = getTagColorClasses(plan.name, plan.color);
            const accentClass = getTagAccentClass(plan.name, plan.color);
            const colorStyle = getTagColorStyle(plan.name, plan.color);
            const accentStyle = getTagAccentStyle(plan.name, plan.color);
            const creditTarget = plan.requiredCredits && plan.requiredCredits > 0 ? plan.requiredCredits : null;
            const creditPct = creditTarget
              ? Math.min((scheduledCredits / creditTarget) * 100, 100)
              : 0;
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
                      <span
                        className={`text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full ${colorClass}`}
                        style={colorStyle}
                      >
                        {plan.type === 'major' ? 'Major' : 'Minor'}
                      </span>
                      <span className="text-base font-semibold text-foreground">{plan.name}</span>
                    </div>
                  </div>
                </div>
                <div className="mt-4 space-y-3">
                  <div className="flex items-baseline justify-between">
                    <span className="text-xs text-muted-foreground">Class progress</span>
                    <span className="text-sm font-semibold text-foreground">
                      {scheduled}/{targetLabel}
                    </span>
                  </div>
                  <div className="h-1.5 rounded-full bg-muted/80">
                    <div
                      className={`h-full rounded-full transition-all ${accentClass || 'bg-primary'}`}
                      style={{ width: `${pct}%`, ...(accentStyle ?? {}) }}
                    />
                  </div>
                  {targetClasses === 0 ? (
                    <p className="text-[11px] text-muted-foreground">Add a class goal to see progress here.</p>
                  ) : scheduled > 0 ? (
                    <p className="text-[11px] text-muted-foreground">{`${scheduled} tagged from your library.`}</p>
                  ) : null}
                  {creditTarget ? (
                    <div className="space-y-1.5">
                      <div className="flex items-baseline justify-between">
                        <span className="text-xs text-muted-foreground">Credit progress</span>
                        <span className="text-sm font-semibold text-foreground">
                          {scheduledCredits}/{creditTarget}
                        </span>
                      </div>
                      <div className="h-1.5 rounded-full bg-muted/80">
                        <div
                          className={`h-full rounded-full transition-all ${accentClass || 'bg-primary'}`}
                          style={{ width: `${creditPct}%`, ...(accentStyle ?? {}), opacity: 0.9 }}
                        />
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>
            );
          })
        )}
      </div>

      <div className="space-y-3">
        <p className="text-xs font-medium text-muted-foreground">Distributives</p>
        {sortedDistributives.length === 0 ? (
          <div className="text-xs text-muted-foreground bg-muted/50 border border-dashed border-border rounded-lg p-3">
            Add distributives to track class goals here.
          </div>
        ) : (
          sortedDistributives.map((dist) => {
            const progress = distributiveProgress[dist.id] ?? { scheduled: 0, total: 0 };
            const targetClasses =
              dist.classesNeeded && dist.classesNeeded > 0 ? dist.classesNeeded : progress.total;
            const pct = targetClasses > 0 ? Math.min((progress.scheduled / targetClasses) * 100, 100) : 0;
            const targetLabel = targetClasses || '—';
            const colorClass = getTagColorClasses(dist.name, dist.color);
            const accentClass = getTagAccentClass(dist.name, dist.color);
            const colorStyle = getTagColorStyle(dist.name, dist.color);
            const accentStyle = getTagAccentStyle(dist.name, dist.color);
            return (
              <div
                key={dist.id}
                className="group relative rounded-2xl border border-border/70 bg-card/95 p-4 pb-8 shadow-sm"
              >
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-3 bottom-3 h-7 w-7 opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100 hover:bg-transparent focus-visible:bg-transparent"
                  onClick={() => {
                    setEditingDistributive(dist);
                    setDistributiveName(dist.name);
                    setDistributiveClasses(dist.classesNeeded?.toString() ?? '');
                    setDistributiveColor(dist.color ?? getDefaultColorId(dist.name));
                    setShowDistributiveDialog(true);
                  }}
                  aria-label={`Edit ${dist.name}`}
                >
                  <Pencil className="h-4 w-4 text-muted-foreground group-hover:text-primary" />
                </Button>
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full ${colorClass}`}
                        style={colorStyle}
                      >
                        Distributive
                      </span>
                      <span className="text-base font-semibold text-foreground">{dist.name}</span>
                    </div>
                  </div>
                </div>
                <div className="mt-4 space-y-3">
                  <div className="flex items-baseline justify-between">
                    <span className="text-xs text-muted-foreground">Class progress</span>
                    <span className="text-sm font-semibold text-foreground">
                      {progress.scheduled}/{targetLabel}
                    </span>
                  </div>
                  <div className="h-1.5 rounded-full bg-muted/80">
                    <div
                      className={`h-full rounded-full transition-all ${accentClass || 'bg-primary'}`}
                      style={{ width: `${pct}%`, ...(accentStyle ?? {}) }}
                    />
                  </div>
                  {targetClasses === 0 ? (
                    <p className="text-[11px] text-muted-foreground">Add a class goal to see progress here.</p>
                  ) : progress.scheduled > 0 ? (
                    <p className="text-[11px] text-muted-foreground">{`${progress.scheduled} tagged from your library.`}</p>
                  ) : null}
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
              <Label htmlFor="plan-name">Title</Label>
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
              <p className="text-[11px] text-muted-foreground">{colorHelperText}</p>
              <TagColorPicker
                value={colorChoice}
                onSelect={(colorId) => {
                  if (colorId) setColorChoice(colorId);
                }}
                customColors={colorPalette}
                onAddCustomColor={(hex) => {
                  const added = onAddPaletteColor(hex);
                  if (added) {
                    setColorChoice(added);
                  } else {
                    setColorChoice(hex);
                  }
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

      <Dialog open={showDistributiveDialog} onOpenChange={handleDistributiveDialogChange}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingDistributive ? `Edit ${editingDistributive.name}` : 'Add a distributive'}
            </DialogTitle>
            <DialogDescription>
              Set a class goal and color for this distributive. You can tag classes from the library anytime.
            </DialogDescription>
          </DialogHeader>

          <form
            className="space-y-4"
            onSubmit={(event) => {
              event.preventDefault();
              handleSaveDistributive();
            }}
          >
            <div className="space-y-2">
              <Label htmlFor="distributive-name">Distributive name</Label>
              <Input
                id="distributive-name"
                placeholder="e.g., Humanities"
                value={distributiveName}
                onChange={(e) => setDistributiveName(e.target.value)}
                disabled={Boolean(editingDistributive)}
                required
              />
              {editingDistributive ? (
                <p className="text-[11px] text-muted-foreground">Names stay locked once created.</p>
              ) : null}
            </div>

            <div className="space-y-2">
              <Label htmlFor="distributive-classes">Classes needed</Label>
              <Input
                id="distributive-classes"
                type="number"
                min={1}
                value={distributiveClasses}
                onChange={(e) => setDistributiveClasses(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label>Color</Label>
              <p className="text-[11px] text-muted-foreground">{colorHelperText}</p>
              <TagColorPicker
                value={distributiveColor}
                onSelect={(colorId) => colorId && setDistributiveColor(colorId)}
                customColors={colorPalette}
                onAddCustomColor={(hex) => {
                  const added = onAddPaletteColor(hex);
                  setDistributiveColor(added || hex);
                }}
              />
            </div>

            <div className="flex justify-between gap-2 pt-2">
              {editingDistributive ? (
                <Button
                  type="button"
                  variant="destructive"
                  onClick={() => {
                    onRemoveDistributive(editingDistributive.id);
                    handleDistributiveDialogChange(false);
                  }}
                >
                  Delete
                </Button>
              ) : (
                <span />
              )}
              <div className="flex gap-2">
                <Button type="button" variant="ghost" onClick={() => handleDistributiveDialogChange(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={!canSaveDistributive}>
                  {editingDistributive ? 'Save changes' : 'Save distributive'}
                </Button>
              </div>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};
