import { Prisma } from '@prisma/client';
import { hash } from 'bcryptjs';
import { randomUUID as uuid } from 'node:crypto';
import { db } from './db';
import type { Session } from './auth/session';

export class RegistrationError extends Error {
  constructor(public status: number, message: string) { super(message); }
}
const required = (value: unknown, label: string) => {
  if (typeof value !== 'string' || !value.trim()) throw new RegistrationError(400, `${label}を入力してください`);
  return value.trim();
};

export async function registerTeam(input: Record<string, unknown>, session: Session | null) {
  const tournamentId = required(input.tournamentId, '大会');
  const teamName = required(input.name, 'チーム名');
  const representative = required(input.representative, '代表者名');
  const phone = required(input.phone, '電話番号');
  const email = required(input.email, 'メールアドレス');
  const existingUserId = typeof input.existingUserId === 'string' ? input.existingUserId : '';
  if (existingUserId && (session?.role !== 'admin' && (session?.role !== 'user' || session.sub !== existingUserId))) throw new RegistrationError(403, 'ログインしているアカウントを確認してください');
  if (!existingUserId && (typeof input.password !== 'string' || !input.password)) throw new RegistrationError(400, 'パスワードを入力してください');
  const password = existingUserId ? '' : input.password as string;
  const passwordHash = existingUserId ? '' : await hash(password, 10);
  const preliminaryNumber = input.preliminaryNumber ? Number(input.preliminaryNumber) : null;
  if (preliminaryNumber !== null && (!Number.isInteger(preliminaryNumber) || preliminaryNumber < 1 || preliminaryNumber > 16)) throw new RegistrationError(400, '予選番号は1〜16を選択してください');
  const clinicCount = input.clinicCount ? Number(input.clinicCount) : 0;
  if (!Number.isInteger(clinicCount) || clinicCount < 0) throw new RegistrationError(400, 'クリニックの人数が不正です');

  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      return await db.$transaction(async tx => {
        const project = await tx.project.findUnique({ where: { id: tournamentId } });
        if (!project) throw new RegistrationError(404, '指定された大会は見つかりませんでした');
        const now = Date.now();
        if (session?.role !== 'admin' && (!project.isActive || project.isTestProject || (project.entryStartDate && project.entryStartDate.getTime() > now) || (project.entryEndDate && project.entryEndDate.getTime() < now))) throw new RegistrationError(403, 'この大会は現在エントリーを受け付けていません');
        const count = await tx.teamEntry.count({ where: { tournamentId, status: { not: 'cancelled' } } });
        if (project.maxTeams && count >= project.maxTeams && project.isWaitlistEnabled === false) throw new RegistrationError(400, 'この大会は定員に達しており、現在キャンセル待ちは受け付けていません。');
        if (project.hasClinic && clinicCount > project.clinicLimit) throw new RegistrationError(400, 'クリニックの人数が上限を超えています');
        const user = existingUserId
          ? await tx.user.findUnique({ where: { id: existingUserId } })
          : await tx.user.create({ data: { id: 'u_' + uuid(), email, password: passwordHash, name: representative, phone, wristbandColor: typeof input.wristbandColor === 'string' ? input.wristbandColor : null } });
        if (!user) throw new RegistrationError(404, 'ユーザーが見つかりません');
        const entry = await tx.teamEntry.create({ data: {
          id: 'e_' + uuid(), userId: user.id, tournamentId, teamName,
          teamNameKana: typeof input.teamNameKana === 'string' ? input.teamNameKana : '',
          teamIntroduction: typeof input.teamIntroduction === 'string' ? input.teamIntroduction : '',
          isBeginnerFriendlyAccepted: input.isBeginnerFriendlyAccepted === true,
          status: 'draft', preliminaryNumber,
          clinicParticipation: typeof input.clinicParticipation === 'boolean' ? input.clinicParticipation : null,
          clinicCount,
          players: { create: { id: 'p_' + uuid(), name: representative, furigana: typeof input.furigana === 'string' ? input.furigana : '', insurance: input.insurance === true, wristbandColor: typeof input.wristbandColor === 'string' ? input.wristbandColor : null, isRepresentative: true } },
        } });
        return { entry, user, project, count: count + 1, isWaitlist: !!project.maxTeams && count >= project.maxTeams };
      }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    } catch (error) {
      const code = error && typeof error === 'object' && 'code' in error ? error.code : undefined;
      if (code === 'P2034') {
        if (attempt < 2) continue;
        throw new RegistrationError(409, '申し込みが混み合っています。時間をおいて再度お試しください');
      }
      if (code === 'P2002') throw new RegistrationError(400, 'このメールアドレスは既に登録されています');
      throw error;
    }
  }
  throw new RegistrationError(409, '申し込みが混み合っています。時間をおいて再度お試しください');
}
