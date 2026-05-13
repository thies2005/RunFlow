import { RaceType, PlanPhase } from '@/generated/prisma/browser';

export type MultiGoalConfig = {
    primaryGoal: {
        raceType: RaceType;
        raceDate: Date;
        planStartDate: Date;
        vdot: number;
    };
    subGoals: Array<{
        id: string;
        name: string;
        raceType: RaceType;
        raceDate: Date;
        priority: 'SECONDARY' | 'TUNE_UP' | 'MILESTONE';
    }>;
    weeksTotal: number;
};

export type MultiGoalPhase = {
    weekIndex: number;
    phase: PlanPhase;
    focusGoalId: string;
    focusGoalName: string;
    volumeMultiplier: number;
    phaseLabel: string;
    isRaceWeek: boolean;
    isRecoveryWeek: boolean;
};

export type ConflictWarning = {
    goal1Id: string;
    goal1Name: string;
    goal2Id: string;
    goal2Name: string;
    message: string;
    suggestion: string;
};

export function generateMultiGoalPhases(config: MultiGoalConfig): MultiGoalPhase[] {
    const { primaryGoal, subGoals, weeksTotal } = config;
    const phases: MultiGoalPhase[] = [];

    const primaryRaceWeek = getWeekIndex(primaryGoal.planStartDate, primaryGoal.raceDate);
    const primaryTaperWeeks = getDefaultTaperWeeks(primaryGoal.raceType);
    const primaryPeakWeeks = 2;
    const primaryBuildWeeks = Math.min(6, Math.max(2, Math.floor((primaryRaceWeek - primaryTaperWeeks) * 0.35)));

    const subGoalWeeks = subGoals.map(sg => ({
        ...sg,
        raceWeek: getWeekIndex(primaryGoal.planStartDate, sg.raceDate),
    }));

    const focusBlocks = subGoalWeeks.map(sg => {
        if (sg.priority === 'MILESTONE') return null;
        if (sg.priority === 'TUNE_UP') return generateTuneUpBlock(sg);
        return generateSecondaryBlock(sg);
    }).filter((b): b is NonNullable<typeof b> => b !== null);

    for (let w = 0; w < weeksTotal; w++) {
        const weekNum = w + 1;
        const primaryWeeksUntil = primaryRaceWeek - w;

        let phase: PlanPhase;
        let focusGoalId = 'primary';
        let focusGoalName = 'Primary Goal';
        let volumeMultiplier = 1.0;
        let phaseLabel = '';
        let isRaceWeek = false;
        let isRecoveryWeek = false;

        const activeBlock = focusBlocks.find(b => w >= b.startWeek && w <= b.endWeek);

        if (activeBlock) {
            focusGoalId = activeBlock.goalId;
            focusGoalName = activeBlock.goalName;
            phaseLabel = `${activeBlock.blockType} → ${activeBlock.goalName}`;
            isRaceWeek = activeBlock.raceWeek === w;
            isRecoveryWeek = activeBlock.recoveryWeek === w;

            if (isRaceWeek) {
                phase = 'RACE_WEEK';
                volumeMultiplier = 0.4;
            } else if (isRecoveryWeek) {
                phase = 'RECOVERY';
                volumeMultiplier = activeBlock.recoveryMultiplier;
            } else if (activeBlock.taperWeek === w) {
                phase = 'TAPER';
                volumeMultiplier = activeBlock.taperMultiplier;
            } else {
                phase = 'TUNE_UP';
                volumeMultiplier = activeBlock.focusMultiplier;
            }
        } else if (primaryWeeksUntil === 1) {
            phase = 'RACE_WEEK';
            phaseLabel = `RACE WEEK → Primary`;
            isRaceWeek = true;
            volumeMultiplier = 0.4;
        } else if (primaryWeeksUntil > 1 && primaryWeeksUntil <= primaryTaperWeeks) {
            phase = 'TAPER';
            const taperFraction = primaryWeeksUntil === primaryTaperWeeks ? 0.80 : primaryWeeksUntil === primaryTaperWeeks - 1 ? 0.65 : 0.50;
            volumeMultiplier = taperFraction;
            phaseLabel = `TAPER → Primary`;
        } else if (primaryWeeksUntil > primaryTaperWeeks && primaryWeeksUntil <= primaryTaperWeeks + primaryPeakWeeks) {
            phase = 'PEAK';
            volumeMultiplier = 1.0;
            phaseLabel = 'PEAK → Primary';
        } else if (primaryWeeksUntil > primaryTaperWeeks + primaryPeakWeeks && primaryWeeksUntil <= primaryTaperWeeks + primaryPeakWeeks + primaryBuildWeeks) {
            phase = 'BUILD';
            volumeMultiplier = 1.0;
            phaseLabel = 'BUILD → Primary';
        } else {
            phase = 'BASE';
            volumeMultiplier = 1.0;
            phaseLabel = 'BASE';
        }

        if (!phaseLabel) {
            phaseLabel = phase;
        }

        const recoveryCycle = (w + 1) % 4 === 0;
        if (recoveryCycle && !isRaceWeek && !isRecoveryWeek && !activeBlock && phase !== 'TAPER' && phase !== 'RACE_WEEK') {
            isRecoveryWeek = true;
            volumeMultiplier = Math.min(volumeMultiplier, 0.8);
        }

        phases.push({
            weekIndex: w,
            phase,
            focusGoalId,
            focusGoalName,
            volumeMultiplier,
            phaseLabel,
            isRaceWeek,
            isRecoveryWeek,
        });
    }

    return phases;
}

