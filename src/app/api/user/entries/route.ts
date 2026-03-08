import { NextResponse } from 'next/server';
import { getUserEntries, getProjects } from '@/lib/sheets';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
        return NextResponse.json({ error: 'User ID required' }, { status: 400 });
    }

    const projects = await getProjects();
    const entries = await getUserEntries(userId);

    const entriesWithProjectName = entries.map(entry => {
        const project = projects.find(p => p.id === entry.tournamentId);
        return {
            ...entry,
            projectName: project?.name || '不明な大会',
            projectEndDate: project?.entryEndDate || null
        };
    });

    return NextResponse.json({ entries: entriesWithProjectName });
}
