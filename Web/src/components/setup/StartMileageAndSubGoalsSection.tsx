'use client';

import { useState } from 'react';
import { Plus, X } from 'lucide-react';
import type { SubGoalForm } from './types';

interface StartMileageAndSubGoalsSectionProps {
    mode: 'onboarding' | 'advanced' | 'modal' | 'settings';
    runsPerWeek: number;
    weeklyMileage: number;
    startWeeklyMileage: number;
    setStartWeeklyMileage: (v: number) => void;
    avgWeeklyKmLast4Weeks?: number;
    subGoals: SubGoalForm[];
    setSubGoals: (goals: SubGoalForm[]) => void;
}

export default function StartMileageAndSubGoalsSection({
    mode,
    runsPerWeek,
    weeklyMileage,
    startWeeklyMileage,
    setStartWeeklyMileage,
    avgWeeklyKmLast4Weeks,
    subGoals,
    setSubGoals,
}: StartMileageAndSubGoalsSectionProps) {
    const [showSubGoalForm, setShowSubGoalForm] = useState(false);
    const [newSubGoal, setNewSubGoal] = useState<SubGoalForm>({ name: '', sport: 'RUN', raceType: '', raceDate: '' });

    return (
        <>
            {/* Start Weekly Mileage (only when running is part of the plan) */}
            {runsPerWeek > 0 && (
                <div className="border-t border-glass-border pt-6">
                    <div className="flex justify-between mb-2">
                        <label className="text-xs text-foreground-muted">Start Weekly Mileage</label>
                        <span className="text-positive font-bold">{startWeeklyMileage} km</span>
                    </div>
                    <input
                        type="range"
                        min={0}
                        max={Math.round(weeklyMileage)}
                        step="5"
                        value={startWeeklyMileage}
                        onChange={(e) => setStartWeeklyMileage(parseInt(e.target.value))}
                        className="w-full h-2 bg-glass-border rounded-md appearance-none cursor-pointer accent-positive"
                    />
                    <div className="flex justify-between text-xs text-foreground-muted mt-1">
                        <span>0km</span>
                        <span>{Math.round(weeklyMileage / 2)}km</span>
                        <span>{Math.round(weeklyMileage)}km</span>
                    </div>
                    <p className="text-xs text-foreground-muted mt-1">
                        {avgWeeklyKmLast4Weeks && avgWeeklyKmLast4Weeks > 0
                            ? `Based on your last 4 weeks avg (${avgWeeklyKmLast4Weeks} km/wk). Adjust if needed.`
                            : 'Your current weekly mileage at the start of the plan.'}
                    </p>
                </div>
            )}

            {/* Sub-Goals (advanced mode only) */}
            {mode === 'advanced' && (
                <div className="border-t border-glass-border pt-6">
                    <div className="flex items-center justify-between mb-2">
                        <label className="text-xs font-medium text-foreground-muted">Sub-Goals</label>
                        {!showSubGoalForm && (
                            <button
                                type="button"
                                onClick={() => setShowSubGoalForm(true)}
                                className="flex items-center gap-1 text-xs text-foreground-muted hover:text-foreground transition-colors"
                            >
                                <Plus className="w-3 h-3" />
                                Add Sub-Goal
                            </button>
                        )}
                    </div>
                    {subGoals.length > 0 && (
                        <div className="space-y-1.5 mb-2">
                            {subGoals.map((sg, i) => (
                                <div key={i} className="flex items-center justify-between bg-surface border border-glass-border rounded-md px-3 py-2">
                                    <div>
                                        <span className="text-xs text-foreground">{sg.name}</span>
                                        {sg.raceDate && <span className="text-[10px] text-foreground-muted ml-2">{sg.raceDate}</span>}
                                    </div>
                                    <button type="button" onClick={() => setSubGoals(subGoals.filter((_, idx) => idx !== i))} className="text-foreground-muted hover:text-negative transition-colors">
                                        <X className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                    {showSubGoalForm && (
                        <div className="bg-surface border border-glass-border rounded-md p-3 space-y-2">
                            <input
                                type="text"
                                value={newSubGoal.name}
                                onChange={(e) => setNewSubGoal((p) => ({ ...p, name: e.target.value }))}
                                placeholder="Sub-goal name"
                                className="w-full bg-surface border border-glass-border rounded-md px-2.5 py-1.5 text-sm text-foreground placeholder:text-foreground-muted focus:outline-none focus:ring-1 focus:ring-accent-orange"
                            />
                            <div className="flex gap-2">
                                <select
                                    value={newSubGoal.raceType}
                                    onChange={(e) => setNewSubGoal((p) => ({ ...p, raceType: e.target.value }))}
                                    className="bg-surface border border-glass-border rounded-md px-2 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-accent-orange flex-1"
                                >
                                    <option value="">Distance / Type</option>
                                    <optgroup label="Running">
                                        <option value="FIVE_K">5K</option>
                                        <option value="TEN_K">10K</option>
                                        <option value="HALF_MARATHON">Half Marathon</option>
                                        <option value="MARATHON">Marathon</option>
                                    </optgroup>
                                    <optgroup label="Triathlon">
                                        <option value="SPRINT_TRI">Sprint Triathlon</option>
                                        <option value="OLYMPIC_TRI">Olympic Triathlon</option>
                                        <option value="HALF_IRONMAN">Middle Distance</option>
                                        <option value="FULL_IRONMAN">Long Distance</option>
                                    </optgroup>
                                </select>
                                <input
                                    type="date"
                                    value={newSubGoal.raceDate}
                                    onChange={(e) => setNewSubGoal((p) => ({ ...p, raceDate: e.target.value }))}
                                    className="bg-surface border border-glass-border rounded-md px-2 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-accent-orange"
                                />
                            </div>
                            <div className="flex gap-2 justify-end">
                                <button type="button" onClick={() => { setShowSubGoalForm(false); setNewSubGoal({ name: '', sport: 'RUN', raceType: '', raceDate: '' }); }} className="px-2.5 py-1 rounded-md text-xs text-foreground-muted hover:text-foreground transition-colors">Cancel</button>
                                <button type="button" onClick={() => { if (!newSubGoal.name.trim()) return; setSubGoals([...subGoals, { ...newSubGoal }]); setNewSubGoal({ name: '', sport: 'RUN', raceType: '', raceDate: '' }); setShowSubGoalForm(false); }} className="px-2.5 py-1 rounded-md text-xs bg-surface-hover text-foreground hover:bg-glass-border transition-colors">Add</button>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </>
    );
}
