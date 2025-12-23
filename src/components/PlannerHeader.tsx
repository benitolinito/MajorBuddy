import { useState } from 'react';
import { GraduationCap, Download, Settings, Wrench, UserRound, Link2, ChevronDown, ListChecks } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { PlanSwitcher } from '@/components/PlanSwitcher';
import { PlanProfile } from '@/types/planner';
import { PresencePeer } from '@/hooks/useSharePresence';

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
  onOpenShare?: () => void;
  onOpenAudit?: () => void;
  onOpenProfile?: () => void;
  sticky?: boolean;
  isMobile?: boolean;
  planProfiles?: PlanProfile[];
  activePlanProfileId?: string;
  onSelectPlanProfile?: (planId: string) => void;
  onCreatePlanProfile?: (name: string, options?: { startBlank?: boolean }) => PlanProfile | void;
  onDeletePlanProfile?: (planId: string) => void;
  presencePeers?: PresencePeer[];
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
  onOpenShare,
  onOpenAudit,
  onOpenProfile,
  sticky = true,
  isMobile = false,
  planProfiles,
  activePlanProfileId,
  onSelectPlanProfile,
  onCreatePlanProfile,
  onDeletePlanProfile,
  presencePeers,
}: PlannerHeaderProps) => {
  const [planActionsOpen, setPlanActionsOpen] = useState(false);
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
  const planDisplayName = activePlanProfile?.name?.trim() || degreeName || 'Your plan';
  const fallbackPlanTitle = (
    <div className="flex items-center gap-2 min-w-0">
      <h1 className="text-base sm:text-lg font-semibold text-foreground leading-tight break-words">
        {degreeName}
      </h1>
      {!isMobile && onOpenSettings && (
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
  const planTitleContainerClass = 'min-w-0 flex-1 w-full max-w-full sm:max-w-[520px]';
  const planSettingsHandler = !isMobile ? onOpenSettings : undefined;
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
      onOpenSettings={planSettingsHandler}
    />
  ) : (
    fallbackPlanTitle
  );
  const mobilePlanSwitcher = canUsePlanSwitcher ? (
    <PlanSwitcher
      plans={planProfiles!}
      activePlanId={activePlanProfileId ?? planProfiles![0]?.id ?? ''}
      onSelectPlan={onSelectPlanProfile!}
      onCreatePlan={onCreatePlanProfile!}
      onDeletePlan={onDeletePlanProfile!}
      compact
      className="w-full"
      fallbackLabel={degreeName}
    />
  ) : (
    fallbackPlanTitle
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

  const userInitial = userLabel?.charAt(0)?.toUpperCase() ?? 'U';
  const showProfileMenu = Boolean((showAuth && authAction) || canOpenProfile);
  const profileMenuLabel = signedIn ? 'Open profile menu' : 'Open sign-in menu';
  const authMenuLabel = signedIn ? 'Sign out' : 'Sign in';
  const authActionDisabled = Boolean(!authAction || cloudBusy);
  const handlePlanAction = (action?: () => void) => {
    if (!action) return;
    action();
    setPlanActionsOpen(false);
  };
  const mobilePlanActionsDialog = isMobile ? (
    <Dialog open={planActionsOpen} onOpenChange={setPlanActionsOpen}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Plan actions</DialogTitle>
          <DialogDescription>Switch plans or export, share, and configure your schedule.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          {mobilePlanSwitcher}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Button
              type="button"
              className="h-11"
              onClick={() => handlePlanAction(onOpenExport)}
              disabled={!onOpenExport}
            >
              <Download className="mr-2 h-4 w-4" />
              Export
            </Button>
            <Button
              type="button"
              variant="secondary"
              className="h-11"
              onClick={() => handlePlanAction(onOpenAudit)}
              disabled={!onOpenAudit}
            >
              <ListChecks className="mr-2 h-4 w-4" />
              Audit
            </Button>
            <Button
              type="button"
              variant="outline"
              className="h-11"
              onClick={() => handlePlanAction(onOpenShare)}
              disabled={!onOpenShare}
            >
              <Link2 className="mr-2 h-4 w-4" />
              Share
            </Button>
            <Button
              type="button"
              variant="secondary"
              className="h-11"
              onClick={() => handlePlanAction(onOpenSettings)}
              disabled={!onOpenSettings}
            >
              <Wrench className="mr-2 h-4 w-4" />
              Configuration
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  ) : null;

  const onlinePeers = (presencePeers ?? []).filter(Boolean);
  const showPresence = onlinePeers.length > 1;
  const presenceIndicator = showPresence ? (
    <div className="flex items-center gap-2 rounded-full border border-border bg-muted/60 px-2.5 py-1 shadow-sm">
      <div className="flex -space-x-2">
        {onlinePeers.slice(0, 3).map((peer) => (
          <Avatar key={peer.id} className="h-7 w-7 border-2 border-background">
            {peer.photoUrl ? <AvatarImage src={peer.photoUrl} alt={peer.label} /> : null}
            <AvatarFallback className="bg-background text-muted-foreground">
              <UserRound className="h-3.5 w-3.5" />
            </AvatarFallback>
          </Avatar>
        ))}
      </div>
      <span className="text-xs font-semibold text-foreground">{onlinePeers.length} online</span>
    </div>
  ) : null;

  if (isMobile) {
    return (
      <>
        <header className={headerClass}>
          <div className="flex flex-col gap-3">
            <div className="flex items-start justify-between gap-3">
              <div className="flex min-w-0 flex-1 items-start gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-sm">
                  <GraduationCap className="h-5 w-5" />
                </div>
                <div className={`${planTitleContainerClass} space-y-1`}>
                  <button
                    type="button"
                    onClick={() => setPlanActionsOpen(true)}
                    className="flex w-full items-center justify-between gap-3 rounded-xl border border-border/70 bg-card/70 px-3 py-2 text-left shadow-sm transition hover:border-primary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    aria-label="Open plan actions"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                        Plan
                      </p>
                      <p className="truncate text-sm font-semibold text-foreground">{planDisplayName}</p>
                    </div>
                    <ChevronDown className="h-4 w-4 text-muted-foreground" aria-hidden />
                  </button>
                  <div>{planMeta}</div>
                  {presenceIndicator}
                  {cloudStatus && (
                    <p className="text-[11px] text-muted-foreground/80">{cloudStatus}</p>
                  )}
                </div>
              </div>
                {showProfileMenu && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-12 w-12 shrink-0 rounded-full border border-border/60 bg-background/90 shadow-sm"
                        aria-label={profileMenuLabel}
                        disabled={cloudBusy && !signedIn}
                      >
                        {signedIn && userPhotoUrl ? (
                          <Avatar className="h-10 w-10">
                            <AvatarImage src={userPhotoUrl} alt={userLabel ?? 'Profile photo'} />
                            <AvatarFallback>{userInitial}</AvatarFallback>
                          </Avatar>
                        ) : (
                          <UserRound className="h-5 w-5" />
                        )}
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
                      {authAction && (
                        <DropdownMenuItem
                          onSelect={() => authAction?.()}
                          disabled={authActionDisabled}
                        >
                          {authMenuLabel}
                        </DropdownMenuItem>
                      )}
                      {onOpenProfile && (
                        <DropdownMenuItem onSelect={() => onOpenProfile?.()}>Settings</DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
            </div>
          </div>
        </header>
        {mobilePlanActionsDialog}
      </>
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
          {presenceIndicator}
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={onOpenShare}
              disabled={!onOpenShare}
            >
              <Link2 className="h-4 w-4 mr-1.5" />
              Share
            </Button>
            <Button
              size="sm"
              variant="secondary"
              onClick={onOpenAudit}
              disabled={!onOpenAudit}
            >
              <ListChecks className="h-4 w-4 mr-1.5" />
              Audit
            </Button>
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
          {(showAuth || canOpenProfile) && (
            <div className="flex items-center gap-2">
              {showAuth && (
                <div className="hidden lg:flex flex-col items-end">
                  <span className="text-xs font-medium text-foreground">
                    {signedIn ? userLabel : 'Sign in to sync'}
                  </span>
                  {cloudStatus && (
                    <span className="text-[11px] text-muted-foreground">{cloudStatus}</span>
                  )}
                </div>
              )}
              {showProfileMenu && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-12 w-12 rounded-full border border-border/60 bg-background/90 shadow-sm"
                      aria-label={profileMenuLabel}
                      disabled={!showProfileMenu}
                    >
                      {signedIn && userPhotoUrl ? (
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={userPhotoUrl} alt={userLabel ?? 'Profile photo'} />
                          <AvatarFallback>{userInitial}</AvatarFallback>
                        </Avatar>
                      ) : (
                        <UserRound className="h-5 w-5" />
                      )}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    {authAction && (
                      <DropdownMenuItem
                        onSelect={() => authAction?.()}
                        disabled={authActionDisabled}
                      >
                        {authMenuLabel}
                      </DropdownMenuItem>
                    )}
                    {onOpenProfile && (
                      <DropdownMenuItem onSelect={() => onOpenProfile?.()}>Settings</DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
