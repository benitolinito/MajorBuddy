import type { ReactNode } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { TermName } from '@/types/planner';
import { CheckCircle2, ListChecks, TriangleAlert } from 'lucide-react';

export type PlannerAuditResult = {
  generatedAt: string;
  requiredCredits: number;
  recommendedPerTerm: number | null;
  scheduledAverage: number | null;
  heavyThreshold: number;
  termLoadWarnings: {
    id: string;
    termLabel: string;
    credits: number;
  }[];
  offeringIssues: {
    id: string;
    termLabel: string;
    courseLabel: string;
    offeredTerms: TermName[];
  }[];
};

interface PlannerAuditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  audit: PlannerAuditResult | null;
}

export const PlannerAuditDialog = ({ open, onOpenChange, audit }: PlannerAuditDialogProps) => {
  const issueCount = (audit?.termLoadWarnings.length ?? 0) + (audit?.offeringIssues.length ?? 0);
  const generatedLabel = audit ? new Date(audit.generatedAt).toLocaleString() : null;
  const recommendedLabel = audit?.recommendedPerTerm != null ? audit.recommendedPerTerm.toFixed(1) : '—';
  const averageLabel = audit?.scheduledAverage != null ? audit.scheduledAverage.toFixed(1) : '—';
  const heavyThresholdLabel = audit ? Math.ceil(audit.heavyThreshold) : '—';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ListChecks className="h-5 w-5" /> Plan audit
          </DialogTitle>
          <DialogDescription>
            Quick validation for course availability and per-term credit load.
          </DialogDescription>
        </DialogHeader>
        {!audit ? (
          <div className="rounded-xl border border-dashed border-border/70 bg-muted/40 p-6 text-sm text-muted-foreground">
            Run the audit again to view the latest results.
          </div>
        ) : (
          <div className="space-y-6">
            <div className="rounded-xl border border-border bg-muted/40 p-4 text-sm text-muted-foreground">
              <p>
                Target pace: <span className="font-semibold text-foreground">{recommendedLabel}</span> credits/term
                to reach <span className="font-semibold text-foreground">{audit.requiredCredits}</span> credits total.
              </p>
              <p>
                Current average: <span className="font-semibold text-foreground">{averageLabel}</span> credits/term across
                {` ${audit.scheduledAverage != null ? 'scheduled terms.' : 'available terms.'}`}
              </p>
              <p>
                Warnings trigger above <span className="font-semibold text-foreground">{heavyThresholdLabel}</span>{' '}
                credits in a single term (ceiled target pace).
              </p>
              <p className="mt-2 text-xs text-muted-foreground/80">
                {generatedLabel ? `Generated ${generatedLabel}` : 'Generated just now'}
              </p>
            </div>
            <AuditSection
              title="Term credit spikes"
              summary={`${issueCountLabel(audit.termLoadWarnings.length, 'warning')}`}
              description={`Flags terms with credits greater than ${heavyThresholdLabel}, meaning they outpace your ceiled target pace. Consider redistributing courses across adjacent terms.`}
              issues={audit.termLoadWarnings}
              emptyLabel="No overloaded terms detected."
            >
              {(issue) => (
                <IssueCard key={issue.id} intent="warning">
                  <p className="text-sm font-semibold text-amber-900 dark:text-amber-100">{issue.termLabel}</p>
                  <p className="text-xs text-amber-900/80 dark:text-amber-100/80">
                    Scheduled {issue.credits} credits • warnings fire once credits exceed target ceiling {heavyThresholdLabel}
                  </p>
                </IssueCard>
              )}
            </AuditSection>
            <AuditSection
              title="Course availability mismatches"
              summary={issueCountLabel(audit.offeringIssues.length, 'issue')}
              description="These classes list specific terms in the catalog. Move them to an allowed term or confirm the catalog entry."
              issues={audit.offeringIssues}
              emptyLabel="All scheduled courses match their offered terms."
            >
              {(issue) => (
                <IssueCard key={issue.id} intent="error">
                  <p className="text-sm font-semibold text-red-900 dark:text-red-100">{issue.courseLabel}</p>
                  <p className="text-xs font-medium text-red-900/80 dark:text-red-100/80">{issue.termLabel}</p>
                  <p className="text-xs text-muted-foreground">
                    Offered in: {issue.offeredTerms.join(', ')}
                  </p>
                </IssueCard>
              )}
            </AuditSection>
            <div className="flex items-center justify-between rounded-lg border border-dashed border-border/70 p-3 text-xs text-muted-foreground">
              <span>{issueCount ? `${issueCount} issue${issueCount === 1 ? '' : 's'} flagged.` : 'No issues detected.'}</span>
              <Badge variant={issueCount ? 'destructive' : 'outline'}>{issueCount ? 'Action needed' : 'All clear'}</Badge>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

const issueCountLabel = (count: number, noun: string) => {
  if (!count) return 'Clear';
  return `${count} ${noun}${count === 1 ? '' : 's'}`;
};

interface AuditSectionProps<T> {
  title: string;
  summary: string;
  description: string;
  issues: T[];
  emptyLabel: string;
  children: (issue: T) => ReactNode;
}

const AuditSection = <T,>({ title, summary, description, issues, emptyLabel, children }: AuditSectionProps<T>) => (
  <section className="space-y-3">
    <div className="flex items-center justify-between">
      <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      <Badge variant={issues.length ? 'secondary' : 'outline'}>{summary}</Badge>
    </div>
    {issues.length ? (
      <div className="space-y-2">{issues.map(children)}</div>
    ) : (
      <div className="flex items-center gap-2 rounded-lg border border-border/70 bg-background/70 p-3 text-sm text-muted-foreground">
        <CheckCircle2 className="h-4 w-4 text-emerald-500" />
        <span>{emptyLabel}</span>
      </div>
    )}
    <p className="text-xs text-muted-foreground">{description}</p>
  </section>
);

interface IssueCardProps {
  intent: 'warning' | 'error';
  children: React.ReactNode;
}

const IssueCard = ({ intent, children }: IssueCardProps) => {
  const intentStyles =
    intent === 'warning'
      ? 'border-amber-500/50 bg-amber-500/10'
      : 'border-red-500/50 bg-red-500/10';
  return (
    <div className={cn('rounded-lg border px-3 py-2.5 text-sm', intentStyles)}>
      <div className="flex items-start gap-2 text-left">
        <TriangleAlert className={`mt-0.5 h-4 w-4 ${intent === 'warning' ? 'text-amber-600' : 'text-red-600'}`} />
        <div className="space-y-1 text-foreground">{children}</div>
      </div>
    </div>
  );
};
