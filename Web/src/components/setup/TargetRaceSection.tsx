import { Target } from 'lucide-react';

interface TargetRaceSectionProps {
    mode: 'onboarding' | 'settings';
    goalName: string;
    setGoalName: (val: string) => void;
    raceType: string;
    setRaceType: (val: string) => void;
    raceDate: string;
    setRaceDate: (val: string) => void;
    planStartDate: string;
    setPlanStartDate: (val: string) => void;
    formErrors: Record<string, string>;
}

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
    formErrors
}: TargetRaceSectionProps) {
    if (mode !== 'onboarding') return null;

    const inputClass = "bg-surface border border-glass-border rounded-lg p-3 text-foreground w-full outline-none focus:ring-2 focus:ring-accent-orange transition-all";

    return (
        <div className="space-y-4">
            <div className="flex items-center gap-2 text-accent-orange mb-2">
                <Target className="w-5 h-5" />
                <h3 className="text-sm font-semibold uppercase tracking-wide">Target Race</h3>
            </div>

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

            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-xs text-foreground-muted mb-1 uppercase">Distance</label>
                    <select
                        value={raceType}
                        onChange={(e) => setRaceType(e.target.value)}
                        className={inputClass}
                    >
                        <option value="FIVE_K">5K</option>
                        <option value="TEN_K">10K</option>
                        <option value="HALF_MARATHON">Half Marathon</option>
                        <option value="MARATHON">Marathon</option>
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

            <div className="mt-4">
                <label className="block text-xs text-gray-400 mb-1 uppercase">Plan Start Date</label>
                <input
                    type="date"
                    value={planStartDate}
                    onChange={(e) => setPlanStartDate(e.target.value)}
                    className={`${inputClass} ${formErrors.planStartDate ? 'border-red-500 focus:ring-red-500' : ''}`}
                />
                {formErrors.planStartDate && <p className="text-red-400 text-xs mt-1">{formErrors.planStartDate}</p>}
                <p className="text-xs text-gray-500 mt-1">When should your training plan begin?</p>
            </div>
        </div>
    );
}
