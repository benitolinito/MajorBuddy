import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type ComponentProps, type CSSProperties, type ReactNode } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { CourseCatalog } from '@/components/CourseCatalog';
import { PlannerHeader } from '@/components/PlannerHeader';
import { PlannerAuditDialog, type PlannerAuditResult } from '@/components/PlannerAuditDialog';
import { YearSection } from '@/components/YearSection';
import { RequirementsSidebar } from '@/components/RequirementsSidebar';
import { usePlanner, clearPlannerStorage } from '@/hooks/usePlanner';
import { useCloudPlanner } from '@/hooks/useCloudPlanner';
import { Course, CourseDropOptions, CourseLibrary, DistributiveRequirement, PlannerConfig, PlannerState, PlanInput, PlannerPlan, NewCourseInput, TermName, TermSystem } from '@/types/planner';
import { ScrollArea } from '@/components/ui/scroll-area';
import { PlannerSetupDialog } from '@/components/PlannerSetupDialog';
import { ExportScheduleDialog } from '@/components/ExportScheduleDialog';
import { SharePlanDialog } from '@/components/SharePlanDialog';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable';
import { Button } from '@/components/ui/button';
import { ChevronsLeft, ChevronsRight, Plus, BookOpen, ListChecks, PenLine } from 'lucide-react';
import type { ImperativePanelHandle } from 'react-resizable-panels';
import { cn } from '@/lib/utils';
import { AuthDialog } from '@/components/AuthDialog';
import { ProfileDialog } from '@/components/ProfileDialog';
import { useIsMobile } from '@/hooks/use-mobile';
import { useSharePresence } from '@/hooks/useSharePresence';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/components/ui/sonner';
import { DEFAULT_PLAN_NAME } from '@/lib/plannerProfiles';
import { consumeSharedImport } from '@/lib/shareImport';
import { ShareLinkAccess } from '@/lib/sharePlanStore';

type PlannerStats = {
  totalCredits: number;
  planProgress: Record<string, { scheduled: number; total: number; scheduledCredits: number }>;
  distributiveProgress: Record<string, { scheduled: number; total: number }>;
};

type PlannerHeaderSharedProps = Omit<ComponentProps<typeof PlannerHeader>, 'isMobile' | 'sticky'>;

const SIDE_PANEL_TRANSITION: CSSProperties = {
  transition: 'flex-basis 200ms ease, width 200ms ease, min-width 200ms ease',
};

type YearSectionAnimatedProps = ComponentProps<typeof YearSection>;

const collapseDurationMs = 420;
const AnimatedYearSection = ({ isRemoving = false, ...props }: YearSectionAnimatedProps) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [height, setHeight] = useState<string | null>(null);

  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    if (!isRemoving) {
      setHeight(null);
      return;
    }
    const measured = container.getBoundingClientRect().height;
    setHeight(`${measured}px`);
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setHeight('0px');
      });
    });
  }, [isRemoving]);

  return (
    <div
      ref={containerRef}
      className={cn(
        'transition-[height] ease-[cubic-bezier(0.33,1,0.68,1)]',
        height !== null && 'overflow-hidden',
      )}
      style={height !== null ? { height, transitionDuration: `${collapseDurationMs}ms` } : undefined}
    >
      <YearSection {...props} isRemoving={isRemoving} />
    </div>
  );
};

