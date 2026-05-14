import { NextRequest, NextResponse } from 'next/server';
import { recalculateWorkoutPaces } from '@/lib/plans/recalculate-paces';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { goalId, newVdot } = body;

        if (!goalId || !newVdot || typeof newVdot !== 'number' || newVdot < 20 || newVdot > 85) {
            return NextResponse.json(
                { error: 'Invalid goalId or newVdot' },
                { status: 400 }
            );
        }

        const result = await recalculateWorkoutPaces(goalId, newVdot);

        return NextResponse.json(result);
    } catch (error) {
        console.error('Error recalculating paces:', error);
        return NextResponse.json(
            { error: 'Failed to recalculate paces' },
            { status: 500 }
        );
    }
}
