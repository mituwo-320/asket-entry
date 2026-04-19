import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function POST(request: Request) {
    try {
        const teamId = request.headers.get('x-team-id');

        if (!teamId) {
            return NextResponse.json({ error: 'Team ID is required' }, { status: 400 });
        }

        const updatedEntry = await db.teamEntry.update({
            where: { id: teamId },
            data: { status: 'submitted' }
        });

        return NextResponse.json({ success: true, entry: updatedEntry });
    } catch (e: any) {
        console.error("Submit entry error:", e);
        return NextResponse.json({ error: "エラーが発生しました。" }, { status: 500 });
    }
}