const Index = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const {
    state,
    courseLibraries,
    activeCourseLibraryId,
    planProfiles,
    activePlanProfileId,
    getCoursePlacement,
    createPlanProfile,
    selectPlanProfile,
    renamePlanProfile,
    deletePlanProfile,
    setPlanShareMeta,
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
    selectCourseLibrary,
    createCourseLibrary,
    renameCourseLibrary,
    deleteCourseLibrary,
    setCourseDefaultCredits,
    addDistributive,
    addDistributiveRequirement,
    updateDistributiveRequirement,
    removeDistributiveRequirement,
    addPlan,
    updatePlan,
    removePlan,
    resetPlannerState,
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
    deletePlannerData: deleteRemotePlannerData,
    deleteAccount: deleteCloudAccount,
  } = useCloudPlanner({
    state,
    applySnapshot,
  });

  const [, setDraggedCourse] = useState<Course | null>(null);
  const [showSetup, setShowSetup] = useState(!hasConfig);
  const [showExport, setShowExport] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const [showAudit, setShowAudit] = useState(false);
  const [auditResult, setAuditResult] = useState<PlannerAuditResult | null>(null);
  const [showAuth, setShowAuth] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showDeleteControls, setShowDeleteControls] = useState(false);
  const [removingYearIds, setRemovingYearIds] = useState<string[]>([]);
  const removalTimersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  const [profileActionPending, setProfileActionPending] = useState<null | 'delete-data' | 'delete-account'>(null);
  const [duplicatePrompt, setDuplicatePrompt] = useState<{
    course: Course;
    placement: { yearName: string; termName: string; termYear: number };
    targetYearId: string;
    targetTermId: string;
    targetIndex?: number;
  } | null>(null);
  const [offeredTermPrompt, setOfferedTermPrompt] = useState<{
    course: Course;
    targetYearId: string;
    targetTermId: string;
    targetIndex?: number;
    source?: CourseDropOptions['source'];
    targetTermName: TermName;
    targetTermYear: number;
    targetYearName: string;
    offeredTerms: TermName[];
  } | null>(null);
  const [courseActionPrompt, setCourseActionPrompt] = useState<{
    course: Course;
    yearId: string;
    termId: string;
  } | null>(null);
  const [courseActionTarget, setCourseActionTarget] = useState('');
  const [courseActionMode, setCourseActionMode] = useState<'move' | 'copy'>('move');
  const shareImportApplied = useRef(false);
  const userLabel = user?.displayName || user?.email || undefined;
  const cloudBusy = cloudSaving || cloudLoading || authBusy;
  const canRemoveYear = state.years.length > 1;
  const isMobile = useIsMobile();
  const termSystem = state.config?.termSystem ?? 'semester';
  const activePlanProfile = planProfiles.find((profile) => profile.id === activePlanProfileId);
  const plannerTitle = state.degreeName || activePlanProfile?.name || DEFAULT_PLAN_NAME;
  const activeShareId = activePlanProfile?.shareId ?? null;
  const activeShareAccess = activePlanProfile?.shareLinkAccess;
  const { peers: presencePeers } = useSharePresence({
    shareId: activeShareId,
    userId: user?.uid ?? null,
    label: userLabel ?? null,
    photoUrl: user?.photoURL ?? null,
  });
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

  const distributiveColorMap = useMemo(() => {
    const map: Record<string, string | null> = {};
    state.distributiveRequirements.forEach((req) => {
      map[req.name] = req.color ?? null;
    });
    return map;
  }, [state.distributiveRequirements]);
  const formatCourseLabel = (course?: Course | null) =>
    ([course?.code, course?.name].filter(Boolean).join(' ').trim() || 'this class');
  const courseActionCourseLabel = formatCourseLabel(courseActionPrompt?.course);
  const buildPlannerAuditSnapshot = (): PlannerAuditResult => {
    const totalTerms = state.years.reduce((sum, year) => sum + year.terms.length, 0);
    const requiredCredits = state.config?.totalCredits ?? state.requirements?.totalCredits ?? 120;
    const recommendedPerTerm = totalTerms > 0 ? requiredCredits / totalTerms : null;
    const scheduledAverage = totalTerms > 0 ? stats.totalCredits / totalTerms : null;
    const heavyThresholdRaw =
      recommendedPerTerm != null
        ? Math.ceil(recommendedPerTerm)
        : scheduledAverage != null
          ? Math.ceil(scheduledAverage)
          : 21;
    const termLoadWarnings: PlannerAuditResult['termLoadWarnings'] = [];
    const offeringIssues: PlannerAuditResult['offeringIssues'] = [];

    state.years.forEach((year) => {
      year.terms.forEach((term) => {
        const termLabel = `${term.name} ${term.year} • ${year.name}`;
        const credits = term.courses.reduce((total, course) => total + course.credits, 0);
        if (credits > heavyThresholdRaw) {
          termLoadWarnings.push({
            id: `${year.id}:${term.id}`,
            termLabel,
            credits,
          });
        }

        term.courses.forEach((course) => {
          const offeredTerms = course.offeredTerms ?? [];
          if (offeredTerms.length && !offeredTerms.includes(term.name)) {
            offeringIssues.push({
              id: `${course.id}:${term.id}`,
              termLabel,
              courseLabel: formatCourseLabel(course),
              offeredTerms,
            });
          }
        });
      });
    });

    return {
      generatedAt: new Date().toISOString(),
      requiredCredits,
      recommendedPerTerm: recommendedPerTerm != null ? Number(recommendedPerTerm.toFixed(1)) : null,
      scheduledAverage: scheduledAverage != null ? Number(scheduledAverage.toFixed(1)) : null,
      heavyThreshold: heavyThresholdRaw,
      termLoadWarnings,
      offeringIssues,
    };
  };
  const findTermMeta = useCallback(
    (yearId: string, termId: string) => {
      const year = state.years.find((item) => item.id === yearId);
      const term = year?.terms.find((item) => item.id === termId);
      if (!year || !term) return null;
      return { termName: term.name, termYear: term.year, yearName: year.name };
    },
    [state.years],
  );
  const disableCourseActionConfirm =
    !courseActionTarget ||
    (courseActionMode === 'move' &&
      courseActionPrompt &&
      courseActionTarget === `${courseActionPrompt.yearId}:${courseActionPrompt.termId}`);

  const handleOpenAuth = () => setShowAuth(true);
  const handleOpenProfile = () => setShowProfile(true);
  useEffect(() => {
    return () => {
      removalTimersRef.current.forEach((timer) => clearTimeout(timer));
      removalTimersRef.current.clear();
    };
  }, []);

  const handleOpenSettings = () => setShowSetup(true);
  const handleOpenExport = () => setShowExport(true);
  const handleOpenShare = () => setShowShare(true);
  const handleOpenAudit = () => {
    setAuditResult(buildPlannerAuditSnapshot());
    setShowAudit(true);
  };
  const toggleDeleteControls = () => setShowDeleteControls((prev) => !prev);

  const handleRemoveYearWithAnimation = useCallback(
    (yearId: string) => {
      if (removalTimersRef.current.has(yearId)) return;
      setRemovingYearIds((prev) => (prev.includes(yearId) ? prev : [...prev, yearId]));
      const timer = setTimeout(() => {
        removeYear(yearId);
        setRemovingYearIds((prev) => prev.filter((id) => id !== yearId));
        removalTimersRef.current.delete(yearId);
      }, collapseDurationMs + 60);
      removalTimersRef.current.set(yearId, timer);
    },
    [removeYear],
  );

  const formatProfileActionError = (error: unknown, fallback: string) => {
    if (error instanceof Error) {
      if (error.message.includes('auth/requires-recent-login')) {
        return 'Please sign in again before deleting your account.';
      }
      return error.message;
    }
    return fallback;
  };

  const handleDeletePlannerData = async () => {
    if (profileActionPending) return;
    setProfileActionPending('delete-data');
    try {
      if (user) {
        await deleteRemotePlannerData();
      }
      clearPlannerStorage();
      setShowProfile(false);
      if (typeof window !== 'undefined') {
        window.location.reload();
      }
    } catch (error) {
      toast('Unable to delete planner data', {
        description: formatProfileActionError(error, 'Please try again.'),
      });
    } finally {
      setProfileActionPending(null);
    }
  };

  const handleDeleteAccount = async () => {
    if (profileActionPending) return;
    if (!user) {
      toast('Sign in required', { description: 'Sign in before deleting your account.' });
      return;
    }
    setProfileActionPending('delete-account');
    try {
      await deleteCloudAccount();
      clearPlannerStorage();
      setShowProfile(false);
      if (typeof window !== 'undefined') {
        window.location.reload();
      }
    } catch (error) {
      toast('Unable to delete account', {
        description: formatProfileActionError(error, 'Please try again.'),
      });
    } finally {
      setProfileActionPending(null);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    resetPlannerState();
    navigate('/', { replace: true });
  };

  const deletingData = profileActionPending === 'delete-data';
  const deletingAccount = profileActionPending === 'delete-account';

  const plannerHeaderProps: PlannerHeaderSharedProps = {
    degreeName: plannerTitle,
    university: state.university,
    classYear: state.classYear,
    userLabel,
    userPhotoUrl: user?.photoURL ?? undefined,
    cloudStatus,
    cloudBusy,
    onSignIn: handleOpenAuth,
    onSignOut: handleSignOut,
    onOpenProfile: handleOpenProfile,
    onOpenSettings: handleOpenSettings,
    onOpenExport: handleOpenExport,
    onOpenShare: handleOpenShare,
    onOpenAudit: handleOpenAudit,
    planProfiles,
    activePlanProfileId,
    onSelectPlanProfile: selectPlanProfile,
    onCreatePlanProfile: createPlanProfile,
    onDeletePlanProfile: deletePlanProfile,
    presencePeers,
  };

  const handleDragStart = (course: Course) => {
    setDraggedCourse(course);
  };

  const executeCourseDrop = useCallback(
    (payload: { yearId: string; termId: string; course: Course; options?: CourseDropOptions }) => {
      const { yearId, termId, course, options } = payload;
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
    },
    [addCourseToTerm, getCoursePlacement, moveCourseBetweenTerms, setDuplicatePrompt, setDraggedCourse],
  );

  const handleDropCourse = (
    yearId: string,
    termId: string,
    course: Course,
    options?: CourseDropOptions,
  ) => {
    const targetMeta = findTermMeta(yearId, termId);
    const offeredTerms = course.offeredTerms ?? [];
    const hasTaggedTerms = offeredTerms.length > 0;
    const matchesOfferedTerm = !hasTaggedTerms || !targetMeta ? true : offeredTerms.includes(targetMeta.termName);

    if (hasTaggedTerms && targetMeta && !matchesOfferedTerm) {
      setOfferedTermPrompt({
        course,
        targetYearId: yearId,
        targetTermId: termId,
        targetIndex: options?.targetIndex,
        source: options?.source,
        targetTermName: targetMeta.termName,
        targetTermYear: targetMeta.termYear,
        targetYearName: targetMeta.yearName,
        offeredTerms,
      });
      setDraggedCourse(null);
      return;
    }

    executeCourseDrop({ yearId, termId, course, options });
  };

  const handleConfirmOfferedTerm = () => {
    if (!offeredTermPrompt) return;
    executeCourseDrop({
      yearId: offeredTermPrompt.targetYearId,
      termId: offeredTermPrompt.targetTermId,
      course: offeredTermPrompt.course,
      options: {
        targetIndex: offeredTermPrompt.targetIndex,
        source: offeredTermPrompt.source,
      },
    });
    setOfferedTermPrompt(null);
  };

  const handleCancelOfferedTerm = () => {
    setOfferedTermPrompt(null);
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
      description: 'Tap "Add class" inside a term to pick from your library.',
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

  useEffect(() => {
    if (shareImportApplied.current) return;

    const navState = (location.state as {
      sharedSnapshot?: PlannerState;
      sharePlanName?: string | null;
      shareId?: string | null;
      shareLinkAccess?: ShareLinkAccess;
    } | null) ?? null;

    const candidateFromState = navState?.sharedSnapshot
      ? {
          snapshot: navState.sharedSnapshot,
          planName: navState.sharePlanName ?? null,
          shareId: navState.shareId ?? null,
          linkAccess: navState.shareLinkAccess,
        }
      : null;

    const candidate = candidateFromState ?? consumeSharedImport();
    if (!candidate) return;

    applySnapshot(candidate.snapshot);
    shareImportApplied.current = true;

    toast('Shared plan loaded', {
      description: candidate.planName ? `Viewing "${candidate.planName}"` : 'Viewing shared plan.',
    });

    if (candidate.shareId && activePlanProfileId) {
      setPlanShareMeta(activePlanProfileId, {
        shareId: candidate.shareId,
        linkAccess: candidate.linkAccess,
      });
    }
  }, [activePlanProfileId, applySnapshot, location.state, setPlanShareMeta]);

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
        onReset={hasConfig ? reset : undefined}
      />
      <ExportScheduleDialog
        open={showExport}
        onOpenChange={setShowExport}
        years={state.years}
        plans={state.plans}
        degreeName={plannerTitle}
        university={state.university}
      />
      <SharePlanDialog
        open={showShare}
        onOpenChange={setShowShare}
        planName={plannerTitle}
        snapshot={state}
        ownerId={user?.uid ?? null}
        activeProfileId={activePlanProfileId}
        existingShareId={activeShareId}
        existingLinkAccess={activeShareAccess}
        onSharePersist={(payload) => {
          if (!activePlanProfileId) return;
          setPlanShareMeta(activePlanProfileId, {
            shareId: payload.shareId,
            linkAccess: payload.linkAccess,
          });
        }}
      />
      <PlannerAuditDialog open={showAudit} onOpenChange={setShowAudit} audit={auditResult} />
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
      <ProfileDialog
        open={showProfile}
        onOpenChange={setShowProfile}
        userLabel={userLabel}
        userEmail={user?.email}
        userPhotoUrl={user?.photoURL}
        cloudStatus={cloudStatus}
        colorPalette={state.colorPalette}
        onSignIn={handleOpenAuth}
        onSignOut={handleSignOut}
        onDeleteData={handleDeletePlannerData}
        onDeleteAccount={user ? handleDeleteAccount : undefined}
        deletingData={deletingData}
        deletingAccount={deletingAccount}
      />
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
          distributiveColors={distributiveColorMap}
          termSystem={termSystem}
          stats={stats}
          canRemoveYear={canRemoveYear}
          getTermCredits={getTermCredits}
          onRemoveCourse={removeCourse}
          onDropCourse={handleDropCourse}
          onAddTerm={addTerm}
          onRemoveTerm={removeTerm}
          onRemoveYear={handleRemoveYearWithAnimation}
          removingYearIds={removingYearIds}
          onRequestCourseAction={handleRequestCourseAction}
          onAddPlan={addPlan}
          onUpdatePlan={updatePlan}
          onRemovePlan={removePlan}
          addDistributiveRequirement={addDistributiveRequirement}
          updateDistributiveRequirement={updateDistributiveRequirement}
          removeDistributiveRequirement={removeDistributiveRequirement}
          onAddYear={addYear}
          addCourseToCatalog={addCourseToCatalog}
          updateCourseInCatalog={updateCourseInCatalog}
          removeCourseFromCatalog={removeCourseFromCatalog}
          defaultCourseCredits={state.courseDefaults.defaultCredits}
          onUpdateDefaultCourseCredits={setCourseDefaultCredits}
          addDistributive={addDistributive}
          addColorToPalette={addColorToPalette}
          onDragStart={handleDragStart}
          courseLibraries={courseLibraries}
          activeCourseLibraryId={activeCourseLibraryId}
          selectCourseLibrary={selectCourseLibrary}
          createCourseLibrary={createCourseLibrary}
          renameCourseLibrary={renameCourseLibrary}
          deleteCourseLibrary={deleteCourseLibrary}
          onOpenExport={handleOpenExport}
          onOpenShare={handleOpenShare}
          onOpenSettings={handleOpenSettings}
        />
      ) : (
        <DesktopPlannerLayout
          headerProps={plannerHeaderProps}
          state={state}
          stats={stats}
          distributiveColors={distributiveColorMap}
          termSystem={termSystem}
          canRemoveYear={canRemoveYear}
          showDeleteControls={showDeleteControls}
          onToggleDeleteControls={toggleDeleteControls}
          getTermCredits={getTermCredits}
          onRemoveCourse={removeCourse}
          onDropCourse={handleDropCourse}
          onAddTerm={addTerm}
          onRemoveTerm={removeTerm}
          onRemoveYear={handleRemoveYearWithAnimation}
          removingYearIds={removingYearIds}
          onAddPlan={addPlan}
          onUpdatePlan={updatePlan}
          onRemovePlan={removePlan}
          addDistributiveRequirement={addDistributiveRequirement}
          updateDistributiveRequirement={updateDistributiveRequirement}
          removeDistributiveRequirement={removeDistributiveRequirement}
          onAddYear={addYear}
          addCourseToCatalog={addCourseToCatalog}
          updateCourseInCatalog={updateCourseInCatalog}
          removeCourseFromCatalog={removeCourseFromCatalog}
          defaultCourseCredits={state.courseDefaults.defaultCredits}
          onUpdateDefaultCourseCredits={setCourseDefaultCredits}
          addDistributive={addDistributive}
          addColorToPalette={addColorToPalette}
          onDragStart={handleDragStart}
          courseLibraries={courseLibraries}
          activeCourseLibraryId={activeCourseLibraryId}
          selectCourseLibrary={selectCourseLibrary}
          createCourseLibrary={createCourseLibrary}
          renameCourseLibrary={renameCourseLibrary}
          deleteCourseLibrary={deleteCourseLibrary}
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

type MobilePane = 'plan' | 'library' | 'requirements';

const MOBILE_TABS: { id: MobilePane; label: string }[] = [
  { id: 'plan', label: 'Plan' },
  { id: 'library', label: 'Library' },
  { id: 'requirements', label: 'Goals' },
];

const MobilePaneCard = ({ children }: { children: ReactNode }) => (
  <div className="rounded-3xl border border-border/60 bg-card/95 p-3 shadow-[0_30px_65px_-35px_rgba(15,23,42,0.8)]">
    {children}
  </div>
);

type MobilePaneSwitchProps = {
  activePane: MobilePane;
  onSelectPane: (pane: MobilePane) => void;
};

const MobilePaneSwitch = ({ activePane, onSelectPane }: MobilePaneSwitchProps) => (
  <div className="rounded-2xl border border-border/70 bg-card/80 p-2 shadow-sm">
    <div className="grid grid-cols-3 gap-1.5">
      {MOBILE_TABS.map((tab) => {
        const Icon = tab.id === 'plan' ? PenLine : tab.id === 'library' ? BookOpen : ListChecks;
        const isActive = activePane === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onSelectPane(tab.id)}
            className={cn(
              'flex items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-[11px] font-semibold transition',
              isActive ? 'bg-primary/10 text-foreground ring-1 ring-primary/30' : 'text-muted-foreground hover:text-foreground/80',
            )}
            aria-pressed={isActive}
          >
            <Icon className="h-4 w-4" aria-hidden />
            {tab.label}
          </button>
        );
      })}
    </div>
  </div>
);

