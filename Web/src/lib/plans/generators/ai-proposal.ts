import { RaceType } from '@/generated/prisma/browser';
import { calculateTrainingPaces } from '@/lib/metrics/vdot';
import { safeFetch } from '@/lib/ai/providers';
import { PLAN_CONSTANTS } from '../index';

export type AiPlanProposal = {
    id: string;
    label: string;
    description: string;
    weeklyVolume: { min: number; max: number };
    peakWeekDistance: number;
    qualitySessionsPerWeek: number;
    longRunPeak: number;
    confidence: number;
    totalWeeks: number;
    highlights: string[];
};

export async function generateAiProposals(
    config: {
        raceType: RaceType;
        vdot: number;
        availableWeeks: number;
        weeklyMileageGoal?: number | null;
        runsPerWeek?: number;
        experience?: string;
    },
    providerConfig?: {
        baseUrl: string;
        apiKey: string;
        model: string;
    },
): Promise<AiPlanProposal[]> {
    if (providerConfig) {
        try {
            const aiProposals = await fetchAiProposals(config, providerConfig);
            if (aiProposals && aiProposals.length >= 2) return aiProposals;
        } catch {
            // fall through to algorithmic
        }
    }

    return generateAlgorithmicProposals(config);
}

async function fetchAiProposals(
    config: {
        raceType: RaceType;
        vdot: number;
        availableWeeks: number;
        weeklyMileageGoal?: number | null;
        runsPerWeek?: number;
        experience?: string;
    },
    providerConfig: { baseUrl: string; apiKey: string; model: string },
): Promise<AiPlanProposal[] | null> {
    const paces = calculateTrainingPaces(config.vdot);
    const easyPaceMin = paces.easy.min;
    const easyPaceMax = paces.easy.max;

    const systemPrompt = `You are an expert running/triathlon coach. Generate 3 training plan proposals for an athlete.

Context:
- Race type: ${config.raceType}
- VDOT: ${config.vdot}
- Easy pace range: ${formatPaceSec(easyPaceMin)} - ${formatPaceSec(easyPaceMax)} per km
- Available weeks: ${config.availableWeeks}
- Weekly mileage goal: ${config.weeklyMileageGoal ? `${Math.round((config.weeklyMileageGoal || 0) / 1000)}km` : 'Not specified'}
- Runs per week: ${config.runsPerWeek || 'Not specified'}
- Experience level: ${config.experience || 'Unknown'}

Return a JSON array with exactly 3 proposals. Each proposal must have these fields:
- id: string ("conservative", "balanced", "aggressive")
- label: string (short name)
- description: string (1-2 sentence description)
- weeklyVolume: { min: number, max: number } (in meters)
- peakWeekDistance: number (in meters)
- qualitySessionsPerWeek: number
- longRunPeak: number (in meters)
- confidence: number (0-1, how confident you are this plan suits the athlete)
- totalWeeks: number
- highlights: string[] (3-5 key features)

Respond ONLY with valid JSON, no markdown formatting.`;

    const response = await safeFetch(`${providerConfig.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${providerConfig.apiKey}`,
        },
        body: JSON.stringify({
            model: providerConfig.model,
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: 'Generate 3 plan proposals based on the above context.' },
            ],
            temperature: 0.7,
            max_tokens: 2000,
        }),
        allowedUrls: [providerConfig.baseUrl],
    });

    if (!response.ok) return null;

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    if (!content) return null;

    const cleaned = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const parsed = JSON.parse(cleaned);

    if (!Array.isArray(parsed) || parsed.length < 2) return null;

    return parsed.map((p: Record<string, unknown>) => {
        const vol = p.weeklyVolume as Record<string, unknown> | undefined;
        return {
            id: String(p.id || 'unknown'),
            label: String(p.label || 'Plan'),
            description: String(p.description || ''),
            weeklyVolume: {
                min: Number(vol?.min || 20000),
                max: Number(vol?.max || 40000),
            },
            peakWeekDistance: Number(p.peakWeekDistance || 40000),
            qualitySessionsPerWeek: Number(p.qualitySessionsPerWeek || 2),
            longRunPeak: Number(p.longRunPeak || 18000),
            confidence: Math.min(1, Math.max(0, Number(p.confidence || 0.5))),
            totalWeeks: Number(p.totalWeeks || config.availableWeeks),
            highlights: Array.isArray(p.highlights) ? p.highlights.map(String) : [],
        };
    });
}

