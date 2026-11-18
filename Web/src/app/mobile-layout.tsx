'use client';

import { useState, useCallback, useEffect, Suspense } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import dynamic from 'next/dynamic';

import { MobileSwipeLayout } from '@/components/navigation';
import { useDashboardData } from '@/hooks/useDashboardData';
import { useAnalyticsPageData } from '@/hooks/useAnalyticsPageData';
import type { Workout } from '@/lib/types';

const DashboardView = dynamic(() => import('@/components/views/DashboardView'), {
    ssr: false,
    loading: () => <div className="h-full w-full bg-background" />,
});
const CalendarView = dynamic(() => import('@/components/views/CalendarView').then(m => ({ default: m.CalendarView })), {
    ssr: false,
    loading: () => <div className="h-full w-full bg-background" />,
});
const AnalyticsView = dynamic(() => import('@/components/views/AnalyticsView'), {
    ssr: false,
    loading: () => <div className="h-full w-full bg-background" />,
});
const HealthView = dynamic(() => import('@/components/views/HealthView'), { ssr: false });
const AiChat = dynamic(() => import('@/components/AiChat'), { ssr: false, loading: () => <div className="flex-1 bg-background" /> });
const ChatSidebar = dynamic(() => import('@/components/ChatSidebar'), { ssr: false, loading: () => null });
const AiSettingsModal = dynamic(() => import('@/components/AiSettingsModal'), { ssr: false, loading: () => null });
const EditWorkoutModal = dynamic(() => import('@/components/EditWorkoutModal'), { ssr: false, loading: () => null });
const ShapeCalibrationModal = dynamic(() => import('@/components/ShapeCalibrationModal'), { ssr: false, loading: () => null });

interface MobileChatPaneProps {
    isSidebarOpen: boolean;
    onOpenSidebar: () => void;
    onCloseSidebar: () => void;
    isPromptLibraryOpen: boolean;
    onOpenPromptLibrary: () => void;
    onClosePromptLibrary: () => void;
    onOpenSettings: () => void;
    chatResetKey: number;
    onIncrementResetKey: () => void;
}

function MobileChatPane({
    isSidebarOpen,
    onOpenSidebar,
    onCloseSidebar,
    isPromptLibraryOpen,
    onOpenPromptLibrary,
    onClosePromptLibrary,
    onOpenSettings,
    chatResetKey,
    onIncrementResetKey,
}: MobileChatPaneProps) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const sessionId = searchParams.get('sessionId') || undefined;

    const handleNewChat = useCallback(() => {
        if (sessionId) {
            router.replace('/chat', { scroll: false });
        }
        onIncrementResetKey();
    }, [sessionId, router, onIncrementResetKey]);

    return (
        <div className="flex flex-col h-full w-full bg-background overflow-hidden">
            <div className="topbar flex items-center justify-between px-4 py-2.5 shrink-0">
                <button
                    type="button"
                    onClick={onOpenSidebar}
                    className="topbar-btn px-2 py-1 text-xs font-medium"
                    aria-label="Open chat history"
                >
                    History
                </button>
                <span className="text-sm font-semibold text-[color:var(--topbar-fg)]">Coach</span>
                <button
                    type="button"
                    onClick={onOpenPromptLibrary}
                    className="topbar-btn px-2 py-1 text-xs font-medium"
                    aria-label="Open prompt library"
                >
                    Prompts
                </button>
            </div>
            {isSidebarOpen && (
                <div className="fixed inset-0 z-50 flex">
                    <div className="fixed inset-0 bg-black/[var(--modal-backdrop-opacity)]" onClick={onCloseSidebar} />
                    <aside className="relative w-[280px] bg-background-secondary h-full border-r border-line animate-slide-in">
                        <ChatSidebar
                            sessionId={sessionId}
                            onCloseMobile={onCloseSidebar}
                            onNewChat={handleNewChat}
                        />
                    </aside>
                </div>
            )}
            <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
                <AiChat
                    key={chatResetKey}
                    sessionId={sessionId}
                    onOpenSettings={onOpenSettings}
                    isPromptLibraryOpen={isPromptLibraryOpen}
                    onClosePromptLibrary={onClosePromptLibrary}
                    onOpenPromptLibrary={onOpenPromptLibrary}
                />
            </div>
        </div>
    );
}

