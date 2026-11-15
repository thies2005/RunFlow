import React from 'react';

interface TierInputGroupProps {
    tier: 1 | 2 | 3;
    formData: any;
    setFormData: (_updater: (_prev: any) => any) => void;
}

export default function TierInputGroup({ tier, formData, setFormData }: TierInputGroupProps) {
    const t = `tier${tier}` as const;

    const handleChange = (field: string, value: string | number) => {
        setFormData((prev: any) => ({ ...prev, [field]: value }));
    };

    return (
        <div className="bg-background p-4 rounded border border-line">
            <label htmlFor={`${t}-name`} className="sr-only">{`Tier ${tier} Name`}</label>
            <input
                id={`${t}-name`}
                type="text"
                value={formData[`${t}Name`]}
                onChange={(e) => handleChange(`${t}Name`, e.target.value)}
                className="w-full px-2 py-1 bg-background-secondary text-foreground border-b border-line font-semibold text-sm mb-3 focus:outline-hidden focus:border-accent-orange"
                placeholder={`Tier ${tier} Name`}
            />
            <div className="space-y-3">
                <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                        <label htmlFor={`${t}-daily-msgs`} className="text-foreground-muted text-xs block mb-1">Daily Msgs</label>
                        <input
                            id={`${t}-daily-msgs`}
                            type="number"
                            value={formData[`${t}DailyLimit`]}
                            onChange={(e) => handleChange(`${t}DailyLimit`, parseInt(e.target.value, 10) || 0)}
                            className="w-full px-2 py-1 bg-background-secondary text-foreground border border-line rounded text-sm font-mono tabular-nums"
                        />
                    </div>
                    <div>
                        <label htmlFor={`${t}-monthly-msgs`} className="text-foreground-muted text-xs block mb-1">Monthly Msgs</label>
                        <input
                            id={`${t}-monthly-msgs`}
                            type="number"
                            value={formData[`${t}MonthlyLimit`]}
                            onChange={(e) => handleChange(`${t}MonthlyLimit`, parseInt(e.target.value, 10) || 0)}
                            className="w-full px-2 py-1 bg-background-secondary text-foreground border border-line rounded text-sm font-mono tabular-nums"
                        />
                    </div>
                </div>
                <div className="grid grid-cols-2 gap-2 text-sm border-t border-line pt-2">
                    <div>
                        <label htmlFor={`${t}-daily-tokens`} className="text-foreground-muted text-xs block mb-1">Daily Tokens</label>
                        <input
                            id={`${t}-daily-tokens`}
                            type="number"
                            value={formData[`${t}DailyTokenLimit`]}
                            onChange={(e) => handleChange(`${t}DailyTokenLimit`, parseInt(e.target.value, 10) || 0)}
                            className="w-full px-2 py-1 bg-background-secondary text-foreground border border-line rounded text-sm font-mono tabular-nums"
                        />
                    </div>
                    <div>
                        <label htmlFor={`${t}-monthly-tokens`} className="text-foreground-muted text-xs block mb-1">Monthly Tokens</label>
                        <input
                            id={`${t}-monthly-tokens`}
                            type="number"
                            value={formData[`${t}MonthlyTokenLimit`]}
                            onChange={(e) => handleChange(`${t}MonthlyTokenLimit`, parseInt(e.target.value, 10) || 0)}
                            className="w-full px-2 py-1 bg-background-secondary text-foreground border border-line rounded text-sm font-mono tabular-nums"
                        />
                    </div>
                </div>
                <div className="border-t border-line pt-2">
                    <div>
                        <label htmlFor={`${t}-calorie-snap`} className="text-foreground-muted text-xs block mb-1">CalorieSnap / Day</label>
                        <input
                            id={`${t}-calorie-snap`}
                            type="number"
                            value={formData[`${t}CalorieSnapLimit`]}
                            onChange={(e) => handleChange(`${t}CalorieSnapLimit`, parseInt(e.target.value, 10) || 0)}
                            className="w-full px-2 py-1 bg-background-secondary text-foreground border border-line rounded text-sm font-mono tabular-nums"
                        />
                    </div>
                </div>
                <div className="grid grid-cols-2 gap-2 text-sm border-t border-line pt-2">
                    <div>
                        <label htmlFor={`${t}-meal-suggest`} className="text-foreground-muted text-xs block mb-1">Meal Suggest / Day</label>
                        <input
                            id={`${t}-meal-suggest`}
                            type="number"
                            value={formData[`${t}MealSuggestLimit`]}
                            onChange={(e) => handleChange(`${t}MealSuggestLimit`, parseInt(e.target.value, 10) || 0)}
                            className="w-full px-2 py-1 bg-background-secondary text-foreground border border-line rounded text-sm font-mono tabular-nums"
                        />
                    </div>
                    <div>
                        <label htmlFor={`${t}-activity-feedback`} className="text-foreground-muted text-xs block mb-1">Activity Feedback / Day</label>
                        <input
                            id={`${t}-activity-feedback`}
                            type="number"
                            value={formData[`${t}ActivityFeedbackLimit`]}
                            onChange={(e) => handleChange(`${t}ActivityFeedbackLimit`, parseInt(e.target.value, 10) || 0)}
                            className="w-full px-2 py-1 bg-background-secondary text-foreground border border-line rounded text-sm font-mono tabular-nums"
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}
