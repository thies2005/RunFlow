import { prisma } from '@/lib/db';
import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import ClientAnalysis from '@/components/analysis/ClientAnalysis';
import { Activity } from '@/lib/types';

export default async function AnalysisPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const session = await auth();

    if (!session || !session.user) {
        redirect('/login');
    }

    const activity = await prisma.activity.findUnique({
        where: { id },
    });

    if (!activity) {
        return <div className="p-8 text-center text-gray-400">Activity not found</div>;
    }

    if (activity.userId !== session.user.id) {
        return <div className="p-8 text-center text-red-400">Unauthorized</div>;
    }

    return <ClientAnalysis activity={activity as unknown as Activity} />;
}
