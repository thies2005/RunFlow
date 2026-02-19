import { prisma } from '@/lib/db';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const goals = await prisma.goal.findMany();
        const users = await prisma.user.findMany({ select: { id: true, email: true, name: true } });
        return NextResponse.json({ goals, users });
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
