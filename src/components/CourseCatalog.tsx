import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { ArrowRight, ArrowUpDown, BookOpen, ChevronDown, ChevronsLeft, Filter, Pencil, Plus, Search, Trash, X } from 'lucide-react';
import { Course, CourseLibrary, NewCourseInput, PlannerPlan, TermName, TermSystem } from '@/types/planner';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Checkbox } from '@/components/ui/checkbox';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { getTagAccentClass, getTagAccentStyle, getTagColorClasses, getTagColorStyle } from '@/lib/tagColors';
import { ConfirmDialog } from '@/components/ConfirmDialog';

interface CourseCatalogProps {
  courses: Course[];
  distributives: string[];
  distributiveColorMap?: Record<string, string | null>;
  onCreateDistributive?: (label: string) => string;
  plans: PlannerPlan[];
  onDragStart: (course: Course) => void;
  onCreateCourse: (course: NewCourseInput) => void;
  onUpdateCourse: (courseId: string, course: NewCourseInput) => void;
  onRemoveCourse: (courseId: string) => void;
  onCollapsePanel?: () => void;
  termSystem: TermSystem;
  isMobile?: boolean;
  onQuickAddCourse?: (course: Course) => void;
  addCourseTrigger?: number;
  quickAddLabel?: string;
  colorPalette?: string[];
  onAddPaletteColor?: (hex: string) => string;
  defaultCourseCredits?: number;
  onUpdateDefaultCourseCredits?: (credits: number) => void;
  courseLibraries?: CourseLibrary[];
  activeCourseLibraryId?: string;
  onSelectCourseLibrary?: (libraryId: string) => void;
  onCreateCourseLibrary?: (name: string) => void;
  onRenameCourseLibrary?: (libraryId: string, name: string) => void;
  onDeleteCourseLibrary?: (libraryId: string) => void;
}

const TogglePill = ({
  label,
  active,
  tone = 'neutral',
  colorClassName,
  colorAccentClass,
  colorStyle,
  colorAccentStyle,
  onClick,
}: {
  label: string;
  active: boolean;
  tone?: 'neutral' | 'major' | 'minor';
  colorClassName?: string;
  colorAccentClass?: string;
  colorStyle?: CSSProperties;
  colorAccentStyle?: CSSProperties;
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
    <button
      type="button"
      onClick={onClick}
      className={`${base} ${active ? activeStyles : idleStyles}`}
      style={active ? colorStyle : undefined}
    >
      {(colorAccentClass || colorAccentStyle) && (
        <span
          className={`mr-1.5 inline-flex h-2.5 w-2.5 rounded-full ${colorAccentClass ?? ''}`}
          style={colorAccentStyle}
          aria-hidden
        />
      )}
      {label}
    </button>
  );
};

