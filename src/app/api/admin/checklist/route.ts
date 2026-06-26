import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

const DEFAULT_CHECKLIST_ITEMS = [
  "タイムスケジュール",
  "掲示用チーム名",
  "得点レギュレーション",
  "チームリスト",
  "受付リスト",
  "会計リスト",
  "保険リスト",
  "抽選券（赤・黒）",
  "賞状",
  "スターティングリスト",
  "シュートチャレンジリスト"
];

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const projectId = searchParams.get('projectId');

        if (!projectId) {
            return NextResponse.json({ error: 'Project ID is required' }, { status: 400 });
        }

        // Fetch checklist items for project
        let items = await db.printChecklistItem.findMany({
            where: { projectId },
            orderBy: { createdAt: 'asc' }
        });

        // Auto-initialize defaults if none exist
        if (items.length === 0) {
            const dataToInsert = DEFAULT_CHECKLIST_ITEMS.map(name => ({
                projectId,
                name,
                isPrinted: false
            }));
            
            await db.printChecklistItem.createMany({
                data: dataToInsert,
                skipDuplicates: true
            });

            items = await db.printChecklistItem.findMany({
                where: { projectId },
                orderBy: { createdAt: 'asc' }
            });
        }

        return NextResponse.json({ items });
    } catch (e) {
        console.error('Fetch checklist items error:', e);
        return NextResponse.json({ error: 'Failed to fetch checklist items' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { projectId, name } = body;

        if (!projectId || !name) {
            return NextResponse.json({ error: 'Project ID and name are required' }, { status: 400 });
        }

        // Check if item with this name already exists for this project
        const existing = await db.printChecklistItem.findUnique({
            where: {
                projectId_name: {
                    projectId,
                    name
                }
            }
        });

        if (existing) {
            return NextResponse.json({ error: '同名のチェックリストアイテムが既に存在します' }, { status: 400 });
        }

        const item = await db.printChecklistItem.create({
            data: {
                projectId,
                name,
                isPrinted: false
            }
        });

        return NextResponse.json({ success: true, item });
    } catch (e) {
        console.error('Create checklist item error:', e);
        return NextResponse.json({ error: 'サーバーエラーが発生しました' }, { status: 500 });
    }
}

export async function PATCH(request: Request) {
    try {
        const body = await request.json();
        const { id, isPrinted } = body;

        if (!id) {
            return NextResponse.json({ error: 'Item ID is required' }, { status: 400 });
        }

        const item = await db.printChecklistItem.update({
            where: { id },
            data: { isPrinted }
        });

        return NextResponse.json({ success: true, item });
    } catch (e) {
        console.error('Update checklist item error:', e);
        return NextResponse.json({ error: 'サーバーエラーが発生しました' }, { status: 500 });
    }
}

export async function DELETE(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');

        if (!id) {
            return NextResponse.json({ error: 'Item ID is required' }, { status: 400 });
        }

        await db.printChecklistItem.delete({
            where: { id }
        });

        return NextResponse.json({ success: true });
    } catch (e) {
        console.error('Delete checklist item error:', e);
        return NextResponse.json({ error: 'サーバーエラーが発生しました' }, { status: 500 });
    }
}
