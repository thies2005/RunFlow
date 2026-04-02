import { Activity, Bike, Move, ChevronDown, ChevronUp, Waves, Dumbbell } from 'lucide-react';

interface PlanVolumeSectionProps {
    runsPerWeek: number;
    setRunsPerWeek: (val: number) => void;
    ridesPerWeek: number;
    setRidesPerWeek: (val: number) => void;
    swimsPerWeek: number;
    setSwimsPerWeek: (val: number) => void;
    strengthPerWeek: number;
    setStrengthPerWeek: (val: number) => void;
    weeklyMileage: number;
    setWeeklyMileage: (val: number) => void;
    taperWeeks: number;
    setTaperWeeks: (val: number) => void;
    peakWeeks: number;
    setPeakWeeks: (val: number) => void;
    buildWeeks: number;
    setBuildWeeks: (val: number) => void;
    showSchedulingSettings: boolean;
    setShowSchedulingSettings: (val: boolean) => void;
    longRunDay: number;
    setLongRunDay: (val: number) => void;
    qualityDay: number;
    setQualityDay: (val: number) => void;
    swimDay: number;
    setSwimDay: (val: number) => void;
    restDays: number[];
    setRestDays: (val: number[]) => void;
}

export default function PlanVolumeSection({
    runsPerWeek,
    setRunsPerWeek,
    ridesPerWeek,
    setRidesPerWeek,
    swimsPerWeek,
    setSwimsPerWeek,
    strengthPerWeek,
    setStrengthPerWeek,
    weeklyMileage,
    setWeeklyMileage,
    taperWeeks,
    setTaperWeeks,
    peakWeeks,
    setPeakWeeks,
    buildWeeks,
    setBuildWeeks,
    showSchedulingSettings,
    setShowSchedulingSettings,
    longRunDay,
    setLongRunDay,
    qualityDay,
    setQualityDay,
    swimDay,
    setSwimDay,
    restDays,
    setRestDays
}: PlanVolumeSectionProps) {
    return (
        <>
            {/* Plan Volume */}
            <div className="border-t border-glass-border pt-6">
                <h3 className="text-sm font-semibold text-foreground-muted uppercase tracking-wide mb-4">Plan Volume</h3>

                {/* Runs Per Week */}
                <div className="mb-6">
                    <div className="flex justify-between mb-2">
                        <label className="text-xs text-foreground-muted uppercase flex items-center gap-1">
                            <Activity className="w-3 h-3" /> Runs / Week
                        </label>
                        <span className="text-accent-orange font-bold">{runsPerWeek}</span>
                    </div>
                    <input
                        type="range"
                        min="2"
                        max="6"
                        value={runsPerWeek}
                        onChange={(e) => setRunsPerWeek(parseInt(e.target.value))}
                        aria-label="Runs per week"
                        aria-valuenow={runsPerWeek}
                        aria-valuemin={2}
                        aria-valuemax={6}
                        className="w-full h-2 bg-white/10 rounded-lg appearance-none cursor-pointer accent-accent-orange"
                    />
                    <div className="flex justify-between text-xs text-gray-500 mt-1">
                        <span>2</span>
                        <span>4</span>
                        <span>6</span>
                    </div>
                </div>

                {/* Rides Per Week */}
                <div className="mb-6">
                    <div className="flex justify-between mb-2">
                        <label className="text-xs text-foreground-muted uppercase flex items-center gap-1">
                            <Bike className="w-3 h-3" /> Rides / Week
                        </label>
                        <span className="text-accent-cyan font-bold">{ridesPerWeek}</span>
                    </div>
                    <input
                        type="range"
                        min="0"
                        max="3"
                        value={ridesPerWeek}
                        onChange={(e) => setRidesPerWeek(parseInt(e.target.value))}
                        aria-label="Rides per week"
                        aria-valuenow={ridesPerWeek}
                        aria-valuemin={0}
                        aria-valuemax={3}
                        className="w-full h-2 bg-glass-border rounded-lg appearance-none cursor-pointer accent-accent-cyan"
                    />
                    <div className="flex justify-between text-xs text-foreground-muted mt-1">
                        <span>0</span>
                        <span>1</span>
                        <span>2</span>
                        <span>3</span>
                    </div>
                </div>

                {/* Swims Per Week */}
                <div className="mb-6">
                    <div className="flex justify-between mb-2">
                        <label className="text-xs text-foreground-muted uppercase flex items-center gap-1">
                            <Waves className="w-4 h-4" /> Swims / Week
                        </label>
                        <span className="text-cyan-400 font-bold">{swimsPerWeek}</span>
                    </div>
                    <input
                        type="range"
                        min="0"
                        max="3"
                        value={swimsPerWeek}
                        onChange={(e) => setSwimsPerWeek(parseInt(e.target.value))}
                        aria-label="Swims per week"
                        aria-valuenow={swimsPerWeek}
                        aria-valuemin={0}
                        aria-valuemax={3}
                        className="w-full h-2 bg-glass-border rounded-lg appearance-none cursor-pointer accent-cyan-500"
                    />
                    <div className="flex justify-between text-xs text-foreground-muted mt-1">
                        <span>0</span>
                        <span>1</span>
                        <span>2</span>
                        <span>3</span>
                    </div>
                </div>

                {/* Strength Per Week */}
                <div className="mb-6">
                    <div className="flex justify-between mb-2">
                        <label className="text-xs text-foreground-muted uppercase flex items-center gap-1">
                            <Dumbbell className="w-4 h-4" /> Strength / Week
                        </label>
                        <span className="text-purple-400 font-bold">{strengthPerWeek}</span>
                    </div>
                    <input
                        type="range"
                        min="0"
                        max="4"
                        value={strengthPerWeek}
                        onChange={(e) => setStrengthPerWeek(parseInt(e.target.value))}
                        aria-label="Strength sessions per week"
                        aria-valuenow={strengthPerWeek}
                        aria-valuemin={0}
                        aria-valuemax={4}
                        className="w-full h-2 bg-glass-border rounded-lg appearance-none cursor-pointer accent-purple-500"
                    />
                    <div className="flex justify-between text-xs text-foreground-muted mt-1">
                        <span>0</span>
                        <span>2</span>
                        <span>4</span>
                    </div>
                </div>

                {/* Peak Mileage */}
                <div className="mb-4">
                    <div className="flex justify-between mb-2">
                        <label className="text-xs text-foreground-muted uppercase flex items-center gap-1">
                            <Move className="w-3 h-3" /> Peak Mileage Goal
                        </label>
                        <span className="text-green-400 font-bold">{weeklyMileage} km</span>
                    </div>
                    <input
                        type="range"
                        min="20"
                        max="100"
                        step="5"
                        value={weeklyMileage}
                        onChange={(e) => setWeeklyMileage(parseInt(e.target.value))}
                        aria-label="Peak weekly mileage goal in kilometers"
                        aria-valuenow={weeklyMileage}
                        aria-valuemin={20}
                        aria-valuemax={100}
                        className="w-full h-2 bg-glass-border rounded-lg appearance-none cursor-pointer accent-green-500"
                    />
                    <div className="flex justify-between text-xs text-foreground-muted mt-1">
                        <span>20km</span>
                        <span>60km</span>
                        <span>100km</span>
                    </div>
                </div>
            </div>

            {/* Training Phases */}
            <div className="border-t border-glass-border pt-6">
                <h3 className="text-sm font-semibold text-foreground-muted uppercase tracking-wide mb-4">Training Phases</h3>

                <div className="grid grid-cols-3 gap-4">
                    <div>
                        <div className="flex justify-between mb-2">
                            <label className="text-xs text-foreground-muted uppercase">Taper</label>
                            <span className="text-teal-400 font-bold">{taperWeeks}w</span>
                        </div>
                        <input
                            type="range"
                            min="1"
                            max="3"
                            value={taperWeeks}
                            onChange={(e) => setTaperWeeks(parseInt(e.target.value))}
                            aria-label="Taper weeks"
                            aria-valuenow={taperWeeks}
                            aria-valuemin={1}
                            aria-valuemax={3}
                            className="w-full h-2 bg-glass-border rounded-lg appearance-none cursor-pointer accent-teal-500"
                        />
                    </div>
                    <div>
                        <div className="flex justify-between mb-2">
                            <label className="text-xs text-foreground-muted uppercase">Peak</label>
                            <span className="text-purple-400 font-bold">{peakWeeks}w</span>
                        </div>
                        <input
                            type="range"
                            min="2"
                            max="6"
                            value={peakWeeks}
                            onChange={(e) => setPeakWeeks(parseInt(e.target.value))}
                            aria-label="Peak weeks"
                            aria-valuenow={peakWeeks}
                            aria-valuemin={2}
                            aria-valuemax={6}
                            className="w-full h-2 bg-glass-border rounded-lg appearance-none cursor-pointer accent-purple-500"
                        />
                    </div>
                    <div>
                        <div className="flex justify-between mb-2">
                            <label className="text-xs text-foreground-muted uppercase">Build</label>
                            <span className="text-orange-400 font-bold">{buildWeeks}w</span>
                        </div>
                        <input
                            type="range"
                            min="2"
                            max="8"
                            value={buildWeeks}
                            onChange={(e) => setBuildWeeks(parseInt(e.target.value))}
                            aria-label="Build weeks"
                            aria-valuenow={buildWeeks}
                            aria-valuemin={2}
                            aria-valuemax={8}
                            className="w-full h-2 bg-glass-border rounded-lg appearance-none cursor-pointer accent-orange-500"
                        />
                    </div>
                </div>
                <p className="text-xs text-foreground-muted mt-2">Remaining weeks will be Base phase.</p>
            </div>

            {/* Workout Scheduling (Collapsible - Advanced) */}
            <div className="border-t border-glass-border pt-4">
                <button
                    type="button"
                    onClick={() => setShowSchedulingSettings(!showSchedulingSettings)}
                    className="flex items-center justify-between w-full text-left py-2"
                >
                    <h3 className="text-sm font-semibold text-foreground-muted uppercase tracking-wide">Workout Scheduling</h3>
                    {showSchedulingSettings ? (
                        <ChevronUp className="w-4 h-4 text-foreground-muted" />
                    ) : (
                        <ChevronDown className="w-4 h-4 text-foreground-muted" />
                    )}
                </button>

                {showSchedulingSettings && (
                    <div className="space-y-4 mt-4 animate-fade-in">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs text-foreground-muted mb-2 uppercase">Long Run Day</label>
                                <select
                                    value={longRunDay}
                                    onChange={e => setLongRunDay(parseInt(e.target.value))}
                                    className="w-full bg-surface border border-glass-border rounded-lg p-2.5 text-foreground text-sm focus:ring-2 focus:ring-accent-orange outline-hidden"
                                >
                                    <option value={0}>Sunday</option>
                                    <option value={1}>Monday</option>
                                    <option value={2}>Tuesday</option>
                                    <option value={3}>Wednesday</option>
                                    <option value={4}>Thursday</option>
                                    <option value={5}>Friday</option>
                                    <option value={6}>Saturday</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs text-foreground-muted mb-2 uppercase">Quality Day</label>
                                <select
                                    value={qualityDay}
                                    onChange={e => setQualityDay(parseInt(e.target.value))}
                                    className="w-full bg-surface border border-glass-border rounded-lg p-2.5 text-foreground text-sm focus:ring-2 focus:ring-accent-orange outline-hidden"
                                >
                                    <option value={0}>Sunday</option>
                                    <option value={1}>Monday</option>
                                    <option value={2}>Tuesday</option>
                                    <option value={3}>Wednesday</option>
                                    <option value={4}>Thursday</option>
                                    <option value={5}>Friday</option>
                                    <option value={6}>Saturday</option>
                                </select>
                            </div>
                        </div>

                        {swimsPerWeek > 0 && (
                            <div>
                                <label className="block text-xs text-foreground-muted mb-2 uppercase flex items-center gap-1">
                                    <span>🏊</span> Swim Day
                                </label>
                                <select
                                    value={swimDay}
                                    onChange={e => setSwimDay(parseInt(e.target.value))}
                                    className="w-full bg-surface border border-glass-border rounded-lg p-2.5 text-foreground text-sm focus:ring-2 focus:ring-accent-cyan outline-hidden"
                                >
                                    <option value={0}>Sunday</option>
                                    <option value={1}>Monday</option>
                                    <option value={2}>Tuesday</option>
                                    <option value={3}>Wednesday</option>
                                    <option value={4}>Thursday</option>
                                    <option value={5}>Friday</option>
                                    <option value={6}>Saturday</option>
                                </select>
                                <p className="text-xs text-foreground-muted mt-1">Preferred day to schedule swim sessions.</p>
                            </div>
                        )}

                        <div>
                            <label className="block text-xs text-foreground-muted mb-2 uppercase">Rest Days</label>
                            <div className="flex flex-wrap gap-2">
                                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, idx) => (
                                    <button
                                        key={idx}
                                        type="button"
                                        onClick={() => {
                                            if (restDays.includes(idx)) {
                                                setRestDays(restDays.filter(d => d !== idx));
                                            } else {
                                                setRestDays([...restDays, idx]);
                                            }
                                        }}
                                        className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${restDays.includes(idx)
                                            ? 'bg-gray-500/20 text-gray-300 border-gray-500/30'
                                            : 'bg-white/5 text-gray-500 border-white/10 hover:text-gray-300'
                                            }`}
                                    >
                                        {day}
                                    </button>
                                ))}
                            </div>
                            <p className="text-xs text-gray-500 mt-2">Select days you prefer to rest (no running).</p>
                        </div>
                    </div>
                )}
            </div>
        </>
    );
}
