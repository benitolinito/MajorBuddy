import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { AlertCircle, ArrowLeft, ExternalLink, Loader2, Share2, UserRound } from "lucide-react";
import { doc, getDoc, getFirestore, Timestamp } from "firebase/firestore";
import app from "@/firebaseClient";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { PlannerState, Term } from "@/types/planner";
import { ShareLinkAccess } from "@/lib/sharePlanStore";
import { storeSharedImport } from "@/lib/shareImport";
import { useSharePresence } from "@/hooks/useSharePresence";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const db = getFirestore(app);
const shareDoc = (shareId: string) => doc(db, "plannerShares", shareId);

type ShareRecord = {
  snapshot?: PlannerState;
  planName?: string;
  linkAccess?: ShareLinkAccess;
  updatedAt?: Timestamp;
  createdAt?: Timestamp;
};

type ShareState =
  | { status: "loading" }
  | { status: "missing" }
  | { status: "disabled"; message?: string }
  | { status: "error"; message?: string }
  | {
      status: "ready";
      payload: {
        shareId: string;
        planName: string;
        snapshot: PlannerState;
        linkAccess: ShareLinkAccess;
        updatedAtLabel?: string;
      };
    };

const formatTimestamp = (value?: Timestamp | null) => {
  if (!value) return undefined;
  const date = value.toDate();
  return date.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
};

const summarizeAccess = (access: ShareLinkAccess) => {
  if (access === "editor") return "Anyone with the link can edit";
  if (access === "viewer") return "Anyone with the link can view";
  return "Link disabled by the owner";
};

