import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ThemeToggle } from '@/components/ThemeToggle';
import { Database, Palette, User } from 'lucide-react';

type ProfileDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userLabel?: string;
  userEmail?: string | null;
  userPhotoUrl?: string | null;
  cloudStatus?: string;
  colorPalette?: string[];
  onSignOut?: () => void;
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
  onSignOut,
}: ProfileDialogProps) => {
  const displayName = userLabel?.trim() || 'Student';
  const emailValue = userEmail?.trim() || 'No email on file';
  const initials = getInitials(userLabel, userEmail);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl p-0">
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
            </TabsList>
          </div>
          <div className="flex-1 p-6">
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
                    <div className="ml-auto text-xs text-muted-foreground">
                      {cloudStatus ? `Sync status: ${cloudStatus}` : 'Sync status: idle'}
                    </div>
                  </div>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="rounded-xl border border-border bg-muted/30 p-4">
                    <p className="text-sm font-semibold text-foreground">Session</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Keep your plan in sync across devices and browsers.
                    </p>
                    {onSignOut && (
                      <Button type="button" variant="outline" size="sm" className="mt-4" onClick={onSignOut}>
                        Sign out
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
                      <Button
                        type="button"
                        variant="outline"
                        className="border-destructive/40 text-destructive hover:bg-destructive/10"
                      >
                        Delete my data
                      </Button>
                    </div>
                    <Separator className="bg-destructive/20" />
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="text-sm font-semibold text-foreground">Delete account</p>
                        <p className="text-xs text-muted-foreground">
                          Permanently removes your account and all associated planner data.
                        </p>
                      </div>
                      <Button type="button" variant="destructive">
                        Delete account
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};
