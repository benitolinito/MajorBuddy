import { Plus, Trash2 } from 'lucide-react';
import { AcademicYear, Course, PlannerPlan, CourseDropOptions, TermSystem } from '@/types/planner';
import { TermCard } from './TermCard';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { useMediaQuery } from '@/hooks/useMediaQuery';

interface YearSectionProps {
  year: AcademicYear;
  getTermCredits: (termId: string) => number;
  plans: PlannerPlan[];
  onRemoveCourse: (termId: string, courseId: string) => void;
  onDropCourse: (yearId: string, termId: string, course: Course, options?: CourseDropOptions) => void;
  onAddTerm: () => void;
  onRemoveTerm: (termId: string) => void;
  onRemoveYear: () => void;
  canRemoveYear: boolean;
  termSystem: TermSystem;
  showDeleteControls?: boolean;
  onRequestAddCourse?: (yearId: string, termId: string) => void;
}

export const YearSection = ({
  year,
  getTermCredits,
  plans,
  onRemoveCourse,
  onDropCourse,
  onAddTerm,
  onRemoveTerm,
  onRemoveYear,
  canRemoveYear,
  termSystem,
  showDeleteControls = false,
  onRequestAddCourse,
}: YearSectionProps) => {
  const isMobile = useMediaQuery('(max-width: 768px)');
  const maxTerms = termSystem === 'quarter' ? 4 : 3;
  const canAddTerm = year.terms.length < maxTerms;

  const termContainerClass = cn(
    'flex gap-4',
    isMobile && 'flex-col gap-3',
  );

  return (
    <section className="mb-8">
      <div className="mb-4 flex items-center gap-2">
        <h3 className="text-xl font-semibold text-foreground">{year.name}</h3>
        {canRemoveYear && (
          <ConfirmDialog
            trigger={
              <Button
                variant="ghost"
                size="sm"
                className={cn(
                  'text-muted-foreground transition hover:opacity-100 hover:text-destructive hover:bg-destructive/10',
                  'focus-visible:opacity-100',
                  showDeleteControls ? 'opacity-100' : 'opacity-0',
                )}
              >
                <Trash2 className="h-4 w-4 mr-1.5" />
                Remove
              </Button>
            }
            title={`Remove ${year.name}?`}
            description={`This will delete every term and course scheduled within ${year.name}. This action cannot be undone.`}
            confirmLabel="Remove year"
            cancelLabel="Keep year"
            confirmVariant="destructive"
            onConfirm={onRemoveYear}
          />
        )}
      </div>
      
      <div className={termContainerClass}>
        {year.terms.map((term) => (
          <TermCard
            key={term.id}
            yearId={year.id}
            term={term}
            credits={getTermCredits(term.id)}
            plans={plans}
            onRemoveCourse={(courseId) => onRemoveCourse(term.id, courseId)}
            onDropCourse={(course, options) => onDropCourse(year.id, term.id, course, options)}
            onRemoveTerm={() => onRemoveTerm(term.id)}
            isStacked={isMobile}
            showDeleteControls={showDeleteControls}
            onAddCourseClick={() => onRequestAddCourse?.(year.id, term.id)}
          />
        ))}
        
        <div
          className={cn(
            'flex items-center justify-center',
            isMobile ? 'w-full rounded-xl border border-dashed border-border/70 py-2' : 'min-w-[200px]',
          )}
        >
          <Button
            variant="ghost"
            className={cn(
              'text-primary hover:text-primary hover:bg-primary/10',
              isMobile && 'w-full justify-center border-0',
              !canAddTerm && 'cursor-not-allowed text-muted-foreground hover:bg-transparent hover:text-muted-foreground',
            )}
            title={!canAddTerm ? `Maximum of ${maxTerms} terms in a ${termSystem} system.` : undefined}
            disabled={!canAddTerm}
            onClick={() => {
              if (!canAddTerm) return;
              onAddTerm();
            }}
          >
            <Plus className="h-4 w-4 mr-1.5" />
            Add {year.name} term
          </Button>
        </div>
      </div>
    </section>
  );
};
