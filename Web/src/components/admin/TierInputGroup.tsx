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
        <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-xs">
            <input
                type="text"
                value={formData[`${t}Name`]}
                onChange={(e) => handleChange(`${t}Name`, e.target.value)}
                className="w-full px-2 py-1 bg-white text-gray-900 border-b border-gray-200 font-medium mb-3 focus:outline-hidden focus:border-purple-500"
                placeholder={`Tier ${tier} Name`}
            />
            <div className="space-y-3">
                <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                        <label className="text-gray-500 text-xs block mb-1">Daily Msgs</label>
                        <input
                            type="number"
                            value={formData[`${t}DailyLimit`]}
                            onChange={(e) => handleChange(`${t}DailyLimit`, parseInt(e.target.value) || 0)}
                            className="w-full px-2 py-1 bg-gray-50 text-gray-900 border border-gray-200 rounded text-sm"
                        />
                    </div>
                    <div>
                        <label className="text-gray-500 text-xs block mb-1">Monthly Msgs</label>
                        <input
                            type="number"
                            value={formData[`${t}MonthlyLimit`]}
                            onChange={(e) => handleChange(`${t}MonthlyLimit`, parseInt(e.target.value) || 0)}
                            className="w-full px-2 py-1 bg-gray-50 text-gray-900 border border-gray-200 rounded text-sm"
                        />
                    </div>
                </div>
                <div className="grid grid-cols-2 gap-2 text-sm border-t border-gray-100 pt-2">
                    <div>
                        <label className="text-gray-500 text-xs block mb-1">Daily Tokens</label>
                        <input
                            type="number"
                            value={formData[`${t}DailyTokenLimit`]}
                            onChange={(e) => handleChange(`${t}DailyTokenLimit`, parseInt(e.target.value) || 0)}
                            className="w-full px-2 py-1 bg-gray-50 text-gray-900 border border-gray-200 rounded text-sm"
                        />
                    </div>
                    <div>
                        <label className="text-gray-500 text-xs block mb-1">Monthly Tokens</label>
                        <input
                            type="number"
                            value={formData[`${t}MonthlyTokenLimit`]}
                            onChange={(e) => handleChange(`${t}MonthlyTokenLimit`, parseInt(e.target.value) || 0)}
                            className="w-full px-2 py-1 bg-gray-50 text-gray-900 border border-gray-200 rounded text-sm"
                        />
                    </div>
                </div>
                <div className="border-t border-gray-100 pt-2">
                    <div>
                        <label className="text-gray-500 text-xs block mb-1">📸 CalorieSnap / Day</label>
                        <input
                            type="number"
                            value={formData[`${t}CalorieSnapLimit`]}
                            onChange={(e) => handleChange(`${t}CalorieSnapLimit`, parseInt(e.target.value) || 0)}
                            className="w-full px-2 py-1 bg-gray-50 text-gray-900 border border-gray-200 rounded text-sm"
                        />
                    </div>
                </div>
                <div className="grid grid-cols-2 gap-2 text-sm border-t border-gray-100 pt-2">
                    <div>
                        <label className="text-gray-500 text-xs block mb-1">🍽️ Meal Suggest / Day</label>
                        <input
                            type="number"
                            value={formData[`${t}MealSuggestLimit`]}
                            onChange={(e) => handleChange(`${t}MealSuggestLimit`, parseInt(e.target.value) || 0)}
                            className="w-full px-2 py-1 bg-gray-50 text-gray-900 border border-gray-200 rounded text-sm"
                        />
                    </div>
                    <div>
                        <label className="text-gray-500 text-xs block mb-1">🏃‍♂️ Act. Feedback / Day</label>
                        <input
                            type="number"
                            value={formData[`${t}ActivityFeedbackLimit`]}
                            onChange={(e) => handleChange(`${t}ActivityFeedbackLimit`, parseInt(e.target.value) || 0)}
                            className="w-full px-2 py-1 bg-gray-50 text-gray-900 border border-gray-200 rounded text-sm"
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}
