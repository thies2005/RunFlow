import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import { checkRateLimitAsync } from '@/lib/rateLimit';

export async function GET() {
    try {
        const session = await auth();

        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Apply rate limiting (max 3 exports per hour)
        const rateLimitResult = await checkRateLimitAsync(session.user.id, {
            limit: 3,
            windowSeconds: 3600,
            prefix: 'export_data',
        });

        if (!rateLimitResult.allowed) {
            return NextResponse.json(
                { error: 'Rate limit exceeded. Please try again later.' },
                { status: 429 }
            );
        }

        // Fetch user with ALL associated data for export (GDPR Right to Portability)
        const user = await prisma.user.findUnique({
            where: { id: session.user.id },
            include: {
                activities: {
                    select: {
                        name: true,
                        type: true,
                        startDate: true,
                        distance: true,
                        movingTime: true,
                        totalElevation: true,
                        averageHr: true,
                        maxHr: true,
                        calories: true,
                        averageCadence: true,
                        estimatedVdot: true,
                        trimp: true,
                        stravaId: true,
                    },
                    orderBy: { startDate: 'desc' }
                },
                goals: {
                    select: {
                        name: true,
                        raceType: true,
                        targetTime: true,
                        raceDate: true,
                        isActive: true,
                    }
                },
                DailyFitness: {
                    select: {
                        date: true,
                        trimp: true,
                        ctl: true,
                        atl: true,
                        tsb: true,
                    },
                    orderBy: { date: 'desc' }
                },
                dailyHealthLogs: {
                    select: {
                        date: true,
                        steps: true,
                        weight: true,
                    },
                    orderBy: { date: 'desc' }
                },
                supplements: {
                    select: {
                        name: true,
                        amount: true,
                        unit: true,
                        timeOfDay: true,
                        isActive: true,
                        logs: {
                            select: {
                                date: true,
                                taken: true,
                            },
                        }
                    },
                },
                chatSessions: {
                    select: {
                        title: true,
                        createdAt: true,
                        messages: {
                            select: {
                                role: true,
                                content: true,
                                createdAt: true,
                            },
                            orderBy: { createdAt: 'asc' }
                        }
                    },
                    orderBy: { createdAt: 'desc' }
                },
                nutritionLogs: {
                    select: {
                        date: true,
                        mealType: true,
                        quantity: true,
                        calories: true,
                        protein: true,
                        carbs: true,
                        fats: true,
                        foodItem: {
                            select: {
                                name: true,
                                calories: true,
                                protein: true,
                                carbs: true,
                                fats: true,
                                barcode: true,
                            },
                        },
                    },
                    orderBy: { date: 'desc' },
                },
                bodyMeasurements: {
                    select: {
                        date: true,
                        weight: true,
                        bodyFat: true,
                        muscleMass: true,
                        chest: true,
                        waist: true,
                        hips: true,
                        arms: true,
                        thighs: true,
                    },
                    orderBy: { date: 'desc' },
                },
                fastingSessions: {
                    select: {
                        startTime: true,
                        endTime: true,
                    },
                    orderBy: { startTime: 'desc' },
                },
                healthInsights: {
                    select: {
                        date: true,
                        content: true,
                    },
                    orderBy: { date: 'desc' },
                },
                dailyReadinessRecords: {
                    select: {
                        date: true,
                        compositeScore: true,
                        state: true,
                        confidence: true,
                        computedAt: true,
                    },
                    orderBy: { date: 'desc' },
                },
                readinessBaselines: {
                    select: {
                        rhrMedian30Day: true,
                        sleepAverage28Day: true,
                        lastUpdated: true,
                    },
                },
                deviceTokens: {
                    select: {
                        platform: true,
                        createdAt: true,
                        updatedAt: true,
                    },
                },
                pushSubscriptions: {
                    select: {
                        endpoint: true,
                        createdAt: true,
                    },
                },
                savedMeals: {
                    select: {
                        name: true,
                        totalCalories: true,
                        totalProtein: true,
                        totalCarbs: true,
                        totalFats: true,
                        items: {
                            select: {
                                name: true,
                                estimatedGrams: true,
                                calories: true,
                                protein: true,
                                carbs: true,
                                fats: true,
                            },
                        },
                    },
                    orderBy: { createdAt: 'desc' },
                },
                foodFavorites: {
                    select: {
                        foodName: true,
                        brand: true,
                        calories: true,
                        protein: true,
                        carbs: true,
                        fats: true,
                        servingSize: true,
                        barcode: true,
                    },
                    orderBy: { createdAt: 'desc' },
                },
                reminderSettings: true,
                nutritionTarget: {
                    select: {
                        dailyCalories: true,
                        proteinPercent: true,
                        carbsPercent: true,
                        fatsPercent: true,
                        exerciseCalorieFactor: true,
                        waterGoalMl: true,
                        waterTrackingEnabled: true,
                        exerciseCalorieSource: true,
                        fastingEnabled: true,
                        fastingGoalHours: true,
                        aiInsightProvider: true,
                    },
                },
                aiSettings: {
                    select: {
                        aiEnabled: true,
                        usageTier: true,
                        messagesUsedToday: true,
                        messagesUsedThisMonth: true,
                        lastUsageReset: true,
                    },
                },
                consents: {
                    select: {
                        consentType: true,
                        action: true,
                        policyVersion: true,
                        createdAt: true,
                    },
                    orderBy: { createdAt: 'desc' },
                },
                weekTemplates: {
                    select: {
                        name: true,
                        description: true,
                        days: true,
                        isDefault: true,
                        createdAt: true,
                    },
                    orderBy: { createdAt: 'desc' },
                },
                guidedPlanSessions: {
                    select: {
                        currentStep: true,
                        responses: true,
                        aiRecommendation: true,
                        isComplete: true,
                        createdAt: true,
                    },
                    orderBy: { createdAt: 'desc' },
                },
                notifications: {
                    select: {
                        message: true,
                        read: true,
                        createdAt: true,
                    },
                    orderBy: { createdAt: 'desc' },
                },
                feedbackJobs: {
                    select: {
                        status: true,
                        priority: true,
                        createdAt: true,
                        completedAt: true,
                    },
                    orderBy: { createdAt: 'desc' },
                },
                adaptedWorkouts: {
                    select: {
                        date: true,
                        originalType: true,
                        adaptedType: true,
                        adaptationType: true,
                        originalTargetDistance: true,
                        adaptedTargetDistance: true,
                        originalTargetDuration: true,
                        adaptedTargetDuration: true,
                        reason: true,
                        readinessScore: true,
                        readinessState: true,
                        isAccepted: true,
                    },
                    orderBy: { date: 'desc' },
                },
                weeklyReconciliationRecords: {
                    select: {
                        weekStartDate: true,
                        plannedLoad: true,
                        actualLoad: true,
                        adaptedLoad: true,
                        deficitPercent: true,
                        surplusPercent: true,
                        adjustmentDescription: true,
                        isApplied: true,
                    },
                    orderBy: { weekStartDate: 'desc' },
                },
                apiKey: {
                    select: {
                        name: true,
                        keyPrefix: true,
                        createdAt: true,
                        lastUsedAt: true,
                        expiresAt: true,
                    },
                },
            },
        });

        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        // Clean up sensitive/internal fields before exporting
        const {
            passwordHash,
            isAdmin,
            stravaAccessToken,
            stravaRefreshToken,
            stravaTokenExpiry,
            ...safeUserData
        } = user;

        void passwordHash;
        void isAdmin;
        void stravaAccessToken;
        void stravaRefreshToken;
        void stravaTokenExpiry;

        const dateStr = new Date().toISOString().split('T')[0];
        const filename = `runflow-data-export-${dateStr}.json`;

        // Create response with JSON download headers, handling BigInt serialization
        return new NextResponse(
            JSON.stringify(
                safeUserData,
                (key, value) => (typeof value === 'bigint' ? value.toString() : value),
                2
            ),
            {
                status: 200,
                headers: {
                    'Content-Type': 'application/json',
                    'Content-Disposition': `attachment; filename="${filename}"`,
                    'Cache-Control': 'no-store, max-age=0',
                },
            }
        );
    } catch (error) {
        console.error('Data export error:', error);
        return NextResponse.json(
            { error: 'Internal server error while generating export' },
            { status: 500 }
        );
    }
}
