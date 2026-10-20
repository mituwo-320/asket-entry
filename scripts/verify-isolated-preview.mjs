// Run manually after `npm run build`, only against an explicitly isolated Preview DB.
// This does not run during the normal build and never configures a production deployment.
import assert from 'node:assert/strict';
import { randomBytes, randomUUID } from 'node:crypto';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { setTimeout as pause } from 'node:timers/promises';
import { PrismaClient } from '@prisma/client';

const env = process.env;
assert.equal(env.VERCEL_ENV, 'preview', 'Preview environment required');
const ref = env.PREVIEW_QA_DATABASE_REF;
assert.match(ref || '', /^[a-z]{20}$/, 'Explicit isolated database reference required');
const database = new URL(env.DATABASE_URL);
assert.equal(decodeURIComponent(database.username), `asket_preview.${ref}`, 'Dedicated QA role required');
assert.match(database.hostname, /^aws-[0-9]+-[a-z0-9-]+\.pooler\.supabase\.com$/, 'Supabase pooler required');
assert.equal(database.pathname, '/postgres', 'Expected database required');
assert.equal(database.searchParams.get('sslmode'), 'require', 'TLS required');
if (env.DIRECT_URL) assert.equal(env.DIRECT_URL, env.DATABASE_URL, 'Both database URLs must be isolated');
for (const key of ['SMTP_HOST', 'SMTP_USER', 'SMTP_PASS']) assert.ok(!env[key], 'Outbound email must be disabled');
for (const key of ['SESSION_SECRET', 'ADMIN_PASSWORD', 'MANAGEMENT_PASSWORD']) assert.ok(env[key]?.length >= 32, 'Independent test credentials required');

const db = new PrismaClient({ log: [] });
const tag = `qa_${randomUUID().replaceAll('-', '')}`;
const projectIds = ['source', 'target', 'capacity', 'restore'].map(suffix => `${tag}_${suffix}`);
const password = randomBytes(24).toString('hex');
const base = 'http://127.0.0.1:4318';
let server;
let stage = 'database connection';
let checks = 0;
let fixturesStarted = false;

function check(condition, label) { assert.ok(condition, label); }
async function test(label, action) {
  stage = label;
  await action();
  checks++;
  console.log(`[preview-qa] PASS ${label}`);
}
async function request(path, { cookie, teamId, body, origin = base } = {}) {
  const headers = { Origin: origin };
  if (cookie) headers.Cookie = cookie;
  if (teamId) headers['x-team-id'] = teamId;
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  const response = await fetch(base + path, {
    method: body === undefined ? 'GET' : 'POST', headers,
    body: body === undefined ? undefined : JSON.stringify(body),
    redirect: 'manual', signal: AbortSignal.timeout(20000),
  });
  const text = await response.text();
  let data;
  try { data = JSON.parse(text); } catch { data = null; }
  const setCookie = response.headers.get('set-cookie') || '';
  return { status: response.status, data, headers: response.headers, setCookie, cookie: setCookie.split(';')[0] };
}
function registration(index, tournamentId = projectIds[0]) {
  return { tournamentId, name: `${tag}_team_${index}`, representative: `検証代表${index}`, furigana: `ケンショウ${index}`, phone: '00000000000', email: `${tag}_${index}@example.invalid`, password, insurance: false, wristbandColor: '赤' };
}

