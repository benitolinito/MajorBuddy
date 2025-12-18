import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CourseCatalog } from '@/components/CourseCatalog';
import { PlannerHeader } from '@/components/PlannerHeader';
import { YearSection } from '@/components/YearSection';
import { RequirementsSidebar } from '@/components/RequirementsSidebar';
import { usePlanner, clearPlannerStorage } from '@/hooks/usePlanner';
import { useCloudPlanner } from '@/hooks/useCloudPlanner';
import { Course, CourseDropOptions } from '@/types/planner';
import { ScrollArea } from '@/components/ui/scroll-area';
import { PlannerSetupDialog } from '@/components/PlannerSetupDialog';
import { ExportScheduleDialog } from '@/components/ExportScheduleDialog';
import { PlannerConfig } from '@/types/planner';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable';
import { Button } from '@/components/ui/button';
import { ChevronsLeft, ChevronsRight, Plus, BookOpen, ListChecks, PenLine } from 'lucide-react';
import type { ImperativePanelHandle } from 'react-resizable-panels';
import { cn } from '@/lib/utils';
import { AuthDialog } from '@/components/AuthDialog';
import { useIsMobile } from '@/hooks/use-mobile';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

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

  const catalogPanelRef = useRef<ImperativePanelHandle>(null);
  const requirementsPanelRef = useRef<ImperativePanelHandle>(null);
  const hasAuthenticatedRef = useRef(false);

  const [catalogCollapsed, setCatalogCollapsed] = useState(false);
  const [requirementsCollapsed, setRequirementsCollapsed] = useState(false);
  const [, setDraggedCourse] = useState<Course | null>(null);
  const [showSetup, setShowSetup] = useState(!hasConfig);
  const [showExport, setShowExport] = useState(false);
  const [showAuth, setShowAuth] = useState(false);
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [requirementsOpen, setRequirementsOpen] = useState(false);
  const [activeMobileYear, setActiveMobileYear] = useState(() => state.years[0]?.id ?? "");
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
  const [preferredQuickAddTarget, setPreferredQuickAddTarget] = useState<string | null>(null);
  const userLabel = user?.displayName || user?.email || undefined;
  const cloudBusy = cloudSaving || cloudLoading || authBusy;
  const canRemoveYear = state.years.length > 1;
  const isMobile = useIsMobile();
  const termSystem = state.config?.termSystem ?? 'semester';
  const activePlanProfile = planProfiles.find((profile) => profile.id === activePlanProfileId);
  const plannerTitle = activePlanProfile?.name || state.degreeName;
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
    setQuickAddCourse(null);
    setQuickAddTarget('');
  };

  const handleSaveSetup = (config: PlannerConfig) => {
    configurePlanner(config);
    setShowSetup(false);
  };

  useEffect(() => {
    setShowSetup(!hasConfig);
  }, [hasConfig]);

  // If a signed-in user signs out, clear local planner storage and return to the landing page.
  useEffect(() => {
    if (user) {
      hasAuthenticatedRef.current = true;
      return;
    }
    if (!hasAuthenticatedRef.current) return;
    clearPlannerStorage();
    hasAuthenticatedRef.current = false;
    navigate("/", { replace: true });
  }, [navigate, user]);

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

  const handleRequestAddCourse = (yearId: string, termId: string) => {
    const target = `${yearId}:${termId}`;
    setPreferredQuickAddTarget(target);
    setActiveMobileYear(yearId);
    setLibraryOpen(true);
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

      {isMobile ? (
        <>
          <PlannerHeader
            degreeName={plannerTitle}
            university={state.university}
            classYear={state.classYear}
            onReset={reset}
            userLabel={userLabel}
            cloudStatus={cloudStatus}
            cloudBusy={cloudBusy}
            onSignIn={() => setShowAuth(true)}
            onSignOut={signOut}
            onOpenSettings={() => setShowSetup(true)}
            onOpenExport={() => setShowExport(true)}
          />
          <div className="space-y-4 px-4 py-4 pb-40">
            <div className="flex gap-2 overflow-x-auto pb-2">
              {state.years.map((year) => (
                <button
                  key={year.id}
                  type="button"
                  onClick={() => setActiveMobileYear(year.id)}
                  className={cn(
                    "rounded-full border px-4 py-1 text-sm font-medium",
                    activeMobileYear === year.id
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-card text-muted-foreground",
                  )}
                >
                  {year.name}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-3">
              <Button
                variant={showDeleteControls ? "default" : "outline"}
                size="sm"
                className="gap-2"
                aria-pressed={showDeleteControls}
                onClick={() => setShowDeleteControls((prev) => !prev)}
              >
                <PenLine className="h-4 w-4" />
                {showDeleteControls ? "Done editing" : "Quick edit"}
              </Button>
              <p className="text-xs text-muted-foreground">Show delete buttons without hovering.</p>
            </div>
            <div className="space-y-6">
              {state.years
                .filter((year) => !activeMobileYear || year.id === activeMobileYear)
                .map((year) => (
                  <YearSection
                    key={year.id}
                    year={year}
                    getTermCredits={(termId) => getTermCredits(year.id, termId)}
                    plans={state.plans}
                    onRemoveCourse={(termId, courseId) => removeCourse(year.id, termId, courseId)}
                  onDropCourse={handleDropCourse}
                  onAddTerm={() => addTerm(year.id)}
                  onRemoveTerm={(termId) => removeTerm(year.id, termId)}
                  onRemoveYear={() => removeYear(year.id)}
                  canRemoveYear={canRemoveYear}
                  termSystem={termSystem}
                  showDeleteControls={showDeleteControls}
                  onRequestAddCourse={handleRequestAddCourse}
                />
              ))}
            </div>
            <Button variant="outline" className="w-full border-dashed" onClick={addYear}>
              <Plus className="mr-2 h-4 w-4" /> Add another academic year
            </Button>
          </div>

          <Sheet open={libraryOpen} onOpenChange={setLibraryOpen}>
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
                  colorPalette={state.colorPalette}
                  onAddPaletteColor={addColorToPalette}
                  planProfiles={planProfiles}
                  activePlanProfileId={activePlanProfileId}
                  onDragStart={handleDragStart}
                  onCreateCourse={addCourseToCatalog}
                  onUpdateCourse={updateCourseInCatalog}
                  onRemoveCourse={removeCourseFromCatalog}
                  onCreateDistributive={addDistributive}
                  onCreatePlanProfile={createPlanProfile}
                  onSelectPlanProfile={selectPlanProfile}
                  onRenamePlanProfile={renamePlanProfile}
                  onDeletePlanProfile={deletePlanProfile}
                  onCollapsePanel={() => setLibraryOpen(false)}
                  isMobile
                  onQuickAddCourse={handleQuickAddRequest}
                  termSystem={termSystem}
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
                onAddPlan={addPlan}
                onUpdatePlan={updatePlan}
                onRemovePlan={removePlan}
                colorPalette={state.colorPalette}
                onAddPaletteColor={addColorToPalette}
                onCollapsePanel={() => setRequirementsOpen(false)}
              />
            </SheetContent>
          </Sheet>
          <MobilePlannerToolbar
            onOpenLibrary={() => setLibraryOpen(true)}
            onOpenRequirements={() => setRequirementsOpen(true)}
            onAddYear={addYear}
          />
        </>
      ) : (
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
              colorPalette={state.colorPalette}
              onAddPaletteColor={addColorToPalette}
              planProfiles={planProfiles}
              activePlanProfileId={activePlanProfileId}
              onDragStart={handleDragStart}
              onCreateCourse={addCourseToCatalog}
              onUpdateCourse={updateCourseInCatalog}
              onRemoveCourse={removeCourseFromCatalog}
              onCreateDistributive={addDistributive}
              onCreatePlanProfile={createPlanProfile}
              onSelectPlanProfile={selectPlanProfile}
              onRenamePlanProfile={renamePlanProfile}
              onDeletePlanProfile={deletePlanProfile}
              onCollapsePanel={() => catalogPanelRef.current?.collapse()}
              termSystem={termSystem}
            />
          )}
        </ResizablePanel>
        <ResizableHandle withHandle />
        <ResizablePanel defaultSize={78} minSize={50}>
          <div className="flex h-screen flex-col">
            <PlannerHeader
              degreeName={plannerTitle}
              university={state.university}
              classYear={state.classYear}
              onReset={reset}
              userLabel={userLabel}
              cloudStatus={cloudStatus}
              cloudBusy={cloudBusy}
              onSignIn={() => setShowAuth(true)}
              onSignOut={signOut}
              onOpenSettings={() => setShowSetup(true)}
              onOpenExport={() => setShowExport(true)}
            />
            
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
                        onClick={() => setShowDeleteControls((prev) => !prev)}
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
                        onRemoveCourse={(termId, courseId) => removeCourse(year.id, termId, courseId)}
                        onDropCourse={handleDropCourse}
                        onAddTerm={() => addTerm(year.id)}
                        onRemoveTerm={(termId) => removeTerm(year.id, termId)}
                        onRemoveYear={() => removeYear(year.id)}
                        canRemoveYear={canRemoveYear}
                        termSystem={termSystem}
                        showDeleteControls={showDeleteControls}
                        onRequestAddCourse={handleRequestAddCourse}
                      />
                    ))}
                    <div className="flex pt-2">
                      <Button
                        variant="outline"
                        className="border-dashed"
                        onClick={addYear}
                      >
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
                defaultSize={24}
                minSize={18}
                maxSize={32}
                collapsible
                collapsedSize={1.5}
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
                      onAddPlan={addPlan}
                      onUpdatePlan={updatePlan}
                      onRemovePlan={removePlan}
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
};

const MobilePlannerToolbar = ({ onOpenLibrary, onOpenRequirements, onAddYear }: MobileToolbarProps) => (
  <div className="fixed inset-x-0 bottom-0 border-t border-border bg-card/95 px-4 py-3 shadow-[0_-8px_24px_rgba(0,0,0,0.2)] backdrop-blur">
    <div className="flex gap-3">
      <Button variant="outline" className="flex-1 justify-center gap-2" onClick={onOpenLibrary}>
        <BookOpen className="h-4 w-4" />
        Library
      </Button>
      <Button variant="outline" className="flex-1 justify-center gap-2" onClick={onOpenRequirements}>
        <ListChecks className="h-4 w-4" />
        Requirements
      </Button>
      <Button variant="default" className="flex-1 justify-center gap-2" onClick={onAddYear}>
        <Plus className="h-4 w-4" />
        Add Year
      </Button>
    </div>
  </div>
);

export default Index;
