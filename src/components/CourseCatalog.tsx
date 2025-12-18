import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowRight, BookOpen, ChevronsLeft, Pencil, Plus, Search, Tag, Trash } from 'lucide-react';
import { Course, NewCourseInput, PlanProfile, PlannerPlan } from '@/types/planner';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { getTagAccentClass, getTagColorClasses } from '@/lib/tagColors';
import { cn } from '@/lib/utils';
import { PlanSwitcher } from '@/components/PlanSwitcher';
import { TagColorPicker } from '@/components/TagColorPicker';

interface CourseCatalogProps {
  courses: Course[];
  distributives: string[];
  plans: PlannerPlan[];
  planProfiles: PlanProfile[];
  activePlanProfileId: string;
  onDragStart: (course: Course) => void;
  onCreateCourse: (course: NewCourseInput) => void;
  onUpdateCourse: (courseId: string, course: NewCourseInput) => void;
  onRemoveCourse: (courseId: string) => void;
  onCreateDistributive: (label: string) => string;
  onCreatePlanProfile: (name: string, options?: { startBlank?: boolean }) => PlanProfile | void;
  onSelectPlanProfile: (planId: string) => void;
  onRenamePlanProfile: (planId: string, name: string) => void;
  onDeletePlanProfile: (planId: string) => void;
  onCollapsePanel?: () => void;
  isMobile?: boolean;
  onQuickAddCourse?: (course: Course) => void;
  addCourseTrigger?: number;
}

const TogglePill = ({
  label,
  active,
  tone = 'neutral',
  colorClassName,
  colorAccentClass,
  onClick,
}: {
  label: string;
  active: boolean;
  tone?: 'neutral' | 'major' | 'minor';
  colorClassName?: string;
  colorAccentClass?: string;
  onClick: () => void;
}) => {
  const base = 'rounded-full border px-2.5 py-1 text-xs font-medium transition-colors';
  const activeStyles =
    colorClassName
      ? colorClassName
      : tone === 'major'
      ? 'bg-primary text-primary-foreground border-primary'
      : tone === 'minor'
        ? 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/40 dark:text-amber-100 dark:border-amber-500/40'
        : 'bg-secondary text-foreground border-primary/40';
  const idleStyles = 'bg-card text-foreground border-border hover:border-primary/50 hover:text-primary';
  return (
    <button type="button" onClick={onClick} className={`${base} ${active ? activeStyles : idleStyles}`}>
      {colorAccentClass && (
        <span className={`mr-1.5 inline-flex h-2.5 w-2.5 rounded-full ${colorAccentClass}`} aria-hidden />
      )}
      {label}
    </button>
  );
};

type CourseFormState = {
  code: string;
  title: string;
  description: string;
  credits: number;
  distributives: string[];
  distributiveColors: Record<string, string>;
  activeDistributive: string | null;
  newDistributive: string;
  planIds: string[];
};

const createEmptyCourseForm = (): CourseFormState => ({
  code: '',
  title: '',
  description: '',
  credits: 3,
  distributives: [],
  distributiveColors: {},
  activeDistributive: null,
  newDistributive: '',
  planIds: [],
});

