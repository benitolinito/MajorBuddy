import { Search, BookOpen } from 'lucide-react';
import { useState } from 'react';
import { Course, CategoryName, CATEGORY_COLORS } from '@/types/planner';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';

interface CourseCatalogProps {
  courses: Course[];
  onDragStart: (course: Course) => void;
}

const CategoryBadge = ({ category }: { category: CategoryName }) => (
  <span 
    className={`${CATEGORY_COLORS[category]} text-primary-foreground text-[10px] font-medium px-1.5 py-0.5 rounded`}
  >
    {category}
  </span>
);

export const CourseCatalog = ({ courses, onDragStart }: CourseCatalogProps) => {
  const [search, setSearch] = useState('');

  const filteredCourses = courses.filter(
    (c) =>
      c.code.toLowerCase().includes(search.toLowerCase()) ||
      c.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <aside className="w-64 bg-card border-r border-border flex flex-col h-screen sticky top-0">
      <div className="p-4 border-b border-border">
        <div className="flex items-center gap-2 mb-4">
          <BookOpen className="h-5 w-5 text-muted-foreground" />
          <h2 className="font-semibold text-foreground">Course Catalog</h2>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search courses..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-secondary border-0"
          />
        </div>
      </div>

      <ScrollArea className="flex-1 p-4">
        <div className="space-y-2">
          {filteredCourses.map((course) => (
            <div
              key={course.id}
              draggable
              onDragStart={(e) => {
                e.dataTransfer.setData('course', JSON.stringify(course));
                onDragStart(course);
              }}
              className="bg-card border border-border rounded-lg p-3 cursor-grab hover:shadow-md hover:border-primary/30 transition-all active:cursor-grabbing"
            >
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
          ))}
        </div>
      </ScrollArea>
    </aside>
  );
};