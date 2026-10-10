'use client';

import { useQuery } from '@tanstack/react-query';
import { useState, useMemo } from 'react';
import {
  ArrowLeft,
  TrendingUp,
  Target,
  AlertTriangle,
  Calendar,
  PieChart as PieChartIcon,
  Utensils,
  Zap
} from 'lucide-react';
import { format, subDays } from 'date-fns';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ReferenceLine,
  CartesianGrid
} from 'recharts';
import { NutritionGoalsModal } from './NutritionGoalsModal';
import { WeeklyInsightsCard } from './WeeklyInsightsCard';

interface NutritionAnalyticsViewProps {
  onClose: () => void;
  onOpenGoals?: () => void;
}

interface AnalyticsData {
  target: {
    dailyCalories: number;
    proteinPercent: number;
    carbsPercent: number;
    fatsPercent: number;
    targetProtein: number;
    targetCarbs: number;
    targetFats: number;
    isDefault?: boolean;
  };
  today: {
    date: string;
    calories: number;
    protein: number;
    carbs: number;
    fats: number;
    fiber: number;
    sugar: number;
    saturatedFat: number;
    sodium: number;
    potassium: number;
    cholesterol: number;
    calcium: number;
    iron: number;
  };
  dailyData: Array<{
    date: string;
    calories: number;
    protein: number;
    carbs: number;
    fats: number;
    fiber: number;
    sugar: number;
    sodium: number;
  }>;
  avgDaily: {
    calories: number;
    protein: number;
    carbs: number;
    fats: number;
    fiber: number;
    sugar: number;
    saturatedFat: number;
    sodium: number;
    potassium: number;
    cholesterol: number;
    calcium: number;
    iron: number;
  } | null;
  adherenceScore: number;
  topContributors: {
    sodium: Array<{ foodItemId: string; foodName: string; amount: number }>;
    sugar: Array<{ foodItemId: string; foodName: string; amount: number }>;
    calories: Array<{ foodItemId: string; foodName: string; amount: number }>;
  };
  daysWithLogs: number;
  exerciseCalories: number;
  exerciseBudget: number;
}

type DateRangePreset = '7days' | '30days' | '90days';

// Chart colors - semantic tokens (work in light and dark mode)
const COLORS = {
  protein: 'var(--accent-pink)',
  carbs: 'var(--accent-blue)',
  fats: 'var(--workout-tempo)',
  calories: 'var(--accent-orange)',
  fiber: 'var(--accent-cyan)',
  warning: 'var(--negative)',
  success: 'var(--positive)',
};

const MICRO_LIMITS = {
  sodium: 2300,  // mg per day recommended limit
  sugar: 50,     // g per day recommended limit
  fiber: 30,     // g per day recommended minimum
};