export const CourseCatalog = ({
  courses,
  distributives,
  plans,
  planProfiles,
  activePlanProfileId,
  onDragStart,
  onCreateCourse,
  onUpdateCourse,
  onRemoveCourse,
  onCreateDistributive,
  onCreatePlanProfile,
  onSelectPlanProfile,
  onRenamePlanProfile,
  onDeletePlanProfile,
  onCollapsePanel,
  isMobile = false,
  onQuickAddCourse,
  addCourseTrigger,
}: CourseCatalogProps) => {
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formState, setFormState] = useState<CourseFormState>(() => createEmptyCourseForm());
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);

  const {
    code,
    title,
    description,
    credits,
    distributives: selectedDistributives,
    distributiveColors: selectedDistributiveColors,
    activeDistributive: activeDistributiveForColor,
    newDistributive,
    planIds: selectedPlans,
  } = formState;
  const updateFormField = <K extends keyof CourseFormState>(key: K, value: CourseFormState[K]) => {
    setFormState((prev) => ({ ...prev, [key]: value }));
  };

  const planLookup = useMemo(() => new Map(plans.map((plan) => [plan.id, plan])), [plans]);

  const filteredCourses = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return courses;
    return courses.filter(
      (c) => c.code.toLowerCase().includes(term) || c.name.toLowerCase().includes(term) || c.distributives.some((d) => d.toLowerCase().includes(term))
    );
  }, [courses, search]);

  useEffect(() => {
    if (selectedDistributives.length === 0) {
      if (activeDistributiveForColor !== null) {
        updateFormField('activeDistributive', null);
      }
      return;
    }
    if (!activeDistributiveForColor || !selectedDistributives.includes(activeDistributiveForColor)) {
      updateFormField('activeDistributive', selectedDistributives[0] ?? null);
    }
  }, [activeDistributiveForColor, selectedDistributives]);

  const updateDistributiveColor = (label: string, colorId: string) => {
    setFormState((prev) => ({
      ...prev,
      distributiveColors: { ...prev.distributiveColors, [label]: colorId },
    }));
  };

  const removeDistributiveColor = (label: string) => {
    setFormState((prev) => {
      if (!(label in prev.distributiveColors)) return prev;
      const nextColors = { ...prev.distributiveColors };
      delete nextColors[label];
      return { ...prev, distributiveColors: nextColors };
    });
  };

  const toggleDistributive = (label: string) => {
    setFormState((prev) => {
      const isSelected = prev.distributives.includes(label);
      if (!isSelected) {
        return {
          ...prev,
          distributives: [...prev.distributives, label],
          activeDistributive: label,
        };
      }

      if (prev.activeDistributive !== label) {
        return {
          ...prev,
          activeDistributive: label,
        };
      }

      const remaining = prev.distributives.filter((item) => item !== label);
      const nextColors = { ...prev.distributiveColors };
      delete nextColors[label];
      return {
        ...prev,
        distributives: remaining,
        distributiveColors: nextColors,
        activeDistributive: remaining[0] ?? null,
      };
    });
  };

  const togglePlan = (planId: string) => {
    setFormState((prev) => ({
      ...prev,
      planIds: prev.planIds.includes(planId)
        ? prev.planIds.filter((id) => id !== planId)
        : [...prev.planIds, planId],
    }));
  };

  const handleAddDistributive = () => {
    const created = onCreateDistributive(newDistributive);
    if (created) {
      setFormState((prev) => ({
        ...prev,
        distributives: Array.from(new Set([...prev.distributives, created])),
        activeDistributive: created,
      }));
    }
    updateFormField('newDistributive', '');
  };

  const resetForm = () => {
    setFormState(createEmptyCourseForm());
    setEditingCourse(null);
  };

  const startAddCourse = () => {
    resetForm();
    setDialogOpen(true);
  };

  const lastAddTrigger = useRef<number | null>(null);

  useEffect(() => {
    if (!addCourseTrigger) return;
    if (lastAddTrigger.current === addCourseTrigger) return;
    lastAddTrigger.current = addCourseTrigger;
    setFormState(createEmptyCourseForm());
    setEditingCourse(null);
    setDialogOpen(true);
  }, [addCourseTrigger]);

  const startEditCourse = (course: Course) => {
    setEditingCourse(course);
    setFormState({
      code: course.code,
      title: course.name,
      description: course.description ?? '',
      credits: course.credits,
      distributives: course.distributives,
      distributiveColors: course.distributiveColors ?? {},
      activeDistributive: course.distributives[0] ?? null,
      newDistributive: '',
      planIds: course.planIds,
    });
    setDialogOpen(true);
  };

  const handleRemoveCourse = () => {
    if (!editingCourse) return;
    onRemoveCourse(editingCourse.id);
    handleDialogChange(false);
  };

  const handleSave = () => {
    const trimmedTitle = title.trim();
    const trimmedCode = code.trim();
    const normalizedCredits = Number.isFinite(Number(credits)) ? Math.max(0, Number(credits)) : 0;
    const activePlanIds = selectedPlans.filter((id) => planLookup.has(id));

    const sanitizedColors = selectedDistributives.reduce<Record<string, string>>((acc, label) => {
      const colorId = selectedDistributiveColors[label];
      if (colorId) {
        acc[label] = colorId;
      }
      return acc;
    }, {});

    const payload: NewCourseInput = {
      code: trimmedCode || 'NEW-000',
      name: trimmedTitle || 'Untitled class',
      description: description.trim() || undefined,
      credits: normalizedCredits,
      distributives: selectedDistributives,
      distributiveColors: Object.keys(sanitizedColors).length ? sanitizedColors : undefined,
      planIds: activePlanIds,
    };

    if (editingCourse) {
      onUpdateCourse(editingCourse.id, payload);
    } else {
      onCreateCourse(payload);
    }
    handleDialogChange(false);
  };

  const handleDialogChange = (open: boolean) => {
    setDialogOpen(open);
    if (!open) resetForm();
  };

  const activeDistributiveColor =
    activeDistributiveForColor && selectedDistributives.includes(activeDistributiveForColor)
      ? selectedDistributiveColors[activeDistributiveForColor] ?? null
      : null;

  const handleActiveColorSelect = (colorId: string | null) => {
    if (!activeDistributiveForColor) return;
    if (colorId) {
      updateDistributiveColor(activeDistributiveForColor, colorId);
    } else {
      removeDistributiveColor(activeDistributiveForColor);
    }
  };

  const isEditing = Boolean(editingCourse);
  const mobileQuickAdd = isMobile && Boolean(onQuickAddCourse);

  return (
    <aside className="bg-card border-r border-border flex flex-col h-screen sticky top-0 min-w-[260px] max-w-full">
      <div className="p-4 border-b border-border space-y-4">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-muted-foreground" />
            <div>
              <h2 className="font-semibold text-foreground leading-tight">Class Library</h2>
              <p className="text-xs text-muted-foreground">
                {mobileQuickAdd ? 'Tap "Add to term" from a class card to place it in your schedule.' : 'Add your classes, then drag to a term.'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Button size="sm" onClick={startAddCourse}>
              <Plus className="h-4 w-4 mr-1" />
              Add class
            </Button>
            {onCollapsePanel && !isMobile && (
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8"
                onClick={onCollapsePanel}
                aria-label="Collapse class library"
              >
                <ChevronsLeft className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search classes..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-secondary border-0"
          />
        </div>
      </div>

      <ScrollArea className="flex-1 p-4">
        <div className="space-y-2">
          {filteredCourses.length === 0 && (
            <div className="border border-dashed border-border rounded-lg p-3 text-xs text-muted-foreground">
              No classes yet. Add your first class to start planning.
            </div>
          )}
          {filteredCourses.map((course) => {
            const coursePlans = course.planIds
              .map((id) => planLookup.get(id))
              .filter((plan): plan is PlannerPlan => Boolean(plan));

            return (
              <div
                key={course.id}
                draggable={!mobileQuickAdd}
                onDragStart={(e) => {
                  if (mobileQuickAdd) return;
                  e.dataTransfer.setData('course', JSON.stringify(course));
                  e.dataTransfer.setData('course-source', '');
                  e.dataTransfer.effectAllowed = 'copy';
                  onDragStart(course);
                }}
                className={cn(
                  'group relative bg-card border border-border rounded-lg p-3 transition-all',
                  mobileQuickAdd ? 'cursor-default' : 'cursor-grab hover:shadow-md hover:border-primary/30 active:cursor-grabbing',
                )}
              >
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label={`Edit ${course.code}`}
                  draggable={false}
                  className="absolute right-2 bottom-2 h-7 w-7 opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
                  onMouseDown={(e) => e.stopPropagation()}
                  onClick={(e) => {
                    e.stopPropagation();
                    startEditCourse(course);
                  }}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
                <div className="flex items-start justify-between gap-2">
                  <span className="font-semibold text-sm text-foreground">{course.code}</span>
                  <span className="text-xs text-muted-foreground">{course.credits}cr</span>
                </div>
                <p className="text-sm text-foreground mt-1">{course.name}</p>
                {course.description && (
                  <p className="text-[11px] text-muted-foreground mt-1 line-clamp-2">{course.description}</p>
                )}
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {coursePlans.map((plan) => (
                    <Badge
                      key={plan.id}
                      variant="outline"
                      className={`text-[11px] font-medium ${getTagColorClasses(plan.name, plan.color)}`}
                    >
                      {plan.type === 'major' ? 'Major' : 'Minor'} • {plan.name}
                    </Badge>
                  ))}
                  {course.distributives.map((dist) => (
                    <Badge key={dist} variant="outline" className={`text-[11px] font-medium ${getTagColorClasses(dist)}`}>
                      {dist}
                    </Badge>
                  ))}
                </div>
                {mobileQuickAdd && (
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    className="mt-3 w-full justify-center gap-2"
                    onClick={() => onQuickAddCourse?.(course)}
                  >
                    <ArrowRight className="h-4 w-4" />
                    Add to term
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      </ScrollArea>

      <Dialog open={dialogOpen} onOpenChange={handleDialogChange}>
        <DialogContent className="sm:max-w-xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{isEditing ? 'Edit class' : 'Add a class'}</DialogTitle>
            <DialogDescription>
              {isEditing
                ? 'Update the details for this class and keep your library tidy.'
                : 'Give us the basics for this class and tag where it fits in your plan.'}
            </DialogDescription>
          </DialogHeader>

          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              handleSave();
            }}
          >
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="class-code">Class code</Label>
                <Input
                  id="class-code"
                  placeholder="e.g., MATH210"
                  value={code}
                  onChange={(e) => updateFormField('code', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="class-title">Title</Label>
                <Input
                  id="class-title"
                  placeholder="Linear Algebra"
                  value={title}
                  onChange={(e) => updateFormField('title', e.target.value)}
                />
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 items-start">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="class-credits">Credits</Label>
                  <Input
                    id="class-credits"
                    type="number"
                    min={0}
                    max={20}
                    value={credits}
                    onChange={(e) => updateFormField('credits', Number(e.target.value))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Distributive colors</Label>
                  <TagColorPicker
                    value={activeDistributiveColor}
                    onSelect={handleActiveColorSelect}
                    disabled={!activeDistributiveForColor}
                    allowDeselect
                    size="compact"
                    className="gap-1.5"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="class-distributives">Distributives</Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="class-distributives"
                    placeholder="Add a distributive"
                    value={newDistributive}
                    onChange={(e) => updateFormField('newDistributive', e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddDistributive();
                      }
                    }}
                  />
                  <Button type="button" variant="secondary" onClick={handleAddDistributive}>
                    <Tag className="h-4 w-4 mr-1" />
                    Add
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2 pt-1">
                  {distributives.map((dist) => (
                    <TogglePill
                      key={dist}
                      label={dist}
                      active={selectedDistributives.includes(dist)}
                      colorClassName={
                        selectedDistributiveColors[dist]
                          ? getTagColorClasses(dist, selectedDistributiveColors[dist])
                          : undefined
                      }
                      colorAccentClass={
                        selectedDistributiveColors[dist]
                          ? getTagAccentClass(dist, selectedDistributiveColors[dist])
                          : undefined
                      }
                      onClick={() => toggleDistributive(dist)}
                    />
                  ))}
                  {selectedDistributives
                    .filter((dist) => !distributives.includes(dist))
                    .map((dist) => (
                      <TogglePill
                        key={dist}
                        label={dist}
                        active
                        colorClassName={
                          selectedDistributiveColors[dist]
                            ? getTagColorClasses(dist, selectedDistributiveColors[dist])
                            : undefined
                        }
                        colorAccentClass={
                          selectedDistributiveColors[dist]
                            ? getTagAccentClass(dist, selectedDistributiveColors[dist])
                            : undefined
                        }
                        onClick={() => toggleDistributive(dist)}
                      />
                    ))}
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <div className="space-y-1">
                <Label>Major/Minor alignment</Label>
                <p className="text-[11px] text-muted-foreground">
                  Tag this class to the majors or minors you&apos;ve added in the Requirements panel.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {plans.length === 0 && (
                  <p className="text-xs text-muted-foreground">No plans yet. Add a major or minor on the right.</p>
                )}
                {plans.map((plan) => (
                  <TogglePill
                    key={plan.id}
                    label={`${plan.type === 'major' ? 'Major' : 'Minor'} • ${plan.name}`}
                    active={selectedPlans.includes(plan.id)}
                    tone={plan.type === 'major' ? 'major' : 'minor'}
                    colorClassName={getTagColorClasses(plan.name, plan.color)}
                    colorAccentClass={getTagAccentClass(plan.name, plan.color)}
                    onClick={() => togglePlan(plan.id)}
                  />
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="class-description">Description</Label>
              <Textarea
                id="class-description"
                placeholder="What does this class cover?"
                value={description}
                onChange={(e) => updateFormField('description', e.target.value)}
              />
            </div>

            <div className="flex items-center gap-2 pt-2">
              {isEditing && (
                <Button
                  type="button"
                  variant="destructive"
                  onClick={handleRemoveCourse}
                  className="mr-auto"
                >
                  <Trash className="h-4 w-4" />
                  Remove class
                </Button>
              )}
              <div className="ml-auto flex gap-2">
                <Button type="button" variant="ghost" onClick={() => handleDialogChange(false)}>
                  Cancel
                </Button>
                <Button type="submit">{isEditing ? 'Save changes' : 'Save class'}</Button>
              </div>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </aside>
  );
};
