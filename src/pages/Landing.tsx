import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, signInWithPopup } from "firebase/auth";
import { ArrowRight, GraduationCap, LogIn, ShieldCheck, Sparkles } from "lucide-react";

import { AuthDialog } from "@/components/AuthDialog";
import { Button } from "@/components/ui/button";
import { auth, googleProvider } from "@/firebaseClient";

const Landing = () => {
  const navigate = useNavigate();
  const [authBusy, setAuthBusy] = useState(false);
  const [authStatus, setAuthStatus] = useState<string | null>(null);
  const [showAuth, setShowAuth] = useState(false);

  const handleContinue = () => navigate("/planner");

  const handleAuthSuccess = () => {
    setAuthStatus("Signed in. Redirecting to your planner...");
    navigate("/planner");
  };

  const handleLogin = () => {
    if (authBusy) return;
    if (auth.currentUser) {
      handleAuthSuccess();
      return;
    }
    setAuthStatus("Sign in to sync your plan before continuing.");
    setShowAuth(true);
  };

  const signInWithGoogle = async () => {
    setAuthBusy(true);
    setAuthStatus("Signing in with Google...");
    try {
      await signInWithPopup(auth, googleProvider);
      handleAuthSuccess();
    } catch (error) {
      const message = error instanceof Error ? error.message : "We could not complete the sign in right now.";
      setAuthStatus(message);
      throw new Error(message);
    } finally {
      setAuthBusy(false);
    }
  };

  const signInWithEmail = async (email: string, password: string) => {
    setAuthBusy(true);
    setAuthStatus("Signing in...");
    try {
      await signInWithEmailAndPassword(auth, email, password);
      handleAuthSuccess();
    } catch (error) {
      const message = error instanceof Error ? error.message : "We could not complete the sign in right now.";
      setAuthStatus(message);
      throw new Error(message);
    } finally {
      setAuthBusy(false);
    }
  };

  const registerWithEmail = async (email: string, password: string) => {
    setAuthBusy(true);
    setAuthStatus("Creating your account...");
    try {
      await createUserWithEmailAndPassword(auth, email, password);
      handleAuthSuccess();
    } catch (error) {
      const message = error instanceof Error ? error.message : "We could not complete the sign up right now.";
      setAuthStatus(message);
      throw new Error(message);
    } finally {
      setAuthBusy(false);
    }
  };

  return (
    <>
      <AuthDialog
        open={showAuth}
        onOpenChange={setShowAuth}
        busy={authBusy}
        status={authStatus}
        onSignInWithGoogle={signInWithGoogle}
        onEmailSignIn={signInWithEmail}
        onEmailRegister={registerWithEmail}
      />

      <main className="relative min-h-screen overflow-hidden bg-gradient-to-br from-primary/10 via-background to-background text-foreground">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -left-12 top-10 h-56 w-56 rounded-full bg-primary/25 blur-3xl" />
          <div className="absolute right-0 bottom-10 h-64 w-64 rounded-full bg-amber-200/50 blur-3xl" />
        </div>

        <div className="relative mx-auto flex max-w-6xl flex-col gap-12 px-6 py-10 lg:flex-row lg:items-center lg:py-16">
          <section className="flex-1 space-y-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1 text-sm font-medium text-primary">
              <Sparkles className="h-4 w-4" />
              MajorBuddy Planner
            </div>
            <h1 className="text-4xl font-semibold leading-[1.1] sm:text-5xl">
              Build your degree plan with confidence and zero guesswork.
            </h1>
            <p className="max-w-2xl text-lg text-muted-foreground">
              Move from course chaos to a clear, semester-by-semester roadmap. Login to sync your plan or continue to
              start mapping right away.
            </p>
            <div className="flex flex-wrap gap-3">
              <Button size="lg" onClick={handleContinue} className="min-w-[140px] shadow-md shadow-primary/20">
                Continue
                <ArrowRight className="h-4 w-4" />
              </Button>
              <Button size="lg" variant="outline" onClick={handleLogin} disabled={authBusy} className="min-w-[140px]">
                <LogIn className="h-4 w-4" />
                {authBusy ? "Signing in..." : "Login"}
              </Button>
            </div>
            {authStatus && <p className="text-sm text-muted-foreground">{authStatus}</p>}

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-xl border border-border bg-card/80 p-4 shadow-sm backdrop-blur">
                <div className="flex items-start gap-3">
                  <div className="rounded-lg bg-primary/15 p-2 text-primary">
                    <GraduationCap className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="font-medium">Stay on track</p>
                    <p className="text-sm text-muted-foreground">
                      Track credits, requirements, and terms with a clear hierarchy that mirrors your degree.
                    </p>
                  </div>
                </div>
              </div>
              <div className="rounded-xl border border-border bg-card/80 p-4 shadow-sm backdrop-blur">
                <div className="flex items-start gap-3">
                  <div className="rounded-lg bg-amber-100 p-2 text-amber-700">
                    <ShieldCheck className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="font-medium">Sync securely</p>
                    <p className="text-sm text-muted-foreground">
                      Sign in with Google or email to save snapshots in the cloud and continue where you left off.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className="flex-1">
            <div className="relative overflow-hidden rounded-2xl border border-border bg-card/80 shadow-2xl backdrop-blur">
              <div className="absolute -right-8 -top-16 h-32 w-32 rounded-full bg-primary/10 blur-2xl" />
              <div className="space-y-6 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">Preview</p>
                    <p className="text-lg font-semibold">Semester Snapshot</p>
                  </div>
                  <Button variant="ghost" size="sm" onClick={handleContinue}>
                    Open planner
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="rounded-lg bg-secondary p-4">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">Credits planned</p>
                    <p className="text-3xl font-semibold text-foreground">120</p>
                    <p className="text-sm text-muted-foreground">Four-year target locked in</p>
                  </div>
                  <div className="rounded-lg bg-secondary p-4">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">Requirements</p>
                    <p className="text-3xl font-semibold text-foreground">85%</p>
                    <p className="text-sm text-muted-foreground">Core & gen ed on track</p>
                  </div>
                </div>

                <div className="rounded-xl border border-dashed border-border p-4 text-sm text-muted-foreground">
                  Drag courses into terms, watch credits update instantly, and keep everything synced once you log in.
                </div>
              </div>
            </div>
          </section>
        </div>
      </main>
    </>
  );
};

export default Landing;
