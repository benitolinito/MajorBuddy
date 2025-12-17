import { Plus } from 'lucide-react';
import { AcademicYear, Course, PlannerPlan } from '@/types/planner';
import { TermCard } from './TermCard';
import { Button } from '@/components/ui/button';

interface YearSectionProps {
  year: AcademicYear;
  getTermCredits: (termId: string) => number;
  plans: PlannerPlan[];
  onRemoveCourse: (termId: string, courseId: string) => void;
  onDropCourse: (termId: string, course: Course) => void;
  onAddTerm: () => void;
  onRemoveTerm: (termId: string) => void;
}

export const YearSection = ({ 
  year, 
  getTermCredits,
  plans,
  onRemoveCourse, 
  onDropCourse,
  onAddTerm,
  onRemoveTerm,
}: YearSectionProps) => {
  return (
    <section className="mb-8">
      <div className="flex items-baseline gap-3 mb-4">
        <h3 className="text-xl font-semibold text-foreground">{year.name}</h3>
      </div>
      
      <div className="flex gap-4">
        {year.terms.map((term) => (
          <TermCard
            key={term.id}
            term={term}
            credits={getTermCredits(term.id)}
            plans={plans}
            onRemoveCourse={(courseId) => onRemoveCourse(term.id, courseId)}
            onDropCourse={(course) => onDropCourse(term.id, course)}
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
