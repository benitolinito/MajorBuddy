import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PlannerPlan, PlanType } from '@/types/planner';
import { ChevronsRight, Trash2 } from 'lucide-react';

interface RequirementsProps {
  totalCredits: number;
  maxCredits: number;
  plans: PlannerPlan[];
  planProgress: Record<string, { scheduled: number; total: number }>;
  onAddPlan: (name: string, type: PlanType) => PlannerPlan | null;
  onRemovePlan: (planId: string) => void;
  onCollapsePanel?: () => void;
}

export const RequirementsSidebar = ({
  totalCredits,
  maxCredits,
  plans,
  planProgress,
  onAddPlan,
  onRemovePlan,
  onCollapsePanel,
}: RequirementsProps) => {
  const [planName, setPlanName] = useState('');
  const [planType, setPlanType] = useState<PlanType>('major');
  const [showAdd, setShowAdd] = useState(false);

  const sortedPlans = useMemo(
    () => [...plans].sort((a, b) => a.name.localeCompare(b.name)),
    [plans],
  );

  const handleAddPlan = () => {
    const created = onAddPlan(planName, planType);
    if (created) {
      setPlanName('');
      setShowAdd(false);
    }
  };

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
          onClick={() => setShowAdd((prev) => !prev)}
        >
          Add major/minor
        </Button>
        {showAdd && (
          <div className="border border-border rounded-lg p-3 space-y-2">
            <div className="space-y-2">
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
              <Input
                placeholder="Plan name"
                value={planName}
                onChange={(e) => setPlanName(e.target.value)}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={() => setShowAdd(false)}>
                Cancel
              </Button>
              <Button size="sm" onClick={handleAddPlan} disabled={!planName.trim()}>
                Save
              </Button>
            </div>
          </div>
        )}
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
            const pct = total > 0 ? Math.min((scheduled / total) * 100, 100) : 0;
            return (
              <div
                key={plan.id}
                className="border border-border rounded-lg p-3 space-y-2"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs uppercase tracking-wide font-semibold text-muted-foreground">
                        {plan.type === 'major' ? 'Major' : 'Minor'}
                      </span>
                      <span className="text-sm font-semibold text-foreground">{plan.name}</span>
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-1">
                      Tagged classes: {total || 0}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                    onClick={() => onRemovePlan(plan.id)}
                    aria-label={`Remove ${plan.name}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-muted-foreground">Progress</span>
                    <span className="font-medium text-foreground">
                      {scheduled}/{total || '—'} classes
                    </span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        plan.type === 'major' ? 'bg-primary' : 'bg-amber-500'
                      }`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  {total === 0 && (
                    <p className="text-[11px] text-muted-foreground mt-1">
                      Tag classes to this plan in the Add class dialog to start tracking.
                    </p>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
