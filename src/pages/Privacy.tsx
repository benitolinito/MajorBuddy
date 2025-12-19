import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

const dataCategories = [
  {
    title: "Account Basics",
    description:
      "When you sign up or log in with email, password, or Google, Firebase Authentication stores your email address, hashed credentials, and the display name returned by your provider.",
    bullets: [
      "Google sign-ins also include your Google profile photo URL and a verified flag if provided.",
      "We do not request or store sensitive personal identifiers such as Social Security numbers.",
    ],
  },
  {
    title: "Planner Content",
    description:
      "Your custom schedule lives in Firebase Firestore under your user ID. It contains your course plan, requirement tags, notes, and timeline metadata so you can resume planning on any device.",
    bullets: [
      "Each save operation stores a sanitized snapshot plus the server timestamp.",
      "We do not ingest grades or transcripts unless you manually add them to your notes.",
    ],
  },
  {
    title: "Uploaded Media",
    description:
      "Optional profile avatars and college or department icons are stored in Firebase Storage so they can be rendered in the planner UI.",
    bullets: [
      "Files are limited to images you intentionally upload—no background scraping occurs.",
      "You can delete uploads at any time from within the profile dialog; doing so removes them from storage.",
    ],
  },
  {
    title: "Security & Diagnostics",
    description:
      "Firebase automatically records standard log data (IP address, device type, browser version) when authentication or database requests occur. We review aggregate logs to defend against abuse and to troubleshoot issues.",
    bullets: [
      "We do not enable Google Analytics or advertising cookies in the current release despite having a Measurement ID configured.",
      "Logs are retained for a limited window and are never sold or shared for marketing.",
    ],
  },
] as const;

const privacySections = [
  {
    title: "How We Use Your Data",
    body:
      "We use account details to authenticate you, planner content to render and sync your schedule, and uploaded media to personalize your workspace. Diagnostic data helps us secure accounts, prevent fraud, and improve reliability.",
  },
  {
    title: "Who We Share Data With",
    body:
      "We share data only with infrastructure providers required to run MajorBuddy, primarily Google Firebase (Authentication, Firestore, Storage). We do not sell personal data or provide student information to advertisers.",
    points: [
      "If legally compelled (e.g., subpoena or court order) we may disclose limited information after verifying the request.",
      "Aggregated, de-identified usage trends may be used internally to prioritize roadmap decisions.",
    ],
  },
  {
    title: "Your Choices",
    body:
      "You control your planner content and uploads. You may update account details inside the profile dialog, delete planner snapshots, remove uploaded images, or request full deletion by contacting support@majorbuddy.com.",
    points: [
      "Export your plan as CSV or PDF before deleting if you want a local archive.",
      "Revoking Google account permissions immediately blocks future sync operations until you authorize again.",
    ],
  },
  {
    title: "Retention",
    body:
      "Planner data remains in Firestore until you delete it or close your account. Removed uploads are purged from Firebase Storage, though cached thumbnails may persist briefly. Authentication logs are kept by Firebase for up to 30 days for security investigations.",
  },
  {
    title: "Security",
    body:
      "We rely on Firebase's hardened infrastructure, enforce HTTPS, and restrict access to least-privileged service roles. While no system is perfectly secure, we monitor for anomalies and patch dependencies promptly.",
    points: [
      "Passwords are never stored in plaintext; Firebase Authentication handles hashing and credential rotation.",
      "We review access to production projects and audit Firestore rules regularly.",
    ],
  },
  {
    title: "Contact",
    body:
      "Questions or requests related to privacy, uploads, or data rights can be sent to support@majorbuddy.com with the subject line \"Privacy Request.\" Please include the email tied to your planner so we can verify ownership.",
  },
] as const;

const Privacy = () => {
  const lastUpdated = "December 18, 2025";

  return (
    <main className="relative min-h-screen overflow-hidden bg-gradient-to-br from-primary/10 via-background to-background text-foreground">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-16 top-10 h-64 w-64 rounded-full bg-primary/20 blur-3xl" />
        <div className="absolute right-0 bottom-0 h-72 w-72 rounded-full bg-emerald-200/35 blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-5xl px-6 py-16">
        <div className="space-y-4">
          <p className="text-xs uppercase tracking-[0.35em] text-muted-foreground">Privacy Policy</p>
          <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">How MajorBuddy Handles Your Data</h1>
          <p className="text-base text-muted-foreground">Last updated {lastUpdated}</p>
          <p className="text-lg text-muted-foreground">
            This policy describes the information we collect through the MajorBuddy web application, how we use it, and
            the choices you have. The app currently runs on Firebase Authentication, Firestore, and Storage as defined in our public configuration.
          </p>
        </div>

        <div className="mt-10 grid gap-6 md:grid-cols-2">
          {dataCategories.map((category) => (
            <section
              key={category.title}
              className="rounded-2xl border border-border/70 bg-card/80 p-5 shadow-sm backdrop-blur"
            >
              <h2 className="text-lg font-semibold text-foreground">{category.title}</h2>
              <p className="mt-2 text-sm text-muted-foreground">{category.description}</p>
              <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
                {category.bullets.map((bullet) => (
                  <li key={bullet} className="flex gap-3">
                    <span aria-hidden="true" className="mt-2 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-primary" />
                    <span>{bullet}</span>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>

        <div className="mt-12 space-y-6">
          {privacySections.map((section) => (
            <section
              key={section.title}
              className="rounded-2xl border border-border/70 bg-card/80 p-6 shadow-sm backdrop-blur"
            >
              <h2 className="text-xl font-semibold text-foreground">{section.title}</h2>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{section.body}</p>
              {section.points && (
                <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
                  {section.points.map((point) => (
                    <li key={point} className="flex gap-3">
                      <span aria-hidden="true" className="mt-2 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-primary" />
                      <span>{point}</span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          ))}
        </div>

        <div className="mt-12 flex flex-wrap gap-3">
          <Button asChild size="lg" className="min-w-[150px]">
            <Link to="/">Back to Landing</Link>
          </Button>
          <Button asChild variant="outline" size="lg" className="min-w-[150px]">
            <Link to="/terms">View Terms of Use</Link>
          </Button>
        </div>
      </div>
    </main>
  );
};

export default Privacy;
