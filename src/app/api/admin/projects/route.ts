import { withAuthorization, ALL_ROLES } from "@/lib/auth/authorize";
import { NextResponse } from 'next/server';
import { getProjects, saveProject, deleteProject } from '@/lib/sheets';
import { Project } from '@/lib/types';
import { randomUUID as uuidv4 } from 'node:crypto';

export const dynamic = 'force-dynamic';

async function handleGET() {
    try {
        const projects = await getProjects();

        return NextResponse.json({ projects });
    } catch (e) {
        return NextResponse.json({ error: 'Failed to fetch projects' }, { status: 500 });
    }
}

async function handlePOST(request: Request) {
    try {
        const body = await request.json();

        const project: Project = {
            id: body.id || "proj_" + uuidv4(),
            name: body.name,
            isActive: body.isActive !== undefined ? body.isActive : true,
            isWaitlistEnabled: body.isWaitlistEnabled !== undefined ? body.isWaitlistEnabled : true,
            isTestProject: body.isTestProject !== undefined ? body.isTestProject : false,
            entryStartDate: body.entryStartDate ? new Date(body.entryStartDate).toISOString() : undefined,
            entryEndDate: body.entryEndDate ? new Date(body.entryEndDate).toISOString() : undefined,
            eventDate: body.eventDate ? new Date(body.eventDate).toISOString() : undefined,
            lineOpenChatLink: body.lineOpenChatLink || undefined,
            maxTeams: body.maxTeams ? parseInt(body.maxTeams.toString(), 10) : undefined,
            hasClinic: body.hasClinic !== undefined ? body.hasClinic : false,
            clinicTitle: body.clinicTitle || undefined,
            clinicDescription: body.clinicDescription || undefined,
            clinicLimit: body.clinicLimit ? parseInt(body.clinicLimit.toString(), 10) : 20
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

async function handleDELETE(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const projectId = searchParams.get('id');

        if (!projectId) {
            return NextResponse.json({ error: 'プロジェクトIDが必要です' }, { status: 400 });
        }

        const success = await deleteProject(projectId);

        if (success) {
            return NextResponse.json({ success: true });
        } else {
            return NextResponse.json({ error: 'プロジェクトの削除に失敗しました' }, { status: 500 });
        }
    } catch (e) {
        console.error('Project Delete Error:', e);
        return NextResponse.json({ error: 'サーバーエラーが発生しました' }, { status: 500 });
    }
}

export const GET = withAuthorization(handleGET, { roles: ALL_ROLES });

export const POST = withAuthorization(handlePOST, { roles: ['admin'] });

export const DELETE = withAuthorization(handleDELETE, { roles: ['admin'] });
