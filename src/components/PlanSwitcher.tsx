import { useMemo, useState } from 'react';
import { ChevronDown, Copy, Pencil, Sparkles, Trash2 } from 'lucide-react';
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

type PlanDialogMode = 'create' | 'rename';

type PlanSwitcherProps = {
  plans: PlanProfile[];
  activePlanId: string;
  onSelectPlan: (planId: string) => void;
  onCreatePlan: (name: string, options?: { startBlank?: boolean }) => PlanProfile | void;
  onRenamePlan: (planId: string, name: string) => void;
  onDeletePlan: (planId: string) => void;
};

export const PlanSwitcher = ({
  plans,
  activePlanId,
  onSelectPlan,
  onCreatePlan,
  onRenamePlan,
  onDeletePlan,
}: PlanSwitcherProps) => {
  const activePlan = useMemo(() => plans.find((plan) => plan.id === activePlanId), [plans, activePlanId]);
  const [dialogMode, setDialogMode] = useState<PlanDialogMode>('create');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [planName, setPlanName] = useState('');
  const [startBlank, setStartBlank] = useState(false);

  const defaultNewPlanName = useMemo(() => {
    if (activePlan?.name) return `${activePlan.name} copy`;
    return plans.length ? `Plan ${plans.length + 1}` : 'My plan';
  }, [activePlan?.name, plans.length]);

  const openCreateDialog = (blank = false) => {
    setDialogMode('create');
    setPlanName(defaultNewPlanName);
    setStartBlank(blank);
    setDialogOpen(true);
  };

  const openRenameDialog = () => {
    setDialogMode('rename');
    setPlanName(activePlan?.name ?? '');
    setStartBlank(false);
    setDialogOpen(true);
  };

  const handleSubmitDialog = () => {
    if (!planName.trim() && dialogMode === 'rename') {
      return;
    }

    if (dialogMode === 'create') {
      onCreatePlan(planName, { startBlank });
    } else if (activePlanId) {
      onRenamePlan(activePlanId, planName);
    }
    setDialogOpen(false);
  };

  const handleDeletePlan = () => {
    if (plans.length <= 1 || !activePlanId) return;
    onDeletePlan(activePlanId);
  };

  return (
    <div className="rounded-lg border border-border bg-card/80 p-3 shadow-sm">
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">My Plans</p>
          <p className="text-sm font-semibold text-foreground">{activePlan?.name ?? 'Select a plan'}</p>
          <p className="text-[11px] text-muted-foreground">Save variations and swap quickly.</p>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="gap-1">
              My Plans
              <ChevronDown className="h-4 w-4" aria-hidden />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-72" align="start" sideOffset={8}>
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
              onSelect={(event) => {
                event.preventDefault();
                openRenameDialog();
              }}
            >
              <Pencil className="h-4 w-4 mr-2" aria-hidden />
              Rename current plan
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
      </div>

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
            <DialogTitle>{dialogMode === 'create' ? 'Save as a new plan' : 'Rename this plan'}</DialogTitle>
            <DialogDescription>
              {dialogMode === 'create'
                ? 'Capture this schedule as its own plan so you can branch out ideas.'
                : 'Give this plan a clear name so you can spot it later.'}
            </DialogDescription>
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
            {dialogMode === 'create' && (
              <label className="flex items-center gap-2 text-sm text-foreground">
                <Checkbox
                  checked={startBlank}
                  onCheckedChange={(checked) => setStartBlank(Boolean(checked))}
                  aria-label="Start from an empty schedule"
                />
                <span className="text-sm">Start from an empty schedule</span>
              </label>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-3">
            <Button variant="ghost" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmitDialog}>
              {dialogMode === 'create' ? 'Create plan' : 'Save name'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
