/**
 * POST /api/plan-advanced/[goalId]/mywhoosh/import-files
 *
 * Imports user-supplied MyWhoosh workout-JSON (.json) and Zwift .zwo files as
 * workouts on an existing plan. Files are parsed locally and never sent
 * anywhere (feature rule: no MyWhoosh hosts are contacted, ever).
 *
 * Mapping (per sdd/task-2-brief): one workout row per parsed workout, dated
 * startDate + index days in stable file-then-in-file order, classified with
 * the Task-1 helpers, snapshotted before the transactional createMany.
 */
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getAuthenticatedUser } from '@/lib/mobile/auth';
import { prisma } from '@/lib/db';
import { checkRateLimitAsync, getClientIdentifier, RATE_LIMITS } from '@/lib/rateLimit';
import { ApiError, handleApiError } from '@/lib/apiError';
import { createSnapshot } from '@/lib/plan/snapshot';
import { PlanPhase } from '@/generated/prisma/client';
import type { Prisma } from '@/generated/prisma/client';
import {
    classifyImportedWorkout,
    decodeXmlEntities,
    parseMyWhooshStepsToStructuredV2,
    parseMyWhooshWorkoutFile,
    parseZwoXmlToStructuredV2,
} from '@/lib/mywhoosh/parser';
import type { StepNode, StructuredWorkoutV2 } from '@/lib/plans/structured';

/** createMany input with a definite Date scheduledDate (the Prisma type also allows ISO strings). */
type WorkoutRow = Omit<Prisma.WorkoutCreateManyInput, 'scheduledDate'> & { scheduledDate: Date };

export const dynamic = 'force-dynamic';

type RouteContext = { params: Promise<{ goalId: string }> };

/**
 * Upload bounds — the same 5MB total budget as the CSV importer, plus a
 * file-count cap and a flattened-workout cap so parsing and row creation
 * stay bounded.
 */
const MAX_TOTAL_BYTES = 5 * 1024 * 1024;
const MAX_FILES = 100;
const MAX_WORKOUTS = 500;
const DAY_MS = 24 * 60 * 60 * 1000;

const StartDateSchema = z
    .string()
    .refine((value) => !Number.isNaN(new Date(value).getTime()), {
        message: 'startDate must be a valid ISO date string',
    });

type RejectedFile = { file: string; reason: string };

/** One importable workout flattened out of a file, pre-classification. */
interface ImportedWorkout {
    fileName: string;
    name: string | null;
    description: string | null;
    plannedTss: number | null;
    intensityFactor: number | null;
    xmlSportType: string | null;
    structured: StructuredWorkoutV2;
    durationSeconds: number;
    ftpPercent: number | null;
}