type FocusBlock = {
    goalId: string;
    goalName: string;
    raceWeek: number;
    startWeek: number;
    endWeek: number;
    taperWeek: number;
    taperMultiplier: number;
    raceWeekMultiplier: number;
    recoveryWeek: number;
    recoveryMultiplier: number;
    focusMultiplier: number;
    blockType: string;
};

function generateSecondaryBlock(sg: { id: string; name: string; raceWeek: number }): FocusBlock {
    const taperWeek = sg.raceWeek - 1;
    const startWeek = Math.max(0, taperWeek - 1);
    const recoveryWeek = sg.raceWeek + 1;
    const endWeek = recoveryWeek;

    return {
        goalId: sg.id,
        goalName: sg.name,
        raceWeek: sg.raceWeek,
        startWeek,
        endWeek,
        taperWeek,
        taperMultiplier: 0.65,
        raceWeekMultiplier: 0.4,
        recoveryWeek,
        recoveryMultiplier: 0.60,
        focusMultiplier: 0.80,
        blockType: 'SECONDARY',
    };
}

function generateTuneUpBlock(sg: { id: string; name: string; raceWeek: number }): FocusBlock {
    const taperWeek = sg.raceWeek - 1;
    const startWeek = taperWeek;
    const recoveryWeek = sg.raceWeek + 1;
    const endWeek = recoveryWeek;

    return {
        goalId: sg.id,
        goalName: sg.name,
        raceWeek: sg.raceWeek,
        startWeek,
        endWeek,
        taperWeek,
        taperMultiplier: 0.70,
        raceWeekMultiplier: 0.5,
        recoveryWeek,
        recoveryMultiplier: 0.85,
        focusMultiplier: 0.85,
        blockType: 'TUNE_UP',
    };
}

export function calculateVolumeForWeek(
    weekIndex: number,
    phases: MultiGoalPhase[],
    baseVolume: number,
): number {
    const phase = phases[weekIndex];
    if (!phase) return baseVolume;

    const effectiveBase = getEffectiveBaseVolume(weekIndex, phases, baseVolume);
    return Math.round(effectiveBase * phase.volumeMultiplier);
}

function getEffectiveBaseVolume(
    weekIndex: number,
    phases: MultiGoalPhase[],
    peakVolume: number,
): number {
    const startVolume = peakVolume * 0.6;
    const rampWeeks = phases.filter(p => p.phase === 'BASE').length;
    const effectiveRampWeeks = Math.max(1, rampWeeks - Math.floor(rampWeeks / 4));
    const growthRate = rampWeeks > 0 ? Math.pow(peakVolume / startVolume, 1 / effectiveRampWeeks) : 1;

    let rampIndex = 0;
    let lastNonRecovery = startVolume;

    for (let i = 0; i <= weekIndex; i++) {
        const p = phases[i];
        if (p.phase === 'BASE' || p.phase === 'BUILD' || p.phase === 'PEAK') {
            if (p.isRecoveryWeek) {
                continue;
            }
            rampIndex++;
            lastNonRecovery = Math.min(
                Math.round(startVolume * Math.pow(growthRate, rampIndex)),
                peakVolume,
            );
        }
    }

    return lastNonRecovery;
}

export function resolveConflicts(
    subGoals: MultiGoalConfig['subGoals'],
): ConflictWarning[] {
    const warnings: ConflictWarning[] = [];
    const sorted = [...subGoals].sort((a, b) => a.raceDate.getTime() - b.raceDate.getTime());

    for (let i = 0; i < sorted.length; i++) {
        for (let j = i + 1; j < sorted.length; j++) {
            const daysApart = Math.abs(sorted[j].raceDate.getTime() - sorted[i].raceDate.getTime()) / (1000 * 60 * 60 * 24);
            const weeksApart = daysApart / 7;

            if (weeksApart < 3) {
                warnings.push({
                    goal1Id: sorted[i].id,
                    goal1Name: sorted[i].name,
                    goal2Id: sorted[j].id,
                    goal2Name: sorted[j].name,
                    message: `"${sorted[i].name}" and "${sorted[j].name}" are only ${Math.round(weeksApart * 7)} days apart.`,
                    suggestion: weeksApart < 2
                        ? 'Consider treating these as a single race weekend. Remove one from sub-goals.'
                        : 'Consider merging these into a single focus block with a shared taper.',
                });
            }
        }
    }

    if (subGoals.length > 4) {
        warnings.push({
            goal1Id: subGoals[0].id,
            goal1Name: subGoals[0].name,
            goal2Id: subGoals[subGoals.length - 1].id,
            goal2Name: subGoals[subGoals.length - 1].name,
            message: `You have ${subGoals.length} sub-goals. This may create a congested plan.`,
            suggestion: 'Consider prioritizing your top 3-4 goals and treating the rest as training runs.',
        });
    }

    return warnings;
}

function getWeekIndex(startDate: Date, targetDate: Date): number {
    const diffMs = targetDate.getTime() - startDate.getTime();
    return Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24 * 7)));
}

function getDefaultTaperWeeks(raceType: RaceType): number {
    switch (raceType) {
        case 'FIVE_K': return 1;
        case 'TEN_K': return 2;
        case 'HALF_MARATHON': return 2;
        case 'MARATHON': return 3;
        case 'HUNDRED_MILE': return 4;
        case 'FULL_IRONMAN': return 4;
        case 'HALF_IRONMAN': return 3;
        default: return 2;
    }
}
