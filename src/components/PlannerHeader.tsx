import { GraduationCap, RotateCcw, Download, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { PlanSwitcher } from '@/components/PlanSwitcher';
import { PlanProfile } from '@/types/planner';

interface PlannerHeaderProps {
  degreeName: string;
  university: string;
  classYear: number;
  onReset: () => void;
  userLabel?: string;
  cloudStatus?: string;
  cloudBusy?: boolean;
  onSignIn?: () => void;
  onSignOut?: () => void;
  onOpenSettings?: () => void;
  onOpenExport?: () => void;
  onOpenProfile?: () => void;
  sticky?: boolean;
  isMobile?: boolean;
  planProfiles?: PlanProfile[];
  activePlanProfileId?: string;
  onSelectPlanProfile?: (planId: string) => void;
  onCreatePlanProfile?: (name: string, options?: { startBlank?: boolean }) => PlanProfile | void;
  onDeletePlanProfile?: (planId: string) => void;
}

export const PlannerHeader = ({
  degreeName,
  university,
  classYear,
  onReset,
  userLabel,
  cloudStatus,
  cloudBusy,
  onSignIn,
  onSignOut,
  onOpenSettings,
  onOpenExport,
  onOpenProfile,
  sticky = true,
  isMobile = false,
  planProfiles,
  activePlanProfileId,
  onSelectPlanProfile,
  onCreatePlanProfile,
  onDeletePlanProfile,
}: PlannerHeaderProps) => {
  const showAuth = Boolean(onSignIn || onSignOut);
  const signedIn = Boolean(userLabel);
  const authAction = signedIn ? onSignOut : onSignIn;
  const canOpenProfile = signedIn && Boolean(onOpenProfile);
  const handlersReady =
    planProfiles && onSelectPlanProfile && onCreatePlanProfile && onDeletePlanProfile;
  const activePlanProfile =
    planProfiles && activePlanProfileId ? planProfiles.find((plan) => plan.id === activePlanProfileId) : null;
  const headerClass = `bg-card border-b border-border ${isMobile ? 'px-4 py-3' : 'px-6 py-4'} ${
    sticky ? 'sticky top-0 z-10' : 'relative z-10'
  }`;
  const canUsePlanSwitcher = Boolean(handlersReady && planProfiles?.length);
  const planSwitcherControl = canUsePlanSwitcher ? (
    <PlanSwitcher
      plans={planProfiles!}
      activePlanId={activePlanProfileId ?? planProfiles![0]?.id ?? ''}
      onSelectPlan={onSelectPlanProfile!}
      onCreatePlan={onCreatePlanProfile!}
      onDeletePlan={onDeletePlanProfile!}
      variant="title"
      className="w-full"
      fallbackLabel={degreeName}
      onOpenSettings={onOpenSettings}
    />
  ) : (
    <div className="flex items-center gap-2">
      <h1 className="text-base sm:text-lg font-semibold text-foreground leading-tight break-words">
        {degreeName}
      </h1>
      {onOpenSettings && (
        <Button
          variant="ghost"
          size="icon"
          onClick={onOpenSettings}
          aria-label="Open planner settings"
        >
          <Settings className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
  const planMeta = (
    <p className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs sm:text-sm text-muted-foreground leading-tight">
      <span className="min-w-0 break-words">{degreeName}</span>
      <span className="hidden sm:inline">•</span>
      <span className="min-w-0 break-words">{university}</span>
      <span className="hidden sm:inline">•</span>
      <span className="text-[11px] sm:text-sm text-muted-foreground">Class of {classYear}</span>
    </p>
  );

  if (isMobile) {
    return (
      <header className={headerClass}>
        <div className="flex flex-col gap-2">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-primary text-primary-foreground">
              <GraduationCap className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0">
              {planSwitcherControl}
              <div className="mt-1">{planMeta}</div>
            </div>
          </div>
          <div className="flex gap-2">
            {showAuth && (
              <Button
                variant="outline"
                size="sm"
                className="flex-1 text-xs"
                onClick={authAction}
                disabled={!authAction || cloudBusy}
              >
                {signedIn ? 'Sign out' : 'Sign in to sync'}
              </Button>
            )}
            <ConfirmDialog
              trigger={
                <Button variant="outline" size="sm" className="flex-1 text-xs">
                  <RotateCcw className="h-4 w-4 mr-1.5" />
                  Reset
                </Button>
              }
              title="Reset your schedule?"
              description="Are you sure you want to reset? This will clear planned classes from your schedule. Your class library will be unaffected."
              confirmLabel="Reset schedule"
              cancelLabel="Keep schedule"
              confirmVariant="destructive"
              onConfirm={onReset}
            />
          </div>
        </div>
      </header>
    );
  }

  return (
    <header className={headerClass}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="p-2 rounded-lg bg-primary text-primary-foreground">
            <GraduationCap className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            {planSwitcherControl}
            <div className="mt-1">{planMeta}</div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 sm:flex-nowrap sm:justify-end">
          <div className="flex items-center gap-2">
            <ConfirmDialog
              trigger={
                <Button variant="outline" size="sm">
                  <RotateCcw className="h-4 w-4 mr-1.5" />
                  Reset
                </Button>
            }
              title="Reset your schedule?"
              description="Are you sure you want to reset? This will clear planned classes and restore missing years or terms. Your class library will be unaffected."
              confirmLabel="Reset schedule"
              cancelLabel="Keep schedule"
              confirmVariant="destructive"
              onConfirm={onReset}
            />
            <Button size="sm" onClick={onOpenExport} disabled={!onOpenExport}>
              <Download className="h-4 w-4 mr-1.5" />
              Export Schedule
            </Button>
            {!canUsePlanSwitcher && onOpenSettings && (
              <Button
                variant="ghost"
                size="icon"
                onClick={onOpenSettings}
                aria-label="Open planner settings"
              >
                <Settings className="h-4 w-4" />
              </Button>
            )}
          </div>
          {showAuth && (
            <div className="flex items-center gap-2">
              <div className="hidden lg:flex flex-col items-end">
                {canOpenProfile ? (
                  <button
                    type="button"
                    onClick={onOpenProfile}
                    className="text-xs font-medium text-foreground transition hover:text-primary"
                    aria-haspopup="dialog"
                  >
                    {userLabel}
                  </button>
                ) : (
                  <span className="text-xs font-medium text-foreground">
                    {signedIn ? userLabel : "Sign in to sync"}
                  </span>
                )}
                {cloudStatus && (
                  <span className="text-[11px] text-muted-foreground">{cloudStatus}</span>
                )}
              </div>
              <Button variant="outline" size="sm" onClick={authAction} disabled={!authAction || cloudBusy}>
                {signedIn ? "Sign out" : "Sign in"}
              </Button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
