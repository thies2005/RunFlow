import { useMemo } from 'react';
import type { Activity, Goal } from '@/lib/types';
import { calculatePredictedTimes, calculateEffectiveVO2max } from '@/lib/metrics/runalyze';
import { calculateTrainingPaces } from '@/lib/metrics/vdot';

export function useAnalyticsMetrics(
    activitiesData: any,
    goalsData: any,
    statsData: any,
    historyData: any,
    userData: any
) {
    return useMemo(() => {
        const activities: Activity[] = activitiesData?.activities || [];
        const effectiveVO2max = statsData?.effectiveVO2max || 0;
        const activeGoalForCalibration = goalsData?.goals?.find((g: Goal) => g.isActive);
        const calibrationFactor = activeGoalForCalibration?.marathonShapeFactor || 1.0;
        const shapeFromServer = statsData?.marathonShape || { shape: 0, mileageScore: 0, longRunScore: 0, crossTrainingScore: 0, details: {} };

        const times = effectiveVO2max > 0
            ? calculatePredictedTimes(effectiveVO2max, shapeFromServer.shape, calibrationFactor)
            : { optimal: 0, predicted: 0 };

        const trainingPaces = effectiveVO2max > 0 ? calculateTrainingPaces(effectiveVO2max) : null;

        // Trend data from server
        const serverVo2Trend = historyData?.vo2Trend || [];
        const vo2TrendData = serverVo2Trend.map((point: any, index: number) => {
            const windowSize = 4;
            const windowValues: number[] = [];
            for (let i = index; i >= 0 && windowValues.length < windowSize; i--) {
                windowValues.push(serverVo2Trend[i].vo2);
            }
            const avg = windowValues.length > 0 ? windowValues.reduce((a, b) => a + b, 0) / windowValues.length : 0;
            return { date: point.week, vo2: point.vo2, vo2Rolling: Math.round(avg * 10) / 10 };
        });

        const shapeTrendData = (historyData?.shapeTrend || []).map((s: any) => ({ week: s.week, shape: s.shape }));
        const fitnessData = (historyData?.fitnessTrend || []).map((f: any) => ({ date: f.date, ctl: f.ctl, atl: f.atl, tsb: f.tsb }));

        // Combined data for charts (matching desktop implementation)
        const dailyVolumeMap = new Map<string, number>();
        const dailyTimeMap = new Map<string, number>();
        const dailyVO2Map = new Map<string, { values: number[]; vo2max?: number }>();
        const maxHR = userData?.user?.hrMax || userData?.hrMax || 190;
        const factor = statsData?.vdotCorrectionFactor || 1.0;
        const serverFitnessTrend = historyData?.fitnessTrend || [];

        activities.forEach((activity: any) => {
            const dateKey = new Date(activity.startDate).toISOString().split('T')[0];

            // Always add to Training Time (minutes) - All Activity Types
            dailyTimeMap.set(dateKey, (dailyTimeMap.get(dateKey) || 0) + activity.movingTime / 60);

            // Run-specific metrics (Volume, VO2)
            if (activity.type === 'RUN') {
                dailyVolumeMap.set(dateKey, (dailyVolumeMap.get(dateKey) || 0) + activity.distance / 1000);

                // Calculate VO2max for this run if it has HR
                if (activity.hasHeartrate && activity.averageHr && activity.distance >= 3000) {
                    const vo2 = calculateEffectiveVO2max(activity.distance, activity.movingTime, activity.averageHr, maxHR);
                    if (vo2 > 0) {
                        const existing = dailyVO2Map.get(dateKey) || { values: [] };
                        existing.values.push(vo2 * factor);
                        dailyVO2Map.set(dateKey, existing);
                    }
                }
            }
        });

        // Calculate average VO2max for each day
        dailyVO2Map.forEach((entry) => {
            if (entry.values.length > 0) {
                entry.vo2max = Math.round(entry.values.reduce((a, b) => a + b, 0) / entry.values.length * 10) / 10;
            }
        });

        // Helper to normalize dates
        const normalizeDate = (d: string) => {
            if (!d) return '';
            return d.length >= 10 ? d.substring(0, 10) : d;
        };

        // Build combined data array - INCLUDE server fitness dates (for rest days)
        const fitnessDateSet = new Set<string>(serverFitnessTrend.map((f: { date: string }) => normalizeDate(f.date)));
        const allDates = new Set<string>([
            ...Array.from(dailyVolumeMap.keys()),
            ...Array.from(dailyTimeMap.keys()),
            ...Array.from(fitnessDateSet)
        ]);
        const combinedDataRaw = Array.from(allDates).sort().map((date: string) => {
            const fitnessEntry = serverFitnessTrend.find((f: { date: string }) => normalizeDate(f.date) === date);
            return {
                date,
                volume: dailyVolumeMap.get(date) || 0,
                trainingTime: dailyTimeMap.get(date) || 0,
                vo2max: dailyVO2Map.get(date)?.vo2max,
                ctl: fitnessEntry?.ctl,
                atl: fitnessEntry?.atl,
                tsb: fitnessEntry?.tsb,
            };
        });

        // Calculate rolling averages for combined data
        const combinedData = combinedDataRaw.map((d, index) => {
            const windowSize = 7;
            let volSum = 0, timeSum = 0, vo2Sum = 0, vo2Count = 0;

            for (let i = index; i >= 0 && index - i < windowSize; i--) {
                volSum += combinedDataRaw[i].volume;
                timeSum += combinedDataRaw[i].trainingTime;
                const v = combinedDataRaw[i].vo2max;
                if (v !== undefined) {
                    vo2Sum += v;
                    vo2Count++;
                }
            }

            return {
                ...d,
                vo2maxRolling: vo2Count > 0 ? Math.round(vo2Sum / vo2Count * 10) / 10 : undefined,
                volumeRolling: Math.round(volSum * 10) / 10,
                trainingTimeRolling: Math.round(timeSum)
            };
        });

        return {
            runalyzeMetrics: {
                effectiveVO2max,
                rawVO2max: statsData?.rawVO2max || 0,
                vdotCorrectionFactor: statsData?.vdotCorrectionFactor || 1.0,
                shape: shapeFromServer.shape,
                mileageScore: shapeFromServer.mileageScore,
                longRunScore: shapeFromServer.longRunScore,
                crossTrainingScore: shapeFromServer.crossTrainingScore || 0,
                details: shapeFromServer.details || {},
                optimalTime: times.optimal,
                predictedTime: times.predicted,
                calibrationFactor
            },
            vo2TrendData,
            shapeTrendData,
            fitnessData,
            combinedData,
            trainingPaces,
        };
    }, [activitiesData, goalsData, statsData, historyData, userData]);
}
