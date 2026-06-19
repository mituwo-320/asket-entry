import { NextResponse } from 'next/server';
import { getProjects, getProjectEntryCount } from '@/lib/sheets';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const allProjects = await getProjects();
        const now = new Date();
        // Return only active projects and those that are currently within the entry period
        const activeProjects = allProjects.filter(p => {
            if (!p.isActive) return false;
            if (p.isTestProject) return false; // NEW: テストプロジェクトを除外
            if (p.entryStartDate && new Date(p.entryStartDate) > now) return false;
            if (p.entryEndDate && new Date(p.entryEndDate) < now) return false;
            return true;
        });

        const activeProjectsWithCounts = await Promise.all(activeProjects.map(async (p) => {
            const count = await getProjectEntryCount(p.id);
            return { ...p, currentEntryCount: count };
        }));

        return NextResponse.json({ projects: activeProjectsWithCounts });
    } catch (e) {
        return NextResponse.json({ error: 'Failed to fetch projects' }, { status: 500 });
    }
}
