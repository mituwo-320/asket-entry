import { NextResponse } from 'next/server';
import { getUserEntries, getProjects } from '@/lib/sheets';
import { db } from '@/lib/db';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
        return NextResponse.json({ error: 'User ID required' }, { status: 400 });
    }

    const projects = await getProjects();
    const entries = await getUserEntries(userId);

    const entriesWithDetails = await Promise.all(entries.map(async (entry) => {
        const project = projects.find(p => p.id === entry.tournamentId);

        let isWaitlist = false;
        if (project && project.maxTeams) {
            const allEntries = await db.teamEntry.findMany({
                where: { tournamentId: entry.tournamentId, status: { not: 'cancelled' } },
                orderBy: { createdAt: 'asc' },
                select: { id: true }
            });
            const index = allEntries.findIndex((e: { id: string }) => e.id === entry.id);
            if (index !== -1 && index >= project.maxTeams) {
                isWaitlist = true;
            }
        }

        return {
            ...entry,
            projectName: project?.name || '不明な大会',
            projectEndDate: project?.entryEndDate || null,
            isWaitlist
        };
    }));

    return NextResponse.json({ entries: entriesWithDetails });
}
