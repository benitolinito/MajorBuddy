import { Plus, Trash2 } from 'lucide-react';
import { AcademicYear, Course, PlannerPlan, CourseDropOptions } from '@/types/planner';
import { TermCard } from './TermCard';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';
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
}: YearSectionProps) => {
  const isMobile = useMediaQuery('(max-width: 768px)');

  return (
    <section className="group mb-8">
      <div className="mb-4 flex items-center gap-2">
        <h3 className="text-xl font-semibold text-foreground">{year.name}</h3>
        {canRemoveYear && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className={cn(
                  "text-muted-foreground opacity-0 transition hover:text-destructive hover:bg-destructive/10",
                  "group-hover:opacity-100 focus-visible:opacity-100",
                )}
              >
                <Trash2 className="h-4 w-4 mr-1.5" />
                Remove
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Remove {year.name}?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will delete every term and course scheduled within {year.name}. This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Keep year</AlertDialogCancel>
                <AlertDialogAction onClick={onRemoveYear}>Remove year</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </div>
      
      <div className={cn("flex gap-4", isMobile && "snap-x snap-mandatory overflow-x-auto py-2")}>
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
          />
        ))}
        
        <div className="min-w-[200px] flex items-center justify-center">
          <Button
            variant="ghost"
            className="text-primary hover:text-primary hover:bg-primary/10"
            onClick={onAddTerm}
          >
            <Plus className="h-4 w-4 mr-1.5" />
            Add {year.name} term
          </Button>
        </div>
      </div>
    </section>
  );
};
