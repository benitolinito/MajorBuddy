import { GraduationCap, RotateCcw, Download, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { ThemeToggle } from '@/components/ThemeToggle';

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
}: PlannerHeaderProps) => {
  const showAuth = Boolean(onSignIn || onSignOut);
  const signedIn = Boolean(userLabel);
  const authAction = signedIn ? onSignOut : onSignIn;

  return (
    <header className="bg-card border-b border-border px-6 py-4 sticky top-0 z-10">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary text-primary-foreground">
            <GraduationCap className="h-5 w-5" />
          </div>
          <div>
            <h1 className="font-semibold text-lg text-foreground">{degreeName}</h1>
            <p className="text-sm text-muted-foreground">
              {university} • Class of {classYear}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 sm:flex-nowrap">
          <div className="flex items-center gap-2">
            <ConfirmDialog
              trigger={
                <Button variant="outline" size="sm">
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
            <Button size="sm" onClick={onOpenExport} disabled={!onOpenExport}>
              <Download className="h-4 w-4 mr-1.5" />
              Export Schedule
            </Button>
            <ThemeToggle />
            <Button
              variant="ghost"
              size="icon"
              onClick={onOpenSettings}
              aria-label="Open planner settings"
            >
              <Settings className="h-4 w-4" />
            </Button>
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