type MobileYearNavigatorProps = {
  years: { id: string; name: string }[];
  activeYearId: string;
  onSelectYear: (yearId: string) => void;
  onAddYear: () => void;
};

const MobileYearNavigator = ({ years, activeYearId, onSelectYear, onAddYear }: MobileYearNavigatorProps) => (
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
        <button
          type="button"
          onClick={onAddYear}
          className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full border border-dashed border-border/70 text-muted-foreground transition hover:border-primary/60 hover:text-primary"
          aria-label="Add academic year"
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>
    </div>
  </div>
);

type MobilePlannerLayoutProps = {
  headerProps: PlannerHeaderSharedProps;
  state: PlannerState;
  distributiveColors: Record<string, string | null>;
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
  onAddPlan: (plan: PlanInput) => PlannerPlan | null;
  onUpdatePlan: (planId: string, plan: PlanInput) => void;
  onRemovePlan: (planId: string) => void;
  addDistributiveRequirement: (input: { name: string; classesNeeded?: number | null; color?: string | null }) => DistributiveRequirement | null;
  updateDistributiveRequirement: (id: string, updates: { classesNeeded?: number | null; color?: string | null }) => void;
  removeDistributiveRequirement: (id: string) => void;
  onAddYear: () => void;
  addCourseToCatalog: (course: NewCourseInput) => Course;
  updateCourseInCatalog: (courseId: string, course: NewCourseInput) => void;
  removeCourseFromCatalog: (courseId: string) => void;
  defaultCourseCredits: number;
  onUpdateDefaultCourseCredits: (credits: number) => void;
  addDistributive: (label: string) => string;
  addColorToPalette: (hex: string) => string;
  onDragStart: (course: Course) => void;
  courseLibraries: CourseLibrary[];
  activeCourseLibraryId: string;
  selectCourseLibrary: (libraryId: string) => void;
  createCourseLibrary: (name: string) => void;
  renameCourseLibrary: (libraryId: string, name: string) => void;
  deleteCourseLibrary: (libraryId: string) => void;
  onOpenExport: () => void;
  onOpenShare: () => void;
  onOpenSettings: () => void;
  removingYearIds: string[];
};