export default function NutritionAnalyticsView({ onClose, onOpenGoals }: NutritionAnalyticsViewProps) {
  const [dateRange, setDateRange] = useState<DateRangePreset>('7days');
  const [isGoalsOpen, setIsGoalsOpen] = useState(false);

  const handleOpenGoals = () => {
    if (onOpenGoals) onOpenGoals();
    else setIsGoalsOpen(true);
  };

  const { data: analytics, isLoading, error } = useQuery<AnalyticsData>({
    queryKey: ['nutrition-analytics', dateRange],
    queryFn: async () => {
      const endDate = format(new Date(), 'yyyy-MM-dd');
      const startDate = format(subDays(new Date(), dateRange === '7days' ? 7 : dateRange === '30days' ? 30 : 90), 'yyyy-MM-dd');

      const res = await fetch(`/api/health/nutrition/analytics?startDate=${startDate}&endDate=${endDate}`);
      if (!res.ok) throw new Error('Failed to fetch analytics');
      return res.json();
    },
    refetchOnWindowFocus: false,
  });

  // Prepare chart data
  const chartData = useMemo(() => {
    if (!analytics?.dailyData) return [];
    return analytics.dailyData.map(day => ({
      // Append time portion to ensure consistent date parsing locally
      date: format(new Date(day.date + 'T12:00:00'), 'MMM dd'),
      calories: Math.round(day.calories),
      protein: Math.round(day.protein) * 4,
      proteinGrams: Math.round(day.protein),
      carbs: Math.round(day.carbs) * 4,
      carbsGrams: Math.round(day.carbs),
      fats: Math.round(day.fats) * 9,
      fatsGrams: Math.round(day.fats),
    }));
  }, [analytics]);

  // Calculate remaining calories for today (including exercise budget)
  const remainingCalories = useMemo(() => {
    if (!analytics) return 0;
    const effectiveTarget = analytics.target.dailyCalories + (analytics.exerciseBudget || 0);
    return Math.max(0, effectiveTarget - analytics.today.calories);
  }, [analytics]);

  const effectiveTarget = analytics ? analytics.target.dailyCalories + (analytics.exerciseBudget || 0) : 0;

  // Render content conditionally
  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="flex items-center justify-center h-[60vh]">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-accent-pink border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-foreground-muted">Loading analytics...</p>
          </div>
        </div>
      );
    }

    if (error || !analytics) {
      return (
        <div className="flex items-center justify-center h-[60vh] px-4">
          <div className="text-center">
            <AlertTriangle className="w-12 h-12 text-negative mx-auto mb-4" />
            <p className="text-foreground font-semibold mb-2">Failed to load analytics</p>
            <p className="text-foreground-muted text-sm">Please try again later</p>
          </div>
        </div>
      );
    }

    if (analytics.daysWithLogs === 0 && analytics.target.isDefault) {
      return (
        <div className="p-4">
          <div className="glass-card border-accent-pink/20 p-4 flex items-start gap-3 mb-6">
            <Target className="w-5 h-5 text-accent-pink shrink-0 mt-0.5" />
            <div className="flex-1">
              <h4 className="text-sm font-semibold text-accent-pink mb-1">Set Up Your Goals</h4>
              <p className="text-xs text-foreground-muted mb-3">Set your calorie and macro targets for personalized adherence scoring.</p>
              <button
                onClick={handleOpenGoals}
                className="bg-accent-pink/10 text-accent-pink px-4 py-2 rounded-md text-xs font-semibold border border-accent-pink/20 hover:bg-accent-pink/20 transition-colors"
              >
                Set Nutrition Goals
              </button>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="p-4 space-y-4 max-w-2xl mx-auto">
        {/* Date Range Selector */}
        <div className="flex gap-2 overflow-x-auto pb-2">
          {[
            { key: '7days' as DateRangePreset, label: 'Last 7 Days' },
            { key: '30days' as DateRangePreset, label: 'Last 30 Days' },
            { key: '90days' as DateRangePreset, label: 'Last 90 Days' },
          ].map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setDateRange(key)}
              className={`px-4 py-2 rounded-md text-sm font-medium whitespace-nowrap transition-colors ${dateRange === key
                ? 'bg-accent-pink/10 text-accent-pink border border-accent-pink/30'
                : 'bg-background-tertiary text-foreground-muted border border-line'
                }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Daily Goal Ring */}
        <div className="glass-card p-4">
          <h3 className="text-foreground font-semibold mb-4 flex items-center gap-2">
            <Target className="w-4 h-4 text-accent-pink" />
            Today&apos;s Progress
          </h3>
          <div className="flex items-center gap-6">
            {/* Calorie Ring */}
            <div className="relative w-32 h-32 shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={[
                      /* Goal limit styling adjustments */
                      { name: 'Consumed', value: analytics.today.calories },
                      { name: 'Remaining', value: remainingCalories },
                    ]}
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={60}
                    startAngle={90}
                    endAngle={-270}
                    dataKey="value"
                  >
                    <Cell fill={COLORS.calories} />
                    <Cell fill="var(--line)" />
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-xl font-semibold font-mono tabular-nums text-foreground">
                  {Math.round(analytics.today.calories)}
                </span>
                <span className="text-xs text-foreground-muted font-mono tabular-nums">/ {effectiveTarget}</span>
              {analytics.exerciseBudget > 0 && (
                <span className="text-[10px] text-positive font-mono tabular-nums block">+{analytics.exerciseBudget} active</span>
              )}
              </div>
            </div>

            {/* Macro Breakdown */}
            <div className="flex-1 space-y-3">
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-foreground-muted">Protein</span>
                  <span className="text-foreground font-mono tabular-nums">
                    {Math.round(analytics.today.protein)}g / {analytics.target.targetProtein}g
                  </span>
                </div>
                <div className="h-2 bg-background-tertiary rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${Math.min(100, (analytics.today.protein / analytics.target.targetProtein) * 100)}%`,
                      backgroundColor: COLORS.protein,
                    }}
                  />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-foreground-muted">Carbs</span>
                  <span className="text-foreground font-mono tabular-nums">
                    {Math.round(analytics.today.carbs)}g / {analytics.target.targetCarbs}g
                  </span>
                </div>
                <div className="h-2 bg-background-tertiary rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${Math.min(100, (analytics.today.carbs / analytics.target.targetCarbs) * 100)}%`,
                      backgroundColor: COLORS.carbs,
                    }}
                  />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-foreground-muted">Fats</span>
                  <span className="text-foreground font-mono tabular-nums">
                    {Math.round(analytics.today.fats)}g / {analytics.target.targetFats}g
                  </span>
                </div>
                <div className="h-2 bg-background-tertiary rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${Math.min(100, (analytics.today.fats / analytics.target.targetFats) * 100)}%`,
                      backgroundColor: COLORS.fats,
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Adherence Score */}
        <div className="glass-card p-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-foreground font-semibold flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-positive" />
                Macro Adherence
              </h3>
              <p className="text-xs text-foreground-muted mt-1">
                How closely you hit your targets over this period
              </p>
            </div>
            <div className="text-right">
              <div className={`text-3xl font-semibold font-mono tabular-nums ${analytics.adherenceScore >= 80 ? 'text-positive' :
                analytics.adherenceScore >= 60 ? 'text-workout-tempo' :
                  'text-negative'
                }`}>
                {analytics.adherenceScore}%
              </div>
            </div>
          </div>
        </div>

        {/* Historical Trend Chart */}
        <div className="glass-card p-4">
          <h3 className="text-foreground font-semibold mb-4 flex items-center gap-2">
            <Calendar className="w-4 h-4 text-accent-blue" />
            Calorie Trend
          </h3>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" />
                <XAxis
                  dataKey="date"
                  stroke="var(--foreground-muted)"
                  fontSize={10}
                  tickLine={false}
                />
                <YAxis
                  stroke="var(--foreground-muted)"
                  fontSize={10}
                  tickLine={false}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'var(--panel-bg)',
                    border: '1px solid var(--line)',
                    borderRadius: '6px',
                  }}
                  labelStyle={{ color: 'var(--foreground)' }}
                  formatter={(value: any, name: string, props: any) => {
                    const payload = props.payload;
                    if (name.includes('Protein')) return [`${value} kcal (${payload.proteinGrams}g)`, 'Protein'];
                    if (name.includes('Carbs')) return [`${value} kcal (${payload.carbsGrams}g)`, 'Carbs'];
                    if (name.includes('Fats')) return [`${value} kcal (${payload.fatsGrams}g)`, 'Fats'];
                    return [value, name];
                  }}
                />
                <Legend
                  wrapperStyle={{ fontSize: '10px' }}
                />
                <ReferenceLine
                  y={analytics.target.dailyCalories}
                  stroke="var(--line-strong)"
                  strokeDasharray="3 3"
                  label={{ value: 'Goal', fill: 'var(--foreground-muted)', fontSize: 10 }}
                />
                <Bar dataKey="protein" stackId="macros" fill={COLORS.protein} name="Protein (kcal)" />
                <Bar dataKey="carbs" stackId="macros" fill={COLORS.carbs} name="Carbs (kcal)" />
                <Bar dataKey="fats" stackId="macros" fill={COLORS.fats} name="Fats (kcal)" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <WeeklyInsightsCard />

        {/* Micronutrient Details */}
        <div className="glass-card p-4">
          <h3 className="text-foreground font-semibold mb-4 flex items-center gap-2">
            <Zap className="w-4 h-4 text-accent-cyan" />
            Average Daily Micronutrients
          </h3>
          <div className="grid grid-cols-2 gap-3">
            {analytics.avgDaily && (
              <>
                {/* Fiber */}
                <div className={`p-3 rounded-md border ${analytics.avgDaily.fiber >= 25
                  ? 'bg-positive/10 border-positive/20'
                  : 'bg-background-tertiary border-line'
                  }`}>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-foreground-muted">Fiber</span>
                    {analytics.avgDaily.fiber < 25 && (
                      <AlertTriangle className="w-3 h-3 text-workout-tempo" />
                    )}
                  </div>
                  <div className="text-lg font-semibold font-mono tabular-nums text-foreground mt-1">
                    {analytics.avgDaily.fiber.toFixed(1)}g
                  </div>
                  <div className="text-xs text-foreground-muted">Goal: 30g+</div>
                </div>

                {/* Sugar */}
                <div className={`p-3 rounded-md border ${analytics.avgDaily.sugar <= MICRO_LIMITS.sugar
                  ? 'bg-positive/10 border-positive/20'
                  : 'bg-negative/10 border-negative/20'
                  }`}>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-foreground-muted">Sugar</span>
                    {analytics.avgDaily.sugar > MICRO_LIMITS.sugar && (
                      <AlertTriangle className="w-3 h-3 text-negative" />
                    )}
                  </div>
                  <div className={`text-lg font-semibold font-mono tabular-nums mt-1 ${analytics.avgDaily.sugar > MICRO_LIMITS.sugar ? 'text-negative' : 'text-foreground'
                    }`}>
                    {analytics.avgDaily.sugar.toFixed(1)}g
                  </div>
                  <div className="text-xs text-foreground-muted">Limit: {MICRO_LIMITS.sugar}g</div>
                </div>

                {/* Sodium */}
                <div className={`p-3 rounded-md border ${analytics.avgDaily.sodium <= MICRO_LIMITS.sodium
                  ? 'bg-positive/10 border-positive/20'
                  : 'bg-negative/10 border-negative/20'
                  }`}>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-foreground-muted">Sodium</span>
                    {analytics.avgDaily.sodium > MICRO_LIMITS.sodium && (
                      <AlertTriangle className="w-3 h-3 text-negative" />
                    )}
                  </div>
                  <div className={`text-lg font-semibold font-mono tabular-nums mt-1 ${analytics.avgDaily.sodium > MICRO_LIMITS.sodium ? 'text-negative' : 'text-foreground'
                    }`}>
                    {analytics.avgDaily.sodium.toFixed(0)}mg
                  </div>
                  <div className="text-xs text-foreground-muted">Limit: {MICRO_LIMITS.sodium}mg</div>
                </div>

                {/* Potassium */}
                <div className="p-3 rounded-md bg-background-tertiary border border-line">
                  <span className="text-xs text-foreground-muted">Potassium</span>
                  <div className="text-lg font-semibold font-mono tabular-nums text-foreground mt-1">
                    {analytics.avgDaily.potassium.toFixed(0)}mg
                  </div>
                  <div className="text-xs text-foreground-muted">Goal: 3500mg+</div>
                </div>

                {/* Saturated Fat */}
                <div className="p-3 rounded-md bg-background-tertiary border border-line">
                  <span className="text-xs text-foreground-muted">Sat. Fat</span>
                  <div className="text-lg font-semibold font-mono tabular-nums text-foreground mt-1">
                    {analytics.avgDaily.saturatedFat.toFixed(1)}g
                  </div>
                  <div className="text-xs text-foreground-muted">Limit: 20g</div>
                </div>

                {/* Iron */}
                <div className="p-3 rounded-md bg-background-tertiary border border-line">
                  <span className="text-xs text-foreground-muted">Iron</span>
                  <div className="text-lg font-semibold font-mono tabular-nums text-foreground mt-1">
                    {analytics.avgDaily.iron.toFixed(1)}mg
                  </div>
                  <div className="text-xs text-foreground-muted">Goal: 8-18mg</div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Top Contributors */}
        <div className="glass-card p-4">
          <h3 className="text-foreground font-semibold mb-4 flex items-center gap-2">
            <PieChartIcon className="w-4 h-4 text-accent-orange" />
            Top Contributors
          </h3>
          <div className="space-y-4">
            {/* Sodium */}
            {analytics.topContributors.sodium.length > 0 && (
              <div>
                <h4 className="text-xs font-semibold text-foreground-muted mb-2">
                  Highest sodium
                </h4>
                <div className="space-y-2">
                  {analytics.topContributors.sodium.map((food, idx) => (
                    <div
                      key={`${food.foodItemId}-sodium`}
                      className="flex items-center justify-between p-2 rounded-md bg-background-tertiary"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono text-foreground-muted">#{idx + 1}</span>
                        <span className="text-sm text-foreground">{food.foodName}</span>
                      </div>
                      <span className="text-sm font-medium font-mono tabular-nums text-workout-tempo">
                        {food.amount}mg
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Sugar */}
            {analytics.topContributors.sugar.length > 0 && (
              <div>
                <h4 className="text-xs font-semibold text-foreground-muted mb-2">
                  Highest sugar
                </h4>
                <div className="space-y-2">
                  {analytics.topContributors.sugar.map((food, idx) => (
                    <div
                      key={`${food.foodItemId}-sugar`}
                      className="flex items-center justify-between p-2 rounded-md bg-background-tertiary"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono text-foreground-muted">#{idx + 1}</span>
                        <span className="text-sm text-foreground">{food.foodName}</span>
                      </div>
                      <span className="text-sm font-medium font-mono tabular-nums text-accent-pink">
                        {food.amount}g
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Calories */}
            {analytics.topContributors.calories.length > 0 && (
              <div>
                <h4 className="text-xs font-semibold text-foreground-muted mb-2">
                  Most calories
                </h4>
                <div className="space-y-2">
                  {analytics.topContributors.calories.map((food, idx) => (
                    <div
                      key={`${food.foodItemId}-calories`}
                      className="flex items-center justify-between p-2 rounded-md bg-background-tertiary"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono text-foreground-muted">#{idx + 1}</span>
                        <span className="text-sm text-foreground">{food.foodName}</span>
                      </div>
                      <span className="text-sm font-medium font-mono tabular-nums text-accent-orange">
                        {food.amount}kcal
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-full bg-background pb-20">
      <header className="border-b border-line bg-background sticky top-0 z-50">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center">
            <button onClick={onClose} className="mr-3">
              <ArrowLeft className="w-5 h-5 text-foreground" />
            </button>
            <span className="text-lg font-semibold text-foreground flex items-center gap-2">
              <Utensils className="w-5 h-5 text-accent-pink" /> Nutrition Analytics
            </span>
          </div>
          <button
            onClick={handleOpenGoals}
            className="bg-accent-pink/10 text-accent-pink px-3 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1 border border-accent-pink/20"
          >
            <Target className="w-3.5 h-3.5" /> Goals
          </button>
        </div>
      </header>

      {renderContent()}

      {!onOpenGoals && (
        <NutritionGoalsModal
          isOpen={isGoalsOpen}
          onClose={() => setIsGoalsOpen(false)}
        />
      )}
    </div>
  );
}
