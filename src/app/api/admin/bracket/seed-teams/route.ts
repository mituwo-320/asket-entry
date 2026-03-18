import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

// POST: Seed 16 test teams for development/testing
export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { tournamentId } = body;

        if (!tournamentId) {
            return NextResponse.json({ error: 'tournamentId is required' }, { status: 400 });
        }

        const teamNames = [
            'レッドドラゴン', 'ブルーフェニックス', 'ゴールデンイーグル', 'シルバーウルフ',
            'サンダーホーク', 'ライトニングボルト', 'ファイアストーム', 'アイスブレイカー',
            'ストームライダー', 'ナイトシャドウ', 'サンライズ', 'ムーンライト',
            'スターダスト', 'ダークマター', 'クリスタルウォリアー', 'アイアンフィスト',
        ];

        // Check how many already exist for this tournament
        const existing = await db.teamEntry.findMany({
            where: { tournamentId },
            select: { id: true }
        });

        if (existing.length >= 16) {
            return NextResponse.json({
                success: true,
                created: 0,
                total: existing.length,
                message: `既に ${existing.length} チーム存在します（追加なし）`
            });
        }

        // Get any user to assign entries to
        const anyUser = await db.user.findFirst({
            select: { id: true }
        });

        if (!anyUser) {
            return NextResponse.json({ error: 'ユーザーが見つかりません。先にログインしてください。' }, { status: 404 });
        }

        // Create teams up to 16 total
        const needed = Math.max(0, 16 - existing.length);
        const toCreate = teamNames.slice(existing.length, existing.length + needed);

        const created = [];
        for (let i = 0; i < toCreate.length; i++) {
            const team = await db.teamEntry.create({
                data: {
                    userId: anyUser.id,
                    tournamentId,
                    teamName: toCreate[i],
                    teamNameKana: '',
                    teamIntroduction: '',
                    isBeginnerFriendlyAccepted: false,
                    status: 'confirmed',
                    isPaid: true,
                },
            });
            created.push(team);
        }

        return NextResponse.json({
            success: true,
            created: created.length,
            total: existing.length + created.length,
            message: `${created.length} チームを追加しました（合計 ${existing.length + created.length} チーム）`
        });
    } catch (error) {
        console.error('Failed to seed test teams:', error);
        return NextResponse.json({ error: 'Failed to seed test teams' }, { status: 500 });
    }
}
