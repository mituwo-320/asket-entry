import { NextResponse } from 'next/server';
import { withAuthorization, authenticatedSession } from '@/lib/auth/authorize';
import { createSession, sessionCookieOptions, SESSION_COOKIES } from '@/lib/auth/session';
import { registerTeam, RegistrationError } from '@/lib/registration';
import { sendAdminNotificationEmail, sendUserRegistrationEmail } from '@/lib/mail';

async function handlePOST(request: Request) {
  try {
    const body = await request.json();
    const result = await registerTeam(body, await authenticatedSession(request));
    const { entry, user, project, count, isWaitlist } = result;
    let teamCountString = project.maxTeams ? `現在 ${count}チーム目 / 上限 ${project.maxTeams}チーム` : `現在 ${count}チーム目`;
    if (isWaitlist) teamCountString += ' (キャンセル待ち)';
    try {
      const sent = await Promise.all([
        sendAdminNotificationEmail({ teamName: entry.teamName, representative: user.name, email: user.email, projectId: project.id, projectName: project.name, teamCountString }),
        sendUserRegistrationEmail({ teamName: entry.teamName, representative: user.name, email: user.email, projectName: project.name }),
      ]);
      if (sent.some(result => !result)) console.error('Registration notification delivery was incomplete');
    } catch { console.error('Registration notification failed'); }
    const response = NextResponse.json({ success: true, teamId: entry.id, isWaitlist, user: { id: user.id, email: user.email, name: user.name, phone: user.phone, furigana: body.furigana || '', role: 'user' } });
    response.cookies.set(SESSION_COOKIES.user, createSession('user', user.id, user.password), sessionCookieOptions());
    return response;
  } catch (error) {
    if (error instanceof RegistrationError) return NextResponse.json({ error: error.message }, { status: error.status });
    console.error('Registration failed');
    return NextResponse.json({ error: 'チームの登録に失敗しました。時間をおいて再度お試しください。' }, { status: 500 });
  }
}
export const POST = withAuthorization(handlePOST, { registration: true });
