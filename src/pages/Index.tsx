import { useEffect, useMemo, useRef, useState, type ComponentProps } from 'react';
import { useNavigate } from 'react-router-dom';
import { CourseCatalog } from '@/components/CourseCatalog';
import { PlannerHeader } from '@/components/PlannerHeader';
import { YearSection } from '@/components/YearSection';
import { RequirementsSidebar } from '@/components/RequirementsSidebar';
import { usePlanner, clearPlannerStorage } from '@/hooks/usePlanner';
import { useCloudPlanner } from '@/hooks/useCloudPlanner';
import { Course, CourseDropOptions, PlannerConfig, PlannerState, PlanInput, PlannerPlan, NewCourseInput, TermSystem } from '@/types/planner';
import { ScrollArea } from '@/components/ui/scroll-area';
import { PlannerSetupDialog } from '@/components/PlannerSetupDialog';
import { ExportScheduleDialog } from '@/components/ExportScheduleDialog';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable';
import { Button } from '@/components/ui/button';
import { ChevronsLeft, ChevronsRight, Plus, BookOpen, ListChecks, Download, Settings, PenLine } from 'lucide-react';
import type { ImperativePanelHandle } from 'react-resizable-panels';
import { cn } from '@/lib/utils';
import { AuthDialog } from '@/components/AuthDialog';
import { useIsMobile } from '@/hooks/use-mobile';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/components/ui/sonner';
import { DEFAULT_PLAN_NAME } from '@/lib/plannerProfiles';

type PlannerStats = {
  totalCredits: number;
  planProgress: Record<string, { scheduled: number; total: number }>;
};

type PlannerHeaderSharedProps = Omit<ComponentProps<typeof PlannerHeader>, 'isMobile' | 'sticky'>;

