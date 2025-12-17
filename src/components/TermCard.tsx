import { useState } from 'react';
import { Term, Course } from '@/types/planner';
import { CourseCard } from './CourseCard';
import { Badge } from '@/components/ui/badge';

interface TermCardProps {
  term: Term;
  credits: number;
  onRemoveCourse: (courseId: string) => void;
  onDropCourse: (course: Course) => void;
}

export const TermCard = ({ term, credits, onRemoveCourse, onDropCourse }: TermCardProps) => {
  const [isDragOver, setIsDragOver] = useState(false);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const courseData = e.dataTransfer.getData('course');
    if (courseData) {
      onDropCourse(JSON.parse(courseData));
    }
  };

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`bg-muted/50 rounded-xl p-4 min-w-[280px] flex-1 transition-all ${
        isDragOver ? 'ring-2 ring-primary ring-offset-2 bg-primary/5' : ''
      }`}
    >
      <div className="flex items-start justify-between mb-4">
        <div>
          <p className="text-sm font-semibold text-primary uppercase tracking-wide">{term.name}</p>
          <p className="text-lg font-bold text-foreground">{term.year}</p>
        </div>
        <Badge variant="outline" className="text-xs font-medium bg-card">
          {credits} Credits
        </Badge>
      </div>
      
      <div className="space-y-2 min-h-[120px]">
        {term.courses.length === 0 ? (
          <div className="h-[120px] flex items-center justify-center text-muted-foreground text-sm border-2 border-dashed border-border rounded-lg">
            Drag courses here
          </div>
        ) : (
          term.courses.map((course) => (
            <CourseCard
              key={course.id}
              course={course}
              onRemove={() => onRemoveCourse(course.id)}
            />
          ))
        )}
      </div>
    </div>
  );
};