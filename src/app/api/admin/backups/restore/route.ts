import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import * as bcrypt from 'bcryptjs';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { fileName } = body;

    if (!fileName) {
      return NextResponse.json({ error: 'fileName is required' }, { status: 400 });
    }

    // Find backup in database
    const backup = await db.backup.findFirst({
      where: { fileName }
    });

    if (!backup) {
      return NextResponse.json({ error: 'バックアップデータが見つかりません。' }, { status: 404 });
    }

    const data = JSON.parse(backup.data);
    const { tournamentId, users, entries } = data;

    if (!tournamentId || !users || !entries) {
      return NextResponse.json({ error: '無効なバックアップフォーマットです。' }, { status: 400 });
    }

    console.log(`Restoring ${users.length} users and ${entries.length} entries for tournament: ${tournamentId}`);

    const userIdMap = new Map<string, string>();
    const dummyPasswordHash = await bcrypt.hash('dummy-password-1234', 10);

    // 1. Restore/Sync Users
    for (const u of users) {
      const existingUser = await db.user.findFirst({
        where: {
          OR: [
            { id: u.id },
            { email: u.email }
          ]
        },
      });

      if (existingUser) {
        await db.user.update({
          where: { id: existingUser.id },
          data: {
            name: u.name,
            phone: u.phone,
            postalCode: u.postalCode || null,
            address: u.address || null,
            wristbandColor: u.wristbandColor || null,
          },
        });
        userIdMap.set(u.id, existingUser.id);
      } else {
        const created = await db.user.create({
          data: {
            id: u.id,
            email: u.email,
            name: u.name,
            phone: u.phone,
            password: dummyPasswordHash, // Schema requires password
            postalCode: u.postalCode || null,
            address: u.address || null,
            wristbandColor: u.wristbandColor || null,
            role: 'user',
          },
        });
        userIdMap.set(u.id, created.id);
      }
    }

    // 2. Clear current database entries for target tournamentId
    await db.player.deleteMany({
      where: {
        teamEntry: {
          tournamentId: tournamentId,
        },
      },
    });

    await db.teamEntry.deleteMany({
      where: {
        tournamentId: tournamentId,
      },
    });

    // 3. Insert backup data
    let entryCount = 0;
    let playerCount = 0;

    for (const e of entries) {
      let resolvedUserId = userIdMap.get(e.userId) || e.userId;

      // Verify user exists in database
      const userExists = await db.user.findUnique({
        where: { id: resolvedUserId }
      });

      if (!userExists) {
        const fallbackUser = await db.user.findFirst();
        if (!fallbackUser) {
          return NextResponse.json({ error: 'データベースにユーザーが登録されていません。先にログインまたはユーザー作成を行ってください。' }, { status: 500 });
        }
        resolvedUserId = fallbackUser.id;
      }

      await db.teamEntry.create({
        data: {
          id: e.id,
          userId: resolvedUserId, // Use resolved/mapped userId
          tournamentId: e.tournamentId,
          teamName: e.teamName,
          teamNameKana: e.teamNameKana || '',
          teamIntroduction: e.teamIntroduction || '',
          isBeginnerFriendlyAccepted: e.isBeginnerFriendlyAccepted || false,
          isPaid: e.isPaid || false,
          status: e.status || 'draft',
          group: e.group || null,
          preliminaryNumber: e.preliminaryNumber || null,
          isOpenChatJoined: e.isOpenChatJoined || false,
          managementMemo: e.managementMemo || '',
          uniformColor: e.uniformColor || null,
          receiptName: e.receiptName || null,
          receiptIssuedAt: e.receiptIssuedAt ? new Date(e.receiptIssuedAt) : null,
          receiptViewedAt: e.receiptViewedAt ? new Date(e.receiptViewedAt) : null,
          clinicParticipation: e.clinicParticipation !== undefined ? e.clinicParticipation : null,
          clinicCount: e.clinicCount || 0,
          createdAt: e.createdAt ? new Date(e.createdAt) : new Date(),
        },
      });
      entryCount++;

      if (e.players && Array.isArray(e.players)) {
        for (const p of e.players) {
          await db.player.create({
            data: {
              id: p.id,
              entryId: e.id,
              name: p.name,
              furigana: p.furigana || '',
              insurance: p.insurance || false,
              isRepresentative: p.isRepresentative || false,
              wristbandColor: p.wristbandColor || null,
              createdAt: p.createdAt ? new Date(p.createdAt) : new Date(),
            },
          });
          playerCount++;
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: `バックアップ "${fileName}" から ${entryCount} チームと ${playerCount} 名の選手データを正常に復元しました。`
    });

  } catch (error: any) {
    console.error('Failed to restore backup:', error);
    return NextResponse.json({ error: 'Failed to restore backup', details: error.message }, { status: 500 });
  }
}
