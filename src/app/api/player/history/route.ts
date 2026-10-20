import { NextResponse } from 'next/server';
import { withAuthorization } from '@/lib/auth/authorize';
import { readSession } from '@/lib/auth/session';
import { getPlayerHistory, importPlayers, PlayerHistoryError } from '@/lib/player-history';

function failure(error: unknown) {
    if (error instanceof PlayerHistoryError) return NextResponse.json({ error: error.message }, { status: error.status });
    if (error instanceof SyntaxError) return NextResponse.json({ error: '入力内容が不正です' }, { status: 400 });
    console.error('Player history operation failed');
    return NextResponse.json({ error: 'メンバー情報を処理できませんでした。時間をおいて再度お試しください。' }, { status: 500 });
}
async function handleGET(request: Request) {
    const entryId = request.headers.get('x-team-id');
    if (!entryId) return NextResponse.json({ error: 'Entry ID required' }, { status: 400 });
    try { return NextResponse.json({ teams: await getPlayerHistory(entryId, readSession(request.headers.get('cookie'))) }); }
    catch (error) { return failure(error); }
}
async function handlePOST(request: Request) {
    const entryId = request.headers.get('x-team-id');
    if (!entryId) return NextResponse.json({ error: 'Entry ID required' }, { status: 400 });
    try { return NextResponse.json({ success: true, ...await importPlayers(entryId, await request.json(), readSession(request.headers.get('cookie'))) }); }
    catch (error) { return failure(error); }
}
export const GET = withAuthorization(handleGET, { roles: ['admin', 'user'], entry: true });
export const POST = withAuthorization(handlePOST, { roles: ['admin', 'user'], entry: true, editable: true });