export async function POST(request: NextRequest, ctx: RouteContext) {
    try {
        // Dual auth: NextAuth session (web) or mobile JWT Bearer (app).
        const user = await getAuthenticatedUser(request);
        if (!user) {
            throw ApiError.unauthorized();
        }

        const clientId = getClientIdentifier(request);
        const rateLimitResult = await checkRateLimitAsync(clientId, RATE_LIMITS.settings);
        if (!rateLimitResult.allowed) {
            throw ApiError.rateLimited('Too many requests. Please try again later.', rateLimitResult);
        }

        const { goalId } = await ctx.params;

        const goal = await prisma.goal.findFirst({
            where: { id: goalId, userId: user.id, deletedAt: null },
            select: { id: true },
        });
        if (!goal) {
            throw ApiError.notFound('Plan');
        }

        const contentType = request.headers.get('content-type') || '';
        if (!contentType.includes('multipart/form-data')) {
            throw ApiError.validation('Expected multipart/form-data with files and startDate');
        }

        const formData = await request.formData();
        const startDateRaw = formData.get('startDate');
        const startDate = StartDateSchema.safeParse(startDateRaw);
        if (!startDate.success) {
            throw ApiError.validation('startDate must be a valid ISO date string');
        }

        const files = formData.getAll('files').filter((entry): entry is File => entry instanceof File);
        if (files.length === 0) {
            throw ApiError.validation('At least one .zwo or .json file is required');
        }
        if (files.length > MAX_FILES) {
            throw ApiError.payloadTooLarge(
                `Too many files: ${files.length} exceeds the ${MAX_FILES}-file limit`,
            );
        }
        // Bound the upload before materializing any of it as strings
        // (file.size is available on the File object before .text()).
        const totalBytes = files.reduce((sum, file) => sum + file.size, 0);
        if (totalBytes > MAX_TOTAL_BYTES) {
            throw ApiError.payloadTooLarge(
                `Upload exceeds the ${MAX_TOTAL_BYTES / (1024 * 1024)}MB total size limit`,
            );
        }

        const { workouts: imported, rejectedFiles } = await parseFiles(files);

        if (rejectedFiles.length > 0) {
            throw ApiError.unprocessable(
                `Failed to parse ${rejectedFiles.length} file(s): ${rejectedFiles
                    .map((r) => `${r.file} (${r.reason})`)
                    .join('; ')}`,
                { rejectedFiles },
            );
        }
        if (imported.length === 0) {
            throw ApiError.validation('No workouts found in the uploaded files');
        }
        if (imported.length > MAX_WORKOUTS) {
            throw ApiError.payloadTooLarge(
                `Import contains ${imported.length} workouts; the limit is ${MAX_WORKOUTS}`,
            );
        }

        const rows = toWorkoutRows(goalId, new Date(startDate.data), imported);

        // Snapshot BEFORE mutation so the import is undoable, same as csv import.
        await createSnapshot(goalId, 'Before MyWhoosh file import', 'mywhoosh_file_import');

        await prisma.$transaction(async (tx) => {
            await tx.workout.createMany({ data: rows });
        });

        return NextResponse.json({
            created: rows.length,
            firstDate: rows[0].scheduledDate.toISOString(),
            lastDate: rows[rows.length - 1].scheduledDate.toISOString(),
            filesProcessed: files.length,
            rejectedFiles: [],
        });
    } catch (error) {
        return handleApiError(error, { path: '/api/plan-advanced/[goalId]/mywhoosh/import-files' });
    }
}

// ==========================================
// File parsing (local only — no network)
// ==========================================

async function parseFiles(files: File[]): Promise<{ workouts: ImportedWorkout[]; rejectedFiles: RejectedFile[] }> {
    const workouts: ImportedWorkout[] = [];
    const rejectedFiles: RejectedFile[] = [];

    // Stable order: file order, then in-file order (JSON arrays).
    for (const file of files) {
        const text = await file.text();
        try {
            if (isZwoXml(file.name, text)) {
                workouts.push(importZwo(file.name, text));
            } else {
                workouts.push(...importMyWhooshJson(file.name, text));
            }
        } catch (error) {
            rejectedFiles.push({
                file: file.name,
                reason: error instanceof Error ? error.message : 'Unrecognized file content',
            });
        }
    }

    return { workouts, rejectedFiles };
}

/** .zwo extension OR a '<' as the first non-whitespace character means Zwift XML. */
function isZwoXml(fileName: string, text: string): boolean {
    if (/\.zwo$/i.test(fileName)) return true;
    return startsWithXml(text);
}

function startsWithXml(text: string): boolean {
    for (const ch of text.slice(0, 64)) {
        if (ch === ' ' || ch === '\t' || ch === '\r' || ch === '\n') continue;
        return ch === '<';
    }
    return false;
}

function importZwo(fileName: string, xml: string): ImportedWorkout {
    const structured = parseZwoXmlToStructuredV2(xml);
    // The JSON path needs no decoding; raw XML tag text stores entities literally.
    const rawName = zwoTagText(xml, 'name');
    const rawDescription = zwoTagText(xml, 'description');
    return finalizeImport(fileName, structured, {
        name: rawName === null ? null : decodeXmlEntities(rawName),
        description: rawDescription === null ? null : decodeXmlEntities(rawDescription),
        plannedTss: null,
        intensityFactor: null,
        xmlSportType: zwoTagText(xml, 'sportType'),
    });
}