const MobilePlannerLayout = ({
  headerProps,
  state,
  distributiveColors,
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
  onAddPlan,
  onUpdatePlan,
  onRemovePlan,
  addDistributiveRequirement,
  updateDistributiveRequirement,
  removeDistributiveRequirement,
  onAddYear,
  addCourseToCatalog,
  updateCourseInCatalog,
  removeCourseFromCatalog,
  defaultCourseCredits,
  onUpdateDefaultCourseCredits,
  addDistributive,
  addColorToPalette,
  onDragStart,
  courseLibraries,
  activeCourseLibraryId,
  selectCourseLibrary,
  createCourseLibrary,
  renameCourseLibrary,
  deleteCourseLibrary,
  onOpenExport,
  onOpenShare,
  onOpenSettings,
  removingYearIds,
}: MobilePlannerLayoutProps) => {
  const [activeYearId, setActiveYearId] = useState(() => state.years[0]?.id ?? '');
  const [activePane, setActivePane] = useState<MobilePane>('plan');
  const [libraryTarget, setLibraryTarget] = useState<{ yearId: string; termId: string } | null>(null);
  const [quickAddOpen, setQuickAddOpen] = useState(false);

  useEffect(() => {
    if (activeYearId && state.years.some((year) => year.id === activeYearId)) {
      return;
    }
    const nextId = state.years[0]?.id ?? '';
    if (nextId !== activeYearId) {
      setActiveYearId(nextId);
    }
  }, [state.years, activeYearId]);

  const libraryTargetLabel = useMemo(() => {
    if (!libraryTarget) return null;
    const year = state.years.find((item) => item.id === libraryTarget.yearId);
    const term = year?.terms.find((item) => item.id === libraryTarget.termId);
    if (!year || !term) return null;
    return `${year.name} • ${term.name} ${term.year}`;
  }, [libraryTarget, state.years]);

  const handleOpenTermPicker = (yearId: string, termId: string) => {
    setLibraryTarget({ yearId, termId });
    setQuickAddOpen(true);
  };

  const handleQuickAddChange = (open: boolean) => {
    setQuickAddOpen(open);
    if (!open) {
      setLibraryTarget(null);
    }
  };

  const handleQuickAddCourse = (course: Course) => {
    if (!libraryTarget) return;
    onDropCourse(libraryTarget.yearId, libraryTarget.termId, course);
  };

  const filteredYears = state.years.filter((year) => !activeYearId || year.id === activeYearId);

  return (
    <>
      <div className="relative min-h-screen pb-28">
        <div className="border-b border-border/70 bg-background/95">
          <PlannerHeader {...headerProps} sticky={false} isMobile />
          <div className="space-y-4 px-4 pb-4 pt-3">
            <MobilePaneSwitch activePane={activePane} onSelectPane={setActivePane} />
            {activePane === 'plan' && (
              <MobileYearNavigator
                years={state.years}
                activeYearId={activeYearId}
                onSelectYear={setActiveYearId}
                onAddYear={onAddYear}
              />
            )}
          </div>
        </div>

        <div className="space-y-6 px-4 py-6">
          {activePane === 'plan' && (
            <div className="space-y-5">
              {filteredYears.length === 0 ? (
                <MobilePaneCard>
                  <div className="py-8 text-center text-sm text-muted-foreground">
                    Add an academic year to start planning.
                  </div>
                </MobilePaneCard>
              ) : (
                filteredYears.map((year) => (
                  <MobilePaneCard key={year.id}>
                    <AnimatedYearSection
                      year={year}
                      getTermCredits={(termId) => getTermCredits(year.id, termId)}
                      plans={state.plans}
                      distributiveColors={distributiveColors}
                      onRemoveCourse={(termId, courseId) => onRemoveCourse(year.id, termId, courseId)}
                      onDropCourse={(yearId, termId, course, options) => onDropCourse(yearId, termId, course, options)}
                      onAddTerm={() => onAddTerm(year.id)}
                      onRemoveTerm={(termId) => onRemoveTerm(year.id, termId)}
                      onRemoveYear={() => onRemoveYear(year.id)}
                      canRemoveYear={canRemoveYear}
                      termSystem={termSystem}
                      onRequestCourseAction={onRequestCourseAction}
                      onAddCourseToTerm={(termId) => handleOpenTermPicker(year.id, termId)}
                      isRemoving={removingYearIds.includes(year.id)}
                    />
                  </MobilePaneCard>
                ))
              )}
              <Button
                type="button"
                variant="outline"
                className="w-full border-dashed"
                onClick={onAddYear}
              >
                <Plus className="mr-2 h-4 w-4" />
                Add academic year
              </Button>
            </div>
          )}

          {activePane === 'library' && (
            <MobilePaneCard>
              <CourseCatalog
                courses={state.courseCatalog}
                distributives={state.distributives}
                plans={state.plans}
                termSystem={termSystem}
                colorPalette={state.colorPalette}
                onAddPaletteColor={addColorToPalette}
                defaultCourseCredits={defaultCourseCredits}
                onUpdateDefaultCourseCredits={onUpdateDefaultCourseCredits}
                onDragStart={onDragStart}
                onCreateCourse={addCourseToCatalog}
                onUpdateCourse={updateCourseInCatalog}
                onRemoveCourse={removeCourseFromCatalog}
                onCreateDistributive={addDistributive}
                courseLibraries={courseLibraries}
                activeCourseLibraryId={activeCourseLibraryId}
                onSelectCourseLibrary={selectCourseLibrary}
                onCreateCourseLibrary={createCourseLibrary}
                onRenameCourseLibrary={renameCourseLibrary}
                onDeleteCourseLibrary={deleteCourseLibrary}
                isMobile
              />
            </MobilePaneCard>
          )}

          {activePane === 'requirements' && (
            <MobilePaneCard>
              <RequirementsSidebar
                totalCredits={stats.totalCredits}
                maxCredits={state.requirements.totalCredits}
                plans={state.plans}
                planProgress={stats.planProgress}
                distributiveRequirements={state.distributiveRequirements}
                distributiveProgress={stats.distributiveProgress}
                onAddPlan={onAddPlan}
                onUpdatePlan={onUpdatePlan}
                onRemovePlan={onRemovePlan}
                onAddDistributive={addDistributiveRequirement}
                onUpdateDistributive={updateDistributiveRequirement}
                onRemoveDistributive={removeDistributiveRequirement}
                colorPalette={state.colorPalette}
                onAddPaletteColor={addColorToPalette}
                isMobile
              />
            </MobilePaneCard>
          )}
        </div>
      </div>

      <Sheet open={quickAddOpen} onOpenChange={handleQuickAddChange}>
        <SheetContent side="bottom" className="h-[85vh] overflow-y-auto px-4">
          <SheetHeader className="pb-2 text-left">
            <SheetTitle>Add to {libraryTargetLabel ?? 'a term'}</SheetTitle>
            <SheetDescription>Select a class to drop into this term.</SheetDescription>
          </SheetHeader>
          <CourseCatalog
            courses={state.courseCatalog}
            distributives={state.distributives}
            plans={state.plans}
            termSystem={termSystem}
            colorPalette={state.colorPalette}
            onAddPaletteColor={addColorToPalette}
            defaultCourseCredits={defaultCourseCredits}
            onUpdateDefaultCourseCredits={onUpdateDefaultCourseCredits}
            onDragStart={onDragStart}
            onCreateCourse={addCourseToCatalog}
            onUpdateCourse={updateCourseInCatalog}
            onRemoveCourse={removeCourseFromCatalog}
            onCreateDistributive={addDistributive}
            courseLibraries={courseLibraries}
            activeCourseLibraryId={activeCourseLibraryId}
            onSelectCourseLibrary={selectCourseLibrary}
            onCreateCourseLibrary={createCourseLibrary}
            onRenameCourseLibrary={renameCourseLibrary}
            onDeleteCourseLibrary={deleteCourseLibrary}
            onCollapsePanel={() => handleQuickAddChange(false)}
            isMobile
            onQuickAddCourse={handleQuickAddCourse}
            quickAddLabel="Add"
          />
        </SheetContent>
      </Sheet>
    </>
  );
};

