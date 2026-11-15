import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { generateMealSuggestion, mealSuggestErrorResponse } from '@/lib/ai/mealSuggest';

export async function POST(request: Request) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        let body: unknown;
        try {
            body = await request.json();
        } catch {
            return NextResponse.json({ error: 'Invalid JSON request body' }, { status: 400 });
        }

        if (!body || typeof body !== 'object') {
            return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
        }

        const { remainingCalories, remainingProtein, remainingCarbs, remainingFats } = body as {
            remainingCalories?: number;
            remainingProtein?: number;
            remainingCarbs?: number;
            remainingFats?: number;
        };

        if (
            remainingCalories === undefined ||
            remainingCalories === null ||
            !Number.isFinite(Number(remainingCalories))
        ) {
            return NextResponse.json({ error: 'Missing remaining macro data' }, { status: 400 });
        }

        const suggestion = await generateMealSuggestion({
            userId: session.user.id,
            remainingCalories: Number(remainingCalories),
            remainingProtein: Number(remainingProtein ?? 0),
            remainingCarbs: Number(remainingCarbs ?? 0),
            remainingFats: Number(remainingFats ?? 0),
            logPrefix: '[AI Meal Suggester]',
        });

        return NextResponse.json(suggestion);
    } catch (error) {
        return mealSuggestErrorResponse(error, '[AI Meal Suggester]');
    }
}
