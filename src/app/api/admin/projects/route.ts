import { NextResponse } from 'next/server';
import { getProjects, saveProject } from '@/lib/sheets';
import { Project } from '@/lib/types';
import { v4 as uuidv4 } from 'uuid';

export async function GET() {
    try {
        let projects = await getProjects();

        // --- POLISH: Auto-create a default mock project if none exist so users can test immediately ---
        if (projects.length === 0) {
            const mockProject: Project = {
                id: "2024-Spring", // Keeping this ID to match existing mock data references just in case
                name: "【テスト用】2026年春季大会",
                isActive: true,
                entryStartDate: new Date().toISOString(),
                entryEndDate: new Date("2026-04-30T23:59:59").toISOString()
            };
            await saveProject(mockProject);
            projects = [mockProject];
        }

        return NextResponse.json({ projects });
    } catch (e) {
        return NextResponse.json({ error: 'Failed to fetch projects' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json();

        const project: Project = {
            id: body.id || "proj_" + uuidv4(),
            name: body.name,
            isActive: body.isActive !== undefined ? body.isActive : true,
            entryStartDate: body.entryStartDate ? new Date(body.entryStartDate).toISOString() : undefined,
            entryEndDate: body.entryEndDate ? new Date(body.entryEndDate).toISOString() : undefined,
            lineOpenChatLink: body.lineOpenChatLink || undefined
        };

        const success = await saveProject(project);

        if (success) {
            return NextResponse.json({ success: true, project });
        } else {
            return NextResponse.json({ error: 'プロジェクトの保存に失敗しました' }, { status: 500 });
        }
    } catch (e) {
        console.error('Project Update Error:', e);
        return NextResponse.json({ error: 'サーバーエラーが発生しました' }, { status: 500 });
    }
}