type DesktopPlannerLayoutProps = {
  headerProps: PlannerHeaderSharedProps;
  state: PlannerState;
  stats: PlannerStats;
  distributiveColors: Record<string, string | null>;
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
  addDistributiveRequirement: (input: { name: string; classesNeeded?: number | null; color?: string | null }) => DistributiveRequirement | null;
  updateDistributiveRequirement: (id: string, updates: { classesNeeded?: number | null; color?: string | null }) => void;
  removeDistributiveRequirement: (id: string) => void;
  onAddYear: () => void;
  addCourseToCatalog: (course: NewCourseInput) => Course;
  updateCourseInCatalog: (courseId: string, course: NewCourseInput) => void;
  removeCourseFromCatalog: (courseId: string) => void;
  defaultCourseCredits: number;
  onUpdateDefaultCourseCredits: (credits: number) => void;
  addDistributive: (label: string) => string;
  addColorToPalette: (hex: string) => string;
  onDragStart: (course: Course) => void;
  courseLibraries: CourseLibrary[];
  activeCourseLibraryId: string;
  selectCourseLibrary: (libraryId: string) => void;
  createCourseLibrary: (name: string) => void;
  renameCourseLibrary: (libraryId: string, name: string) => void;
  deleteCourseLibrary: (libraryId: string) => void;
  removingYearIds: string[];
};

