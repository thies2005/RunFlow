import { Target, Zap, Waves, Clock } from 'lucide-react';

interface TargetRaceSectionProps {
    mode: 'onboarding' | 'advanced' | 'modal' | 'settings';
    goalName: string;
    setGoalName: (_val: string) => void;
    raceType: string;
    setRaceType: (_val: string) => void;
    raceDate: string;
    setRaceDate: (_val: string) => void;
    planStartDate: string;
    setPlanStartDate: (_val: string) => void;
    formErrors: Record<string, string>;
    sport?: string;
    setSport?: (_val: string) => void;
    durationWeeks?: string;
    setDurationWeeks?: (_val: string) => void;
    experienceLevel?: string;
    setExperienceLevel?: (_val: string) => void;
}

const SPORT_OPTIONS = [
    { value: 'RUN', label: 'Running', Icon: Zap },
    { value: 'TRIATHLON', label: 'Triathlon', Icon: Waves },
    { value: 'NO_RACE', label: 'No Race', Icon: Clock },
];

export default function TargetRaceSection({
    mode,
    goalName,
    setGoalName,
    raceType,
    setRaceType,
    raceDate,
    setRaceDate,
    planStartDate,
    setPlanStartDate,
    formErrors,
    sport = 'RUN',
    setSport,
    durationWeeks = '12',
    setDurationWeeks,
    experienceLevel = 'INTERMEDIATE',
    setExperienceLevel,
}: TargetRaceSectionProps) {
    const inputClass = "bg-surface border border-glass-border rounded-lg p-3 text-foreground w-full outline-hidden focus:ring-2 focus:ring-accent-orange transition-all";

    return (
        <div className="space-y-4">
            <div className="flex items-center gap-2 text-accent-orange mb-2">
                <Target className="w-5 h-5" />
                <h3 className="text-sm font-semibold uppercase tracking-wide">Target Race</h3>
            </div>

            {(mode === 'onboarding' || mode === 'advanced') && (
                <div>
                    <label className="block text-xs text-foreground-muted mb-1 uppercase">Goal Name</label>
                    <input
                        type="text"
                        value={goalName}
                        onChange={(e) => setGoalName(e.target.value)}
                        className={`${inputClass} ${formErrors.goalName ? 'border-red-500 focus:ring-red-500' : ''}`}
                        placeholder="e.g., Berlin Marathon 2026"
                    />
                    {formErrors.goalName && <p className="text-red-400 text-xs mt-1">{formErrors.goalName}</p>}
                </div>
            )}

            {(mode === 'onboarding' || mode === 'advanced') && setSport && (
                <div>
                    <label className="block text-xs text-foreground-muted mb-2 uppercase">Sport</label>
                    <div className="grid grid-cols-3 gap-2">
                        {SPORT_OPTIONS.map(({ value, label, Icon }) => (
                            <button
                                key={value}
                                type="button"
                                onClick={() => {
                                    setSport(value);
                                    if (value === 'RUN') setRaceType('FIVE_K');
                                    else if (value === 'TRIATHLON') setRaceType('SPRINT_TRI');
                                }}
                                className={`p-3 rounded-lg border text-left transition-colors ${
                                    sport === value
                                        ? 'border-accent-orange bg-accent-orange/10 text-foreground'
                                        : 'border-glass-border bg-surface hover:border-foreground-muted text-foreground-muted'
                                }`}
                            >
                                <Icon className="w-4 h-4 mb-1" />
                                <span className="text-xs font-medium block">{label}</span>
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {(mode === 'onboarding' || mode === 'advanced') && setExperienceLevel && (
                <div>
                    <label className="block text-xs text-foreground-muted mb-2 uppercase">Experience Level</label>
                    <div className="grid grid-cols-3 gap-2">
                        {['BEGINNER', 'INTERMEDIATE', 'ADVANCED'].map((level) => (
                            <button
                                key={level}
                                type="button"
                                onClick={() => setExperienceLevel(level)}
                                className={`px-3 py-2 rounded-lg text-xs font-medium border transition-colors ${
                                    experienceLevel === level
                                        ? 'border-accent-orange bg-accent-orange/10 text-foreground'
                                        : 'border-glass-border bg-surface text-foreground-muted hover:border-foreground-muted'
                                }`}
                            >
                                {level.charAt(0) + level.slice(1).toLowerCase()}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {sport !== 'NO_RACE' && (
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-xs text-foreground-muted mb-1 uppercase">Distance</label>
                        <select
                            value={raceType}
                            onChange={(e) => setRaceType(e.target.value)}
                            className={inputClass}
                        >
                            <optgroup label="Running">
                                <option value="FIVE_K">5K</option>
                                <option value="TEN_K">10K</option>
                                <option value="HALF_MARATHON">Half Marathon</option>
                                <option value="MARATHON">Marathon</option>
                            </optgroup>
                            <optgroup label="Ultra">
                                <option value="FIFTY_K">50K</option>
                                <option value="FIFTY_MILE">50 Mile</option>
                                <option value="HUNDRED_K">100K</option>
                                <option value="HUNDRED_MILE">100 Mile</option>
                                <option value="TWELVE_HOUR">12 Hour</option>
                                <option value="TWENTY_FOUR_HOUR">24 Hour</option>
                                <option value="BACKYARD_ULTRA">Backyard Ultra</option>
                            </optgroup>
                            <optgroup label="Triathlon">
                                <option value="SPRINT_TRI">Sprint Triathlon</option>
                                <option value="OLYMPIC_TRI">Olympic Triathlon</option>
                                <option value="HALF_IRONMAN">Half Ironman (70.3)</option>
                                <option value="FULL_IRONMAN">Full Ironman</option>
                                <option value="CUSTOM_TRI">Custom Triathlon</option>
                            </optgroup>
                            <optgroup label="Other">
                                <option value="CUSTOM_DISTANCE">Custom Distance</option>
                            </optgroup>
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs text-foreground-muted mb-1 uppercase">Race Date</label>
                        <input
                            type="date"
                            value={raceDate}
                            onChange={(e) => setRaceDate(e.target.value)}
                            className={`${inputClass} ${formErrors.raceDate ? 'border-red-500 focus:ring-red-500' : ''}`}
                        />
                        {formErrors.raceDate && <p className="text-red-400 text-xs mt-1">{formErrors.raceDate}</p>}
                    </div>
                </div>
            )}

            {sport === 'NO_RACE' && setDurationWeeks && (
                <div>
                    <label className="block text-xs text-foreground-muted mb-1 uppercase">Plan Duration (weeks)</label>
                    <input
                        type="number"
                        value={durationWeeks}
                        onChange={(e) => setDurationWeeks(e.target.value)}
                        min={4}
                        max={52}
                        placeholder="12"
                        className={inputClass}
                    />
                </div>
            )}

            <div className="mt-4">
                <label className="block text-xs text-foreground-muted mb-1 uppercase">Plan Start Date</label>
                <input
                    type="date"
                    value={planStartDate}
                    onChange={(e) => setPlanStartDate(e.target.value)}
                    className={`${inputClass} ${formErrors.planStartDate ? 'border-red-500 focus:ring-red-500' : ''}`}
                />
                {formErrors.planStartDate && <p className="text-red-400 text-xs mt-1">{formErrors.planStartDate}</p>}
                <p className="text-xs text-foreground-muted mt-1">When should your training plan begin?</p>
            </div>
        </div>
    );
}
