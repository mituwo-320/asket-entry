import { NextResponse } from 'next/server';
import { findTeamEntry, findUserById, getProjects } from '@/lib/sheets';
import { db } from '@/lib/db';

import { cookies } from 'next/headers';

export async function GET(request: Request) {
    const cookieStore = await cookies();
    const isAdmin = cookieStore.get('admin_auth')?.value === 'true';
    const entryId = request.headers.get('x-team-id');

    if (!entryId) {
        return NextResponse.json({ error: 'Entry ID required' }, { status: 400 });
    }

    const entry = await findTeamEntry(entryId);

    if (entry) {
        const user = await findUserById(entry.userId);
        const projects = await getProjects();
        const project = projects.find(p => p.id === entry.tournamentId);
        const projectName = project?.name || '不明な大会';
        const projectEndDate = project?.entryEndDate;

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

        const hasClinic = project?.hasClinic || false;
        const clinicTitle = project?.clinicTitle || undefined;
        const clinicDescription = project?.clinicDescription || undefined;
        const clinicLimit = project?.clinicLimit !== undefined ? project.clinicLimit : 20;

        return NextResponse.json({
            teamEntry: { ...entry, projectName, projectEndDate, isWaitlist, hasClinic, clinicTitle, clinicDescription, clinicLimit },
            user,
            isAdmin
        });
    } else {
        return NextResponse.json({ error: 'Entry not found' }, { status: 404 });
    }
}
