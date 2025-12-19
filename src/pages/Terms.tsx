import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

const termsSections = [
  {
    title: "1. Acceptance of Terms",
    body:
      "By accessing or using MajorBuddy, you agree to these Terms of Use and any policies referenced here. If you do not agree, do not access the planner, upload media, or create an account.",
  },
  {
    title: "2. Eligibility & Accounts",
    body:
      "MajorBuddy is designed for students, advisors, and staff who need to plan degree progress. You are responsible for keeping your login credentials secure and for all activity that occurs under your account.",
    points: [
      "You must be at least 13 years old or the minimum age of digital consent in your region.",
      "If you access MajorBuddy on behalf of an institution, you confirm that you have authority to bind that organization to these Terms.",
      "Notify us immediately of any unauthorized access or suspected security incident.",
    ],
  },
  {
    title: "3. Your Content & Uploads",
    body:
      "MajorBuddy lets you personalize your workspace by uploading a profile picture, adding free-form notes, and uploading an icon that represents your college or department. You retain ownership of your content while granting us a limited license to store and display it for you.",
    points: [
      "Only upload media you have the rights to share. This includes photos, avatars, college crests, or other graphics.",
      "Do not upload content that is unlawful, discriminatory, harassing, or infringes intellectual property rights.",
      "You are solely responsible for the accuracy of any academic information, text inputs, or files you store in the app.",
    ],
  },
  {
    title: "4. Acceptable Use",
    body:
      "We expect everyone to keep MajorBuddy safe and respectful. You agree not to interfere with the service, probe for vulnerabilities, or use the platform to distribute malware, spam, or misleading academic advice.",
    points: [
      "Use the app only for lawful academic planning purposes.",
      "Do not attempt to reverse engineer or scrape private areas of the service.",
      "Respect rate limits and avoid automated scripts that degrade performance for others.",
    ],
  },
  {
    title: "5. Privacy & Data Security",
    body:
      "MajorBuddy relies on Firebase Authentication and Firestore to secure accounts, store planner data, and host limited media uploads. We apply industry-standard safeguards, but no online platform can guarantee absolute security.",
    points: [
      "Review our Privacy Policy to understand how we collect, use, and share personal data.",
      "Uploaded profile images and college icons are stored in Firebase Storage and may be processed to generate responsive thumbnails.",
      "Inform us at security@majorbuddy.com if you suspect a vulnerability or data exposure.",
    ],
  },
  {
    title: "6. Intellectual Property & Feedback",
    body:
      "All product names, code, and design elements belong to MajorBuddy. We encourage feedback; by submitting suggestions you grant us permission to use them without obligation or compensation.",
  },
  {
    title: "7. Service Availability & Changes",
    body:
      "We may add, update, or remove features—such as media upload limits or export formats—at any time. We will give reasonable notice when changes materially affect your use of MajorBuddy.",
  },
  {
    title: "8. Termination",
    body:
      "You can stop using the service at any time. We reserve the right to suspend or terminate access if you violate these Terms, jeopardize platform security, or misuse academic records.",
    points: [
      "Upon termination we may delete or archive your uploads, planner data, and content.",
      "Some information may persist in backups for a limited retention period.",
    ],
  },
  {
    title: "9. Disclaimers & Liability",
    body:
      "MajorBuddy is provided “as is.” We do not guarantee that planner projections, requirement tracking, or exports are free from error, and we are not liable for academic decisions made using the app.",
    points: [
      "To the maximum extent permitted by law, we disclaim implied warranties of merchantability, fitness for a particular purpose, and non-infringement.",
      "Our total liability for claims related to the service will not exceed the amount you paid (if any) in the twelve (12) months prior to the event giving rise to the claim.",
    ],
  },
  {
    title: "10. Contact",
    body:
      "Questions about these Terms or requests related to uploads, security, or privacy can be sent to support@majorbuddy.com. For legal notices, include “Terms Inquiry” in the subject line.",
  },
] as const;

const Terms = () => {
  const lastUpdated = "December 18, 2025";

  return (
    <main className="relative min-h-screen overflow-hidden bg-gradient-to-br from-primary/10 via-background to-background text-foreground">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-10 top-16 h-64 w-64 rounded-full bg-primary/20 blur-3xl" />
        <div className="absolute right-0 bottom-0 h-72 w-72 rounded-full bg-emerald-200/30 blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-5xl px-6 py-16">
        <div className="space-y-4">
          <p className="text-xs uppercase tracking-[0.35em] text-muted-foreground">Terms & Conditions</p>
          <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">MajorBuddy Terms of Use</h1>
          <p className="text-base text-muted-foreground">Last updated {lastUpdated}</p>
          <p className="text-lg text-muted-foreground">
            These Terms govern your access to the MajorBuddy web application, including planner data stored in Firebase,
            media uploaded to your profile, and any icons you provide for your college or department. Please review them
            carefully before continuing.
          </p>
        </div>

        <div className="mt-10 space-y-6">
          {termsSections.map((section) => (
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
            <Link to="/privacy">Read Privacy Policy</Link>
          </Button>
        </div>
      </div>
    </main>
  );
};

export default Terms;
