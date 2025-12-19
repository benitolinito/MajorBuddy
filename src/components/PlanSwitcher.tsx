import { useMemo, useState } from 'react';
import { ChevronDown, Copy, Sparkles, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { PlanProfile } from '@/types/planner';
import { buildDuplicatePlanName, DEFAULT_PLAN_NAME, getSuggestedPlanName } from '@/lib/plannerProfiles';

type PlanSwitcherProps = {
  plans: PlanProfile[];
  activePlanId: string;
  onSelectPlan: (planId: string) => void;
  onCreatePlan: (name: string, options?: { startBlank?: boolean }) => PlanProfile | void;
  onDeletePlan: (planId: string) => void;
  compact?: boolean;
};

export const PlanSwitcher = ({
  plans,
  activePlanId,
  onSelectPlan,
  onCreatePlan,
  onDeletePlan,
  compact = false,
}: PlanSwitcherProps) => {
  const activePlan = useMemo(() => plans.find((plan) => plan.id === activePlanId), [plans, activePlanId]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [planName, setPlanName] = useState('');
  const [startBlank, setStartBlank] = useState(false);
  const planLabel = activePlan?.name ?? 'Select a plan';

  const defaultNewPlanName = useMemo(() => {
    if (activePlan?.name) return buildDuplicatePlanName(activePlan.name, plans);
    if (plans.length) return getSuggestedPlanName(plans);
    return DEFAULT_PLAN_NAME;
  }, [activePlan?.name, plans]);

  const openCreateDialog = (blank = false) => {
    setPlanName(blank ? '' : defaultNewPlanName);
    setStartBlank(blank);
    setDialogOpen(true);
  };

  const handleSubmitDialog = () => {
    if (!planName.trim()) return;
    onCreatePlan(planName, { startBlank });
    setDialogOpen(false);
  };

  const handleDeletePlan = () => {
    if (plans.length <= 1 || !activePlanId) return;
    onDeletePlan(activePlanId);
  };

  const dropdown = (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={compact ? 'max-w-[200px] justify-between' : 'w-full justify-between'}
        >
          <span className="min-w-0 flex-1 truncate text-left">{planLabel}</span>
          <ChevronDown className="h-4 w-4" aria-hidden />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-72" align={compact ? 'end' : 'start'} sideOffset={8}>
        <DropdownMenuLabel>Saved plans</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuRadioGroup value={activePlanId} onValueChange={onSelectPlan}>
          {plans.map((plan) => (
            <DropdownMenuRadioItem key={plan.id} value={plan.id}>
              {plan.name}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onSelect={(event) => {
            event.preventDefault();
            openCreateDialog(false);
          }}
        >
          <Copy className="h-4 w-4 mr-2" aria-hidden />
          Duplicate current plan
        </DropdownMenuItem>
        <DropdownMenuItem
          onSelect={(event) => {
            event.preventDefault();
            openCreateDialog(true);
          }}
        >
          <Sparkles className="h-4 w-4 mr-2" aria-hidden />
          New blank plan
        </DropdownMenuItem>
        <DropdownMenuItem
          disabled={plans.length <= 1}
          className="text-destructive focus:text-destructive"
          onSelect={(event) => {
            event.preventDefault();
            handleDeletePlan();
          }}
        >
          <Trash2 className="h-4 w-4 mr-2" aria-hidden />
          Delete current plan
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  const dialog = (
    <Dialog
      open={dialogOpen}
      onOpenChange={(open) => {
        setDialogOpen(open);
          if (!open) {
            setStartBlank(false);
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Save as a new plan</DialogTitle>
            <DialogDescription>Capture this schedule as its own plan so you can branch out ideas.</DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="plan-name">Plan name</Label>
              <Input
                id="plan-name"
                value={planName}
                autoFocus
                onChange={(event) => setPlanName(event.target.value)}
              />
            </div>
            <label className="flex items-center gap-2 text-sm text-foreground">
              <Checkbox
                checked={startBlank}
                onCheckedChange={(checked) => setStartBlank(Boolean(checked))}
                aria-label="Start from an empty schedule"
              />
              <span className="text-sm">Start from an empty schedule</span>
            </label>
          </div>

          <div className="flex justify-end gap-2 pt-3">
            <Button variant="ghost" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmitDialog} disabled={!planName.trim()}>Create plan</Button>
          </div>
        </DialogContent>
      </Dialog>
  );

  if (compact) {
    return (
      <>
        <div className="flex items-center justify-end gap-2">{dropdown}</div>
        {dialog}
      </>
    );
  }

  return (
    <div className="rounded-lg border border-border bg-card/80 p-3 shadow-sm">
      <div className="space-y-1.5">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">My Plans</p>
        {dropdown}
        <p className="text-[11px] text-muted-foreground">Save variations and swap quickly.</p>
      </div>
      {dialog}
    </div>
  );
};
