import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { sendAdminNotificationEmail } from '@/lib/mail';

export async function POST(request: Request) {
    try {
        const teamId = request.headers.get('x-team-id');

        if (!teamId) {
            return NextResponse.json({ error: 'Team ID is required' }, { status: 400 });
        }

        const updatedEntry = await db.teamEntry.update({
            where: { id: teamId },
            data: { status: 'submitted' },
            include: { user: true }
        });

        const p = await db.project.findUnique({ where: { id: updatedEntry.tournamentId } });

        // Send email to admin
        try {
            await sendAdminNotificationEmail({
                teamName: updatedEntry.teamName,
                representative: updatedEntry.user.name,
                email: updatedEntry.user.email,
                projectId: updatedEntry.tournamentId,
                projectName: p?.name || '不明な大会',
                teamCountString: "★本エントリー（請求書発行済み・メンバー確定済み）"
            });
        } catch (e) {
            console.error("Failed to send admin notification:", e);
        }

        return NextResponse.json({ success: true, entry: updatedEntry });
    } catch (e: any) {
        console.error("Submit entry error:", e);
        return NextResponse.json({ error: "エラーが発生しました。" }, { status: 500 });
    }
}
