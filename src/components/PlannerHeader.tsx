import { GraduationCap, RotateCcw, FileText, Download, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface PlannerHeaderProps {
  degreeName: string;
  university: string;
  classYear: number;
  totalCredits: number;
  maxCredits: number;
  onReset: () => void;
  userLabel?: string;
  cloudStatus?: string;
  cloudBusy?: boolean;
  onSignIn?: () => void;
  onSignOut?: () => void;
}

export const PlannerHeader = ({
  degreeName,
  university,
  classYear,
  totalCredits,
  maxCredits,
  onReset,
  userLabel,
  cloudStatus,
  cloudBusy,
  onSignIn,
  onSignOut,
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

        <div className="flex flex-wrap items-center gap-4 sm:flex-nowrap">
          <div className="text-right sm:mr-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Total Credits</p>
            <p className="text-xl font-bold text-foreground">
              <span className="text-primary">{totalCredits}</span>
              <span className="text-muted-foreground font-normal"> / {maxCredits}</span>
            </p>
          </div>

          <Button variant="outline" size="sm" onClick={onReset}>
            <RotateCcw className="h-4 w-4 mr-1.5" />
            Reset
          </Button>
          <Button variant="outline" size="sm">
            <FileText className="h-4 w-4 mr-1.5" />
            Audit Report
          </Button>
          <Button size="sm">
            <Download className="h-4 w-4 mr-1.5" />
            Export Schedule
          </Button>
          <Button variant="ghost" size="icon" className="ml-1">
            <Settings className="h-4 w-4" />
          </Button>
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