const Index = () => {
  const navigate = useNavigate();
  const {
    state,
    planProfiles,
    activePlanProfileId,
    getCoursePlacement,
    createPlanProfile,
    selectPlanProfile,
    renamePlanProfile,
    deletePlanProfile,
    addCourseToTerm,
    removeCourse,
    removeTerm,
    addTerm,
    addYear,
    removeYear,
    getTermCredits,
    stats,
    colorPalette,
    addColorToPalette,
    reset,
    addCourseToCatalog,
    updateCourseInCatalog,
    removeCourseFromCatalog,
    addDistributive,
    addPlan,
    updatePlan,
    removePlan,
    applySnapshot,
    configurePlanner,
    hasConfig,
    moveCourseBetweenTerms,
  } = usePlanner();

  const {
    user,
    cloudStatus,
    cloudSaving,
    cloudLoading,
    authBusy,
    signInWithGoogle,
    signInWithEmail,
    registerWithEmail,
    signOut,
  } = useCloudPlanner({
    state,
    applySnapshot,
  });

  const [, setDraggedCourse] = useState<Course | null>(null);
  const [showSetup, setShowSetup] = useState(!hasConfig);
  const [showExport, setShowExport] = useState(false);
  const [showAuth, setShowAuth] = useState(false);
  const [showDeleteControls, setShowDeleteControls] = useState(false);
  const [duplicatePrompt, setDuplicatePrompt] = useState<{
    course: Course;
    placement: { yearName: string; termName: string; termYear: number };
    targetYearId: string;
    targetTermId: string;
    targetIndex?: number;
  } | null>(null);
  const [quickAddCourse, setQuickAddCourse] = useState<Course | null>(null);
  const [quickAddTarget, setQuickAddTarget] = useState('');
  const [preferredQuickAddTarget, setPreferredQuickAddTarget] = useState('');
  const [courseActionPrompt, setCourseActionPrompt] = useState<{
    course: Course;
    yearId: string;
    termId: string;
  } | null>(null);
  const [courseActionTarget, setCourseActionTarget] = useState('');
  const [courseActionMode, setCourseActionMode] = useState<'move' | 'copy'>('move');
  const userLabel = user?.displayName || user?.email || undefined;
  const cloudBusy = cloudSaving || cloudLoading || authBusy;
  const canRemoveYear = state.years.length > 1;
  const isMobile = useIsMobile();
  const termSystem = state.config?.termSystem ?? 'semester';
  const activePlanProfile = planProfiles.find((profile) => profile.id === activePlanProfileId);
  const plannerTitle = state.degreeName || activePlanProfile?.name || DEFAULT_PLAN_NAME;
  const quickAddOptions = useMemo(() => {
    const options: { value: string; label: string }[] = [];
    state.years.forEach((year) => {
      year.terms.forEach((term) => {
        options.push({
          value: `${year.id}:${term.id}`,
          label: `${year.name} • ${term.name} ${term.year}`,
        });
      });
    });
    return options;
  }, [state.years]);
  const quickAddCourseLabel = quickAddCourse
    ? ([quickAddCourse.code, quickAddCourse.name].filter(Boolean).join(' ').trim() || 'this class')
    : 'this class';
  const courseActionCourseLabel = courseActionPrompt
    ? ([courseActionPrompt.course.code, courseActionPrompt.course.name].filter(Boolean).join(' ').trim() || 'this class')
    : 'this class';
  const disableCourseActionConfirm =
    !courseActionTarget ||
    (courseActionMode === 'move' &&
      courseActionPrompt &&
      courseActionTarget === `${courseActionPrompt.yearId}:${courseActionPrompt.termId}`);

  const handleOpenAuth = () => setShowAuth(true);
  const handleOpenSettings = () => setShowSetup(true);
  const handleOpenExport = () => setShowExport(true);
  const toggleDeleteControls = () => setShowDeleteControls((prev) => !prev);

  const plannerHeaderProps: PlannerHeaderSharedProps = {
    degreeName: plannerTitle,
    university: state.university,
    classYear: state.classYear,
    onReset: reset,
    userLabel,
    cloudStatus,
    cloudBusy,
    onSignIn: handleOpenAuth,
    onSignOut: signOut,
    onOpenSettings: handleOpenSettings,
    onOpenExport: handleOpenExport,
    planProfiles,
    activePlanProfileId,
    onSelectPlanProfile: selectPlanProfile,
    onCreatePlanProfile: createPlanProfile,
    onDeletePlanProfile: deletePlanProfile,
  };

  const handleDragStart = (course: Course) => {
    setDraggedCourse(course);
  };

  const handleDropCourse = (
    yearId: string,
    termId: string,
    course: Course,
    options?: CourseDropOptions,
  ) => {
    const source = options?.source;
    if (source?.courseId && source?.yearId && source?.termId) {
      moveCourseBetweenTerms({
        sourceYearId: source.yearId,
        sourceTermId: source.termId,
        courseId: source.courseId,
        targetYearId: yearId,
        targetTermId: termId,
        targetIndex: options?.targetIndex,
      });
      setDraggedCourse(null);
      return;
    }

    const placement = getCoursePlacement(course);
    if (placement) {
      setDuplicatePrompt({
        course,
        placement,
        targetYearId: yearId,
        targetTermId: termId,
        targetIndex: options?.targetIndex,
      });
    } else {
      addCourseToTerm(yearId, termId, course, options?.targetIndex);
    }
    setDraggedCourse(null);
  };

  const handleQuickAddRequest = (course: Course) => {
    setQuickAddCourse(course);
    const defaultTarget =
      (preferredQuickAddTarget && quickAddOptions.find((option) => option.value === preferredQuickAddTarget)?.value) ||
      quickAddOptions[0]?.value ||
      '';
    setQuickAddTarget(defaultTarget);
  };

  const closeQuickAddDialog = () => {
    setQuickAddCourse(null);
    setQuickAddTarget('');
  };

  const handleQuickAddConfirm = () => {
    if (!quickAddCourse || !quickAddTarget) return;
    const [targetYearId, targetTermId] = quickAddTarget.split(':');
    if (!targetYearId || !targetTermId) return;
    handleDropCourse(targetYearId, targetTermId, quickAddCourse);
    setPreferredQuickAddTarget(quickAddTarget);
    setQuickAddCourse(null);
    setQuickAddTarget('');
  };

  const handleRequestCourseAction = (payload: { course: Course; yearId: string; termId: string }) => {
    setCourseActionPrompt(payload);
    const sourceValue = `${payload.yearId}:${payload.termId}`;
    const defaultTarget =
      quickAddOptions.find((option) => option.value === sourceValue)?.value ??
      quickAddOptions[0]?.value ??
      '';
    setCourseActionTarget(defaultTarget);
    setCourseActionMode('move');
  };

  const closeCourseActionDialog = () => {
    setCourseActionPrompt(null);
    setCourseActionTarget('');
  };

  const handleCourseActionConfirm = () => {
    if (!courseActionPrompt || !courseActionTarget) return;
    const [targetYearId, targetTermId] = courseActionTarget.split(':');
    if (!targetYearId || !targetTermId) return;
    if (courseActionMode === 'move') {
      if (courseActionPrompt.yearId === targetYearId && courseActionPrompt.termId === targetTermId) {
        closeCourseActionDialog();
        return;
      }
      moveCourseBetweenTerms({
        sourceYearId: courseActionPrompt.yearId,
        sourceTermId: courseActionPrompt.termId,
        courseId: courseActionPrompt.course.id,
        targetYearId,
        targetTermId,
      });
    } else {
      handleDropCourse(targetYearId, targetTermId, courseActionPrompt.course);
    }
    closeCourseActionDialog();
  };

  const handleSaveSetup = (config: PlannerConfig) => {
    configurePlanner(config);
    if (activePlanProfileId) {
      renamePlanProfile(activePlanProfileId, config.planName);
    }
    setShowSetup(false);
  };

  useEffect(() => {
    setShowSetup(!hasConfig);
  }, [hasConfig]);

  useEffect(() => {
    if (!isMobile) return;
    const storageKey = 'majorbuddy-mobile-add-hint';
    if (typeof window === 'undefined') return;
    const hasSeen = window.localStorage.getItem(storageKey);
    if (hasSeen) return;
    toast('Add classes without dragging', {
      description: 'Tap "Add to term" inside Class Library cards to place a course into a term.',
    });
    window.localStorage.setItem(storageKey, 'seen');
  }, [isMobile]);

  const handleConfirmDuplicate = () => {
    if (!duplicatePrompt) return;
    addCourseToTerm(
      duplicatePrompt.targetYearId,
      duplicatePrompt.targetTermId,
      duplicatePrompt.course,
      duplicatePrompt.targetIndex,
    );
    setDuplicatePrompt(null);
  };

  const handleCancelDuplicate = () => {
    setDuplicatePrompt(null);
  };

  return (
    <div
      className="min-h-screen bg-background"
      onDragEnd={() => setDraggedCourse(null)}
    >
      <PlannerSetupDialog
        open={showSetup}
        onClose={hasConfig ? () => setShowSetup(false) : undefined}
        onSave={handleSaveSetup}
        initialConfig={state.config ?? null}
      />
      <ExportScheduleDialog
        open={showExport}
        onOpenChange={setShowExport}
        years={state.years}
        plans={state.plans}
        degreeName={plannerTitle}
        university={state.university}
      />
      <ConfirmDialog
        open={Boolean(duplicatePrompt)}
        onOpenChange={(open) => {
          if (!open) {
            setDuplicatePrompt(null);
          }
        }}
        title="Add this class again?"
        description={
          duplicatePrompt ? (
            <>
              <span className="font-medium text-foreground">
                {[duplicatePrompt.course.code, duplicatePrompt.course.name].filter(Boolean).join(' ').trim() ||
                  'This class'}
              </span>{' '}
              is already scheduled in {duplicatePrompt.placement.termName} {duplicatePrompt.placement.termYear}. Would you
              like to add another copy to this term?
            </>
          ) : undefined
        }
        confirmLabel="Add anyway"
        cancelLabel="Keep existing"
        onConfirm={handleConfirmDuplicate}
        onCancel={handleCancelDuplicate}
      />
      <AuthDialog
        open={showAuth}
        onOpenChange={setShowAuth}
        busy={authBusy}
        status={authBusy ? cloudStatus : null}
        onSignInWithGoogle={signInWithGoogle}
        onEmailSignIn={signInWithEmail}
        onEmailRegister={registerWithEmail}
      />
      <Dialog
        open={Boolean(quickAddCourse)}
        onOpenChange={(open) => {
          if (!open) {
            closeQuickAddDialog();
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add {quickAddCourseLabel} to a term</DialogTitle>
            <DialogDescription>
              Choose where this class should appear in your schedule.
            </DialogDescription>
          </DialogHeader>
          {quickAddOptions.length > 0 ? (
            <>
              <div className="space-y-2">
                <p className="text-sm font-medium text-foreground">Destination term</p>
                <Select value={quickAddTarget} onValueChange={setQuickAddTarget}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select a term" />
                  </SelectTrigger>
                  <SelectContent>
                    {quickAddOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <DialogFooter className="gap-2 pt-4">
                <Button type="button" variant="outline" onClick={closeQuickAddDialog}>
                  Cancel
                </Button>
                <Button type="button" onClick={handleQuickAddConfirm} disabled={!quickAddTarget}>
                  Add class
                </Button>
              </DialogFooter>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">
              Add a year or term to choose a destination for {quickAddCourseLabel}.
            </p>
          )}
        </DialogContent>
      </Dialog>
      <Dialog
        open={Boolean(courseActionPrompt)}
        onOpenChange={(open) => {
          if (!open) {
            closeCourseActionDialog();
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Manage {courseActionCourseLabel}</DialogTitle>
            <DialogDescription>Move or copy this class to another term.</DialogDescription>
          </DialogHeader>
          {quickAddOptions.length > 0 ? (
            <div className="space-y-4">
              <div className="space-y-2">
                <p className="text-sm font-medium text-foreground">Action</p>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { key: 'move', title: 'Move', description: 'Remove from original term' },
                    { key: 'copy', title: 'Copy', description: 'Keep a copy in both terms' },
                  ].map((option) => (
                    <button
                      type="button"
                      key={option.key}
                      onClick={() => setCourseActionMode(option.key as 'move' | 'copy')}
                      className={cn(
                        'rounded-lg border p-3 text-left text-sm font-medium transition',
                        courseActionMode === option.key
                          ? 'border-primary bg-primary/5 text-foreground'
                          : 'border-border text-foreground',
                      )}
                    >
                      {option.title}
                      <p className="text-xs font-normal text-muted-foreground">{option.description}</p>
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium text-foreground">Destination term</p>
                <Select value={courseActionTarget} onValueChange={setCourseActionTarget}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select a term" />
                  </SelectTrigger>
                  <SelectContent>
                    {quickAddOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <DialogFooter className="gap-2">
                <Button type="button" variant="outline" onClick={closeCourseActionDialog}>
                  Cancel
                </Button>
                <Button type="button" onClick={handleCourseActionConfirm} disabled={disableCourseActionConfirm}>
                  {courseActionMode === 'move' ? 'Move class' : 'Copy class'}
                </Button>
              </DialogFooter>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Add a year or term to choose a destination for {courseActionCourseLabel}.
            </p>
          )}
      </DialogContent>
    </Dialog>

      {isMobile ? (
        <MobilePlannerLayout
          headerProps={plannerHeaderProps}
          state={state}
          termSystem={termSystem}
          stats={stats}
          canRemoveYear={canRemoveYear}
          getTermCredits={getTermCredits}
          onRemoveCourse={removeCourse}
          onDropCourse={handleDropCourse}
          onAddTerm={addTerm}
          onRemoveTerm={removeTerm}
          onRemoveYear={removeYear}
          onRequestCourseAction={handleRequestCourseAction}
          onQuickAddCourse={handleQuickAddRequest}
          onAddPlan={addPlan}
          onUpdatePlan={updatePlan}
          onRemovePlan={removePlan}
          onAddYear={addYear}
          addCourseToCatalog={addCourseToCatalog}
          updateCourseInCatalog={updateCourseInCatalog}
          removeCourseFromCatalog={removeCourseFromCatalog}
          addDistributive={addDistributive}
          addColorToPalette={addColorToPalette}
          onDragStart={handleDragStart}
          onOpenExport={handleOpenExport}
          onOpenSettings={handleOpenSettings}
        />
      ) : (
        <DesktopPlannerLayout
          headerProps={plannerHeaderProps}
          state={state}
          stats={stats}
          termSystem={termSystem}
          canRemoveYear={canRemoveYear}
          showDeleteControls={showDeleteControls}
          onToggleDeleteControls={toggleDeleteControls}
          getTermCredits={getTermCredits}
          onRemoveCourse={removeCourse}
          onDropCourse={handleDropCourse}
          onAddTerm={addTerm}
          onRemoveTerm={removeTerm}
          onRemoveYear={removeYear}
          onAddPlan={addPlan}
          onUpdatePlan={updatePlan}
          onRemovePlan={removePlan}
          onAddYear={addYear}
          addCourseToCatalog={addCourseToCatalog}
          updateCourseInCatalog={updateCourseInCatalog}
          removeCourseFromCatalog={removeCourseFromCatalog}
          addDistributive={addDistributive}
          addColorToPalette={addColorToPalette}
          onDragStart={handleDragStart}
        />
      )}
    </div>
  );
};

type CollapsedRailProps = {
  side: "left" | "right";
  ariaLabel: string;
  onExpand: () => void;
};

const CollapsedRail = ({ side, ariaLabel, onExpand }: CollapsedRailProps) => (
  <button
    type="button"
    onClick={onExpand}
    className={cn(
      "flex h-full w-full flex-col items-center justify-center gap-2 border border-border/40 bg-card/80 text-muted-foreground transition hover:border-primary hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
      side === "left" ? "rounded-r-xl border-l-0" : "rounded-l-xl border-r-0",
    )}
    aria-label={ariaLabel}
  >
    {side === "left" ? (
      <ChevronsRight className="h-4 w-4" aria-hidden />
    ) : (
      <ChevronsLeft className="h-4 w-4" aria-hidden />
    )}
  </button>
);

type MobileToolbarProps = {
  onOpenLibrary: () => void;
  onOpenRequirements: () => void;
  onAddYear: () => void;
  onAddClass: () => void;
  onOpenExport: () => void;
  onOpenSettings: () => void;
};

const MobilePlannerToolbar = ({
  onOpenLibrary,
  onOpenRequirements,
  onAddYear,
  onAddClass,
  onOpenExport,
  onOpenSettings,
}: MobileToolbarProps) => (
  <div className="fixed inset-x-0 bottom-0 border-t border-border bg-card/95 px-4 py-3 shadow-[0_-8px_24px_rgba(0,0,0,0.2)] backdrop-blur">
    <div className="grid grid-cols-3 gap-3 pb-2 text-xs font-medium">
      <Button variant="outline" className="justify-center gap-1.5 py-2 text-xs" onClick={onOpenLibrary}>
        <BookOpen className="h-3.5 w-3.5" />
        Library
      </Button>
      <Button variant="outline" className="justify-center gap-1.5 py-2 text-xs" onClick={onOpenRequirements}>
        <ListChecks className="h-3.5 w-3.5" />
        Requirements
      </Button>
      <Button variant="outline" className="justify-center gap-1.5 py-2 text-xs" onClick={onAddClass}>
        <Plus className="h-3.5 w-3.5" />
        Add class
      </Button>
    </div>
    <div className="grid grid-cols-3 gap-3 text-xs font-medium">
      <Button variant="default" className="justify-center gap-1.5 py-2 text-xs" onClick={onAddYear}>
        <Plus className="h-3.5 w-3.5" />
        Add year
      </Button>
      <Button variant="outline" className="justify-center gap-1.5 py-2 text-xs" onClick={onOpenExport}>
        <Download className="h-3.5 w-3.5" />
        Export
      </Button>
      <Button variant="outline" className="justify-center gap-1.5 py-2 text-xs" onClick={onOpenSettings}>
        <Settings className="h-3.5 w-3.5" />
        Settings
      </Button>
    </div>
  </div>
);

type MobileYearNavigatorProps = {
  years: { id: string; name: string }[];
  activeYearId: string;
  onSelectYear: (yearId: string) => void;
};

const MobileYearNavigator = ({ years, activeYearId, onSelectYear }: MobileYearNavigatorProps) => (
  <div className="border-t border-border/60 bg-background/70 px-4 py-3">
    <div className="relative">
      <div className="pointer-events-none absolute inset-y-0 left-0 w-8 bg-gradient-to-r from-background to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-background to-transparent" />
      <div className="flex gap-2 overflow-x-auto pb-1 pr-2" aria-label="Select academic year">
        {years.length === 0 ? (
          <span className="text-sm text-muted-foreground">Add an academic year to get started.</span>
        ) : (
          years.map((year) => (
            <button
              key={year.id}
              type="button"
              onClick={() => onSelectYear(year.id)}
              className={cn(
                'flex-shrink-0 rounded-full border px-4 py-1 text-sm font-medium transition',
                activeYearId === year.id
                  ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                  : 'bg-card text-muted-foreground hover:text-foreground',
              )}
            >
              {year.name}
            </button>
          ))
        )}
      </div>
    </div>
  </div>
);

type MobilePlannerLayoutProps = {
  headerProps: PlannerHeaderSharedProps;
  state: PlannerState;
  termSystem: TermSystem;
  stats: PlannerStats;
  canRemoveYear: boolean;
  getTermCredits: (yearId: string, termId: string) => number;
  onRemoveCourse: (yearId: string, termId: string, courseId: string) => void;
  onDropCourse: (yearId: string, termId: string, course: Course, options?: CourseDropOptions) => void;
  onAddTerm: (yearId: string) => void;
  onRemoveTerm: (yearId: string, termId: string) => void;
  onRemoveYear: (yearId: string) => void;
  onRequestCourseAction: (payload: { course: Course; yearId: string; termId: string }) => void;
  onQuickAddCourse: (course: Course) => void;
  onAddPlan: (plan: PlanInput) => PlannerPlan | null;
  onUpdatePlan: (planId: string, plan: PlanInput) => void;
  onRemovePlan: (planId: string) => void;
  onAddYear: () => void;
  addCourseToCatalog: (course: NewCourseInput) => Course;
  updateCourseInCatalog: (courseId: string, course: NewCourseInput) => void;
  removeCourseFromCatalog: (courseId: string) => void;
  addDistributive: (label: string) => string;
  addColorToPalette: (hex: string) => string;
  onDragStart: (course: Course) => void;
  onOpenExport: () => void;
  onOpenSettings: () => void;
};

const MobilePlannerLayout = ({
  headerProps,
  state,
  termSystem,
  stats,
  canRemoveYear,
  getTermCredits,
  onRemoveCourse,
  onDropCourse,
  onAddTerm,
  onRemoveTerm,
  onRemoveYear,
  onRequestCourseAction,
  onQuickAddCourse,
  onAddPlan,
  onUpdatePlan,
  onRemovePlan,
  onAddYear,
  addCourseToCatalog,
  updateCourseInCatalog,
  removeCourseFromCatalog,
  addDistributive,
  addColorToPalette,
  onDragStart,
  onOpenExport,
  onOpenSettings,
}: MobilePlannerLayoutProps) => {
  const [activeYearId, setActiveYearId] = useState(() => state.years[0]?.id ?? '');
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [requirementsOpen, setRequirementsOpen] = useState(false);
  const [catalogAddTrigger, setCatalogAddTrigger] = useState(0);

  const handleLibraryOpenChange = (open: boolean) => {
    setLibraryOpen(open);
    if (!open) {
      setCatalogAddTrigger(0);
    }
  };

  const handleStartAddClass = () => {
    setLibraryOpen(true);
    setCatalogAddTrigger(Date.now());
  };

  return (
    <>
      <div className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur">
        <PlannerHeader {...headerProps} sticky={false} isMobile />
        <MobileYearNavigator years={state.years} activeYearId={activeYearId} onSelectYear={setActiveYearId} />
      </div>
      <div className="space-y-4 px-4 py-4 pb-44">
        <div className="space-y-6">
          {state.years
            .filter((year) => !activeYearId || year.id === activeYearId)
            .map((year) => (
              <YearSection
                key={year.id}
                year={year}
                getTermCredits={(termId) => getTermCredits(year.id, termId)}
                plans={state.plans}
                onRemoveCourse={(termId, courseId) => onRemoveCourse(year.id, termId, courseId)}
                onDropCourse={(yearId, termId, course, options) => onDropCourse(yearId, termId, course, options)}
                onAddTerm={() => onAddTerm(year.id)}
                onRemoveTerm={(termId) => onRemoveTerm(year.id, termId)}
                onRemoveYear={() => onRemoveYear(year.id)}
                canRemoveYear={canRemoveYear}
                termSystem={termSystem}
                onRequestCourseAction={onRequestCourseAction}
              />
            ))}
        </div>
      </div>

      <Sheet open={libraryOpen} onOpenChange={handleLibraryOpenChange}>
        <SheetContent side="bottom" className="h-[90vh] overflow-y-auto px-2">
          <SheetHeader className="pb-2 text-left">
            <SheetTitle>Class Library</SheetTitle>
            <SheetDescription>Browse and edit your saved courses.</SheetDescription>
          </SheetHeader>
          <div className="pb-6">
            <CourseCatalog
              courses={state.courseCatalog}
              distributives={state.distributives}
              plans={state.plans}
              termSystem={termSystem}
              colorPalette={state.colorPalette}
              onAddPaletteColor={addColorToPalette}
              onDragStart={onDragStart}
              onCreateCourse={addCourseToCatalog}
              onUpdateCourse={updateCourseInCatalog}
              onRemoveCourse={removeCourseFromCatalog}
              onCreateDistributive={addDistributive}
              onCollapsePanel={() => handleLibraryOpenChange(false)}
              isMobile
              onQuickAddCourse={onQuickAddCourse}
              addCourseTrigger={catalogAddTrigger}
            />
          </div>
        </SheetContent>
      </Sheet>

      <Sheet open={requirementsOpen} onOpenChange={setRequirementsOpen}>
        <SheetContent side="bottom" className="h-[85vh] overflow-y-auto px-4">
          <SheetHeader className="pb-2 text-left">
            <SheetTitle>Requirements</SheetTitle>
            <SheetDescription>Track majors, minors, and distributives.</SheetDescription>
          </SheetHeader>
          <RequirementsSidebar
            totalCredits={stats.totalCredits}
            maxCredits={state.requirements.totalCredits}
            plans={state.plans}
            planProgress={stats.planProgress}
            onAddPlan={onAddPlan}
            onUpdatePlan={onUpdatePlan}
            onRemovePlan={onRemovePlan}
            colorPalette={state.colorPalette}
            onAddPaletteColor={addColorToPalette}
            onCollapsePanel={() => setRequirementsOpen(false)}
            isMobile
          />
        </SheetContent>
      </Sheet>
      <MobilePlannerToolbar
        onOpenLibrary={() => setLibraryOpen(true)}
        onOpenRequirements={() => setRequirementsOpen(true)}
        onAddYear={onAddYear}
        onAddClass={handleStartAddClass}
        onOpenExport={onOpenExport}
        onOpenSettings={onOpenSettings}
      />
    </>
  );
};

type DesktopPlannerLayoutProps = {
  headerProps: PlannerHeaderSharedProps;
  state: PlannerState;
  stats: PlannerStats;
  termSystem: TermSystem;
  canRemoveYear: boolean;
  showDeleteControls: boolean;
  onToggleDeleteControls: () => void;
  getTermCredits: (yearId: string, termId: string) => number;
  onRemoveCourse: (yearId: string, termId: string, courseId: string) => void;
  onDropCourse: (yearId: string, termId: string, course: Course, options?: CourseDropOptions) => void;
  onAddTerm: (yearId: string) => void;
  onRemoveTerm: (yearId: string, termId: string) => void;
  onRemoveYear: (yearId: string) => void;
  onAddPlan: (plan: PlanInput) => PlannerPlan | null;
  onUpdatePlan: (planId: string, plan: PlanInput) => void;
  onRemovePlan: (planId: string) => void;
  onAddYear: () => void;
  addCourseToCatalog: (course: NewCourseInput) => Course;
  updateCourseInCatalog: (courseId: string, course: NewCourseInput) => void;
  removeCourseFromCatalog: (courseId: string) => void;
  addDistributive: (label: string) => string;
  addColorToPalette: (hex: string) => string;
  onDragStart: (course: Course) => void;
};

const DesktopPlannerLayout = ({
  headerProps,
  state,
  stats,
  termSystem,
  canRemoveYear,
  showDeleteControls,
  onToggleDeleteControls,
  getTermCredits,
  onRemoveCourse,
  onDropCourse,
  onAddTerm,
  onRemoveTerm,
  onRemoveYear,
  onAddPlan,
  onUpdatePlan,
  onRemovePlan,
  onAddYear,
  addCourseToCatalog,
  updateCourseInCatalog,
  removeCourseFromCatalog,
  addDistributive,
  addColorToPalette,
  onDragStart,
}: DesktopPlannerLayoutProps) => {
  const catalogPanelRef = useRef<ImperativePanelHandle>(null);
  const requirementsPanelRef = useRef<ImperativePanelHandle>(null);
  const [catalogCollapsed, setCatalogCollapsed] = useState(false);
  const [requirementsCollapsed, setRequirementsCollapsed] = useState(false);

  return (
    <ResizablePanelGroup direction="horizontal" className="h-screen w-full">
      <ResizablePanel
        ref={catalogPanelRef}
        defaultSize={22}
        minSize={18}
        maxSize={35}
        collapsible
        collapsedSize={1.5}
        onCollapse={() => setCatalogCollapsed(true)}
        onExpand={() => setCatalogCollapsed(false)}
      >
        {catalogCollapsed ? (
          <CollapsedRail side="left" ariaLabel="Expand class library" onExpand={() => catalogPanelRef.current?.expand()} />
        ) : (
          <CourseCatalog
            courses={state.courseCatalog}
            distributives={state.distributives}
            plans={state.plans}
            termSystem={termSystem}
            colorPalette={state.colorPalette}
            onAddPaletteColor={addColorToPalette}
            onDragStart={onDragStart}
            onCreateCourse={addCourseToCatalog}
            onUpdateCourse={updateCourseInCatalog}
            onRemoveCourse={removeCourseFromCatalog}
            onCreateDistributive={addDistributive}
            onCollapsePanel={() => catalogPanelRef.current?.collapse()}
          />
        )}
      </ResizablePanel>
      <ResizableHandle withHandle />
      <ResizablePanel defaultSize={78} minSize={50}>
        <div className="flex h-screen flex-col">
          <PlannerHeader {...headerProps} />
          <ResizablePanelGroup direction="horizontal" className="flex-1">
            <ResizablePanel minSize={55}>
              <ScrollArea className="h-full px-6 py-6">
                <div className="w-max min-w-full space-y-8 pr-6">
                    <div className="flex items-center gap-3">
                      <Button
                        variant={showDeleteControls ? "default" : "outline"}
                        size="sm"
                        className="gap-2"
                        aria-pressed={showDeleteControls}
                        onClick={onToggleDeleteControls}
                      >
                        <PenLine className="h-4 w-4" />
                        {showDeleteControls ? "Done editing" : "Quick edit"}
                      </Button>
                      <p className="text-sm text-muted-foreground">Show delete buttons without hovering.</p>
                    </div>
                  {state.years.map((year) => (
                    <YearSection
                      key={year.id}
                      year={year}
                      getTermCredits={(termId) => getTermCredits(year.id, termId)}
                      plans={state.plans}
                      onRemoveCourse={(termId, courseId) => onRemoveCourse(year.id, termId, courseId)}
                      onDropCourse={(yearId, termId, course, options) => onDropCourse(yearId, termId, course, options)}
                      onAddTerm={() => onAddTerm(year.id)}
                      onRemoveTerm={(termId) => onRemoveTerm(year.id, termId)}
                      onRemoveYear={() => onRemoveYear(year.id)}
                      canRemoveYear={canRemoveYear}
                      termSystem={termSystem}
                      showDeleteControls={showDeleteControls}
                    />
                  ))}
                  <div className="flex pt-2">
                    <Button variant="outline" className="border-dashed" onClick={onAddYear}>
                      <Plus className="h-4 w-4 mr-2" />
                      Add another academic year
                    </Button>
                  </div>
                </div>
              </ScrollArea>
            </ResizablePanel>
            <ResizableHandle withHandle />
            <ResizablePanel
              ref={requirementsPanelRef}
              defaultSize={22}
              minSize={18}
              collapsible
              collapsedSize={2}
              onCollapse={() => setRequirementsCollapsed(true)}
              onExpand={() => setRequirementsCollapsed(false)}
            >
              {requirementsCollapsed ? (
                <CollapsedRail side="right" ariaLabel="Expand requirements" onExpand={() => requirementsPanelRef.current?.expand()} />
              ) : (
                <aside className="h-full border-l border-border bg-card/30 p-6 overflow-y-auto">
                  <RequirementsSidebar
                    totalCredits={stats.totalCredits}
                    maxCredits={state.requirements.totalCredits}
                    plans={state.plans}
                    planProgress={stats.planProgress}
                    onAddPlan={onAddPlan}
                    onUpdatePlan={onUpdatePlan}
                    onRemovePlan={onRemovePlan}
                    colorPalette={state.colorPalette}
                    onAddPaletteColor={addColorToPalette}
                    onCollapsePanel={() => requirementsPanelRef.current?.collapse()}
                  />
                </aside>
              )}
            </ResizablePanel>
          </ResizablePanelGroup>
        </div>
      </ResizablePanel>
    </ResizablePanelGroup>
  );
};

export default Index;