function importMyWhooshJson(fileName: string, text: string): ImportedWorkout[] {
    const json: unknown = JSON.parse(text);
    const entries: unknown[] = Array.isArray(json) ? json : [json];
    const fallbackName = fileName.replace(/\.[^.]+$/, '');
    return entries.map((entry) => {
        const wf = parseMyWhooshWorkoutFile(entry, fallbackName);
        return finalizeImport(fileName, parseMyWhooshStepsToStructuredV2(wf.steps), {
            name: wf.name,
            description: wf.description,
            plannedTss: wf.tss,
            intensityFactor: wf.intensityFactor,
            xmlSportType: null,
        });
    });
}

function finalizeImport(
    fileName: string,
    structured: StructuredWorkoutV2,
    meta: {
        name: string | null;
        description: string | null;
        plannedTss: number | null;
        intensityFactor: number | null;
        xmlSportType: string | null;
    },
): ImportedWorkout {
    return {
        fileName,
        structured,
        durationSeconds: sumStepSeconds(structured),
        ftpPercent: dominantFtpPercent(structured),
        ...meta,
    };
}

/** First `<tag>…</tag>` text (trimmed, bounded), or null. Linear scan — the
 *  negated character class cannot backtrack. */
function zwoTagText(xml: string, tag: string): string | null {
    const match = xml.match(new RegExp(`<${tag}\\s*>([^<]{0,4096})</${tag}\\s*>`, 'i'));
    const value = match?.[1]?.trim();
    return value ? value : null;
}

/** Total seconds across all leaf steps, repeat nodes multiplied by their times. */
function sumStepSeconds(workout: StructuredWorkoutV2): number {
    let total = 0;
    function visit(nodes: StepNode[], multiplier: number) {
        for (const node of nodes) {
            if (node.kind === 'repeat') {
                visit(node.steps, multiplier * node.times);
            } else if (node.duration.type === 'time') {
                total += node.duration.seconds * multiplier;
            }
        }
    }
    visit(workout.steps, 1);
    return total;
}

/**
 * FTP percent of the dominant work/steady step: the power-targeted step with
 * the largest (multiplied) duration. Free-ride and non-power steps carry no
 * percent, so a free ride maps to null.
 */
function dominantFtpPercent(workout: StructuredWorkoutV2): number | null {
    let bestSeconds = -1;
    let bestPercent: number | null = null;
    function visit(nodes: StepNode[], multiplier: number) {
        for (const node of nodes) {
            if (node.kind === 'repeat') {
                visit(node.steps, multiplier * node.times);
                continue;
            }
            if (node.kind !== 'work' && node.kind !== 'steady') continue;
            const target = node.target;
            if (target?.type !== 'power' || target.ftpPercent === undefined) continue;
            const seconds = node.duration.type === 'time' ? node.duration.seconds * multiplier : 0;
            if (seconds > bestSeconds) {
                bestSeconds = seconds;
                bestPercent = target.ftpPercent;
            }
        }
    }
    visit(workout.steps, 1);
    return bestPercent;
}

// ==========================================
// Row mapping + persistence
// ==========================================

function toWorkoutRows(goalId: string, baseDate: Date, imported: ImportedWorkout[]): WorkoutRow[] {
    return imported.map((workout, index) => {
        const { workoutType, sport } = classifyImportedWorkout({
            name: workout.name ?? workout.fileName,
            xmlSportType: workout.xmlSportType,
            steps: workout.structured,
            durationSeconds: workout.durationSeconds,
            intensityFactor: workout.intensityFactor,
        });
        return {
            goalId,
            scheduledDate: new Date(baseDate.getTime() + index * DAY_MS),
            workoutType,
            sport,
            description: workout.description ?? `Imported from MyWhoosh/.zwo file ${workout.fileName}`,
            customName: workout.name,
            phase: PlanPhase.BASE,
            plannedTss: workout.plannedTss,
            targetDuration: workout.durationSeconds > 0 ? workout.durationSeconds : null,
            targetFtpPercent: workout.ftpPercent,
            structuredSteps: workout.structured as unknown as Prisma.InputJsonValue,
            order: index,
        };
    });
}
