import { useEffect, useRef, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { AcademicYear, Course, PlannerPlan, CourseDropOptions, TermSystem } from '@/types/planner';
import { TermCard } from './TermCard';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { useMediaQuery } from '@/hooks/useMediaQuery';

const termExitDurationMs = 320;

interface YearSectionProps {
  year: AcademicYear;
  getTermCredits: (termId: string) => number;
  plans: PlannerPlan[];
  distributiveColors?: Record<string, string | null>;
  termSystem: TermSystem;
  onRemoveCourse: (termId: string, courseId: string) => void;
  onDropCourse: (yearId: string, termId: string, course: Course, options?: CourseDropOptions) => void;
  onAddTerm: () => void;
  onRemoveTerm: (termId: string) => void;
  onRemoveYear: () => void;
  canRemoveYear: boolean;
  showDeleteControls?: boolean;
  onRequestCourseAction?: (payload: { yearId: string; termId: string; course: Course }) => void;
  onAddCourseToTerm?: (termId: string) => void;
  isRemoving?: boolean;
}

export const YearSection = ({
  year,
  getTermCredits,
  plans,
  distributiveColors,
  termSystem,
  onRemoveCourse,
  onDropCourse,
  onAddTerm,
  onRemoveTerm,
  onRemoveYear,
  canRemoveYear,
  showDeleteControls = false,
  onRequestCourseAction,
  onAddCourseToTerm,
  isRemoving = false,
}: YearSectionProps) => {
  const isMobile = useMediaQuery('(max-width: 768px)');
  const deleteControlsVisible = showDeleteControls || isMobile;
  const maxTerms = termSystem === 'quarter' ? 4 : 3;
  const canAddTerm = year.terms.length < maxTerms;

  const termContainerClass = cn(
    'flex gap-4',
    isMobile && 'flex-col gap-3',
  );
  const [removingTermIds, setRemovingTermIds] = useState<string[]>([]);
  const [recentTermId, setRecentTermId] = useState<string | null>(null);
  const termRemovalTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  const addedTermTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const previousTermIds = useRef<string[]>([]);
  const initializedTerms = useRef(false);

  useEffect(() => {
    const currentIds = year.terms.map((term) => term.id);
    if (initializedTerms.current) {
      const addedId = currentIds.find((id) => !previousTermIds.current.includes(id));
      if (addedId) {
        setRecentTermId(addedId);
        if (addedTermTimer.current) {
          clearTimeout(addedTermTimer.current);
        }
        addedTermTimer.current = setTimeout(() => setRecentTermId(null), 900);
      }
    } else {
      initializedTerms.current = true;
    }
    previousTermIds.current = currentIds;
  }, [year.terms]);

  useEffect(
    () => () => {
      termRemovalTimers.current.forEach((timer) => clearTimeout(timer));
      termRemovalTimers.current.clear();
      if (addedTermTimer.current) {
        clearTimeout(addedTermTimer.current);
      }
    },
    [],
  );

  const handleRemoveTerm = (termId: string) => {
    if (removingTermIds.includes(termId)) return;
    setRemovingTermIds((prev) => [...prev, termId]);
    const timer = setTimeout(() => {
      onRemoveTerm(termId);
      setRemovingTermIds((prev) => prev.filter((id) => id !== termId));
      termRemovalTimers.current.delete(termId);
    }, termExitDurationMs);
    termRemovalTimers.current.set(termId, timer);
  };

  return (
    <section
      className={cn(
        'group mb-6 sm:mb-8 transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] will-change-transform',
        isRemoving &&
          'pointer-events-none opacity-0 -translate-y-6 sm:-translate-y-8 scale-[0.92] blur-[1.5px]',
      )}
    >
      <div className="mb-3 flex flex-wrap items-center gap-2 sm:mb-4">
        <h3 className="text-lg font-semibold text-foreground sm:text-xl">{year.name}</h3>
        {canRemoveYear && (
          <ConfirmDialog
            trigger={
              <Button
                variant="ghost"
                size="sm"
                className={cn(
                  'text-muted-foreground transition hover:opacity-100 hover:text-destructive hover:bg-destructive/10',
                  'focus-visible:opacity-100',
                  deleteControlsVisible ? 'opacity-100' : 'opacity-0',
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
        {year.terms.map((term) => {
          const isRemovingTerm = removingTermIds.includes(term.id);
          const isNewTerm = recentTermId === term.id;
          return (
            <div
              key={term.id}
              className={cn(
                'transition-[opacity,transform,filter] duration-300 ease-[cubic-bezier(0.33,1,0.68,1)] will-change-transform',
                isRemovingTerm
                  ? 'pointer-events-none opacity-0 -translate-y-2 scale-[0.98] blur-[1px]'
                  : 'opacity-100 translate-y-0 scale-100',
                isNewTerm && 'animate-term-enter',
              )}
            >
              <TermCard
                yearId={year.id}
                term={term}
                credits={getTermCredits(term.id)}
                plans={plans}
                distributiveColors={distributiveColors}
                onRemoveCourse={(courseId) => onRemoveCourse(term.id, courseId)}
                onDropCourse={(course, options) => onDropCourse(year.id, term.id, course, options)}
                onRemoveTerm={() => handleRemoveTerm(term.id)}
                isStacked={isMobile}
                showDeleteControls={deleteControlsVisible}
                onRequestCourseAction={
                  onRequestCourseAction
                    ? (course) => onRequestCourseAction({ yearId: year.id, termId: term.id, course })
                    : undefined
                }
                onAddCourse={onAddCourseToTerm ? () => onAddCourseToTerm(term.id) : undefined}
              />
            </div>
          );
        })}
        
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
