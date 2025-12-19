import { GraduationCap, Download, Settings, Wrench, UserRound } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { PlanSwitcher } from '@/components/PlanSwitcher';
import { PlanProfile } from '@/types/planner';

interface PlannerHeaderProps {
  degreeName: string;
  university: string;
  classYear: number;
  userLabel?: string;
  userPhotoUrl?: string;
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
  userLabel,
  cloudStatus,
  cloudBusy,
  onSignIn,
  onSignOut,
  userPhotoUrl,
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
  const canOpenProfile = Boolean(onOpenProfile);
  const handlersReady =
    planProfiles && onSelectPlanProfile && onCreatePlanProfile && onDeletePlanProfile;
  const activePlanProfile =
    planProfiles && activePlanProfileId ? planProfiles.find((plan) => plan.id === activePlanProfileId) : null;
  const headerClass = `bg-card border-b border-border ${isMobile ? 'px-4 py-3' : 'px-6 py-4'} ${
    sticky ? 'sticky top-0 z-10' : 'relative z-10'
  }`;
  const canUsePlanSwitcher = Boolean(handlersReady && planProfiles?.length);
  const planTitleContainerClass = 'min-w-0 flex-1 w-full max-w-full sm:max-w-[520px]';
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
    <div className="flex items-center gap-2 min-w-0">
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
          <Wrench className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
  const hasUniversity = Boolean(university?.trim());
  const planMeta = (
    <p className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs sm:text-sm text-muted-foreground leading-tight">
      {hasUniversity ? (
        <>
          <span className="min-w-0 break-words">{university}</span>
          <span className="hidden sm:inline">•</span>
        </>
      ) : null}
      <span className="text-[11px] sm:text-sm text-muted-foreground">Class of {classYear}</span>
    </p>
  );

  const mobileUserAction = signedIn ? onOpenProfile ?? onSignOut : onSignIn;
  const showMobileUserAction = Boolean(isMobile && mobileUserAction);
  const mobileUserLabel = signedIn ? 'Open profile' : 'Sign in to sync';
  const userInitial = userLabel?.charAt(0)?.toUpperCase() ?? 'U';

  if (isMobile) {
    return (
      <header className={headerClass}>
        <div className="flex flex-col gap-2">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-primary text-primary-foreground">
              <GraduationCap className="h-5 w-5" />
            </div>
            <div className={planTitleContainerClass}>
              {planSwitcherControl}
              <div className="mt-1">{planMeta}</div>
              {cloudStatus && (
                <p className="text-[11px] text-muted-foreground/80">{cloudStatus}</p>
              )}
            </div>
            {showMobileUserAction && (
              <Button
                variant="ghost"
                size="icon"
                className="mt-1 shrink-0 h-10 w-10 rounded-full border border-border/70 bg-background/80"
                onClick={mobileUserAction!}
                aria-label={mobileUserLabel}
                disabled={cloudBusy && !signedIn}
              >
                {signedIn && userPhotoUrl ? (
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={userPhotoUrl} alt={userLabel ?? 'Profile photo'} />
                    <AvatarFallback>{userInitial}</AvatarFallback>
                  </Avatar>
                ) : (
                  <UserRound className="h-5 w-5" />
                )}
              </Button>
            )}
          </div>
        </div>
      </header>
    );
  }

  return (
    <header className={headerClass}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 flex-1 min-w-0 sm:flex-none">
          <div className="p-2 rounded-lg bg-primary text-primary-foreground">
            <GraduationCap className="h-5 w-5" />
          </div>
          <div className={planTitleContainerClass}>
            {planSwitcherControl}
            <div className="mt-1">{planMeta}</div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 sm:flex-nowrap sm:justify-end">
          <div className="flex items-center gap-2">
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
            {canOpenProfile && (
              <Button
                variant="outline"
                size="icon"
                onClick={onOpenProfile}
                aria-label="Open profile"
              >
                <Settings className="h-4 w-4" />
              </Button>
            )}
          </div>
          {showAuth && (
            <div className="flex items-center gap-2">
              <div className="hidden lg:flex flex-col items-end">
                <span className="text-xs font-medium text-foreground">
                  {signedIn ? userLabel : "Sign in to sync"}
                </span>
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
