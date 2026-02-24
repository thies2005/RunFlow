'use client';

import { LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface TrendChartsSectionProps {
    filteredVo2Trend: any[];
    filteredShapeTrend: any[];
    timeRange: string;
}

export default function TrendChartsSection({ filteredVo2Trend, filteredShapeTrend, timeRange }: TrendChartsSectionProps) {
    const formatXAxis = (val: string) => {
        const date = new Date(val);
        if (timeRange === '1M') {
            return date.toLocaleDateString('en-US', { day: 'numeric', month: 'short' });
        } else if (['3M', '6M'].includes(timeRange)) {
            return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        } else {
            return date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
        }
    };

    const formatTooltipLabel = (val: string) => new Date(val).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="glass-card p-6">
                <h3 className="text-lg font-semibold text-foreground mb-4">Effective VO2max Trend</h3>
                <div className="h-64 min-h-[256px] w-full relative">
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={filteredVo2Trend}>
                            <CartesianGrid strokeDasharray="3 3" stroke="var(--glass-border)" vertical={false} />
                            <XAxis
                                dataKey="date"
                                stroke="var(--foreground-muted)"
                                fontSize={11}
                                tickLine={false}
                                minTickGap={timeRange === '1M' ? 20 : 50}
                                tickFormatter={formatXAxis}
                            />
                            <YAxis stroke="#9ca3af" fontSize={11} tickLine={false} domain={['auto', 'auto']} />
                            <Tooltip
                                contentStyle={{ background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', borderRadius: '8px', backdropFilter: 'blur(12px)' }}
                                labelStyle={{ color: 'var(--foreground)' }}
                                itemStyle={{ color: 'var(--foreground)' }}
                                labelFormatter={formatTooltipLabel}
                            />
                            <Line type="monotone" dataKey="vo2" stroke="none" isAnimationActive={false} dot={{ r: 3, fill: '#f59e0b', fillOpacity: 1 }} name="VO2max (Run)" />
                            <Line type="monotone" dataKey="vo2Rolling" stroke="#f59e0b" strokeWidth={2} dot={false} isAnimationActive={false} name="VO2max (Avg)" />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            </div>

            <div className="glass-card p-6">
                <h3 className="text-lg font-semibold text-foreground mb-4">Marathon Shape Trend</h3>
                <div className="h-64 min-h-[256px] w-full relative">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={filteredShapeTrend}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#374151" vertical={false} />
                            <XAxis
                                dataKey="week"
                                stroke="#9ca3af"
                                fontSize={11}
                                tickLine={false}
                                minTickGap={timeRange === '1M' ? 20 : 50}
                                tickFormatter={formatXAxis}
                            />
                            <YAxis stroke="var(--foreground-muted)" fontSize={11} tickLine={false} domain={[0, 120]} />
                            <Tooltip
                                contentStyle={{ background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', borderRadius: '8px', backdropFilter: 'blur(12px)' }}
                                labelStyle={{ color: 'var(--foreground)' }}
                                itemStyle={{ color: 'var(--foreground)' }}
                                labelFormatter={formatTooltipLabel}
                            />
                            <Area type="monotone" dataKey="shape" stroke="#10b981" fill="#10b981" fillOpacity={0.3} isAnimationActive={false} name="Shape %" />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
    );
}
