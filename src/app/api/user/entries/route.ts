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

    const entriesWithProjectName = entries.map(entry => ({
        ...entry,
        projectName: projects.find(p => p.id === entry.tournamentId)?.name || '不明な大会'
    }));

    return NextResponse.json({ entries: entriesWithProjectName });
}