export function MobileLayout() {
    const { data: session, status } = useSession();
    const router = useRouter();

    const [activePath, setActivePath] = useState(() => (typeof window !== 'undefined' ? window.location.pathname : '/'));
    const [isMobileChatSidebarOpen, setIsMobileChatSidebarOpen] = useState(false);
    const [isPromptLibraryOpen, setIsPromptLibraryOpen] = useState(false);
    const [isAiSettingsOpen, setIsAiSettingsOpen] = useState(false);
    const [chatResetKey, setChatResetKey] = useState(0);

    const isCalendarPath = activePath === '/calendar' || activePath === '/plan';
    const isAnalyticsPath = activePath === '/analytics';

    const {
        statsData: dashboardStats,
        recentActivities,
        activeGoal,
        incompleteGoal,
        weeklyWorkouts,
        syncStatus,
        syncMutation,
        isLoading: isDashboardLoading,
        error: dashboardError,
        editingWorkout,
        initialComplete,
        openEditWorkout,
        closeEditWorkout,
        invalidateAll,
    } = useDashboardData({ status, userId: session?.user?.id });

    const {
        activitiesData,
        userData,
        statsData: analyticsStatsData,
        cyclingData,
        timeRange,
        setTimeRange,
        isCalibrationOpen,
        setIsCalibrationOpen,
        recalculateMutation,
        analyticsMetrics,
    } = useAnalyticsPageData({ status, enabled: isAnalyticsPath });

    // === AUTH GUARDS ===
    // Redirects must run in an effect — calling router.push() during render
    // triggers a "Cannot update a component while rendering a different
    // component" error (Router state update inside MobileLayout render).
    const shouldRedirectToLogin = status === 'unauthenticated';
    const shouldRedirectToOnboarding =
        status === 'authenticated' && !isDashboardLoading && !activeGoal && !incompleteGoal &&
        (typeof window === 'undefined' || localStorage.getItem('runflow_onboarding_dismissed') !== 'true');

    useEffect(() => {
        if (shouldRedirectToLogin) {
            router.push('/login');
        } else if (shouldRedirectToOnboarding) {
            try {
                localStorage.setItem('runflow_onboarding_dismissed', 'true');
            } catch {
                // ignore storage errors
            }
            router.push('/onboarding?step=4');
        }
    }, [router, shouldRedirectToLogin, shouldRedirectToOnboarding]);

    if (shouldRedirectToLogin || shouldRedirectToOnboarding) {
        return null;
    }

    // === RENDER ===

    return (
        <Suspense fallback={<div className="fixed inset-0 bg-background" />}>
            <MobileSwipeLayout
                onPathChange={setActivePath}
            >
                {/* Dashboard View - always index 0 */}
                {activePath === '/' ? (
                    <DashboardView
                        session={session}
                        statsData={dashboardStats}
                        recentActivities={recentActivities}
                        activeGoal={activeGoal}
                        incompleteGoal={incompleteGoal}
                        weeklyWorkouts={weeklyWorkouts}
                        syncStatus={syncStatus}
                        syncMutation={syncMutation}
                        isLoading={isDashboardLoading}
                        error={dashboardError}
                        onEditWorkout={openEditWorkout}
                        onInvalidateQueries={invalidateAll}
                        showHeader={false}
                    />
                ) : <div className="h-full w-full" />}

                {/* Calendar View - always index 1 */}
                {isCalendarPath ? (
                    <CalendarView showHeader={false} />
                ) : <div className="h-full w-full" />}

                {/* Analytics View - always index 2 */}
                {isAnalyticsPath ? (
                    <AnalyticsView
                        runalyzeMetrics={analyticsMetrics.runalyzeMetrics}
                        vo2TrendData={analyticsMetrics.vo2TrendData}
                        shapeTrendData={analyticsMetrics.shapeTrendData}
                        fitnessData={analyticsMetrics.fitnessData}
                        combinedData={analyticsMetrics.combinedData}
                        trainingPaces={analyticsMetrics.trainingPaces}
                        userData={userData}
                        activitiesData={activitiesData}
                        cyclingData={cyclingData}
                        timeRange={timeRange}
                        setTimeRange={setTimeRange}
                        onRecalculate={() => recalculateMutation.mutate()}
                        isRecalculating={recalculateMutation.isPending}
                        onOpenCalibration={() => setIsCalibrationOpen(true)}
                        showHeader={false}
                    />
                ) : <div className="h-full w-full" />}
                {activePath === '/health' ? <HealthView showHeader={false} /> : <div className="h-full w-full" />}

                {/* Coach View - always index 4 */}
                {activePath === '/chat' ? (
                    <MobileChatPane
                        isSidebarOpen={isMobileChatSidebarOpen}
                        onOpenSidebar={() => setIsMobileChatSidebarOpen(true)}
                        onCloseSidebar={() => setIsMobileChatSidebarOpen(false)}
                        isPromptLibraryOpen={isPromptLibraryOpen}
                        onOpenPromptLibrary={() => setIsPromptLibraryOpen(true)}
                        onClosePromptLibrary={() => setIsPromptLibraryOpen(false)}
                        onOpenSettings={() => setIsAiSettingsOpen(true)}
                        chatResetKey={chatResetKey}
                        onIncrementResetKey={() => setChatResetKey(prev => prev + 1)}
                    />
                ) : <div className="h-full w-full" />}
            </MobileSwipeLayout>

            {/* Modals */}
            <AiSettingsModal
                isOpen={isAiSettingsOpen}
                onClose={() => setIsAiSettingsOpen(false)}
            />

            <EditWorkoutModal
                key={editingWorkout?.id ?? 'new'}
                isOpen={!!editingWorkout}
                onClose={closeEditWorkout}
                // M-06 fix: WorkoutWithLinkedActivity extends Workout, safe cast
                workout={editingWorkout as Workout | null}
                goalId={activeGoal?.id}
                initialComplete={initialComplete}
            />

            <ShapeCalibrationModal
                isOpen={isCalibrationOpen}
                onClose={() => setIsCalibrationOpen(false)}
                currentFactor={analyticsMetrics.runalyzeMetrics.calibrationFactor}
                effectiveVO2max={analyticsMetrics.runalyzeMetrics.effectiveVO2max}
                rawVO2max={analyticsMetrics.runalyzeMetrics.rawVO2max}
                vdotCorrectionFactor={analyticsMetrics.runalyzeMetrics.vdotCorrectionFactor}
                effectiveVo2maxCorrectionFactor={analyticsStatsData?.effectiveVo2maxCorrectionFactor || 1.0}
                shapePercent={analyticsMetrics.runalyzeMetrics.shape}
                activities={activitiesData?.activities || []}
            />
        </Suspense>
    );
}

export default MobileLayout;