try {
  const roles = await db.$queryRaw`SELECT current_user AS name, rolsuper, rolbypassrls FROM pg_roles WHERE rolname = current_user`;
  check(roles.length === 1 && roles[0].name === 'asket_preview' && !roles[0].rolsuper && !roles[0].rolbypassrls, 'Nonprivileged test DB role required');
  console.log('[preview-qa] Isolated connection verified; email disabled');
  fixturesStarted = true;
  await db.project.createMany({ data: projectIds.map((id, i) => ({ id, name: `${tag}_${i}`, isActive: true, isWaitlistEnabled: false, isTestProject: false, maxTeams: i === 2 ? 1 : 20 })) });
  server = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'start', '-H', '127.0.0.1', '-p', '4318'], { env, stdio: 'ignore' });
  let startupError = false;
  server.on('error', () => { startupError = true; });
  let ready = false;
  for (let attempt = 0; attempt < 60; attempt++) {
    check(!startupError && server.exitCode === null, 'QA server failed to start');
    try { await fetch(base, { signal: AbortSignal.timeout(1000) }); ready = true; break; } catch { await pause(500); }
  }
  check(ready, 'QA server startup timeout');
  let owner, other, target, admin, management, sourcePlayer, copiedPlayer;
  await test('registration persists without SMTP and issues secure session', async () => {
    owner = await request('/api/team/register', { body: registration('owner') });
    check(owner.status === 200 && owner.data.success, 'Registration failed');
    check(/HttpOnly/i.test(owner.setCookie) && /Secure/i.test(owner.setCookie) && /SameSite=strict/i.test(owner.setCookie), 'Cookie flags missing');
    check(!('password' in owner.data.user), 'Password leaked');
    check(await db.teamEntry.count({ where: { id: owner.data.teamId } }) === 1, 'Registration not persisted');
  });
  await test('login validates stored password', async () => {
    const bad = await request('/api/team/login', { body: { email: registration('owner').email, password: 'incorrect' } });
    check(bad.status === 401, 'Incorrect password accepted');
    const login = await request('/api/team/login', { body: { email: registration('owner').email, password } });
    check(login.status === 200 && login.cookie.startsWith('participant_session='), 'Login failed');
    owner.cookie = login.cookie;
  });
  await test('same account registers another team', async () => {
    target = await request('/api/team/register', { cookie: owner.cookie, body: { ...registration('target', projectIds[1]), existingUserId: owner.data.user.id } });
    check(target.status === 200 && target.data.user.id === owner.data.user.id, 'Existing account registration failed');
    other = await request('/api/team/register', { body: registration('other') });
    check(other.status === 200, 'Second test account failed');
  });
  await test('owner boundary, authentication and cross-origin protection', async () => {
    check((await request('/api/team/data', { teamId: owner.data.teamId })).status === 401, 'Anonymous entry access allowed');
    check((await request('/api/team/data', { teamId: owner.data.teamId, cookie: other.cookie })).status === 403, 'Foreign entry access allowed');
    check((await request('/api/team/register', { cookie: other.cookie, body: { ...registration('forged'), existingUserId: owner.data.user.id } })).status === 403, 'Foreign account registration allowed');
    check((await request('/api/team/update', { cookie: owner.cookie, teamId: owner.data.teamId, body: { teamName: 'invalid' }, origin: 'https://foreign.example.invalid' })).status === 403, 'Cross-origin write allowed');
    const data = await request('/api/team/data', { cookie: owner.cookie, teamId: owner.data.teamId });
    check(data.status === 200 && !('password' in data.data.user), 'Team data failed or exposed password');
    check(data.headers.get('cache-control')?.includes('no-store'), 'Private response cache protection missing');
  });
  await test('add player then copy edited member without changing source', async () => {
    sourcePlayer = { id: `${tag}_player`, name: '引用元選手', furigana: 'インヨウモトセンシュ', insurance: false, wristbandColor: '赤', isRepresentative: false };
    check((await request('/api/player/save', { cookie: owner.cookie, teamId: owner.data.teamId, body: sourcePlayer })).status === 200, 'Source player save failed');
    const history = await request('/api/player/history', { cookie: owner.cookie, teamId: target.data.teamId });
    check(history.status === 200 && history.data.teams.some(t => t.players.some(p => p.id === sourcePlayer.id)), 'History missing');
    const draft = { sourcePlayerId: sourcePlayer.id, name: '編集済み選手', furigana: 'ヘンシュウズミセンシュ', insurance: true, wristbandColor: '青' };
    const imported = await request('/api/player/history', { cookie: owner.cookie, teamId: target.data.teamId, body: { players: [draft] } });
    check(imported.status === 200 && imported.data.added === 1, 'Import failed');
    copiedPlayer = imported.data.players.find(p => p.name === draft.name);
    check(copiedPlayer?.insurance && copiedPlayer.wristbandColor === '青' && !copiedPlayer.isRepresentative, 'Edited import data lost');
    const source = await db.player.findUnique({ where: { id: sourcePlayer.id } });
    check(source.name === sourcePlayer.name && !source.insurance && source.wristbandColor === '赤', 'Source changed during copy');
    const repeated = await request('/api/player/history', { cookie: owner.cookie, teamId: target.data.teamId, body: { players: [draft] } });
    check(repeated.status === 200 && repeated.data.added === 0 && repeated.data.skipped === 1, 'Retry created a duplicate');
    check((await request('/api/player/history', { cookie: other.cookie, teamId: other.data.teamId, body: { players: [draft] } })).status === 403, 'Foreign source import allowed');
  });
  await test('representative and submitted/deadline rules', async () => {
    const rep = await db.player.findFirst({ where: { entryId: target.data.teamId, isRepresentative: true } });
    check((await request('/api/player/delete', { cookie: owner.cookie, teamId: target.data.teamId, body: { playerId: rep.id } })).status === 400, 'Representative deleted');
    check((await request('/api/team/submit', { cookie: owner.cookie, teamId: target.data.teamId, body: {} })).status === 200, 'Submission failed');
    check((await request('/api/player/save', { cookie: owner.cookie, teamId: target.data.teamId, body: copiedPlayer })).status === 403, 'Submitted roster editable');
    await db.project.update({ where: { id: projectIds[0] }, data: { entryEndDate: new Date(Date.now() - 60000) } });
    check((await request('/api/player/save', { cookie: owner.cookie, teamId: owner.data.teamId, body: sourcePlayer })).status === 403, 'Expired roster editable');
    check((await request('/api/team/register', { body: registration('expired') })).status === 403, 'Expired registration accepted');
  });
  await test('staff roles and permitted operations persist', async () => {
    admin = await request('/api/admin/auth', { body: { password: env.ADMIN_PASSWORD } });
    management = await request('/api/management/auth', { body: { password: env.MANAGEMENT_PASSWORD } });
    check(admin.status === 200 && management.status === 200, 'Staff login failed');
    check((await request('/api/admin/projects', { cookie: management.cookie, body: { name: 'invalid' } })).status === 403, 'Management gained admin permission');
    check((await request('/api/management/entry/update', { cookie: owner.cookie, body: { entryId: target.data.teamId, updates: { isPaid: true } } })).status === 403, 'Participant gained staff permission');
    check((await request('/api/management/entry/update', { cookie: management.cookie, body: { entryId: target.data.teamId, updates: { isPaid: true, managementMemo: '検証メモ', uniformColor: '赤' } } })).status === 200, 'Operations update failed');
    const saved = await db.teamEntry.findUnique({ where: { id: target.data.teamId } });
    check(saved.isPaid && saved.managementMemo === '検証メモ' && saved.uniformColor === '赤', 'Operations data not persisted');
  });
  await test('concurrent receipt issuance/view claims are idempotent', async () => {
    const opts = { cookie: owner.cookie, teamId: target.data.teamId, body: { receiptName: '検証用宛名' } };
    const issued = await Promise.all([request('/api/team/receipt/issue', opts), request('/api/team/receipt/issue', opts)]);
    check(issued.every(r => r.status === 200), 'Receipt issue failed');
    check(issued.filter(r => r.data.alreadyIssued === false).length === 1 && issued.filter(r => r.data.alreadyIssued === true).length === 1, 'Duplicate receipt claim');
    const viewed = await Promise.all([request('/api/team/receipt/viewed', opts), request('/api/team/receipt/viewed', opts)]);
    check(viewed.every(r => r.status === 200) && viewed.filter(r => r.data.alreadyViewed === false).length === 1 && viewed.filter(r => r.data.alreadyViewed === true).length === 1, 'Duplicate receipt view claim');
    const unpaid = await request('/api/team/receipt/issue', { ...opts, teamId: owner.data.teamId });
    check(unpaid.status === 403, 'Unpaid receipt issued');
  });
  await test('concurrent last-slot registration preserves capacity', async () => {
    const results = await Promise.all(['race_a', 'race_b'].map(index => request('/api/team/register', { body: registration(index, projectIds[2]) })));
    check(results.filter(r => r.status === 200).length === 1 && results.filter(r => [400, 409].includes(r.status)).length === 1, 'Last-slot registration outcome incorrect');
    check(await db.teamEntry.count({ where: { tournamentId: projectIds[2] } }) === 1, 'Capacity exceeded');
  });
  await test('backup restores fixtures and rolls back invalid restore', async () => {
    const entryId = `${tag}_restored_entry`;
    const playerId = `${tag}_restored_player`;
    const fileName = `${tag}_backup.json`;
    const entry = { id: entryId, userId: owner.data.user.id, tournamentId: projectIds[3], teamName: '復元対象', players: [{ id: playerId, name: '復元選手', isRepresentative: true }] };
    const backup = await db.backup.create({ data: { tournamentId: projectIds[3], fileName, data: JSON.stringify({ tournamentId: projectIds[3], users: [], entries: [entry] }) } });
    check((await request('/api/admin/backups/restore', { cookie: management.cookie, body: { fileName } })).status === 403, 'Management can restore backup');
    check((await request('/api/admin/backups/restore', { cookie: admin.cookie, body: { fileName } })).status === 200, 'Backup restore failed');
    check(await db.player.count({ where: { id: playerId } }) === 1, 'Restored player missing');
    await db.backup.update({ where: { id: backup.id }, data: { data: JSON.stringify({ tournamentId: projectIds[3], users: [], entries: [{ ...entry, userId: `${tag}_unknown` }] }) } });
    check((await request('/api/admin/backups/restore', { cookie: admin.cookie, body: { fileName } })).status === 500, 'Invalid restore accepted');
    check(await db.player.count({ where: { id: playerId } }) === 1 && await db.teamEntry.count({ where: { id: entryId } }) === 1, 'Failed restore lost existing data');
  });
} catch (error) {
  console.error(`[preview-qa] FAIL ${stage} (${error.code || error.name || 'error'})`);
  process.exitCode = 1;
} finally {
  if (server && server.exitCode === null) {
    const exited = once(server, 'exit');
    server.kill('SIGTERM');
    await Promise.race([exited, pause(3000)]);
    if (server.exitCode === null) server.kill('SIGKILL');
  }
  try {
    if (fixturesStarted) {
      await db.teamEntry.deleteMany({ where: { tournamentId: { in: projectIds } } });
      await db.user.deleteMany({ where: { email: { startsWith: `${tag}_`, endsWith: '@example.invalid' } } });
      await db.backup.deleteMany({ where: { tournamentId: { in: projectIds } } });
      await db.project.deleteMany({ where: { id: { in: projectIds } } });
      check(await db.teamEntry.count({ where: { tournamentId: { in: projectIds } } }) === 0, 'Fixture cleanup failed');
      console.log('[preview-qa] Fixtures removed');
    }
  } catch { console.error('[preview-qa] Fixture cleanup failed'); process.exitCode = 1; }
  await db.$disconnect();
}
if (!process.exitCode) console.log(`[preview-qa] ${checks} API/DB integration checks passed`);
