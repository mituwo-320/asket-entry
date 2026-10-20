import { db } from "@/lib/db";
import { withAuthorization } from "@/lib/auth/authorize";
import { NextResponse } from 'next/server';
import { savePlayerToEntry, findTeamEntry } from '@/lib/sheets';
import { Player } from '@/lib/types';
import { readSession } from "@/lib/auth/session";

async function handlePOST(request: Request) {
    try {
        const entryId = request.headers.get('x-team-id'); // treating as entryId
        if (!entryId) return NextResponse.json({ error: 'Entry ID required' }, { status: 400 });

        const existingEntry = await findTeamEntry(entryId);
        if (!existingEntry) {
            return NextResponse.json({ error: 'Entry not found' }, { status: 404 });
        }

        const isAdmin = readSession(request.headers.get("cookie"))?.role === "admin";

        if (existingEntry.status === 'submitted' && !isAdmin) {
            return NextResponse.json({ error: '本エントリー完了後の編集はできません' }, { status: 403 });
        }

        const player: Player = await request.json();

        if (!player || typeof player.id !== "string" || typeof player.name !== "string" || !player.name.trim()) return NextResponse.json({ error: "選手情報が不正です" }, { status: 400 });
        const storedPlayer = await db.player.findUnique({ where: { id: player.id } });
        if (storedPlayer && storedPlayer.entryId !== entryId) return NextResponse.json({ error: "他チームの選手は編集できません" }, { status: 403 });
        if (!isAdmin && !!player.isRepresentative !== !!storedPlayer?.isRepresentative) return NextResponse.json({ error: "代表者の区分は変更できません" }, { status: 403 });
        const success = await savePlayerToEntry(entryId, player);

        if (success) {
            return NextResponse.json({ success: true });
        } else {
            return NextResponse.json({ error: 'Failed to save' }, { status: 500 });
        }
    } catch {
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
}

export const POST = withAuthorization(handlePOST, { roles: ['admin', 'user'], entry: true, editable: true });