const SectionCard = ({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) => (
  <section className="space-y-3 rounded-2xl border border-border/70 bg-card/90 p-4 shadow-sm">
    <div className="space-y-1">
      <p className="text-base font-semibold leading-tight text-foreground">{title}</p>
      {description && <p className="text-sm text-muted-foreground">{description}</p>}
    </div>
    {children}
  </section>
);

type CourseFormState = {
  code: string;
  title: string;
  description: string;
  credits: number;
  subject: string;
  prerequisiteIds: string[];
  distributives: string[];
  newDistributive: string;
  planIds: string[];
  offeredTerms: TermName[];
};

type SortOption =
  | 'order-added'
  | 'distributive'
  | 'credits'
  | 'title-asc'
  | 'title-desc'
  | 'plan';

const SORT_LABELS: Record<SortOption, string> = {
  'order-added': 'Order added',
  distributive: 'Distributive',
  credits: 'Credit number',
  'title-asc': 'Title (A-Z)',
  'title-desc': 'Title (Z-A)',
  plan: 'Major/Minor',
};

const DEFAULT_COURSE_CREDITS = 3;

const createEmptyCourseForm = (defaultCredits: number = DEFAULT_COURSE_CREDITS): CourseFormState => ({
  code: '',
  title: '',
  description: '',
  subject: '',
  prerequisiteIds: [],
  credits: defaultCredits,
  distributives: [],
  newDistributive: '',
  planIds: [],
  offeredTerms: [],
});

export const CourseCatalog = ({
  courses,
  distributives,
  distributiveColorMap,
  onCreateDistributive,
  plans,
  onDragStart,
  onCreateCourse,
  onUpdateCourse,
  onRemoveCourse,
  onCollapsePanel,
  termSystem,
  isMobile = false,
  onQuickAddCourse,
  addCourseTrigger,
  quickAddLabel = 'Add to term',
  colorPalette: _colorPalette,
  onAddPaletteColor: _onAddPaletteColor,
  defaultCourseCredits,
  onUpdateDefaultCourseCredits,
  courseLibraries = [],
  activeCourseLibraryId,
  onSelectCourseLibrary,
  onCreateCourseLibrary,
  onRenameCourseLibrary,
  onDeleteCourseLibrary,
}: CourseCatalogProps) => {
  const resolvedDefaultCredits = Number.isFinite(Number(defaultCourseCredits))
    ? Math.max(0, Number(defaultCourseCredits))
    : DEFAULT_COURSE_CREDITS;
  const [search, setSearch] = useState('');
  const [sortOption, setSortOption] = useState<SortOption>('order-added');
  const [termFilter, setTermFilter] = useState<TermName | null>(null);
  const [distributiveFilter, setDistributiveFilter] = useState<string | null>(null);
  const [planFilter, setPlanFilter] = useState<string | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formState, setFormState] = useState<CourseFormState>(() => createEmptyCourseForm(resolvedDefaultCredits));
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [libraryEditor, setLibraryEditor] = useState<{ mode: 'create' | 'rename'; open: boolean }>({ mode: 'create', open: false });
  const [libraryNameDraft, setLibraryNameDraft] = useState('');
  const [deleteLibraryDialogOpen, setDeleteLibraryDialogOpen] = useState(false);

  const {
    code,
    title,
    description,
    credits,
    subject,
    prerequisiteIds,
    distributives: selectedDistributives,
    newDistributive,
    planIds: selectedPlans,
    offeredTerms,
  } = formState;
  const courseLookup = useMemo(() => new Map(courses.map((course) => [course.id, course])), [courses]);
  const updateFormField = <K extends keyof CourseFormState>(key: K, value: CourseFormState[K]) => {
    setFormState((prev) => ({ ...prev, [key]: value }));
  };

  const resolvedLibraries = useMemo(() => courseLibraries ?? [], [courseLibraries]);
  const activeLibrary = useMemo(() => {
    if (!resolvedLibraries.length) return null;
    return resolvedLibraries.find((library) => library.id === activeCourseLibraryId) ?? resolvedLibraries[0];
  }, [resolvedLibraries, activeCourseLibraryId]);
  const canDeleteLibrary = resolvedLibraries.length > 1 && Boolean(onDeleteCourseLibrary);

  const baseTermOptions = useMemo<TermName[]>(
    () => (termSystem === 'quarter' ? ['Fall', 'Winter', 'Spring', 'Summer'] : ['Fall', 'Spring', 'Summer']),
    [termSystem],
  );

  const termOptions = useMemo<TermName[]>(() => {
    const extras = offeredTerms.filter((term) => !baseTermOptions.includes(term));
    return [...baseTermOptions, ...extras];
  }, [baseTermOptions, offeredTerms]);

  const uniqueTermOptions = useMemo<TermName[]>(() => Array.from(new Set(termOptions)), [termOptions]);
  const allTermOptionsSelected = useMemo(
    () => uniqueTermOptions.length > 0 && uniqueTermOptions.every((term) => offeredTerms.includes(term)),
    [uniqueTermOptions, offeredTerms],
  );
  const selectAllLabel = allTermOptionsSelected ? 'Deselect all' : 'Select all';

  const planLookup = useMemo(() => new Map(plans.map((plan) => [plan.id, plan])), [plans]);

  const courseOrder = useMemo(() => new Map(courses.map((course, index) => [course.id, index])), [courses]);
  const prerequisiteOptions = useMemo(() => {
    const filtered = courses.filter((course) => !editingCourse || course.id !== editingCourse.id);
    return filtered.sort((a, b) => (courseOrder.get(a.id) ?? 0) - (courseOrder.get(b.id) ?? 0));
  }, [courses, editingCourse, courseOrder]);
  const hasCourses = courses.length > 0;

  const termFilterOptions = useMemo<TermName[]>(() => {
    const seen = new Set<TermName>();
    baseTermOptions.forEach((term) => seen.add(term));
    courses.forEach((course) => {
      (course.offeredTerms ?? []).forEach((term) => seen.add(term));
    });
    return Array.from(seen);
  }, [baseTermOptions, courses]);

  const visibleCourses = useMemo(() => {
    const searchTerm = search.trim().toLowerCase();

    const primaryPlanKey = (course: Course) => {
      const sortedPlans = course.planIds
        .map((id) => planLookup.get(id))
        .filter((plan): plan is PlannerPlan => Boolean(plan))
        .sort((a, b) => {
          if (a.type !== b.type) return a.type === 'major' ? -1 : 1;
          return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
        });
      const plan = sortedPlans[0];
      return plan ? `${plan.type}-${plan.name}` : '';
    };

    const fallbackOrder = (a: Course, b: Course) => (courseOrder.get(a.id) ?? 0) - (courseOrder.get(b.id) ?? 0);

    const matchesSearch = (course: Course) => {
      if (!searchTerm) return true;
      return (
        course.code.toLowerCase().includes(searchTerm) ||
        course.name.toLowerCase().includes(searchTerm) ||
        course.distributives.some((d) => d.toLowerCase().includes(searchTerm))
      );
    };

    const matchesFilters = (course: Course) => {
      if (termFilter && !(course.offeredTerms ?? []).includes(termFilter)) return false;
      if (distributiveFilter && !course.distributives.includes(distributiveFilter)) return false;
      if (planFilter && !course.planIds.includes(planFilter)) return false;
      return true;
    };

    const sorted = courses
      .filter(matchesSearch)
      .filter(matchesFilters)
      .sort((a, b) => {
        switch (sortOption) {
          case 'title-asc': {
            const cmp = a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
            return cmp !== 0 ? cmp : fallbackOrder(a, b);
          }
          case 'title-desc': {
            const cmp = b.name.localeCompare(a.name, undefined, { sensitivity: 'base' });
            return cmp !== 0 ? cmp : fallbackOrder(a, b);
          }
          case 'credits': {
            const diff = b.credits - a.credits;
            return diff !== 0 ? diff : fallbackOrder(a, b);
          }
          case 'distributive': {
            const aKey = (a.distributives[0] ?? '').toLowerCase();
            const bKey = (b.distributives[0] ?? '').toLowerCase();
            const cmp = aKey.localeCompare(bKey, undefined, { sensitivity: 'base' });
            return cmp !== 0 ? cmp : fallbackOrder(a, b);
          }
          case 'plan': {
            const aKey = primaryPlanKey(a).toLowerCase();
            const bKey = primaryPlanKey(b).toLowerCase();
            const cmp = aKey.localeCompare(bKey, undefined, { sensitivity: 'base' });
            return cmp !== 0 ? cmp : fallbackOrder(a, b);
          }
          case 'order-added':
          default:
            return fallbackOrder(a, b);
        }
      });

    return sorted;
  }, [courses, search, termFilter, distributiveFilter, planFilter, sortOption, courseOrder, planLookup]);

  const activeFilters = useMemo(() => {
    const filters: { key: 'term' | 'distributive' | 'plan'; label: string }[] = [];
    if (termFilter) {
      filters.push({ key: 'term', label: `Offered in ${termFilter}` });
    }
    if (distributiveFilter) {
      filters.push({ key: 'distributive', label: `Distributive: ${distributiveFilter}` });
    }
    if (planFilter) {
      const plan = planLookup.get(planFilter);
      const typeLabel = plan?.type === 'minor' ? 'Minor' : 'Major';
      filters.push({ key: 'plan', label: `${typeLabel}: ${plan?.name ?? 'Plan'}` });
    }
    return filters;
  }, [distributiveFilter, planFilter, planLookup, termFilter]);

  const hasActiveFilters = activeFilters.length > 0;

  const clearFilters = () => {
    setTermFilter(null);
    setDistributiveFilter(null);
    setPlanFilter(null);
  };

  const handleAddDistributive = () => {
    const label = newDistributive.trim();
    if (!label) return;

    const createdLabel = onCreateDistributive ? onCreateDistributive(label) : label;
    if (!createdLabel) {
      setFormState((prev) => ({ ...prev, newDistributive: '' }));
      return;
    }

    setFormState((prev) => {
      const normalized = createdLabel.trim();
      const alreadySelected = prev.distributives.includes(normalized);
      return {
        ...prev,
        distributives: alreadySelected ? prev.distributives : [...prev.distributives, normalized],
        newDistributive: '',
      };
    });
  };

  const toggleDistributive = (label: string) => {
    setFormState((prev) => {
      const isSelected = prev.distributives.includes(label);
      return {
        ...prev,
        distributives: isSelected
          ? prev.distributives.filter((item) => item !== label)
          : [...prev.distributives, label],
      };
    });
  };

  const setOfferedTerm = (term: TermName, include: boolean) => {
    setFormState((prev) => {
      const exists = prev.offeredTerms.includes(term);
      if (include && !exists) {
        return { ...prev, offeredTerms: [...prev.offeredTerms, term] };
      }
      if (!include && exists) {
        return { ...prev, offeredTerms: prev.offeredTerms.filter((item) => item !== term) };
      }
      return prev;
    });
  };

  const toggleAllOfferedTerms = () => {
    setFormState((prev) => {
      const allTerms = Array.from(new Set(uniqueTermOptions));
      const isFullySelected = allTerms.length > 0 && allTerms.every((term) => prev.offeredTerms.includes(term));
      return { ...prev, offeredTerms: isFullySelected ? [] : allTerms };
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

  const togglePrerequisite = (courseId: string) => {
    if (editingCourse?.id === courseId) return;
    setFormState((prev) => ({
      ...prev,
      prerequisiteIds: prev.prerequisiteIds.includes(courseId)
        ? prev.prerequisiteIds.filter((id) => id !== courseId)
        : [...prev.prerequisiteIds, courseId],
    }));
  };

  const resetForm = () => {
    setFormState(createEmptyCourseForm(resolvedDefaultCredits));
    setEditingCourse(null);
  };

  const startAddCourse = () => {
    resetForm();
    setDialogOpen(true);
  };

  const lastAddTrigger = useRef<number | null>(null);
  const previousDefaultCreditsRef = useRef(resolvedDefaultCredits);

  useEffect(() => {
    if (!addCourseTrigger) return;
    if (lastAddTrigger.current === addCourseTrigger) return;
    lastAddTrigger.current = addCourseTrigger;
    setFormState(createEmptyCourseForm(resolvedDefaultCredits));
    setEditingCourse(null);
    setDialogOpen(true);
  }, [addCourseTrigger, resolvedDefaultCredits]);

  useEffect(() => {
    if (!editingCourse) {
      setFormState((prev) => {
        if (prev.credits !== previousDefaultCreditsRef.current) return prev;
        return { ...prev, credits: resolvedDefaultCredits };
      });
    }
    previousDefaultCreditsRef.current = resolvedDefaultCredits;
  }, [editingCourse, resolvedDefaultCredits]);

  const startEditCourse = (course: Course) => {
    setEditingCourse(course);
    setFormState({
      code: course.code,
      title: course.name,
      description: course.description ?? '',
      credits: course.credits,
      subject: course.subject ?? '',
      prerequisiteIds: course.prerequisiteIds ?? [],
      distributives: course.distributives,
      newDistributive: '',
      planIds: course.planIds,
      offeredTerms: course.offeredTerms ?? [],
    });
    setDialogOpen(true);
  };

  const handleUseCreditsAsDefault = () => {
    const normalized = Number.isFinite(Number(credits)) ? Math.max(0, Number(credits)) : resolvedDefaultCredits;
    onUpdateDefaultCourseCredits?.(normalized);
    if (!editingCourse && credits === resolvedDefaultCredits) {
      updateFormField('credits', normalized);
    }
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
    const normalizedOfferedTerms = Array.from(new Set(offeredTerms));
    const orderedOfferedTerms = (['Fall', 'Winter', 'Spring', 'Summer'] as TermName[]).filter((term) =>
      normalizedOfferedTerms.includes(term),
    );
    const normalizedSubject = subject.trim() || undefined;
    const normalizedPrerequisites = Array.from(
      new Set(prerequisiteIds.filter((id) => courseLookup.has(id))),
    );

    const payload: NewCourseInput = {
      code: trimmedCode || 'NEW-000',
      name: trimmedTitle || 'Untitled class',
      description: description.trim() || undefined,
      credits: normalizedCredits,
      distributives: selectedDistributives,
      planIds: activePlanIds,
      offeredTerms: orderedOfferedTerms,
      subject: normalizedSubject,
      prerequisiteIds: normalizedPrerequisites,
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
    if (!open) {
      resetForm();
    }
  };

  const handleLibraryDialogChange = (open: boolean) => {
    setLibraryEditor((prev) => ({ ...prev, open }));
    if (!open) {
      setLibraryNameDraft('');
    }
  };

  const handleSelectLibrary = (value: string) => {
    if (!value || value === '__none') return;
    onSelectCourseLibrary?.(value);
  };

  const handleOpenCreateLibrary = () => {
    if (!onCreateCourseLibrary) return;
    setLibraryEditor({ mode: 'create', open: true });
    setLibraryNameDraft('');
  };

  const handleOpenRenameLibrary = () => {
    if (!onRenameCourseLibrary || !activeLibrary) return;
    setLibraryEditor({ mode: 'rename', open: true });
    setLibraryNameDraft(activeLibrary.name);
  };

  const handleSubmitLibraryEditor = () => {
    const trimmed = libraryNameDraft.trim();
    if (!trimmed) return;
    if (libraryEditor.mode === 'create') {
      onCreateCourseLibrary?.(trimmed);
    } else if (libraryEditor.mode === 'rename' && activeLibrary) {
      onRenameCourseLibrary?.(activeLibrary.id, trimmed);
    }
    handleLibraryDialogChange(false);
  };

  const selectedDistributiveColors = distributiveColorMap ?? {};

  const isEditing = Boolean(editingCourse);
  const mobileQuickAdd = isMobile && Boolean(onQuickAddCourse);
  const isDraggable = !isMobile;
  const headerDescription = isMobile
    ? mobileQuickAdd
      ? 'Pick a class to add it to this term.'
      : 'Create and edit classes in your library.'
    : 'Add your classes, then drag to a term.';
  const libraryMenuValue = activeLibrary?.id ?? (resolvedLibraries[0]?.id ?? '__none');
  const libraryLabel = activeLibrary?.name ?? 'Select library';
  const showLibraryControls = Boolean(onSelectCourseLibrary || onCreateCourseLibrary || resolvedLibraries.length);
  const libraryCountLabel = resolvedLibraries.length > 1 ? `${resolvedLibraries.length} libraries` : null;
  const addCourseLabel = mobileQuickAdd ? 'New class' : 'Add class';
  const containerClassName = cn(
    'flex flex-col max-w-full',
    isMobile
      ? 'bg-transparent'
      : 'bg-card border-r border-border h-screen sticky top-0 min-w-[260px]',
  );

  const renderDesktopForm = () => (
    <>
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
            <div className="flex items-center justify-between gap-2">
              <Label htmlFor="class-credits">Credits</Label>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button type="button" variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={handleUseCreditsAsDefault}>
                    Use as default
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top">Makes new classes be worth this number of credits by default.</TooltipContent>
              </Tooltip>
            </div>
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
            <Label htmlFor="class-subject">Subject</Label>
            <Input
              id="class-subject"
              placeholder="Math, Science, Languages"
              value={subject}
              onChange={(e) => updateFormField('subject', e.target.value)}
            />
            <p className="text-[11px] text-muted-foreground">Use your own subject label for quick scanning.</p>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="class-distributives">Distributives</Label>
          <p className="text-[11px] text-muted-foreground">Tag to distributives from the Requirements panel.</p>
          <div className="flex flex-wrap gap-2 pt-1">
            {distributives.map((dist) => {
              const colorId = distributiveColorMap?.[dist];
              return (
                <TogglePill
                  key={dist}
                  label={dist}
                  active={selectedDistributives.includes(dist)}
                  colorClassName={getTagColorClasses(dist, colorId)}
                  colorAccentClass={getTagAccentClass(dist, colorId)}
                  colorStyle={getTagColorStyle(dist, colorId)}
                  colorAccentStyle={getTagAccentStyle(dist, colorId)}
                  onClick={() => toggleDistributive(dist)}
                />
              );
            })}
            {selectedDistributives
              .filter((dist) => !distributives.includes(dist))
              .map((dist) => {
                const colorId = distributiveColorMap?.[dist];
                return (
                  <TogglePill
                    key={dist}
                    label={dist}
                    active
                    colorClassName={getTagColorClasses(dist, colorId)}
                    colorAccentClass={getTagAccentClass(dist, colorId)}
                    colorStyle={getTagColorStyle(dist, colorId)}
                    colorAccentStyle={getTagAccentStyle(dist, colorId)}
                    onClick={() => toggleDistributive(dist)}
                  />
                );
              })}
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
              colorStyle={getTagColorStyle(plan.name, plan.color)}
              colorAccentStyle={getTagAccentStyle(plan.name, plan.color)}
              onClick={() => togglePlan(plan.id)}
            />
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <div className="space-y-1">
          <Label>Prerequisites</Label>
          <p className="text-[11px] text-muted-foreground">Pick classes from your library that should come first.</p>
        </div>
        <div className="max-h-44 space-y-2 overflow-y-auto rounded-xl border border-border/70 bg-card/70 p-3">
          {prerequisiteOptions.length === 0 && (
            <p className="text-xs text-muted-foreground">Add another class to choose it as a prerequisite.</p>
          )}
          {prerequisiteOptions.map((course) => {
            const selected = prerequisiteIds.includes(course.id);
            return (
              <label
                key={course.id}
                className={cn(
                  'flex items-start gap-3 rounded-lg border px-3 py-2 text-left transition',
                  selected ? 'border-primary/70 bg-primary/5' : 'border-border/70 bg-background',
                )}
              >
                <Checkbox
                  checked={selected}
                  onCheckedChange={() => togglePrerequisite(course.id)}
                  aria-label={`Require ${course.code}`}
                />
                <div className="space-y-0.5 leading-tight">
                  <p className="text-sm font-semibold text-foreground">{course.code}</p>
                  <p className="text-xs text-muted-foreground line-clamp-2">{course.name}</p>
                </div>
              </label>
            );
          })}
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-start justify-between gap-2">
          <div className="space-y-1">
            <Label>Typical terms offered</Label>
            <p className="text-[11px] text-muted-foreground">
              Pick every term this class usually runs in your {termSystem === 'quarter' ? 'quarter' : 'semester'} system.
            </p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8"
            onClick={toggleAllOfferedTerms}
          >
            {selectAllLabel}
          </Button>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {termOptions.map((term) => {
            const selected = offeredTerms.includes(term);
            const isExtra = !baseTermOptions.includes(term);
            return (
              <label
                key={term}
                className={cn(
                  'flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm font-medium text-foreground shadow-sm transition hover:border-primary/60 hover:bg-primary/5',
                  selected && 'border-primary bg-primary/10',
                )}
              >
                <Checkbox
                  checked={selected}
                  onCheckedChange={(checked) => setOfferedTerm(term, Boolean(checked))}
                  aria-label={`Typically offered in ${term}`}
                />
                <div className="leading-tight">
                  <p>{term}</p>
                  {isExtra && <p className="text-[11px] text-muted-foreground">From a previous setup</p>}
                </div>
              </label>
            );
          })}
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
    </>
  );

  const renderMobileForm = () => (
    <div className="space-y-4">
      <SectionCard title="Class basics" description="Name your class and capture the essentials.">
        <div className="space-y-3">
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
          <div className="space-y-2">
            <Label htmlFor="class-subject">Subject</Label>
            <Input
              id="class-subject"
              placeholder="Math, Science, Languages"
              value={subject}
              onChange={(e) => updateFormField('subject', e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <Label htmlFor="class-credits">Credits</Label>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button type="button" variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={handleUseCreditsAsDefault}>
                    Use as default
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top">Makes new classes be worth this number of credits by default.</TooltipContent>
              </Tooltip>
            </div>
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
            <Label htmlFor="class-description">Description</Label>
            <Textarea
              id="class-description"
              placeholder="What does this class cover?"
              value={description}
              onChange={(e) => updateFormField('description', e.target.value)}
              className="min-h-[120px]"
            />
          </div>
        </div>
      </SectionCard>

      <SectionCard
        title="Tags & colors"
        description="Group this class into your custom goals, then give each tag a color."
      >
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Add tags from the Requirements tab, then pick which ones apply to this class.
          </p>
          <div className="flex flex-wrap gap-2">
            {distributives.length === 0 && selectedDistributives.length === 0 && (
              <p className="text-sm text-muted-foreground">No tags yet. Create them in Requirements.</p>
            )}
            {[...distributives, ...selectedDistributives.filter((dist) => !distributives.includes(dist))].map((dist) => (
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
                colorStyle={
                  selectedDistributiveColors[dist]
                    ? getTagColorStyle(dist, selectedDistributiveColors[dist])
                    : undefined
                }
                colorAccentStyle={
                  selectedDistributiveColors[dist]
                    ? getTagAccentStyle(dist, selectedDistributiveColors[dist])
                    : undefined
                }
                onClick={() => toggleDistributive(dist)}
              />
            ))}
          </div>
        </div>
      </SectionCard>

      <SectionCard
        title="Programs & goals"
        description="Tie the class into majors, minors, or other requirement sets."
      >
        <div className="flex flex-wrap gap-2">
          {plans.length === 0 && (
            <p className="text-sm text-muted-foreground">No plans yet. Add a major or minor in Goals.</p>
          )}
          {plans.map((plan) => (
            <TogglePill
              key={plan.id}
              label={`${plan.type === 'major' ? 'Major' : 'Minor'} • ${plan.name}`}
              active={selectedPlans.includes(plan.id)}
              tone={plan.type === 'major' ? 'major' : 'minor'}
              colorClassName={getTagColorClasses(plan.name, plan.color)}
              colorAccentClass={getTagAccentClass(plan.name, plan.color)}
              colorStyle={getTagColorStyle(plan.name, plan.color)}
              colorAccentStyle={getTagAccentStyle(plan.name, plan.color)}
              onClick={() => togglePlan(plan.id)}
            />
          ))}
        </div>
      </SectionCard>

      <SectionCard
        title="Prerequisites"
        description="Select the classes a student should take first."
      >
        <div className="space-y-2">
          {prerequisiteOptions.length === 0 && (
            <p className="text-sm text-muted-foreground">Add another class to choose it as a prerequisite.</p>
          )}
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {prerequisiteOptions.map((course) => {
              const selected = prerequisiteIds.includes(course.id);
              return (
                <label
                  key={course.id}
                  className={cn(
                    'flex items-start gap-3 rounded-xl border px-3 py-3 text-sm transition',
                    selected ? 'border-primary/70 bg-primary/5' : 'border-border/70 bg-background',
                  )}
                >
                  <Checkbox
                    checked={selected}
                    onCheckedChange={() => togglePrerequisite(course.id)}
                    aria-label={`Require ${course.code}`}
                  />
                  <div className="leading-tight">
                    <p className="font-semibold text-foreground">{course.code}</p>
                    <p className="text-xs text-muted-foreground">{course.name}</p>
                  </div>
                </label>
              );
            })}
          </div>
        </div>
      </SectionCard>

      <SectionCard
        title="Availability"
        description="Pick every term this class typically runs so you can plan faster."
      >
        <div className="flex justify-end pb-1">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8"
            onClick={toggleAllOfferedTerms}
          >
            {selectAllLabel}
          </Button>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {termOptions.map((term) => {
            const selected = offeredTerms.includes(term);
            const isExtra = !baseTermOptions.includes(term);
            return (
              <label
                key={term}
                className={cn(
                  'flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-3 text-sm font-semibold text-foreground shadow-sm transition hover:border-primary/60 hover:bg-primary/5',
                  selected && 'border-primary bg-primary/10',
                )}
              >
                <Checkbox
                  checked={selected}
                  onCheckedChange={(checked) => setOfferedTerm(term, Boolean(checked))}
                  aria-label={`Typically offered in ${term}`}
                />
                <div className="leading-tight">
                  <p>{term}</p>
                  {isExtra && <p className="text-[11px] text-muted-foreground">From another setup</p>}
                </div>
              </label>
            );
          })}
        </div>
      </SectionCard>
    </div>
  );

  return (
    <>
      <aside className={containerClassName}>
      <div className="p-4 border-b border-border space-y-4">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-muted-foreground" />
            <div>
              <h2 className="font-semibold text-foreground leading-tight">Class Library</h2>
              <p className="text-xs text-muted-foreground">{headerDescription}</p>
            </div>
          </div>
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
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search classes..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-secondary border-0"
          />
        </div>

        {showLibraryControls && (
          <div className="space-y-1">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Library</p>
              {libraryCountLabel ? <span className="text-xs text-muted-foreground">{libraryCountLabel}</span> : null}
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="w-full justify-between gap-2">
                  <span className="truncate">{libraryLabel}</span>
                  <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-64 space-y-1">
                <DropdownMenuLabel>Class libraries</DropdownMenuLabel>
                <DropdownMenuRadioGroup value={libraryMenuValue} onValueChange={handleSelectLibrary}>
                  {resolvedLibraries.length === 0 ? (
                    <DropdownMenuRadioItem value="__none" disabled>
                      No libraries yet
                    </DropdownMenuRadioItem>
                  ) : (
                    resolvedLibraries.map((library) => (
                      <DropdownMenuRadioItem key={library.id} value={library.id}>
                        {library.name}
                      </DropdownMenuRadioItem>
                    ))
                  )}
                </DropdownMenuRadioGroup>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onSelect={() => {
                    handleOpenCreateLibrary();
                  }}
                  disabled={!onCreateCourseLibrary}
                >
                  <Plus className="mr-2 h-4 w-4" /> New library
                </DropdownMenuItem>
                <DropdownMenuItem
                  onSelect={() => {
                    handleOpenRenameLibrary();
                  }}
                  disabled={!onRenameCourseLibrary || !activeLibrary}
                >
                  <Pencil className="mr-2 h-4 w-4" /> Rename current
                </DropdownMenuItem>
                <DropdownMenuItem
                  onSelect={() => {
                    setDeleteLibraryDialogOpen(true);
                  }}
                  disabled={!canDeleteLibrary}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash className="mr-2 h-4 w-4" /> Delete current
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}

        {hasCourses && (
          <div className="flex flex-wrap items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                  <ArrowUpDown className="h-4 w-4" />
                  {SORT_LABELS[sortOption]}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-56">
                <DropdownMenuLabel>Sort classes</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuRadioGroup value={sortOption} onValueChange={(value) => setSortOption(value as SortOption)}>
                  <DropdownMenuRadioItem value="order-added">Order added</DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="title-asc">Title (A-Z)</DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="title-desc">Title (Z-A)</DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="credits">Credit number</DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="distributive">Distributive</DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="plan">Major/Minor</DropdownMenuRadioItem>
                </DropdownMenuRadioGroup>
              </DropdownMenuContent>
            </DropdownMenu>

            <Popover open={filtersOpen} onOpenChange={setFiltersOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant={hasActiveFilters ? 'default' : 'outline'}
                  size="sm"
                  className="gap-2"
                >
                  <Filter className="h-4 w-4" />
                  Filters{hasActiveFilters ? ` (${activeFilters.length})` : ''}
                </Button>
              </PopoverTrigger>
              <PopoverContent align="start" className="w-80 space-y-4">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-foreground">Filter class library</p>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 px-2 text-xs"
                    onClick={clearFilters}
                    disabled={!hasActiveFilters}
                  >
                    Clear
                  </Button>
                </div>

                <div className="space-y-2">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Term offered</p>
                  <div className="flex flex-wrap gap-2">
                    <TogglePill label="Any term" active={!termFilter} onClick={() => setTermFilter(null)} />
                    {termFilterOptions.map((term) => (
                      <TogglePill
                        key={term}
                        label={term}
                        active={termFilter === term}
                        onClick={() => setTermFilter(termFilter === term ? null : term)}
                      />
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Distributive</p>
                  <div className="flex flex-wrap gap-2">
                    {distributives.length === 0 ? (
                      <p className="text-xs text-muted-foreground">Add a distributive to filter.</p>
                    ) : (
                      distributives.map((dist) => (
                        <TogglePill
                          key={dist}
                          label={dist}
                          active={distributiveFilter === dist}
                          onClick={() => setDistributiveFilter(distributiveFilter === dist ? null : dist)}
                        />
                      ))
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Major / Minor</p>
                  <div className="flex flex-wrap gap-2">
                    {plans.length === 0 ? (
                      <p className="text-xs text-muted-foreground">Add a plan to filter.</p>
                    ) : (
                      plans.map((plan) => (
                        <TogglePill
                          key={plan.id}
                          label={`${plan.type === 'major' ? 'Major' : 'Minor'} • ${plan.name}`}
                          active={planFilter === plan.id}
                          tone={plan.type === 'major' ? 'major' : 'minor'}
                          colorClassName={getTagColorClasses(plan.name, plan.color)}
                          colorAccentClass={getTagAccentClass(plan.name, plan.color)}
                          colorStyle={getTagColorStyle(plan.name, plan.color)}
                          colorAccentStyle={getTagAccentStyle(plan.name, plan.color)}
                          onClick={() => setPlanFilter(planFilter === plan.id ? null : plan.id)}
                        />
                      ))
                    )}
                  </div>
                </div>
              </PopoverContent>
            </Popover>

            {hasActiveFilters && (
              <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                {activeFilters.map((filter) => (
                  <Badge key={`${filter.key}-${filter.label}`} variant="secondary" className="flex items-center gap-1">
                    {filter.label}
                    <button
                      type="button"
                      className="ml-1 rounded-full p-0.5 text-muted-foreground transition hover:text-foreground"
                      aria-label={`Remove ${filter.label} filter`}
                      onClick={() => {
                        if (filter.key === 'term') setTermFilter(null);
                        if (filter.key === 'distributive') setDistributiveFilter(null);
                        if (filter.key === 'plan') setPlanFilter(null);
                      }}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2"
                  onClick={clearFilters}
                >
                  Clear all
                </Button>
              </div>
            )}
          </div>
        )}
      </div>

      <ScrollArea className="flex-1 p-4">
        <div className="space-y-2">
          {visibleCourses.length === 0 && (
            <div className="border border-dashed border-border rounded-lg p-3 text-xs text-muted-foreground">
              {hasCourses ? 'No classes match these filters yet.' : 'No classes yet. Add your first class to start planning.'}
            </div>
          )}
          {visibleCourses.map((course) => {
            const coursePlans = course.planIds
              .map((id) => planLookup.get(id))
              .filter((plan): plan is PlannerPlan => Boolean(plan));

            return (
              <div
                key={course.id}
                draggable={isDraggable}
                onDragStart={(e) => {
                  if (!isDraggable) return;
                  e.dataTransfer.setData('course', JSON.stringify(course));
                  e.dataTransfer.setData('course-source', '');
                  e.dataTransfer.effectAllowed = 'copy';
                  onDragStart(course);
                }}
                className={cn(
                  'group relative bg-card border border-border rounded-lg p-3 transition-all',
                  isDraggable ? 'cursor-grab hover:shadow-md hover:border-primary/30 active:cursor-grabbing' : 'cursor-default',
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
                  {course.subject && (
                    <Badge variant="secondary" className="text-[11px] font-medium">
                      {course.subject}
                    </Badge>
                  )}
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
                      className={`text-[11px] font-medium ${getTagColorClasses(dist)}`}
                      style={getTagColorStyle(dist)}
                    >
                      {dist}
                    </Badge>
                  ))}
                </div>
                {course.prerequisiteIds && course.prerequisiteIds.length > 0 && (
                  <p className="text-[11px] text-muted-foreground mt-1">
                    Prereqs: {course.prerequisiteIds
                      .map((id) => {
                        const prereq = courseLookup.get(id);
                        if (!prereq) return id;
                        return prereq.code || prereq.name || id;
                      })
                      .join(', ')}
                  </p>
                )}
                {mobileQuickAdd && (
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    className="mt-3 w-full justify-center gap-2"
                    onClick={() => onQuickAddCourse?.(course)}
                  >
                    <ArrowRight className="h-4 w-4" />
                    {quickAddLabel}
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      </ScrollArea>
      <div
        className={cn(
          'border-t border-border/70 p-4',
          isMobile ? 'bg-background/80 backdrop-blur-sm' : 'bg-card',
        )}
      >
        <Button
          variant="outline"
          size="sm"
          className="w-full border-dashed"
          onClick={startAddCourse}
        >
          <Plus className="h-4 w-4 mr-1.5" />
          {addCourseLabel}
        </Button>
      </div>

      <Dialog open={dialogOpen} onOpenChange={handleDialogChange}>
        <DialogContent
          className={cn(
            'sm:max-w-xl max-h-[90vh] sm:!max-h-[90vh] overflow-y-auto',
            isMobile && 'h-[92vh] max-h-none w-screen max-w-none rounded-none border-0 bg-background p-0',
          )}
        >
          <div className={cn(isMobile && 'flex h-full flex-col')}>
            <DialogHeader className={isMobile ? 'px-4 pt-4 pb-2 text-left' : undefined}>
              <DialogTitle>{isEditing ? 'Edit class' : 'Add a class'}</DialogTitle>
              <DialogDescription>
                {isEditing
                  ? 'Update the details for this class and keep your library tidy.'
                  : 'Give us the basics for this class and tag where it fits in your plan.'}
              </DialogDescription>
            </DialogHeader>

            <form
              className={cn(isMobile ? 'flex h-full flex-col gap-4' : 'space-y-4')}
              onSubmit={(e) => {
                e.preventDefault();
                handleSave();
              }}
            >
              <div className={cn(isMobile ? 'flex-1 overflow-y-auto px-4 space-y-4' : 'space-y-4')}>
                {isMobile ? renderMobileForm() : renderDesktopForm()}
              </div>
              <div
                className={cn(
                  'flex items-center gap-2 pt-2',
                  isMobile && 'flex-col-reverse gap-3 border-t border-border/70 px-4 pb-4',
                )}
              >
                {isEditing && (
                  <Button
                    type="button"
                    variant="destructive"
                    onClick={handleRemoveCourse}
                    className={cn('mr-auto', isMobile && 'mr-0 w-full justify-center')}
                  >
                    <Trash className="h-4 w-4" />
                    Remove class
                  </Button>
                )}
                <div className={cn('ml-auto flex gap-2', isMobile && 'ml-0 w-full flex-col-reverse')}>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => handleDialogChange(false)}
                    className={isMobile ? 'w-full justify-center' : undefined}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" className={isMobile ? 'w-full justify-center' : undefined}>
                    {isEditing ? 'Save changes' : 'Save class'}
                  </Button>
                </div>
              </div>
            </form>
          </div>
        </DialogContent>
      </Dialog>
    </aside>

    <Dialog open={libraryEditor.open} onOpenChange={handleLibraryDialogChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{libraryEditor.mode === 'create' ? 'New class library' : 'Rename class library'}</DialogTitle>
          <DialogDescription>
            {libraryEditor.mode === 'create'
              ? 'Group different sets of saved classes, like electives or specific schools.'
              : 'Give this library a name that reflects the courses it holds.'}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <Label htmlFor="library-name">Library name</Label>
          <Input
            id="library-name"
            value={libraryNameDraft}
            onChange={(event) => setLibraryNameDraft(event.target.value)}
            placeholder="e.g., STEM electives"
            autoComplete="off"
            autoFocus
          />
        </div>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => handleLibraryDialogChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmitLibraryEditor}
            disabled={!libraryNameDraft.trim() || (libraryEditor.mode === 'create' ? !onCreateCourseLibrary : !onRenameCourseLibrary)}
          >
            {libraryEditor.mode === 'create' ? 'Create library' : 'Save name'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <ConfirmDialog
      open={deleteLibraryDialogOpen}
      onOpenChange={setDeleteLibraryDialogOpen}
      title="Delete this library?"
      description="Scheduled classes stay put, but the saved library will be removed."
      confirmLabel="Delete"
      confirmVariant="destructive"
      confirmDisabled={!canDeleteLibrary}
      onConfirm={() => {
        if (activeLibrary && canDeleteLibrary) {
          onDeleteCourseLibrary?.(activeLibrary.id);
        }
        setDeleteLibraryDialogOpen(false);
      }}
      onCancel={() => setDeleteLibraryDialogOpen(false)}
    />

    </>
  );
};
