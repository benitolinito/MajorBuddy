import { useEffect, useState } from "react";
import { Loader2, LogIn, Mail, ShieldCheck, UserPlus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";

type AuthMode = "signin" | "signup";

type AuthDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  busy?: boolean;
  status?: string | null;
  onSignInWithGoogle: () => Promise<void>;
  onEmailSignIn: (email: string, password: string) => Promise<void>;
  onEmailRegister?: (email: string, password: string) => Promise<void>;
  onSuccess?: () => void;
};

export const AuthDialog = ({
  open,
  onOpenChange,
  busy = false,
  status,
  onSignInWithGoogle,
  onEmailSignIn,
  onEmailRegister,
  onSuccess,
}: AuthDialogProps) => {
  const [mode, setMode] = useState<AuthMode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setFormError(null);
    } else {
      setPassword("");
    }
  }, [open]);

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      setFormError(null);
    }
    onOpenChange(nextOpen);
  };

  const handleGoogle = async () => {
    setFormError(null);
    try {
      await onSignInWithGoogle();
      onSuccess?.();
      onOpenChange(false);
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "We couldn’t complete Google sign in.");
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setFormError(null);
    const trimmedEmail = email.trim();
    const trimmedPassword = password.trim();

    if (!trimmedEmail || !trimmedPassword) {
      setFormError("Enter both an email and password to continue.");
      return;
    }

    try {
      if (mode === "signup" && onEmailRegister) {
        await onEmailRegister(trimmedEmail, trimmedPassword);
      } else {
        await onEmailSignIn(trimmedEmail, trimmedPassword);
      }
      onSuccess?.();
      onOpenChange(false);
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "We couldn’t complete that request.");
    }
  };

  const submitLabel = mode === "signin" ? "Sign in with email" : "Create account";
  const hint =
    mode === "signin"
      ? "Use the email you’ve signed up with before."
      : "Set a password with at least 6 characters.";

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Login to sync your planner</DialogTitle>
          <DialogDescription>
            Save your schedule to the cloud and pick up on any device. Choose Google or your email—whatever is easiest.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-6 lg:grid-cols-5">
          <div className="lg:col-span-3 space-y-4">
            <Button
              type="button"
              variant="outline"
              className="w-full justify-center gap-2"
              onClick={handleGoogle}
              disabled={busy}
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogIn className="h-4 w-4" />}
              Continue with Google
            </Button>

            <div className="relative py-1">
              <Separator />
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="rounded-full bg-background px-3 text-xs uppercase tracking-[0.2em] text-muted-foreground">
                  or
                </span>
              </div>
            </div>

            <form className="space-y-4" onSubmit={handleSubmit}>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="auth-email">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="auth-email"
                      type="email"
                      autoComplete="email"
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      className="pl-10"
                      disabled={busy}
                      placeholder="you@example.com"
                    />
                  </div>
                </div>

                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="auth-password">Password</Label>
                  <Input
                    id="auth-password"
                    type="password"
                    autoComplete={mode === "signup" ? "new-password" : "current-password"}
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    disabled={busy}
                    placeholder="••••••••"
                    minLength={6}
                  />
                  <p className="text-xs text-muted-foreground">{hint}</p>
                </div>
              </div>

              {formError && <p className="text-sm text-destructive">{formError}</p>}
              {status && !formError && <p className="text-sm text-muted-foreground">{status}</p>}

              <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                <button
                  type="button"
                  className="text-sm font-medium text-primary underline-offset-4 hover:underline"
                  onClick={() => setMode((prev) => (prev === "signin" ? "signup" : "signin"))}
                  disabled={busy}
                >
                  {mode === "signin" ? "Create a new account instead" : "Use an existing account"}
                </button>
                <div className="flex items-center gap-2">
                  {mode === "signup" && (
                    <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                      <UserPlus className="h-3.5 w-3.5" />
                      New profiles sync once you sign in.
                    </span>
                  )}
                  <Button type="submit" disabled={busy}>
                    {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ShieldCheck className="mr-2 h-4 w-4" />}
                    {submitLabel}
                  </Button>
                </div>
              </div>
            </form>
          </div>

          <div className="lg:col-span-2 space-y-3 rounded-xl border border-border bg-muted/50 p-4">
            <p className="text-sm font-semibold text-foreground">What you get</p>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-start gap-2">
                <ShieldCheck className="mt-0.5 h-4 w-4 text-primary" />
                <span>Cloud backups so your terms and credits stay safe.</span>
              </li>
              <li className="flex items-start gap-2">
                <ShieldCheck className="mt-0.5 h-4 w-4 text-primary" />
                <span>Sync across devices without re-entering your plan.</span>
              </li>
              <li className="flex items-start gap-2">
                <ShieldCheck className="mt-0.5 h-4 w-4 text-primary" />
                <span>Fast sign-in with Google or secure email access.</span>
              </li>
            </ul>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