const DesktopPlannerLayout = ({
  headerProps,
  state,
  stats,
  distributiveColors,
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
  addDistributiveRequirement,
  updateDistributiveRequirement,
  removeDistributiveRequirement,
  onAddYear,
  addCourseToCatalog,
  updateCourseInCatalog,
  removeCourseFromCatalog,
  defaultCourseCredits,
  onUpdateDefaultCourseCredits,
  addDistributive,
  addColorToPalette,
  onDragStart,
  courseLibraries,
  activeCourseLibraryId,
  selectCourseLibrary,
  createCourseLibrary,
  renameCourseLibrary,
  deleteCourseLibrary,
  removingYearIds,
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
        style={SIDE_PANEL_TRANSITION}
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
            defaultCourseCredits={defaultCourseCredits}
            onUpdateDefaultCourseCredits={onUpdateDefaultCourseCredits}
            onDragStart={onDragStart}
            onCreateCourse={addCourseToCatalog}
            onUpdateCourse={updateCourseInCatalog}
            onRemoveCourse={removeCourseFromCatalog}
            onCreateDistributive={addDistributive}
            courseLibraries={courseLibraries}
            activeCourseLibraryId={activeCourseLibraryId}
            onSelectCourseLibrary={selectCourseLibrary}
            onCreateCourseLibrary={createCourseLibrary}
            onRenameCourseLibrary={renameCourseLibrary}
            onDeleteCourseLibrary={deleteCourseLibrary}
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
                    <AnimatedYearSection
                      key={year.id}
                      year={year}
                      getTermCredits={(termId) => getTermCredits(year.id, termId)}
                      plans={state.plans}
                      distributiveColors={distributiveColors}
                      onRemoveCourse={(termId, courseId) => onRemoveCourse(year.id, termId, courseId)}
                      onDropCourse={(yearId, termId, course, options) => onDropCourse(yearId, termId, course, options)}
                      onAddTerm={() => onAddTerm(year.id)}
                      onRemoveTerm={(termId) => onRemoveTerm(year.id, termId)}
                      onRemoveYear={() => onRemoveYear(year.id)}
                      canRemoveYear={canRemoveYear}
                      termSystem={termSystem}
                      showDeleteControls={showDeleteControls}
                      isRemoving={removingYearIds.includes(year.id)}
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
              style={SIDE_PANEL_TRANSITION}
            >
              {requirementsCollapsed ? (
                <CollapsedRail side="right" ariaLabel="Expand requirements" onExpand={() => requirementsPanelRef.current?.expand()} />
              ) : (
                <aside className="flex h-full flex-col border-l border-border bg-card">
                  <div className="flex-1 overflow-y-auto p-6">
                    <RequirementsSidebar
                      totalCredits={stats.totalCredits}
                      maxCredits={state.requirements.totalCredits}
                      plans={state.plans}
                      planProgress={stats.planProgress}
                      distributiveRequirements={state.distributiveRequirements}
                      distributiveProgress={stats.distributiveProgress}
                      onAddPlan={onAddPlan}
                      onUpdatePlan={onUpdatePlan}
                      onRemovePlan={onRemovePlan}
                      onAddDistributive={addDistributiveRequirement}
                      onUpdateDistributive={updateDistributiveRequirement}
                      onRemoveDistributive={removeDistributiveRequirement}
                      colorPalette={state.colorPalette}
                      onAddPaletteColor={addColorToPalette}
                      onCollapsePanel={() => requirementsPanelRef.current?.collapse()}
                    />
                  </div>
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
