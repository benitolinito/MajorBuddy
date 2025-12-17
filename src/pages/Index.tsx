import { useEffect, useRef, useState } from 'react';
import { CourseCatalog } from '@/components/CourseCatalog';
import { PlannerHeader } from '@/components/PlannerHeader';
import { YearSection } from '@/components/YearSection';
import { RequirementsSidebar } from '@/components/RequirementsSidebar';
import { usePlanner } from '@/hooks/usePlanner';
import { useCloudPlanner } from '@/hooks/useCloudPlanner';
import { Course } from '@/types/planner';
import { ScrollArea } from '@/components/ui/scroll-area';
import { PlannerSetupDialog } from '@/components/PlannerSetupDialog';
import { PlannerConfig } from '@/types/planner';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable';
import { Button } from '@/components/ui/button';
import { ChevronsLeft, ChevronsRight } from 'lucide-react';
import type { ImperativePanelHandle } from 'react-resizable-panels';
import { cn } from '@/lib/utils';

const Index = () => {
  const {
    state,
    addCourseToTerm,
    removeCourse,
    addTerm,
    getTermCredits,
    stats,
    reset,
    addCourseToCatalog,
    addDistributive,
    addPlan,
    removePlan,
    applySnapshot,
    configurePlanner,
    hasConfig,
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
  const userLabel = user?.displayName || user?.email || undefined;
  const cloudBusy = cloudSaving || cloudLoading;

  const handleDragStart = (course: Course) => {
    setDraggedCourse(course);
  };

  const handleDropCourse = (yearId: string, termId: string, course: Course) => {
    addCourseToTerm(yearId, termId, course);
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
              totalCredits={stats.totalCredits}
              maxCredits={state.requirements.totalCredits}
              onReset={reset}
              userLabel={userLabel}
              cloudStatus={cloudStatus}
              cloudBusy={cloudBusy}
              onSignIn={signIn}
              onSignOut={signOut}
              onOpenSettings={() => setShowSetup(true)}
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
                        onDropCourse={(termId, course) => handleDropCourse(year.id, termId, course)}
                        onAddTerm={() => addTerm(year.id)}
                      />
                    ))}
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
