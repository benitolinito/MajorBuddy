import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, signInWithPopup } from "firebase/auth";
import {
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  GraduationCap,
  Layers3,
  ListChecks,
  LogIn,
  Share2,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

import { AuthDialog } from "@/components/AuthDialog";
import { Button } from "@/components/ui/button";
import { auth, googleProvider } from "@/firebaseClient";

const featureHighlights = [
  {
    title: "Visual drag-and-drop planning",
    description: "Sequence classes by term, reorder instantly, and catch overloads before registration opens.",
    detail: "MajorBuddy keeps credit counts up-to-date while you experiment with every possible schedule.",
    icon: CalendarDays,
  },
  {
    title: "Requirement-aware tags",
    description: "Color-coded distributives and plan tags make it obvious which requirements each course fulfills.",
    detail: "Highlight general education buckets, major tracks, and minors without maintaining spreadsheets.",
    icon: ListChecks,
  },
  {
    title: "Profile multiple degree paths",
    description: "Save alternate four-year plans for double majors, minors, co-ops, or study abroad.",
    detail: "Switch between plan profiles to compare timelines before you commit to a path.",
    icon: Layers3,
  },
  {
    title: "Share polished exports",
    description: "Generate a CSV or PDF-friendly grid that advisors and internship coordinators can review.",
    detail: "Capture academic year, credit load, distributives, and custom notes in one click.",
    icon: Share2,
  },
] as const;

const workflowSteps = [
  {
    title: "Tell us about your college or program",
    description: "Enter your start year, term system, and target credit goals so we can shape the timeline for you.",
    icon: Sparkles,
  },
  {
    title: "Drag courses into semesters or quarters",
    description: "Use colored tags, filters, and requirement groups to balance credit loads and milestones.",
    icon: GraduationCap,
  },
  {
    title: "Share with advisors and keep iterating",
    description: "Export a clean schedule, invite collaborators, or revisit the plan on mobile between advising sessions.",
    icon: ShieldCheck,
  },
] as const;

const faqs = [
  {
    question: "Is MajorBuddy free to use?",
    answer:
      "Yes. The core planner, drag-and-drop schedule builder, and export tools are free. We are adding optional pro features for teams, but students can plan unlimited terms without paying.",
  },
  {
    question: "Will it work for quarter and semester schools?",
    answer:
      "Absolutely. The setup flow lets you pick quarter or semester calendars, and you can add or remove terms for co-ops, summer sessions, or study abroad blocks.",
  },
  {
    question: "Can I collaborate with advisors or friends?",
    answer:
      "You can export snapshots to share over email today, and our roadmap includes shared links and commenting so advisors can propose edits without spreadsheets.",
  },
  {
    question: "Does MajorBuddy replace my university degree audit?",
    answer:
      "No—think of MajorBuddy as the planning canvas on top of your audit. Use it to explore what-if scenarios, run course drafts, and then confirm the plan with your official audit.",
  },
] as const;

const seoCopy = [
  "MajorBuddy is a modern academic planning tool for students who would rather build their degree plan the same way they organize a kanban board. The browser-based interface mirrors real semester or quarter calendars, supports custom requirements, and showcases every class with meaningful colors, tags, and notes. Unlike static PDF checklists, MajorBuddy stays interactive—drag a course into a new term, watch credit totals rebalance, and keep going until every graduation requirement is satisfied.",
  "Advisors and student success teams also lean on MajorBuddy to standardize planning conversations. Because every requirement, general education bucket, and elective track can be modeled in one hub, departments can share starter templates with incoming students while still giving them room to personalize. The built-in export tools generate clean progress reports that plug into email threads, LMS resources, or portfolio updates.",
  "Whether you plan to double major, accelerate graduation, take a mid-degree internship, or tack on a certificate, MajorBuddy shows the trade-offs at a glance. Historical versions are saved in the browser, no login is required to get started, and the experience is optimized for mobile so you can tweak the plan while waiting for advising appointments or class registration windows to open.",
] as const;

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

        <section id="features" className="mx-auto w-full max-w-6xl px-6 py-16">
          <p className="text-sm font-semibold uppercase tracking-[0.25rem] text-primary">Why students choose MajorBuddy</p>
          <h2 className="mt-3 text-3xl font-semibold text-foreground sm:text-4xl">
            Everything you need to plan four years with confidence.
          </h2>
          <p className="mt-2 max-w-3xl text-lg text-muted-foreground">
            From orientation to graduation audits, MajorBuddy keeps students, advisors, and career coaches aligned on the same course roadmap.
          </p>
          <div className="mt-10 grid gap-5 md:grid-cols-2">
            {featureHighlights.map(({ title, description, detail, icon: Icon }) => (
              <article key={title} className="rounded-2xl border border-border bg-card/80 p-5 shadow-sm backdrop-blur">
                <div className="flex items-center gap-3">
                  <span className="rounded-full bg-primary/10 p-2 text-primary">
                    <Icon className="h-5 w-5" />
                  </span>
                  <h3 className="text-lg font-semibold text-foreground">{title}</h3>
                </div>
                <p className="mt-3 text-base text-muted-foreground">{description}</p>
                <p className="mt-2 text-sm text-muted-foreground/90">{detail}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="bg-muted/30 py-16" id="workflow">
          <div className="mx-auto flex max-w-5xl flex-col gap-8 px-6">
            <header className="space-y-2 text-center">
              <p className="text-xs uppercase tracking-[0.4rem] text-muted-foreground">How it works</p>
              <h2 className="text-3xl font-semibold text-foreground">Plan faster in three lightweight steps.</h2>
              <p className="text-base text-muted-foreground">
                Answer a few onboarding questions, drag your catalog into place, and ship a professional-looking schedule to advisors or recruiters.
              </p>
            </header>
            <ol className="space-y-6">
              {workflowSteps.map(({ title, description, icon: Icon }, index) => (
                <li key={title} className="rounded-2xl border border-border bg-card/70 p-5 shadow-sm backdrop-blur">
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground font-semibold">
                      {String(index + 1).padStart(2, "0")}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <Icon className="h-5 w-5 text-primary" />
                        <h3 className="text-lg font-semibold">{title}</h3>
                      </div>
                      <p className="mt-2 text-base text-muted-foreground">{description}</p>
                    </div>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section id="testimonials" className="mx-auto w-full max-w-5xl px-6 py-16">
          <article className="rounded-3xl border border-border bg-card/90 p-6 shadow-lg">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.3rem] text-primary">What students are saying</p>
                <h2 className="mt-1 text-2xl font-semibold text-foreground">“It finally feels like my degree plan lives in one place.”</h2>
              </div>
              <CheckCircle2 className="h-10 w-10 text-primary" />
            </div>
            <p className="mt-4 text-base text-muted-foreground">
              “My advisor always wanted spreadsheets, but I kept tinkering in notebooks. MajorBuddy gives me a clean, colorful canvas to try different minor options and instantly export the winning version. I brought it to my last advising appointment and we finalized an entire year in ten minutes.”
            </p>
            <p className="mt-4 text-sm font-medium text-foreground">– Camila R., Applied Math & Economics, Class of 2026</p>
          </article>
        </section>

        <section id="faq" className="bg-background/60 py-16">
          <div className="mx-auto grid max-w-6xl gap-10 px-6 lg:grid-cols-[1fr,1fr]">
            <div>
              <p className="text-xs uppercase tracking-[0.4rem] text-muted-foreground">Questions</p>
              <h2 className="mt-2 text-3xl font-semibold text-foreground">Frequently asked about MajorBuddy.</h2>
              <p className="mt-2 text-base text-muted-foreground">
                We built the platform with students and advisors, so the roadmap reflects real-world planning headaches.
              </p>
            </div>
            <dl className="space-y-6">
              {faqs.map(({ question, answer }) => (
                <div key={question} className="rounded-2xl border border-border bg-card/70 p-5 shadow-sm backdrop-blur">
                  <dt className="text-lg font-semibold text-foreground">{question}</dt>
                  <dd className="mt-2 text-base text-muted-foreground">{answer}</dd>
                </div>
              ))}
            </dl>
          </div>
        </section>

        <section id="about" className="border-t border-border/50 bg-card/30 py-16">
          <div className="mx-auto flex max-w-5xl flex-col gap-6 px-6">
            <h2 className="text-3xl font-semibold text-foreground">Purpose-built for discoverable degree planning.</h2>
            {seoCopy.map((paragraph) => (
              <p key={paragraph.slice(0, 32)} className="text-base leading-7 text-muted-foreground">
                {paragraph}
              </p>
            ))}
          </div>
        </section>
      </main>
    </>
  );
};

export default Landing;