function generateAlgorithmicProposals(
    config: {
        raceType: RaceType;
        vdot: number;
        availableWeeks: number;
        weeklyMileageGoal?: number | null;
        runsPerWeek?: number;
        experience?: string;
    },
): AiPlanProposal[] {
    const { raceType, vdot, availableWeeks } = config;
    const paces = calculateTrainingPaces(vdot);

    const basePeak = config.weeklyMileageGoal || PLAN_CONSTANTS.MIN_PEAK_VOLUME[raceType] || 40000;
    const baseLongRun = PLAN_CONSTANTS.MAX_LONG_RUN_DIST[raceType] || 18000;
    const baseWeeks = availableWeeks;

    const isExperienced = config.experience === '1-3 years' || config.experience === '3+ years';
    const isBeginner = config.experience === '<6 months' || config.experience === '6-12 months';

    if (isBeginner) {
        return [
            {
                id: 'conservative',
                label: 'Beginner Friendly',
                description: 'Gentle build with extra recovery. Ideal if you are new to the distance.',
                weeklyVolume: { min: Math.round(basePeak * 0.4), max: Math.round(basePeak * 0.65) },
                peakWeekDistance: Math.round(basePeak * 0.65),
                qualitySessionsPerWeek: 1,
                longRunPeak: Math.round(baseLongRun * 0.65),
                confidence: 0.95,
                totalWeeks: Math.max(baseWeeks, 12),
                highlights: [
                    '4-week cycles with recovery every 4th week',
                    'Maximum 10% weekly volume increase',
                    'Single quality session per week',
                    'Extra rest days between hard efforts',
                ],
            },
            {
                id: 'balanced',
                label: 'Steady Progression',
                description: 'Standard build with 2 quality sessions. Recommended for most runners.',
                weeklyVolume: { min: Math.round(basePeak * 0.5), max: Math.round(basePeak * 0.80) },
                peakWeekDistance: Math.round(basePeak * 0.80),
                qualitySessionsPerWeek: 2,
                longRunPeak: Math.round(baseLongRun * 0.80),
                confidence: 0.80,
                totalWeeks: baseWeeks,
                highlights: [
                    '3-week build + 1 recovery cycle',
                    'Two quality sessions (intervals + tempo)',
                    'Progressive long run buildup',
                    'Standard 2-3 week taper',
                ],
            },
            {
                id: 'aggressive',
                label: 'Ambitious Build',
                description: 'Higher volume with more intensity. Best if you have a strong aerobic base.',
                weeklyVolume: { min: Math.round(basePeak * 0.6), max: Math.round(basePeak * 0.95) },
                peakWeekDistance: Math.round(basePeak * 0.95),
                qualitySessionsPerWeek: 2,
                longRunPeak: Math.round(baseLongRun * 0.95),
                confidence: 0.55,
                totalWeeks: Math.min(baseWeeks, 14),
                highlights: [
                    'Compressed timeline with faster ramp',
                    'Higher peak volume',
                    'Race-pace long run segments',
                    'Shorter taper (less fitness loss risk)',
                ],
            },
        ];
    }

    return [
        {
            id: 'conservative',
            label: 'Conservative Build',
            description: 'Lower risk, steady progression. Best if returning from injury or new to the distance.',
            weeklyVolume: { min: Math.round(basePeak * 0.50), max: Math.round(basePeak * 0.70) },
            peakWeekDistance: Math.round(basePeak * 0.70),
            qualitySessionsPerWeek: isExperienced ? 2 : 1,
            longRunPeak: Math.round(baseLongRun * 0.75),
            confidence: 0.92,
            totalWeeks: Math.max(baseWeeks, 12),
            highlights: [
                '3-week cycles with 1 recovery week',
                'Gradual long run buildup (10% max weekly increase)',
                `${isExperienced ? 'Two quality sessions (interval + tempo)' : 'Single quality session per week'}`,
                'Extended taper for maximum freshness',
            ],
        },
        {
            id: 'balanced',
            label: 'Balanced Plan',
            description: 'Standard periodization. Recommended for most runners with 1+ year experience.',
            weeklyVolume: { min: Math.round(basePeak * 0.60), max: Math.round(basePeak * 0.90) },
            peakWeekDistance: Math.round(basePeak * 0.90),
            qualitySessionsPerWeek: 2,
            longRunPeak: Math.round(baseLongRun * 0.90),
            confidence: 0.85,
            totalWeeks: baseWeeks,
            highlights: [
                '3-week build + 1 recovery cycle',
                'Two quality sessions per week',
                'Progressive long run to race-distance ratio',
                'Standard taper based on race distance',
                `Easy pace: ${formatPaceSec(paces.easy.min)}-${formatPaceSec(paces.easy.max)}/km`,
            ],
        },
        {
            id: 'aggressive',
            label: 'High Performance',
            description: 'Higher volume and intensity. For experienced runners targeting a significant PR.',
            weeklyVolume: { min: Math.round(basePeak * 0.75), max: basePeak },
            peakWeekDistance: basePeak,
            qualitySessionsPerWeek: 3,
            longRunPeak: baseLongRun,
            confidence: isExperienced ? 0.75 : 0.55,
            totalWeeks: Math.min(baseWeeks, 16),
            highlights: [
                'Higher weekly volume with 3 quality sessions',
                'Faster ramp with aggressive peak weeks',
                'Race-pace segments in long runs',
                'Compressed taper (maintain fitness)',
                `Threshold pace: ${formatPaceSec(paces.threshold)}/km`,
            ],
        },
    ];
}

function formatPaceSec(secPerKm: number): string {
    const mins = Math.floor(secPerKm / 60);
    const secs = Math.round(secPerKm % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}
