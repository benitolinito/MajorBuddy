import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ThemeToggle } from '@/components/ThemeToggle';
import { Database, Info, Palette, User } from 'lucide-react';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { AboutContent } from '@/components/AboutDialog';

type ProfileDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userLabel?: string;
  userEmail?: string | null;
  userPhotoUrl?: string | null;
  cloudStatus?: string;
  colorPalette?: string[];
  onSignIn?: () => void;
  onSignOut?: () => void;
  onDeleteData?: () => void | Promise<void>;
  onDeleteAccount?: () => void | Promise<void>;
  deletingData?: boolean;
  deletingAccount?: boolean;
};

const getInitials = (label?: string, email?: string | null) => {
  const base = (label?.trim() || email?.split('@')[0] || 'User').trim();
  const parts = base.split(' ').filter(Boolean);
  const initials =
    parts.length >= 2
      ? `${parts[0]?.[0] ?? ''}${parts[1]?.[0] ?? ''}`
      : base.slice(0, 2);
  return initials.toUpperCase() || 'U';
};

export const ProfileDialog = ({
  open,
  onOpenChange,
  userLabel,
  userEmail,
  userPhotoUrl,
  cloudStatus,
  colorPalette = [],
  onSignIn,
  onSignOut,
  onDeleteData,
  onDeleteAccount,
  deletingData = false,
  deletingAccount = false,
}: ProfileDialogProps) => {
  const isSignedIn = Boolean(userLabel || userEmail);
  const displayName = isSignedIn ? userLabel?.trim() || 'Student' : 'Not signed in';
  const emailValue = isSignedIn ? userEmail?.trim() || 'No email on file' : 'Connect your account to sync plans.';
  const initials = getInitials(userLabel, userEmail);
  const canSignOut = Boolean(onSignOut && isSignedIn);
  const canSignIn = Boolean(onSignIn && !isSignedIn);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl p-0 sm:min-h-[520px]">
        <Tabs defaultValue="account" orientation="vertical" className="flex flex-col sm:flex-row">
          <div className="border-b border-border bg-muted/30 p-4 sm:w-60 sm:border-b-0 sm:border-r">
            <DialogHeader className="text-left">
              <DialogTitle>Profile</DialogTitle>
              <DialogDescription>Manage your account, appearance, and saved data.</DialogDescription>
            </DialogHeader>
            <TabsList className="mt-4 flex h-auto w-full flex-col items-stretch gap-2 bg-transparent p-0">
              <TabsTrigger value="account" className="w-full justify-start gap-2">
                <User className="h-4 w-4" />
                Account
              </TabsTrigger>
              <TabsTrigger value="appearance" className="w-full justify-start gap-2">
                <Palette className="h-4 w-4" />
                Appearance
              </TabsTrigger>
              <TabsTrigger value="data" className="w-full justify-start gap-2">
                <Database className="h-4 w-4" />
                Data
              </TabsTrigger>
              <TabsTrigger value="about" className="w-full justify-start gap-2">
                <Info className="h-4 w-4" />
                About
              </TabsTrigger>
            </TabsList>
          </div>
          <div className="flex-1 p-6 min-h-[420px]">
            <TabsContent value="account" className="mt-0">
              <div className="space-y-6">
                <div className="rounded-xl border border-border bg-card p-4">
                  <div className="flex flex-wrap items-center gap-4">
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={userPhotoUrl ?? undefined} alt={displayName} />
                      <AvatarFallback>{initials}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-[160px]">
                      <p className="text-sm font-semibold text-foreground">{displayName}</p>
                      <p className="text-xs text-muted-foreground">{emailValue}</p>
                    </div>
                    {isSignedIn && (
                      <div className="ml-auto text-xs text-muted-foreground">
                        {cloudStatus ? `Sync status: ${cloudStatus}` : 'Sync status: idle'}
                      </div>
                    )}
                  </div>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="rounded-xl border border-border bg-muted/30 p-4">
                    <p className="text-sm font-semibold text-foreground">Session</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Keep your plan in sync across devices and browsers.
                    </p>
                    {canSignOut && (
                      <Button type="button" variant="outline" size="sm" className="mt-4" onClick={onSignOut}>
                        Sign out
                      </Button>
                    )}
                    {canSignIn && (
                      <Button type="button" size="sm" className="mt-4" onClick={onSignIn}>
                        Sign in
                      </Button>
                    )}
                  </div>
                  <div className="rounded-xl border border-border bg-muted/30 p-4">
                    <p className="text-sm font-semibold text-foreground">Profile info</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Plan profiles, schedules, and saved courses stay linked to this account.
                    </p>
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="appearance" className="mt-0">
              <div className="space-y-6">
                <div className="rounded-xl border border-border bg-card p-4">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-sm font-semibold text-foreground">Theme</p>
                      <p className="text-xs text-muted-foreground">Switch between light and dark mode.</p>
                    </div>
                    <ThemeToggle />
                  </div>
                </div>
                <div className="rounded-xl border border-border bg-card p-4">
                  <p className="text-sm font-semibold text-foreground">Planner palette</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Your saved accent colors for course tags and requirements.
                  </p>
                  {colorPalette.length > 0 ? (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {colorPalette.map((color) => (
                        <div
                          key={color}
                          className="flex items-center gap-2 rounded-full border border-border bg-muted/20 px-2 py-1 text-xs"
                        >
                          <span
                            className="h-3.5 w-3.5 rounded-full border border-border"
                            style={{ backgroundColor: color }}
                            title={color}
                          />
                          <span className="text-muted-foreground">{color}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="mt-3 text-xs text-muted-foreground">No custom colors yet.</p>
                  )}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="data" className="mt-0">
              <div className="space-y-4">
                <div className="rounded-xl border border-border bg-muted/30 p-4">
                  <p className="text-sm font-semibold text-foreground">Data controls</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Remove planner data or close your account entirely. These actions cannot be undone.
                  </p>
                </div>
                <div className="rounded-xl border border-destructive/40 bg-destructive/5 p-4">
                  <div className="flex flex-col gap-4">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="text-sm font-semibold text-foreground">Delete planner data</p>
                        <p className="text-xs text-muted-foreground">
                          Clears schedules, saved courses, and requirements but keeps your account.
                        </p>
                      </div>
                      <ConfirmDialog
                        title="Delete planner data?"
                        description="This removes schedules, saved courses, and requirements from this device and/or the cloud if signed in."
                        confirmLabel={deletingData ? 'Deleting...' : 'Delete data'}
                        cancelLabel="Keep data"
                        confirmVariant="destructive"
                        confirmationText="DELETE"
                        confirmationLabel="Type DELETE to confirm"
                        confirmationPlaceholder="DELETE"
                        confirmationHint="This action cannot be undone."
                        confirmDisabled={deletingData || !onDeleteData}
                        onConfirm={() => onDeleteData?.()}
                        trigger={
                          <Button
                            type="button"
                            variant="outline"
                            className="border-destructive/40 text-destructive hover:bg-destructive/10"
                            disabled={deletingData || !onDeleteData}
                          >
                            {deletingData ? 'Deleting...' : 'Delete my data'}
                          </Button>
                        }
                      />
                    </div>
                    <Separator className="bg-destructive/20" />
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="text-sm font-semibold text-foreground">Delete account</p>
                        <p className="text-xs text-muted-foreground">
                          Permanently removes your account and all associated planner data.
                        </p>
                      </div>
                      <ConfirmDialog
                        title="Delete your account?"
                        description="This permanently removes your account and planner data. You may be asked to sign in again before continuing."
                        confirmLabel={deletingAccount ? 'Deleting...' : 'Delete account'}
                        cancelLabel="Keep account"
                        confirmVariant="destructive"
                        confirmationText="DELETE ACCOUNT"
                        confirmationLabel="Type DELETE ACCOUNT"
                        confirmationPlaceholder="DELETE ACCOUNT"
                        confirmationHint="This action cannot be undone."
                        confirmDisabled={deletingAccount || !onDeleteAccount}
                        onConfirm={() => onDeleteAccount?.()}
                        trigger={
                          <Button
                            type="button"
                            variant="destructive"
                            disabled={deletingAccount || !onDeleteAccount}
                          >
                            {deletingAccount ? 'Deleting...' : 'Delete account'}
                          </Button>
                        }
                      />
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="about" className="mt-0">
              <div className="space-y-4">
                <div className="rounded-xl border border-border bg-muted/30 p-4">
                  <p className="text-sm font-semibold text-foreground">Policies</p>
                  <p className="mt-1 text-xs text-muted-foreground">Review how we handle terms and privacy.</p>
                  <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                    <Button asChild variant="outline" className="justify-start sm:justify-center">
                      <a href="/terms">Terms of Service</a>
                    </Button>
                    <Button asChild variant="outline" className="justify-start sm:justify-center">
                      <a href="/privacy">Privacy Policy</a>
                    </Button>
                  </div>
                </div>
                <div className="space-y-2">
                  <div>
                    <p className="text-sm font-semibold text-foreground">About MajorBuddy</p>
                    <p className="text-xs text-muted-foreground">Learn more about who built this project.</p>
                  </div>
                  <AboutContent />
                </div>
              </div>
            </TabsContent>
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};
