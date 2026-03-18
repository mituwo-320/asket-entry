import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

// POST: Update bracket data (team placement, match results)
export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { bracketId, brackets, status } = body;

        if (!bracketId || !brackets) {
            return NextResponse.json(
                { error: 'bracketId and brackets are required' },
                { status: 400 }
            );
        }

        const bracket = await db.tournamentBracket.update({
            where: { id: bracketId },
            data: {
                brackets: brackets as any,
                status: status || undefined,
            },
        });

        return NextResponse.json({ success: true, bracket });
    } catch (error) {
        console.error('Failed to update bracket:', error);
        return NextResponse.json({ error: 'Failed to update bracket' }, { status: 500 });
    }
}
