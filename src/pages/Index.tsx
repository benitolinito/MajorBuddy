import { useEffect, useRef, useState } from 'react';
import { CourseCatalog } from '@/components/CourseCatalog';
import { PlannerHeader } from '@/components/PlannerHeader';
import { YearSection } from '@/components/YearSection';
import { RequirementsSidebar } from '@/components/RequirementsSidebar';
import { usePlanner } from '@/hooks/usePlanner';
import { useCloudPlanner } from '@/hooks/useCloudPlanner';
import { Course, CourseDropOptions } from '@/types/planner';
import { ScrollArea } from '@/components/ui/scroll-area';
import { PlannerSetupDialog } from '@/components/PlannerSetupDialog';
import { ExportScheduleDialog } from '@/components/ExportScheduleDialog';
import { PlannerConfig } from '@/types/planner';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable';
import { Button } from '@/components/ui/button';
import { ChevronsLeft, ChevronsRight, Plus } from 'lucide-react';
import type { ImperativePanelHandle } from 'react-resizable-panels';
import { cn } from '@/lib/utils';

const Index = () => {
  const {
    state,
    addCourseToTerm,
    removeCourse,
    removeTerm,
    addTerm,
    addYear,
    getTermCredits,
    stats,
    reset,
    addCourseToCatalog,
    updateCourseInCatalog,
    removeCourseFromCatalog,
    addDistributive,
    addPlan,
    removePlan,
    applySnapshot,
    configurePlanner,
    hasConfig,
    moveCourseBetweenTerms,
  } = usePlanner();

  const { user, cloudStatus, cloudSaving, cloudLoading, signIn, signOut } = useCloudPlanner({
    state,
    applySnapshot,
  });

  const catalogPanelRef = useRef<ImperativePanelHandle>(null);
  const requirementsPanelRef = useRef<ImperativePanelHandle>(null);

  const [catalogCollapsed, setCatalogCollapsed] = useState(false);
  const [requirementsCollapsed, setRequirementsCollapsed] = useState(false);
  const [, setDraggedCourse] = useState<Course | null>(null);
  const [showSetup, setShowSetup] = useState(!hasConfig);
  const [showExport, setShowExport] = useState(false);
  const userLabel = user?.displayName || user?.email || undefined;
  const cloudBusy = cloudSaving || cloudLoading;

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
    } else {
      addCourseToTerm(yearId, termId, course, options?.targetIndex);
    }
    setDraggedCourse(null);
  };

  const handleSaveSetup = (config: PlannerConfig) => {
    configurePlanner(config);
    setShowSetup(false);
  };

  useEffect(() => {
    setShowSetup(!hasConfig);
  }, [hasConfig]);

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
        degreeName={state.degreeName}
        university={state.university}
      />

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
              onDragStart={handleDragStart}
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
            <PlannerHeader
              degreeName={state.degreeName}
              university={state.university}
              classYear={state.classYear}
              onReset={reset}
              userLabel={userLabel}
              cloudStatus={cloudStatus}
              cloudBusy={cloudBusy}
              onSignIn={signIn}
              onSignOut={signOut}
              onOpenSettings={() => setShowSetup(true)}
              onOpenExport={() => setShowExport(true)}
            />
            
            <ResizablePanelGroup direction="horizontal" className="flex-1">
              <ResizablePanel minSize={55}>
                <ScrollArea className="h-full p-6">
                  <div className="max-w-4xl">
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
                />
                    ))}
                    <div className="mt-4 flex">
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
                  <aside className="h-full border-l border-border bg-card/30 p-6">
                    <RequirementsSidebar
                      totalCredits={stats.totalCredits}
                      maxCredits={state.requirements.totalCredits}
                      plans={state.plans}
                      planProgress={stats.planProgress}
                      onAddPlan={addPlan}
                      onRemovePlan={removePlan}
                      onCollapsePanel={() => requirementsPanelRef.current?.collapse()}
                    />
                  </aside>
                )}
              </ResizablePanel>
            </ResizablePanelGroup>
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>
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

export default Index;