const Share = () => {
  const { shareId } = useParams<{ shareId: string }>();
  const navigate = useNavigate();
  const [view, setView] = useState<ShareState>({ status: "loading" });
  const activeShareId = view.status === "ready" ? view.payload.shareId : null;
  const { peers: presencePeers } = useSharePresence({ shareId: activeShareId, userId: null, label: null, photoUrl: null });

  const presenceIndicator = useMemo(() => {
    if (!presencePeers || presencePeers.length <= 1) return null;
    return (
      <div className="flex items-center gap-2 rounded-full border border-border bg-muted/60 px-2.5 py-1 shadow-sm">
        <div className="flex -space-x-2">
          {presencePeers.slice(0, 3).map((peer) => (
            <Avatar key={peer.id} className="h-7 w-7 border-2 border-background">
              {peer.photoUrl ? <AvatarImage src={peer.photoUrl} alt={peer.label} /> : null}
              <AvatarFallback className="bg-background text-muted-foreground">
                <UserRound className="h-3.5 w-3.5" />
              </AvatarFallback>
            </Avatar>
          ))}
        </div>
        <span className="text-xs font-semibold text-foreground">{presencePeers.length} viewing</span>
      </div>
    );
  }, [presencePeers]);

  useEffect(() => {
    let active = true;
    if (!shareId) {
      setView({ status: "missing" });
      return () => {
        active = false;
      };
    }

    const load = async () => {
      try {
        const snap = await getDoc(shareDoc(shareId));
        if (!active) return;
        if (!snap.exists()) {
          setView({ status: "missing" });
          return;
        }
        const data = snap.data() as ShareRecord;
        const linkAccess: ShareLinkAccess = data.linkAccess ?? "viewer";
        if (linkAccess === "none") {
          setView({ status: "disabled", message: "The owner turned this link off." });
          return;
        }
        if (!data.snapshot) {
          setView({ status: "error", message: "This share link is missing a saved plan." });
          return;
        }
        setView({
          status: "ready",
          payload: {
            shareId,
            planName: data.planName || "Shared plan",
            snapshot: data.snapshot,
            linkAccess,
            updatedAtLabel: formatTimestamp(data.updatedAt ?? data.createdAt ?? null),
          },
        });
      } catch (error) {
        console.error("Unable to load shared plan", error);
        if (!active) return;
        setView({ status: "error", message: "We could not open this share link. Please try again." });
      }
    };

    load();

    return () => {
      active = false;
    };
  }, [shareId]);

  const handleOpenPlanner = (snapshot: PlannerState, planName: string, linkAccess: ShareLinkAccess) => {
    storeSharedImport({ snapshot, planName, shareId, linkAccess });
    navigate("/planner", {
      state: { sharedSnapshot: snapshot, sharePlanName: planName, shareId, shareLinkAccess: linkAccess },
      replace: false,
    });
  };

  const header = useMemo(() => {
    if (view.status !== "ready") return null;
    return (
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.12em] text-muted-foreground">Shared plan</p>
          <h1 className="text-3xl font-semibold text-foreground">{view.payload.planName}</h1>
          <p className="text-sm text-muted-foreground">
            {view.payload.snapshot.university || "University"} | Class of {view.payload.snapshot.classYear || ""}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge variant="secondary">{summarizeAccess(view.payload.linkAccess)}</Badge>
          {view.payload.updatedAtLabel ? (
            <Badge variant="outline">Updated {view.payload.updatedAtLabel}</Badge>
          ) : null}
          {presenceIndicator}
        </div>
      </div>
    );
  }, [presenceIndicator, view]);

  const planPreview = useMemo(() => {
    if (view.status !== "ready") return null;
    const { snapshot } = view.payload;
    if (!snapshot.years?.length) {
      return <p className="text-sm text-muted-foreground">No schedule data was shared.</p>;
    }
    return (
      <div className="space-y-4">
        {snapshot.years.map((year) => (
          <div key={year.id} className="rounded-2xl border border-border bg-card p-4 shadow-sm">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-xs uppercase tracking-[0.1em] text-muted-foreground">{year.name}</p>
                <p className="text-lg font-semibold text-foreground">
                  {year.startYear}-{year.endYear}
                </p>
              </div>
              <Badge variant="outline">{year.terms.length} terms</Badge>
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-3">
              {year.terms.map((term) => (
                <TermPreview key={term.id} term={term} />
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }, [view]);

  if (view.status === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-foreground">
        <div className="flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          <span>Loading shared plan...</span>
        </div>
      </div>
    );
  }

  if (view.status === "missing") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-6 py-12 text-foreground">
        <div className="max-w-md space-y-4 text-center">
          <AlertCircle className="mx-auto h-12 w-12 text-destructive" aria-hidden />
          <h1 className="text-2xl font-semibold">Link not found</h1>
          <p className="text-sm text-muted-foreground">
            This share link does not exist. It may have been removed or the URL is incorrect.
          </p>
          <div className="flex justify-center gap-2">
            <Button asChild variant="secondary">
              <Link to="/">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Go home
              </Link>
            </Button>
            <Button asChild>
              <Link to="/planner">
                Open planner
                <ExternalLink className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (view.status === "disabled" || view.status === "error") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-6 py-12 text-foreground">
        <div className="max-w-md space-y-4 text-center">
          <AlertCircle className="mx-auto h-12 w-12 text-destructive" aria-hidden />
          <h1 className="text-2xl font-semibold">Cannot open share link</h1>
          <p className="text-sm text-muted-foreground">{view.message || "This shared plan is unavailable."}</p>
          <Button asChild>
            <Link to="/">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Return to home
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto flex max-w-6xl flex-col gap-8 px-6 py-10">
        <div className="flex items-center justify-between">
          <Button variant="ghost" size="sm" asChild>
            <Link to="/">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Home
            </Link>
          </Button>
          <Button size="sm" variant="secondary" onClick={() => navigate("/planner")}>Open planner</Button>
        </div>

        {header}

        <div className="flex flex-wrap gap-3">
          <Button size="sm" onClick={() => handleOpenPlanner(view.payload.snapshot, view.payload.planName, view.payload.linkAccess)}>
            <Share2 className="mr-2 h-4 w-4" />
            Open in planner
          </Button>
          <Button asChild size="sm" variant="outline">
            <Link to="/planner">
              Start a new plan
              <ExternalLink className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>

        <Separator />

        <section className="space-y-3">
          <div className="space-y-1">
            <h2 className="text-xl font-semibold text-foreground">Schedule preview</h2>
            <p className="text-sm text-muted-foreground">
              View-only snapshot of the plan. To edit or duplicate it, open it inside the planner.
            </p>
          </div>
          {planPreview}
        </section>
      </div>
    </div>
  );
};

const TermPreview = ({ term }: { term: Term }) => (
  <div className="rounded-xl border border-border bg-muted/40 p-3">
    <div className="flex items-center justify-between gap-2">
      <p className="text-sm font-semibold text-foreground">
        {term.name} {term.year}
      </p>
      <span className="text-xs text-muted-foreground">{term.courses.length} course{term.courses.length === 1 ? "" : "s"}</span>
    </div>
    <div className="mt-2 space-y-2">
      {term.courses.length ? (
        term.courses.map((course) => (
          <div key={course.id} className="rounded-lg border border-dashed border-border bg-background px-3 py-2">
            <p className="text-sm font-semibold text-foreground">
              {[course.code, course.name].filter(Boolean).join(" — ") || "Course"}
            </p>
            <p className="text-xs text-muted-foreground">
              {course.credits} credit{course.credits === 1 ? "" : "s"}
              {course.distributives?.length ? ` | ${course.distributives.join(", ")}` : ""}
            </p>
          </div>
        ))
      ) : (
        <p className="text-xs text-muted-foreground">No courses in this term.</p>
      )}
    </div>
  </div>
);

export default Share;
