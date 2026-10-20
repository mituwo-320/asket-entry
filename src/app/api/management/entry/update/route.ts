import { withAuthorization, STAFF } from "@/lib/auth/authorize";
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import type { Prisma } from '@prisma/client';

async function handlePOST(request: Request) {
    try {
        const { entryId, updates } = await request.json();

        if (!entryId || !updates) {
            return NextResponse.json({ success: false, error: 'Missing entryId or updates' }, { status: 400 });
        }

        // Only allow updating isOpenChatJoined, isPaid, and managementMemo from this endpoint
        const validUpdates: Prisma.TeamEntryUpdateInput = {};
        if (typeof updates.isOpenChatJoined === 'boolean') {
            validUpdates.isOpenChatJoined = updates.isOpenChatJoined;
        }
        if (typeof updates.isPaid === 'boolean') {
            validUpdates.isPaid = updates.isPaid;
        }
        if (typeof updates.managementMemo === 'string') {
            validUpdates.managementMemo = updates.managementMemo;
        }
        if (typeof updates.uniformColor === "string") validUpdates.uniformColor = updates.uniformColor;
        if (typeof updates.status === 'string' && ["draft", "submitted", "cancelled"].includes(updates.status)) {
            validUpdates.status = updates.status;
        }

        if (Object.keys(validUpdates).length === 0) return NextResponse.json({ success: false, error: "更新する内容がありません" }, { status: 400 });
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

export const POST = withAuthorization(handlePOST, { roles: STAFF });
