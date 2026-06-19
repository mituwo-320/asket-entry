import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { backupTournamentData } from '@/lib/backup';

// POST: Seed test teams for development/testing
export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { tournamentId, teamCount = 16 } = body;

        if (!tournamentId) {
            return NextResponse.json({ error: 'tournamentId is required' }, { status: 400 });
        }

        // Check if the project is a test project to prevent wiping production data
        const project = await db.project.findUnique({
            where: { id: tournamentId }
        });

        if (!project) {
            return NextResponse.json({ error: 'プロジェクトが見つかりません。' }, { status: 404 });
        }

        if (!project.isTestProject) {
            return NextResponse.json({
                error: '本番用プロジェクトにテストデータを流し込むことはできません。テスト用プロジェクトとして設定した大会でのみ実行可能です。'
            }, { status: 400 });
        }

        const count = Math.min(Math.max(2, teamCount), 32);

        const teamNames = [
            'レッドドラゴン', 'ブルーフェニックス', 'ゴールデンイーグル', 'シルバーウルフ',
            'サンダーホーク', 'ライトニングボルト', 'ファイアストーム', 'アイスブレイカー',
            'ストームライダー', 'ナイトシャドウ', 'サンライズ', 'ムーンライト',
            'スターダスト', 'ダークマター', 'クリスタルウォリアー', 'アイアンフィスト',
            'キングコブラ', 'シャドーキャット', 'ワイルドベア', 'ディープシーフォース',
            'マウンテンジャイアント', 'ファイアバード', 'スカイウォーカー', 'オーシャンディフェンダー',
            'アースクエイク', 'ボルケーノ', 'ハリケーン', 'ブラストエッジ',
            'サイレントアサシン', 'コスミックゲイル', 'ブレイクアウト', 'ネオジェネシス'
        ];

        // Get any user to assign entries to
        const anyUser = await db.user.findFirst({
            select: { id: true }
        });

        if (!anyUser) {
            return NextResponse.json({ error: 'ユーザーが見つかりません。先にログインしてください。' }, { status: 404 });
        }

        // Automatically backup existing data before wiping
        const backupPath = await backupTournamentData(tournamentId);
        if (backupPath) {
            console.log(`Automatic backup created before seed wiping: ${backupPath}`);
        }

        // Delete existing entries for this tournament to ensure a clean size switch
        await db.teamEntry.deleteMany({
            where: { tournamentId }
        });

        // Create exactly 'count' teams
        const created = [];
        for (let i = 0; i < count; i++) {
            const team = await db.teamEntry.create({
                data: {
                    userId: anyUser.id,
                    tournamentId,
                    teamName: teamNames[i] || `テストチーム-${String(i + 1).padStart(2, '0')}`,
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
            total: created.length,
            message: `${created.length} チームを追加しました。トーナメント表を自動再生成しました。`
        });
    } catch (error) {
        console.error('Failed to seed test teams:', error);
        return NextResponse.json({ error: 'Failed to seed test teams' }, { status: 500 });
    }
}
