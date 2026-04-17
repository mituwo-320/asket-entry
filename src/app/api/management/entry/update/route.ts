import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function POST(request: Request) {
    try {
        const { entryId, updates } = await request.json();

        if (!entryId || !updates) {
            return NextResponse.json({ success: false, error: 'Missing entryId or updates' }, { status: 400 });
        }

        // Only allow updating isOpenChatJoined, isPaid, and managementMemo from this endpoint
        const validUpdates: any = {};
        if (typeof updates.isOpenChatJoined === 'boolean') {
            validUpdates.isOpenChatJoined = updates.isOpenChatJoined;
        }
        if (typeof updates.isPaid === 'boolean') {
            validUpdates.isPaid = updates.isPaid;
        }
        if (typeof updates.managementMemo === 'string') {
            validUpdates.managementMemo = updates.managementMemo;
        }

        await db.teamEntry.update({
            where: { id: entryId },
            data: validUpdates
        });

        return NextResponse.json({ success: true });
    } catch (e) {
        console.error("Management API Error:", e);
        return NextResponse.json({ success: false, error: 'Failed to update entry' }, { status: 500 });
    }
}
