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
}

type DateRangePreset = '7days' | '30days' | '90days';

// Chart colors - matching app theme
const COLORS = {
  protein: '#f72585',  // Pink
  carbs: '#4361ee',    // Blue
  fats: '#fca311',     // Yellow/Orange
  calories: '#7209b7', // Purple
  fiber: '#4cc9f0',    // Cyan
  warning: '#ef4444',  // Red
  success: '#22c55e',  // Green
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
      date: format(new Date(day.date), 'MMM dd'),
      calories: Math.round(day.calories),
      protein: Math.round(day.protein),
      carbs: Math.round(day.carbs),
      fats: Math.round(day.fats),
    }));
  }, [analytics]);

  // Calculate remaining calories for today
  const remainingCalories = useMemo(() => {
    if (!analytics) return 0;
    return Math.max(0, analytics.target.dailyCalories - analytics.today.calories);
  }, [analytics]);

  // Render content conditionally
  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="flex items-center justify-center h-[60vh]">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-pink-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-400">Loading analytics...</p>
          </div>
        </div>
      );
    }

    if (error || !analytics) {
      return (
        <div className="flex items-center justify-center h-[60vh] px-4">
          <div className="text-center">
            <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <p className="text-white font-semibold mb-2">Failed to load analytics</p>
            <p className="text-gray-400 text-sm">Please try again later</p>
          </div>
        </div>
      );
    }

    if (analytics.daysWithLogs === 0) {
      const isGoalsSet = !analytics.target.isDefault;
      return (
        <div className="flex items-center justify-center h-[60vh] px-4">
          <div className="text-center max-w-sm">
            <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-4">
              <Utensils className="w-8 h-8 text-gray-400" />
            </div>
            <p className="text-white font-semibold mb-2">No nutrition data yet</p>
            <p className="text-gray-400 text-sm mb-6">
              {isGoalsSet ? "You've set your targets! Start logging your meals to see detailed analytics and insights." : "Start logging your meals to see detailed analytics and insights."}
            </p>
            <button
              onClick={handleOpenGoals}
              className="bg-pink-500/20 text-pink-400 px-6 py-3 rounded-xl text-sm font-semibold mb-3 w-full"
            >
              {isGoalsSet ? "Adjust Nutrition Goals" : "Set Nutrition Goals First"}
            </button>
            <button
              onClick={onClose}
              className="bg-white/5 text-gray-300 px-6 py-3 rounded-xl text-sm font-semibold w-full"
            >
              Go to Health Dashboard
            </button>
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
              className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${dateRange === key
                ? 'bg-pink-500/20 text-pink-400 border border-pink-500/30'
                : 'bg-white/5 text-gray-400 border border-white/10'
                }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Daily Goal Ring */}
        <div className="glass-card p-4">
          <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
            <Target className="w-4 h-4 text-pink-500" />
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
                    <Cell fill="rgba(255,255,255,0.1)" />
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-xl font-bold text-white">
                  {Math.round(analytics.today.calories)}
                </span>
                <span className="text-xs text-gray-400">/ {analytics.target.dailyCalories}</span>
              </div>
            </div>

            {/* Macro Breakdown */}
            <div className="flex-1 space-y-3">
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-gray-400">Protein</span>
                  <span className="text-white">
                    {Math.round(analytics.today.protein)}g / {analytics.target.targetProtein}g
                  </span>
                </div>
                <div className="h-2 bg-white/10 rounded-full overflow-hidden">
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
                  <span className="text-gray-400">Carbs</span>
                  <span className="text-white">
                    {Math.round(analytics.today.carbs)}g / {analytics.target.targetCarbs}g
                  </span>
                </div>
                <div className="h-2 bg-white/10 rounded-full overflow-hidden">
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
                  <span className="text-gray-400">Fats</span>
                  <span className="text-white">
                    {Math.round(analytics.today.fats)}g / {analytics.target.targetFats}g
                  </span>
                </div>
                <div className="h-2 bg-white/10 rounded-full overflow-hidden">
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
              <h3 className="text-white font-semibold flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-green-500" />
                Macro Adherence
              </h3>
              <p className="text-xs text-gray-400 mt-1">
                How closely you hit your targets over this period
              </p>
            </div>
            <div className="text-right">
              <div className={`text-3xl font-bold ${analytics.adherenceScore >= 80 ? 'text-green-400' :
                analytics.adherenceScore >= 60 ? 'text-yellow-400' :
                  'text-red-400'
                }`}>
                {analytics.adherenceScore}%
              </div>
            </div>
          </div>
        </div>

        {/* Historical Trend Chart */}
        <div className="glass-card p-4">
          <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
            <Calendar className="w-4 h-4 text-blue-500" />
            Calorie Trend
          </h3>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                <XAxis
                  dataKey="date"
                  stroke="#888"
                  fontSize={10}
                  tickLine={false}
                />
                <YAxis
                  stroke="#888"
                  fontSize={10}
                  tickLine={false}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'rgba(0,0,0,0.8)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '8px',
                  }}
                  labelStyle={{ color: '#fff' }}
                />
                <Legend
                  wrapperStyle={{ fontSize: '10px' }}
                />
                <ReferenceLine
                  y={analytics.target.dailyCalories}
                  stroke="rgba(255,255,255,0.3)"
                  strokeDasharray="3 3"
                  label={{ value: 'Goal', fill: 'rgba(255,255,255,0.5)', fontSize: 10 }}
                />
                <Bar dataKey="protein" stackId="macros" fill={COLORS.protein} name="Protein (cal)" />
                <Bar dataKey="carbs" stackId="macros" fill={COLORS.carbs} name="Carbs (cal)" />
                <Bar dataKey="fats" stackId="macros" fill={COLORS.fats} name="Fats (cal)" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Micronutrient Details */}
        <div className="glass-card p-4">
          <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
            <Zap className="w-4 h-4 text-cyan-500" />
            Average Daily Micronutrients
          </h3>
          <div className="grid grid-cols-2 gap-3">
            {analytics.avgDaily && (
              <>
                {/* Fiber */}
                <div className={`p-3 rounded-lg border ${analytics.avgDaily.fiber >= 25
                  ? 'bg-green-500/10 border-green-500/20'
                  : 'bg-white/5 border-white/10'
                  }`}>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-400">Fiber</span>
                    {analytics.avgDaily.fiber < 25 && (
                      <AlertTriangle className="w-3 h-3 text-yellow-500" />
                    )}
                  </div>
                  <div className="text-lg font-bold text-white mt-1">
                    {analytics.avgDaily.fiber.toFixed(1)}g
                  </div>
                  <div className="text-xs text-gray-500">Goal: 30g+</div>
                </div>

                {/* Sugar */}
                <div className={`p-3 rounded-lg border ${analytics.avgDaily.sugar <= MICRO_LIMITS.sugar
                  ? 'bg-green-500/10 border-green-500/20'
                  : 'bg-red-500/10 border-red-500/20'
                  }`}>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-400">Sugar</span>
                    {analytics.avgDaily.sugar > MICRO_LIMITS.sugar && (
                      <AlertTriangle className="w-3 h-3 text-red-500" />
                    )}
                  </div>
                  <div className={`text-lg font-bold mt-1 ${analytics.avgDaily.sugar > MICRO_LIMITS.sugar ? 'text-red-400' : 'text-white'
                    }`}>
                    {analytics.avgDaily.sugar.toFixed(1)}g
                  </div>
                  <div className="text-xs text-gray-500">Limit: {MICRO_LIMITS.sugar}g</div>
                </div>

                {/* Sodium */}
                <div className={`p-3 rounded-lg border ${analytics.avgDaily.sodium <= MICRO_LIMITS.sodium
                  ? 'bg-green-500/10 border-green-500/20'
                  : 'bg-red-500/10 border-red-500/20'
                  }`}>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-400">Sodium</span>
                    {analytics.avgDaily.sodium > MICRO_LIMITS.sodium && (
                      <AlertTriangle className="w-3 h-3 text-red-500" />
                    )}
                  </div>
                  <div className={`text-lg font-bold mt-1 ${analytics.avgDaily.sodium > MICRO_LIMITS.sodium ? 'text-red-400' : 'text-white'
                    }`}>
                    {analytics.avgDaily.sodium.toFixed(0)}mg
                  </div>
                  <div className="text-xs text-gray-500">Limit: {MICRO_LIMITS.sodium}mg</div>
                </div>

                {/* Potassium */}
                <div className="p-3 rounded-lg bg-white/5 border border-white/10">
                  <span className="text-xs text-gray-400">Potassium</span>
                  <div className="text-lg font-bold text-white mt-1">
                    {analytics.avgDaily.potassium.toFixed(0)}mg
                  </div>
                  <div className="text-xs text-gray-500">Goal: 3500mg+</div>
                </div>

                {/* Saturated Fat */}
                <div className="p-3 rounded-lg bg-white/5 border border-white/10">
                  <span className="text-xs text-gray-400">Sat. Fat</span>
                  <div className="text-lg font-bold text-white mt-1">
                    {analytics.avgDaily.saturatedFat.toFixed(1)}g
                  </div>
                  <div className="text-xs text-gray-500">Limit: 20g</div>
                </div>

                {/* Iron */}
                <div className="p-3 rounded-lg bg-white/5 border border-white/10">
                  <span className="text-xs text-gray-400">Iron</span>
                  <div className="text-lg font-bold text-white mt-1">
                    {analytics.avgDaily.iron.toFixed(1)}mg
                  </div>
                  <div className="text-xs text-gray-500">Goal: 8-18mg</div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Top Contributors */}
        <div className="glass-card p-4">
          <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
            <PieChartIcon className="w-4 h-4 text-orange-500" />
            Top Contributors
          </h3>
          <div className="space-y-4">
            {/* Sodium */}
            {analytics.topContributors.sodium.length > 0 && (
              <div>
                <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-2">
                  Highest Sodium
                </h4>
                <div className="space-y-2">
                  {analytics.topContributors.sodium.map((food, idx) => (
                    <div
                      key={`${food.foodItemId}-sodium`}
                      className="flex items-center justify-between p-2 rounded-lg bg-white/5"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono text-gray-500">#{idx + 1}</span>
                        <span className="text-sm text-white">{food.foodName}</span>
                      </div>
                      <span className="text-sm font-medium text-orange-400">
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
                <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-2">
                  Highest Sugar
                </h4>
                <div className="space-y-2">
                  {analytics.topContributors.sugar.map((food, idx) => (
                    <div
                      key={`${food.foodItemId}-sugar`}
                      className="flex items-center justify-between p-2 rounded-lg bg-white/5"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono text-gray-500">#{idx + 1}</span>
                        <span className="text-sm text-white">{food.foodName}</span>
                      </div>
                      <span className="text-sm font-medium text-pink-400">
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
                <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-2">
                  Most Calories
                </h4>
                <div className="space-y-2">
                  {analytics.topContributors.calories.map((food, idx) => (
                    <div
                      key={`${food.foodItemId}-calories`}
                      className="flex items-center justify-between p-2 rounded-lg bg-white/5"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono text-gray-500">#{idx + 1}</span>
                        <span className="text-sm text-white">{food.foodName}</span>
                      </div>
                      <span className="text-sm font-medium text-purple-400">
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
      <header className="border-b border-glass-border backdrop-blur-md bg-background/80 sticky top-0 z-50">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center">
            <button onClick={onClose} className="mr-3">
              <ArrowLeft className="w-5 h-5 text-white" />
            </button>
            <span className="text-lg font-bold text-white flex items-center gap-2">
              <Utensils className="w-5 h-5 text-pink-500" /> Nutrition Analytics
            </span>
          </div>
          <button
            onClick={handleOpenGoals}
            className="bg-pink-500/20 text-pink-400 px-3 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1"
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
