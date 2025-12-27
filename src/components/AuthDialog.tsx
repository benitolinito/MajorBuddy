import { useEffect, useState, type SVGProps } from "react";
import { Loader2, Mail, ShieldCheck, UserPlus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";

type AuthMode = "signin" | "signup";

const GoogleIcon = (props: SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 18 18" aria-hidden="true" {...props}>
    <path
      fill="#4285F4"
      d="M17.64 9.2045c0-.638-.0573-1.2518-.1636-1.8409H9v3.4818h4.8445c-.2082 1.125-.8427 2.0782-1.7959 2.7164v2.2591h2.9087c1.7009-1.5655 2.6827-3.8741 2.6827-6.6164Z"
    />
    <path
      fill="#34A853"
      d="M9 18c2.43 0 4.4673-.806 5.9564-2.1782l-2.9087-2.2591c-.806.54-1.8382.8591-3.0477.8591-2.3441 0-4.3282-1.5837-5.0364-3.7105H.9573v2.3318C2.4382 15.9859 5.4818 18 9 18Z"
    />
    <path
      fill="#FBBC05"
      d="M3.9636 10.7109c-.18-.54-.2827-1.1168-.2827-1.7109s.1027-1.1709.2827-1.7109V4.9573H.9573C.3477 6.1732 0 7.5505 0 9s.3477 2.8268.9573 4.0427l3.0063-2.3318Z"
    />
    <path
      fill="#EA4335"
      d="M9 3.5795c1.3214 0 2.5082.4541 3.4391 1.3459l2.5795-2.5795C13.4645.8914 11.4273 0 9 0 5.4818 0 2.4382 2.0141.9573 4.9573l3.0063 2.3318C4.6718 5.1632 6.6559 3.5795 9 3.5795Z"
    />
  </svg>
);

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
  const [confirmPassword, setConfirmPassword] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setFormError(null);
    } else {
      setPassword("");
      setConfirmPassword("");
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
    const trimmedConfirmPassword = confirmPassword.trim();

    if (!trimmedEmail || !trimmedPassword) {
      setFormError("Enter both an email and password to continue.");
      return;
    }

    if (mode === "signup") {
      if (trimmedPassword.length < 6) {
        setFormError("Password must be at least 6 characters.");
        return;
      }
      if (trimmedPassword !== trimmedConfirmPassword) {
        setFormError("Passwords need to match.");
        return;
      }
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
  const hint = mode === "signin" ? "Enter your email and password to continue." : "Use a password with at least 6 characters.";

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader className="space-y-2">
          <DialogTitle>Sign in to sync your planner</DialogTitle>
          <DialogDescription>Use Google for one-tap access or email to sign in or create an account.</DialogDescription>
        </DialogHeader>

        <div className="grid gap-6 lg:grid-cols-5">
          <form className="lg:col-span-3 space-y-4 rounded-xl border border-border/80 bg-card p-5 shadow-sm" onSubmit={handleSubmit}>
            <div className="space-y-2">
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

            <div className="space-y-2">
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

            {mode === "signup" && (
              <div className="space-y-2">
                <Label htmlFor="auth-confirm-password">Confirm password</Label>
                <Input
                  id="auth-confirm-password"
                  type="password"
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  disabled={busy}
                  placeholder="Repeat password"
                  minLength={6}
                />
              </div>
            )}

            {formError && <p className="text-sm text-destructive">{formError}</p>}
            {status && !formError && <p className="text-sm text-muted-foreground">{status}</p>}

            <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
              <button
                type="button"
                className="text-sm font-medium text-primary underline-offset-4 hover:underline"
                onClick={() => {
                  setMode((prev) => (prev === "signin" ? "signup" : "signin"));
                  setFormError(null);
                  setConfirmPassword("");
                }}
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

          <div className="lg:col-span-2 space-y-4 rounded-xl border border-border/80 bg-muted/40 p-4 shadow-sm">
            <p className="text-sm font-semibold text-foreground">Quick sign-in</p>
            <Button
              type="button"
              variant="outline"
              className="w-full justify-center gap-2"
              onClick={handleGoogle}
              disabled={busy}
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <GoogleIcon className="h-4 w-4" />}
              Continue with Google
            </Button>
            <Separator />
            <ul className="space-y-1 text-sm text-muted-foreground">
              <li className="flex items-start gap-2">
                <ShieldCheck className="mt-0.5 h-4 w-4 text-primary" />
                <span>Sync and back up your planner automatically.</span>
              </li>
              <li className="flex items-start gap-2">
                <ShieldCheck className="mt-0.5 h-4 w-4 text-primary" />
                <span>Secure access with Google or your email password.</span>
              </li>
            </ul>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
