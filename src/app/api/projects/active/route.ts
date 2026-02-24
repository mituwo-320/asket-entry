import { NextResponse } from 'next/server';
import { getProjects } from '@/lib/sheets';

export async function GET() {
    try {
        const allProjects = await getProjects();
        const now = new Date();
        // Return only active projects and those that are currently within the entry period
        const activeProjects = allProjects.filter(p => {
            if (!p.isActive) return false;
            if (p.entryStartDate && new Date(p.entryStartDate) > now) return false;
            if (p.entryEndDate && new Date(p.entryEndDate) < now) return false;
            return true;
        });

        return NextResponse.json({ projects: activeProjects });
    } catch (e) {
        return NextResponse.json({ error: 'Failed to fetch projects' }, { status: 500 });
    }
}
