import { X } from 'lucide-react';
import { Course, CategoryName, CATEGORY_COLORS } from '@/types/planner';

interface CourseCardProps {
  course: Course;
  onRemove: () => void;
}

const CategoryBadge = ({ category }: { category: CategoryName }) => (
  <span 
    className={`${CATEGORY_COLORS[category]} text-primary-foreground text-[10px] font-medium px-1.5 py-0.5 rounded`}
  >
    {category}
  </span>
);

export const CourseCard = ({ course, onRemove }: CourseCardProps) => {
  return (
    <div className="group relative bg-card border border-border rounded-lg p-3 hover:shadow-sm transition-all">
      <button
        onClick={onRemove}
        className="absolute -top-2 -right-2 h-5 w-5 rounded-full bg-card border border-border flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive hover:text-destructive-foreground hover:border-destructive"
      >
        <X className="h-3 w-3" />
      </button>
      
      <div className="flex items-start justify-between gap-2">
        <span className="font-semibold text-sm text-foreground">{course.code}</span>
        <span className="text-xs text-muted-foreground">{course.credits}cr</span>
      </div>
      <p className="text-xs text-muted-foreground mt-1">{course.name}</p>
      <div className="flex flex-wrap gap-1 mt-2">
        {course.categories.map((cat) => (
          <CategoryBadge key={cat} category={cat} />
        ))}
      </div>
    </div>
  );
};