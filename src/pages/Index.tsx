import { useState } from 'react';
import { CourseCatalog } from '@/components/CourseCatalog';
import { PlannerHeader } from '@/components/PlannerHeader';
import { YearSection } from '@/components/YearSection';
import { RequirementsSidebar } from '@/components/RequirementsSidebar';
import { usePlanner } from '@/hooks/usePlanner';
import { useCloudPlanner } from '@/hooks/useCloudPlanner';
import { Course } from '@/types/planner';
import { ScrollArea } from '@/components/ui/scroll-area';

const Index = () => {
  const {
    state,
    addCourseToTerm,
    removeCourse,
    addTerm,
    getTermCredits,
    stats,
    reset,
    applySnapshot,
  } = usePlanner();

  const { user, cloudStatus, cloudSaving, cloudLoading, signIn, signOut } = useCloudPlanner({
    state,
    applySnapshot,
  });

  const [draggedCourse, setDraggedCourse] = useState<Course | null>(null);
  const userLabel = user?.displayName || user?.email || undefined;
  const cloudBusy = cloudSaving || cloudLoading;

  const handleDragStart = (course: Course) => {
    setDraggedCourse(course);
  };

  const handleDropCourse = (yearId: string, termId: string, course: Course) => {
    addCourseToTerm(yearId, termId, course);
    setDraggedCourse(null);
  };

  return (
    <div 
      className="min-h-screen bg-background flex"
      onDragEnd={() => setDraggedCourse(null)}
    >
      <CourseCatalog 
        courses={state.courseCatalog} 
        onDragStart={handleDragStart}
      />
      
      <div className="flex-1 flex flex-col">
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
        />
        
        <div className="flex-1 flex">
          <ScrollArea className="flex-1 p-6">
            <div className="max-w-4xl">
              {state.years.map((year) => (
                <YearSection
                  key={year.id}
                  year={year}
                  getTermCredits={(termId) => getTermCredits(year.id, termId)}
                  onRemoveCourse={(termId, courseId) => removeCourse(year.id, termId, courseId)}
                  onDropCourse={(termId, course) => handleDropCourse(year.id, termId, course)}
                  onAddTerm={() => addTerm(year.id)}
                />
              ))}
            </div>
          </ScrollArea>
          
          <aside className="w-64 p-6 border-l border-border">
            <RequirementsSidebar
              totalCredits={stats.totalCredits}
              maxCredits={state.requirements.totalCredits}
              majorCore={stats.majorCore}
              maxMajorCore={state.requirements.majorCore}
              genEd={stats.genEd}
              maxGenEd={state.requirements.genEd}
            />
          </aside>
        </div>
      </div>
    </div>
  );
};

export default Index;
