import { useEffect, useState } from 'react';
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

  const [draggedCourse, setDraggedCourse] = useState<Course | null>(null);
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
        <ResizablePanel defaultSize={18} minSize={18} maxSize={35}>
          <CourseCatalog 
            courses={state.courseCatalog} 
            distributives={state.distributives}
            plans={state.plans}
            onDragStart={handleDragStart}
            onCreateCourse={addCourseToCatalog}
            onCreateDistributive={addDistributive}
          />
        </ResizablePanel>
        <ResizableHandle withHandle />
        <ResizablePanel defaultSize={74} minSize={50}>
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
            
            <div className="flex flex-1">
              <ScrollArea className="flex-1 p-6">
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
              
              <aside className="w-80 p-6 border-l border-border">
                <RequirementsSidebar
                  totalCredits={stats.totalCredits}
                  maxCredits={state.requirements.totalCredits}
                  plans={state.plans}
                  planProgress={stats.planProgress}
                  onAddPlan={addPlan}
                  onRemovePlan={removePlan}
                />
              </aside>
            </div>
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
};

export default Index;
