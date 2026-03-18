import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { generateBracket } from '@/lib/bracket-generator';

// GET: Fetch bracket data for a tournament
export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const tournamentId = searchParams.get('tournamentId') || '2024-Spring';

        const bracket = await db.tournamentBracket.findFirst({
            where: { tournamentId },
            orderBy: { updatedAt: 'desc' },
        });

        return NextResponse.json({ bracket });
    } catch (error) {
        console.error('Failed to fetch bracket:', error);
        return NextResponse.json({ error: 'Failed to fetch bracket' }, { status: 500 });
    }
}

// POST: Create a new bracket
export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { tournamentId, teamCount } = body;

        if (!tournamentId || !teamCount || teamCount < 2) {
            return NextResponse.json(
                { error: 'tournamentId and teamCount (>= 2) are required' },
                { status: 400 }
            );
        }

        // Generate bracket structure
        const bracketData = generateBracket(teamCount);

        // Create or update bracket in DB
        const existing = await db.tournamentBracket.findFirst({
            where: { tournamentId },
        });

        let bracket;
        if (existing) {
            bracket = await db.tournamentBracket.update({
                where: { id: existing.id },
                data: {
                    teamCount,
                    brackets: bracketData as any,
                    status: 'setup',
                },
            });
        } else {
            bracket = await db.tournamentBracket.create({
                data: {
                    tournamentId,
                    teamCount,
                    brackets: bracketData as any,
                    status: 'setup',
                },
            });
        }

        return NextResponse.json({ success: true, bracket });
    } catch (error) {
        console.error('Failed to create bracket:', error);
        return NextResponse.json({ error: 'Failed to create bracket' }, { status: 500 });
    }
}
