import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { DragEvent } from 'react';
import { X } from 'lucide-react';
import { Term, Course, PlannerPlan, CourseDropOptions } from '@/types/planner';
import { CourseCard } from './CourseCard';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

const extractSource = (event: DragEvent): CourseDropOptions['source'] | undefined => {
  const rawSource = event.dataTransfer.getData('course-source');
  if (!rawSource) return undefined;
  try {
    return JSON.parse(rawSource);
  } catch {
    return undefined;
  }
};

interface TermCardProps {
  yearId: string;
  term: Term;
  credits: number;
  plans: PlannerPlan[];
  onRemoveCourse: (courseId: string) => void;
  onDropCourse: (course: Course, options?: CourseDropOptions) => void;
  onRemoveTerm?: () => void;
}

export const TermCard = ({ yearId, term, credits, plans, onRemoveCourse, onDropCourse, onRemoveTerm }: TermCardProps) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [indicatorIndex, setIndicatorIndex] = useState<number | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);
  const positionsRef = useRef<Map<string, DOMRect>>(new Map());
  const [recentCourseId, setRecentCourseId] = useState<string | null>(null);
  const dropHighlightTimeout = useRef<number | null>(null);

  const handleDragLeave = (event: DragEvent) => {
    const nextTarget = event.relatedTarget as Node | null;
    if (!event.currentTarget.contains(nextTarget)) {
      setIsDragOver(false);
      setIndicatorIndex(null);
    }
  };

  const getDropIndex = useCallback(
    (event: DragEvent) => {
      const container = listRef.current;
      if (!container || term.courses.length === 0) return 0;
      const courseNodes = Array.from(container.querySelectorAll<HTMLElement>('[data-course-index]'));
      const cursorY = event.clientY;
      for (const node of courseNodes) {
        const idx = Number(node.dataset.courseIndex);
        const rect = node.getBoundingClientRect();
        if (cursorY < rect.top + rect.height / 2) {
          return Number.isNaN(idx) ? 0 : idx;
        }
      }
      return term.courses.length;
    },
    [term.courses.length],
  );

  const highlightCourse = useCallback((courseId: string) => {
    setRecentCourseId(courseId);
    if (dropHighlightTimeout.current) {
      window.clearTimeout(dropHighlightTimeout.current);
    }
    dropHighlightTimeout.current = window.setTimeout(() => setRecentCourseId(null), 700);
  }, []);

  const handleDrop = useCallback(
    (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const insertionIndex = indicatorIndex ?? getDropIndex(e);
      setIsDragOver(false);
      setIndicatorIndex(null);
      const courseData = e.dataTransfer.getData('course');
      if (!courseData) return;
      try {
        const course = JSON.parse(courseData) as Course;
        const source = extractSource(e);
        onDropCourse(course, { targetIndex: insertionIndex, source });
        highlightCourse(course.id);
      } catch {
        // ignore malformed payloads
      }
    },
    [getDropIndex, highlightCourse, indicatorIndex, onDropCourse],
  );

  const handleTermDragOver = useCallback(
    (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragOver(true);
      const index = term.courses.length === 0 ? 0 : getDropIndex(e);
      setIndicatorIndex(index);
    },
    [getDropIndex, term.courses.length],
  );

  const handleCourseDragStart = useCallback(
    (event: DragEvent, course: Course) => {
      event.dataTransfer.setData('course', JSON.stringify(course));
      event.dataTransfer.setData(
        'course-source',
        JSON.stringify({ yearId, termId: term.id, courseId: course.id }),
      );
      event.dataTransfer.effectAllowed = 'move';
    },
    [term.id, yearId],
  );

  const renderDropIndicator = (index: number) => (
    <div
      key={`indicator-${term.id}-${index}`}
      className={`h-2 rounded border border-dashed border-transparent transition-all duration-150 ${
        indicatorIndex === index ? 'border-primary bg-primary/30 opacity-100' : 'opacity-0'
      }`}
    />
  );

  const showIndicatorAt = (index: number) => indicatorIndex !== null && indicatorIndex === index;

  useLayoutEffect(() => {
    const container = listRef.current;
    if (!container) return;
    const nextPositions = new Map<string, DOMRect>();
    const nodes = container.querySelectorAll<HTMLElement>('[data-course-id]');
    nodes.forEach((node) => {
      const id = node.dataset.courseId;
      if (!id) return;
      const nextRect = node.getBoundingClientRect();
      const prevRect = positionsRef.current.get(id);
      nextPositions.set(id, nextRect);
      if (prevRect) {
        const deltaX = prevRect.left - nextRect.left;
        const deltaY = prevRect.top - nextRect.top;
        if (deltaX || deltaY) {
          node.style.transition = 'none';
          node.style.transform = `translate(${deltaX}px, ${deltaY}px)`;
          requestAnimationFrame(() => {
            node.style.transition = 'transform 220ms cubic-bezier(0.2, 0, 0, 1), opacity 220ms ease';
            node.style.transform = '';
          });
        }
      }
    });
    positionsRef.current = nextPositions;
  }, [term.courses]);

  useEffect(() => () => {
    if (dropHighlightTimeout.current) {
      window.clearTimeout(dropHighlightTimeout.current);
    }
  }, []);

  const isEmpty = term.courses.length === 0;
  const containerClassName = cn(
    'group relative bg-muted/50 rounded-xl p-4 min-w-[280px] max-w-[320px] flex-1 transition-all',
    isDragOver && 'ring-2 ring-primary ring-offset-2 bg-primary/5',
  );

  return (
    <div className={containerClassName} onDragOver={handleTermDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop}>
      {onRemoveTerm && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onRemoveTerm();
          }}
          className="absolute -top-2 -right-2 flex h-7 w-7 items-center justify-center rounded-full border border-border bg-card text-muted-foreground opacity-0 p-0 leading-none transition hover:border-destructive hover:text-destructive focus-visible:opacity-100 group-hover:opacity-100"
          aria-label={`Remove ${term.name} ${term.year}`}
        >
          <X className="h-4 w-4" />
        </button>
      )}
      <div className="flex items-start justify-between mb-4">
        <div>
          <p className="text-sm font-semibold text-primary uppercase tracking-wide">{term.name}</p>
          <p className="text-lg font-bold text-foreground">{term.year}</p>
        </div>
        <Badge variant="outline" className="text-xs font-medium bg-card">
          {credits} Credits
        </Badge>
      </div>
      
      <div ref={listRef} className="space-y-2 min-h-[120px]">
        {isEmpty ? (
          <div
            className="h-[120px] flex items-center justify-center text-muted-foreground text-sm border-2 border-dashed border-border rounded-lg"
            onDragOver={handleTermDragOver}
            onDrop={handleDrop}
          >
            Drag courses here
          </div>
        ) : (
          term.courses.map((course, index) => (
            <div
              key={course.id}
              data-course-index={index}
              data-course-id={course.id}
              className={cn(
                "transition-transform duration-200 ease-out",
                recentCourseId === course.id && "animate-course-drop",
              )}
            >
              {showIndicatorAt(index) && renderDropIndicator(index)}
              <CourseCard
                course={course}
                plans={plans}
                onRemove={() => onRemoveCourse(course.id)}
                draggable
                onDragStart={handleCourseDragStart}
              />
            </div>
          ))
        )}
        {showIndicatorAt(term.courses.length) && renderDropIndicator(term.courses.length)}
      </div>
    </div>
  );
};
