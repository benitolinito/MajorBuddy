import { Plus } from 'lucide-react';
import { AcademicYear, Course } from '@/types/planner';
import { TermCard } from './TermCard';
import { Button } from '@/components/ui/button';

interface YearSectionProps {
  year: AcademicYear;
  getTermCredits: (termId: string) => number;
  onRemoveCourse: (termId: string, courseId: string) => void;
  onDropCourse: (termId: string, course: Course) => void;
  onAddTerm: () => void;
}

export const YearSection = ({ 
  year, 
  getTermCredits,
  onRemoveCourse, 
  onDropCourse,
  onAddTerm,
}: YearSectionProps) => {
  return (
    <section className="mb-8">
      <h3 className="text-xl font-semibold text-foreground mb-4">
        {year.name} Year
      </h3>
      
      <div className="flex gap-4">
        {year.terms.map((term) => (
          <TermCard
            key={term.id}
            term={term}
            credits={getTermCredits(term.id)}
            onRemoveCourse={(courseId) => onRemoveCourse(term.id, courseId)}
            onDropCourse={(course) => onDropCourse(term.id, course)}
          />
        ))}
        
        <div className="min-w-[200px] flex items-center justify-center">
          <Button
            variant="ghost"
            className="text-primary hover:text-primary hover:bg-primary/10"
            onClick={onAddTerm}
          >
            <Plus className="h-4 w-4 mr-1.5" />
            Add {year.name} Term
          </Button>
        </div>
      </div>
    </section>
  );
};