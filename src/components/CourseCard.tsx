import type { DragEvent } from 'react';
import { X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Course, PlannerPlan } from '@/types/planner';
import { getTagColorClasses, getTagColorStyle } from '@/lib/tagColors';
import { cn } from '@/lib/utils';

interface CourseCardProps {
  course: Course;
  plans?: PlannerPlan[];
  distributiveColors?: Record<string, string | null>;
  onRemove: () => void;
  draggable?: boolean;
  onDragStart?: (event: DragEvent, course: Course) => void;
  onSelect?: () => void;
}

export const CourseCard = ({
  course,
  plans = [],
  distributiveColors,
  onRemove,
  draggable = false,
  onDragStart,
  onSelect,
}: CourseCardProps) => {
  const coursePlans = course.planIds
    .map((id) => plans.find((plan) => plan.id === id))
    .filter((plan): plan is PlannerPlan => Boolean(plan));
  const clickable = Boolean(onSelect);

  return (
    <div
      className={cn(
        "group relative bg-card border border-border rounded-lg p-3 hover:shadow-sm transition-all",
        clickable && "cursor-pointer active:scale-[0.995] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
      )}
      draggable={draggable}
      onDragStart={(event) => onDragStart?.(event, course)}
      onClick={onSelect}
      role={clickable ? 'button' : undefined}
      tabIndex={clickable ? 0 : undefined}
      onKeyDown={(event) => {
        if (!clickable) return;
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onSelect?.();
        }
      }}
    >
      <button
        onClick={(event) => {
          event.stopPropagation();
          onRemove();
        }}
        className="absolute -top-2 -right-2 h-5 w-5 rounded-full bg-card border border-border flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive hover:text-destructive-foreground hover:border-destructive"
        aria-label="Remove class"
      >
        <X className="h-3 w-3" />
      </button>
      
      <div className="flex items-start justify-between gap-2">
        <span className="font-semibold text-sm text-foreground">{course.code}</span>
        <span className="text-xs text-muted-foreground">{course.credits}cr</span>
      </div>
      <p className="text-xs text-muted-foreground mt-1">{course.name}</p>
      {course.description && <p className="text-[11px] text-muted-foreground mt-1 line-clamp-2">{course.description}</p>}
      <div className="flex flex-wrap gap-1.5 mt-2">
        {coursePlans.map((plan) => (
          <Badge
            key={plan.id}
            variant="outline"
            className={`text-[11px] font-medium ${getTagColorClasses(plan.name, plan.color)}`}
            style={getTagColorStyle(plan.name, plan.color)}
          >
            {plan.type === 'major' ? 'Major' : 'Minor'} • {plan.name}
          </Badge>
        ))}
        {course.distributives.map((dist) => (
          <Badge
            key={dist}
            variant="outline"
            className={`text-[11px] font-medium ${getTagColorClasses(dist, distributiveColors?.[dist] ?? course.distributiveColors?.[dist])}`}
            style={getTagColorStyle(dist, distributiveColors?.[dist] ?? course.distributiveColors?.[dist])}
          >
            {dist}
          </Badge>
        ))}
      </div>
    </div>
  );
};
