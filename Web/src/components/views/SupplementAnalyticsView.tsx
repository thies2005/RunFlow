'use client';

import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    ArrowLeft, TrendingUp, Calendar, BarChart3, Pill, ChevronLeft, ChevronRight,
    Sun, Cloud, Moon, AlertTriangle, Check, X as XIcon
} from 'lucide-react';
import { format, subDays } from 'date-fns';
import {
    BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, ReferenceLine
} from 'recharts';

interface Props {
    onClose: () => void;
}

type DateRange = '7days' | '30days' | '90days';
type ViewTab = 'analytics' | 'calendar';

const TIME_ICONS: Record<string, React.ComponentType<{ className?: string; style?: React.CSSProperties }>> = { MORNING: Sun, NOON: Cloud, EVENING: Moon };
const TIME_COLORS: Record<string, string> = { MORNING: '#f59e0b', NOON: '#3b82f6', EVENING: '#8b5cf6' };

export default function SupplementAnalyticsView({ onClose }: Props) {
    const queryClient = useQueryClient();
    const [dateRange, setDateRange] = useState<DateRange>('30days');
    const [tab, setTab] = useState<ViewTab>('analytics');

    // Calendar state
    const [calYear, setCalYear] = useState(new Date().getFullYear());
    const [calMonth, setCalMonth] = useState(new Date().getMonth() + 1);
    const [selectedDay, setSelectedDay] = useState<string | null>(null);

    // Analytics data
    const { data: analytics, isLoading } = useQuery({
        queryKey: ['supplement-analytics', dateRange],
        queryFn: async () => {
            const endDate = format(new Date(), 'yyyy-MM-dd');
            const days = dateRange === '7days' ? 7 : dateRange === '30days' ? 30 : 90;
            const startDate = format(subDays(new Date(), days), 'yyyy-MM-dd');
            const res = await fetch(`/api/health/supplements/analytics?startDate=${startDate}&endDate=${endDate}`);
            if (!res.ok) throw new Error('Failed to fetch');
            return res.json();
        },
        enabled: tab === 'analytics'
    });

    // Calendar data
    const { data: calData, isLoading: isCalLoading } = useQuery({
        queryKey: ['supplement-calendar', calYear, calMonth],
        queryFn: async () => {
            const res = await fetch(`/api/health/supplements/calendar?year=${calYear}&month=${calMonth}`);
            if (!res.ok) throw new Error('Failed to fetch');
            return res.json();
        },
        enabled: tab === 'calendar'
    });

    // Toggle mutation for calendar editing
    const toggleMutation = useMutation({
        mutationFn: async ({ supplementId, date, taken }: { supplementId: string; date: string; taken: boolean }) => {
            const _dateObj = new Date(date + 'T00:00:00Z');
            const res = await fetch('/api/health/daily', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    date,
                    action: 'toggleSupplement',
                    supplementId,
                    taken
                })
            });
            if (!res.ok) throw new Error('Failed to toggle');
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['supplement-calendar', calYear, calMonth] });
            queryClient.invalidateQueries({ queryKey: ['supplement-analytics'] });
            queryClient.invalidateQueries({ queryKey: ['daily-health'] });
        }
    });

    // Chart data for analytics
    const chartData = useMemo(() => {
        if (!analytics?.dailyData) return [];
        return analytics.dailyData.map((d: { date: string; taken: number; scheduled: number }) => ({
            date: format(new Date(d.date + 'T12:00:00'), 'MMM dd'),
            taken: d.taken,
            missed: d.scheduled - d.taken,
            scheduled: d.scheduled,
        }));
    }, [analytics]);

    // Calendar grid
    const calendarGrid = useMemo(() => {
        if (!calData?.days) return [];
        const firstDay = new Date(Date.UTC(calYear, calMonth - 1, 1)).getUTCDay();
        const grid: (typeof calData.days[0] | null)[] = [];
        for (let i = 0; i < firstDay; i++) grid.push(null);
        for (const day of calData.days) grid.push(day);
        return grid;
    }, [calData, calYear, calMonth]);

    // What supplements are scheduled for the selected day
    const selectedDaySupps = useMemo(() => {
        if (!selectedDay || !calData) return [];
        const dayOfWeek = new Date(selectedDay + 'T00:00:00Z').getUTCDay();
        return calData.supplements
            .filter((s: { id: string; daysOfWeek: unknown }) => {
                const days = s.daysOfWeek as number[] | null;
                return !days || days.length === 0 || days.includes(dayOfWeek);
            })
            .map((s: Record<string, unknown>) => ({
                ...s,
                taken: !!calData.logMap[`${s.id}:${selectedDay}`]
            }));
    }, [selectedDay, calData]);

    const prevMonth = () => {
        if (calMonth === 1) { setCalMonth(12); setCalYear(calYear - 1); }
        else setCalMonth(calMonth - 1);
        setSelectedDay(null);
    };

    const nextMonth = () => {
        if (calMonth === 12) { setCalMonth(1); setCalYear(calYear + 1); }
        else setCalMonth(calMonth + 1);
        setSelectedDay(null);
    };

    const monthName = format(new Date(calYear, calMonth - 1), 'MMMM yyyy');

    return (
        <div className="min-h-full bg-background pb-20">
            {/* Header */}
            <header className="border-b border-glass-border backdrop-blur-md bg-background/80 sticky top-0 z-50">
                <div className="flex items-center justify-between px-4 py-3">
                    <div className="flex items-center">
                        <button onClick={onClose} className="mr-3">
                            <ArrowLeft className="w-5 h-5 text-foreground" />
                        </button>
                        <span className="text-lg font-bold text-foreground flex items-center gap-2">
                            <Pill className="w-5 h-5 text-blue-400" /> Supplement Analytics
                        </span>
                    </div>
                </div>
                {/* Tab Bar */}
                <div className="flex border-t border-foreground/5">
                    <button
                        onClick={() => setTab('analytics')}
                        className={`flex-1 py-2.5 text-xs font-bold uppercase tracking-widest text-center transition-colors ${tab === 'analytics' ? 'text-blue-400 border-b-2 border-blue-400' : 'text-foreground-muted'}`}
                    >
                        <BarChart3 className="w-4 h-4 inline mr-1.5 -mt-0.5" />Analytics
                    </button>
                    <button
                        onClick={() => setTab('calendar')}
                        className={`flex-1 py-2.5 text-xs font-bold uppercase tracking-widest text-center transition-colors ${tab === 'calendar' ? 'text-blue-400 border-b-2 border-blue-400' : 'text-foreground-muted'}`}
                    >
                        <Calendar className="w-4 h-4 inline mr-1.5 -mt-0.5" />Calendar
                    </button>
                </div>
            </header>

            {tab === 'analytics' && (
                <div className="p-4 space-y-4 max-w-2xl mx-auto">
                    {/* Date Range Selector */}
                    <div className="flex gap-2 overflow-x-auto pb-2">
                        {([
                            { key: '7days' as DateRange, label: 'Last 7 Days' },
                            { key: '30days' as DateRange, label: 'Last 30 Days' },
                            { key: '90days' as DateRange, label: 'Last 90 Days' },
                        ]).map(({ key, label }) => (
                            <button
                                key={key}
                                onClick={() => setDateRange(key)}
                                className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${dateRange === key
                                    ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                                    : 'bg-foreground/5 text-foreground-muted border border-foreground/10'
                                    }`}
                            >
                                {label}
                            </button>
                        ))}
                    </div>

                    {isLoading ? (
                        <div className="flex items-center justify-center h-[40vh]">
                            <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
                        </div>
                    ) : analytics ? (
                        <>
                            {/* Hero Stats */}
                            <div className="grid grid-cols-3 gap-3">
                                <div className="glass-card p-4 text-center border border-glass-border rounded-2xl">
                                    <div className={`text-3xl font-black ${analytics.overallAdherence >= 80 ? 'text-green-400' : analytics.overallAdherence >= 50 ? 'text-yellow-400' : 'text-red-400'}`}>
                                        {analytics.overallAdherence}%
                                    </div>
                                    <div className="text-[10px] uppercase text-foreground-muted font-bold tracking-widest mt-1">Adherence</div>
                                </div>
                                <div className="glass-card p-4 text-center border border-glass-border rounded-2xl">
                                    <div className="text-3xl font-black text-foreground">{analytics.avgDailyDoses}</div>
                                    <div className="text-[10px] uppercase text-foreground-muted font-bold tracking-widest mt-1">Avg/Day</div>
                                </div>
                                <div className="glass-card p-4 text-center border border-glass-border rounded-2xl">
                                    <div className="text-3xl font-black text-blue-400">{analytics.totalSupplements}</div>
                                    <div className="text-[10px] uppercase text-foreground-muted font-bold tracking-widest mt-1">Active</div>
                                </div>
                            </div>

                            {/* Daily Chart */}
                            <div className="glass-card p-4 border border-glass-border rounded-2xl">
                                <h3 className="text-foreground font-semibold mb-4 flex items-center gap-2 text-sm">
                                    <TrendingUp className="w-4 h-4 text-green-500" />
                                    Daily Supplement Intake
                                </h3>
                                <div className="h-48">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={chartData}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                                            <XAxis dataKey="date" stroke="#666" fontSize={10} tickLine={false} />
                                            <YAxis stroke="#666" fontSize={10} tickLine={false} />
                                            <Tooltip
                                                contentStyle={{ backgroundColor: 'rgba(0,0,0,0.85)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }}
                                                labelStyle={{ color: '#fff' }}
                                                formatter={(value: number | string, name: string) => {
                                                    if (name === 'Taken') return [value, '✅ Taken'];
                                                    if (name === 'Missed') return [value, '❌ Missed'];
                                                    return [value, name];
                                                }}
                                            />
                                            <Bar dataKey="taken" stackId="stack" fill="#22c55e" name="Taken" radius={[0, 0, 0, 0]} />
                                            <Bar dataKey="missed" stackId="stack" fill="#ef4444" name="Missed" radius={[2, 2, 0, 0]} />
                                            <ReferenceLine y={analytics.totalSupplements} stroke="rgba(255,255,255,0.2)" strokeDasharray="3 3" />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>

                            {/* Time of Day Breakdown */}
                            <div className="glass-card p-4 border border-glass-border rounded-2xl">
                                <h3 className="text-foreground font-semibold mb-4 flex items-center gap-2 text-sm">
                                    <Sun className="w-4 h-4 text-amber-400" />
                                    Time of Day
                                </h3>
                                <div className="space-y-3">
                                    {analytics.timeOfDayBreakdown?.map((t: { time: string; adherence: number }) => {
                                        const Icon = TIME_ICONS[t.time] || Sun;
                                        const color = TIME_COLORS[t.time] || '#888';
                                        return (
                                            <div key={t.time} className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${color}20` }}>
                                                    <Icon className="w-4 h-4" style={{ color }} />
                                                </div>
                                                <div className="flex-1">
                                                    <div className="flex justify-between text-xs mb-1">
                                                        <span className="text-foreground-muted capitalize">{t.time.toLowerCase()}</span>
                                                        <span className="text-foreground font-bold">{t.adherence}%</span>
                                                    </div>
                                                    <div className="h-2 bg-foreground/10 rounded-full overflow-hidden">
                                                        <div
                                                            className="h-full rounded-full transition-all"
                                                            style={{ width: `${t.adherence}%`, backgroundColor: color }}
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Most Missed */}
                            {analytics.mostMissed?.length > 0 && (
                                <div className="glass-card p-4 border border-glass-border rounded-2xl">
                                    <h3 className="text-foreground font-semibold mb-4 flex items-center gap-2 text-sm">
                                        <AlertTriangle className="w-4 h-4 text-red-400" />
                                        Most Missed
                                    </h3>
                                    <div className="space-y-2">
                                        {analytics.mostMissed.map((s: { id: string; name: string; amount: string; unit: string; stackName?: string; missed: number; adherence: number }) => (
                                            <div key={s.id} className="flex items-center justify-between p-2.5 rounded-lg bg-foreground/5">
                                                <div>
                                                    <span className="text-sm text-foreground font-medium">{s.name}</span>
                                                    <span className="text-xs text-foreground-muted ml-2">{s.amount}{s.unit}</span>
                                                    {s.stackName && <span className="text-xs text-blue-400/60 ml-2">({s.stackName})</span>}
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-xs text-foreground-muted">{s.missed} missed</span>
                                                    <span className={`text-sm font-bold ${s.adherence >= 80 ? 'text-green-400' : s.adherence >= 50 ? 'text-yellow-400' : 'text-red-400'}`}>
                                                        {s.adherence}%
                                                    </span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </>
                    ) : null}
                </div>
            )}

            {tab === 'calendar' && (
                <div className="p-4 max-w-2xl mx-auto space-y-4">
                    {/* Month Navigation */}
                    <div className="flex items-center justify-between">
                        <button onClick={prevMonth} className="p-2 rounded-lg hover:bg-foreground/10 transition-colors">
                            <ChevronLeft className="w-5 h-5 text-foreground" />
                        </button>
                        <span className="text-foreground font-bold">{monthName}</span>
                        <button onClick={nextMonth} className="p-2 rounded-lg hover:bg-foreground/10 transition-colors">
                            <ChevronRight className="w-5 h-5 text-foreground" />
                        </button>
                    </div>

                    {isCalLoading ? (
                        <div className="flex items-center justify-center h-[30vh]">
                            <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
                        </div>
                    ) : (
                        <>
                            {/* Calendar Grid */}
                            <div className="glass-card border border-glass-border rounded-2xl p-3">
                                <div className="grid grid-cols-7 gap-1 mb-2">
                                    {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
                                        <div key={i} className="text-center text-[10px] font-bold text-foreground-muted uppercase py-1">{d}</div>
                                    ))}
                                </div>
                                <div className="grid grid-cols-7 gap-1">
                                    {calendarGrid.map((day, i) => {
                                        if (!day) return <div key={`empty-${i}`} />;
                                        const dayNum = new Date(day.date + 'T00:00:00Z').getUTCDate();
                                        const isToday = day.date === format(new Date(), 'yyyy-MM-dd');
                                        const isSelected = day.date === selectedDay;
                                        const isFuture = new Date(day.date) > new Date();
                                        const pct = day.scheduled > 0 ? day.taken / day.scheduled : 0;

                                        let bgColor = 'bg-foreground/5';
                                        if (!isFuture && day.scheduled > 0) {
                                            if (pct >= 1) bgColor = 'bg-green-500/20 border-green-500/30';
                                            else if (pct >= 0.5) bgColor = 'bg-yellow-500/20 border-yellow-500/30';
                                            else if (pct > 0) bgColor = 'bg-orange-500/20 border-orange-500/30';
                                            else bgColor = 'bg-red-500/10 border-red-500/20';
                                        }

                                        return (
                                            <button
                                                key={day.date}
                                                onClick={() => setSelectedDay(day.date === selectedDay ? null : day.date)}
                                                className={`aspect-square rounded-lg flex flex-col items-center justify-center text-xs font-semibold border transition-all
                                                    ${bgColor}
                                                    ${isSelected ? 'ring-2 ring-blue-500 scale-105' : ''}
                                                    ${isToday ? 'ring-1 ring-foreground/30' : ''}
                                                    ${isFuture ? 'opacity-30' : 'hover:scale-105'}
                                                `}
                                                disabled={isFuture}
                                            >
                                                <span className={`${isToday ? 'text-blue-400' : 'text-foreground'}`}>{dayNum}</span>
                                                {!isFuture && day.scheduled > 0 && (
                                                    <span className="text-[8px] text-foreground-muted mt-0.5">{day.taken}/{day.scheduled}</span>
                                                )}
                                            </button>
                                        );
                                    })}
                                </div>
                                <div className="flex items-center gap-3 mt-3 pt-3 border-t border-foreground/5 text-[10px] text-foreground-muted justify-center">
                                    <div className="flex items-center gap-1"><div className="w-2.5 h-2.5 rounded bg-green-500/40" /> All taken</div>
                                    <div className="flex items-center gap-1"><div className="w-2.5 h-2.5 rounded bg-yellow-500/40" /> Partial</div>
                                    <div className="flex items-center gap-1"><div className="w-2.5 h-2.5 rounded bg-red-500/20" /> Missed</div>
                                </div>
                            </div>

                            {/* Day Detail Panel */}
                            {selectedDay && (
                                <div className="glass-card border border-glass-border rounded-2xl p-4 animate-in slide-in-from-bottom-4 fade-in">
                                    <h3 className="text-foreground font-semibold mb-3 text-sm">
                                        {format(new Date(selectedDay + 'T12:00:00'), 'EEEE, MMMM d, yyyy')}
                                    </h3>
                                    {selectedDaySupps.length === 0 ? (
                                        <p className="text-sm text-foreground-muted">No supplements scheduled for this day.</p>
                                    ) : (
                                        <div className="space-y-2">
                                            {selectedDaySupps.map((supp: { id: string; name: string; amount: string | number; unit: string; timeOfDay: string; stackName?: string; taken: boolean }) => {
                                                const Icon = TIME_ICONS[supp.timeOfDay] || Sun;
                                                const color = TIME_COLORS[supp.timeOfDay] || '#888';
                                                const isPending = toggleMutation.isPending 
                                                    && toggleMutation.variables?.supplementId === supp.id 
                                                    && toggleMutation.variables?.date === selectedDay;

                                                return (
                                                    <div key={supp.id} className="flex items-center justify-between p-3 rounded-xl bg-foreground/5 border border-foreground/5">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-7 h-7 rounded-md flex items-center justify-center" style={{ backgroundColor: `${color}15` }}>
                                                                <Icon className="w-3.5 h-3.5" style={{ color }} />
                                                            </div>
                                                            <div>
                                                                <span className="text-sm text-foreground font-medium">{supp.name}</span>
                                                                <span className="text-xs text-foreground-muted ml-1.5">{supp.amount}{supp.unit}</span>
                                                                {supp.stackName && (
                                                                    <span className="text-xs text-blue-400/50 block">{supp.stackName}</span>
                                                                )}
                                                            </div>
                                                        </div>
                                                        <button
                                                            onClick={() => toggleMutation.mutate({
                                                                supplementId: supp.id,
                                                                date: selectedDay,
                                                                taken: !supp.taken
                                                            })}
                                                            disabled={isPending}
                                                            className={`w-9 h-9 rounded-full flex items-center justify-center transition-all border ${
                                                                supp.taken
                                                                    ? 'bg-green-500/20 border-green-500/30 text-green-400 hover:bg-red-500/20 hover:border-red-500/30 hover:text-red-400'
                                                                    : 'bg-foreground/5 border-foreground/10 text-foreground-muted hover:bg-green-500/20 hover:border-green-500/30 hover:text-green-400'
                                                            } ${isPending ? 'opacity-50 animate-pulse' : ''}`}
                                                        >
                                                            {supp.taken ? <Check className="w-4 h-4" /> : <XIcon className="w-4 h-4" />}
                                                        </button>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            )}
                        </>
                    )}
                </div>
            )}
        </div>
    );
}
