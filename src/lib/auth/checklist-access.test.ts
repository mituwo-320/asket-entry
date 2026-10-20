/** @jest-environment node */
import { db } from '@/lib/db';
import { GET, POST, PATCH, DELETE } from '@/app/api/admin/checklist/route';
import { createSession, SESSION_COOKIES, type Role } from './session';

jest.mock('@/lib/db', () => ({ db: {
  user: { findUnique: jest.fn() },
  printChecklistItem: {
    findMany: jest.fn(), findUnique: jest.fn(), createMany: jest.fn(),
    create: jest.fn(), update: jest.fn(), delete: jest.fn(),
  },
} }));

const saved = { id: 'print-item', projectId: 'event', name: '保存済みの印刷物', isPrinted: true };
const handlers = { GET, POST, PATCH, DELETE };
type Method = keyof typeof handlers;
const methods: Method[] = ['GET', 'POST', 'PATCH', 'DELETE'];
function request(method: Method, role?: Role, origin = 'https://example.test') {
  const credential = role === 'admin' ? process.env.ADMIN_PASSWORD! : role === 'management' ? process.env.MANAGEMENT_PASSWORD! : 'participant-hash';
  const cookie = role ? `${SESSION_COOKIES[role]}=${createSession(role, 'fixture', credential)}` : '';
  return new Request('https://example.test/api/admin/checklist?projectId=event&id=print-item', {
    method, headers: { cookie, origin, 'Content-Type': 'application/json' },
    ...(method === 'POST' ? { body: JSON.stringify({ projectId: 'event', name: '追加する印刷物' }) } : {}),
    ...(method === 'PATCH' ? { body: JSON.stringify({ id: saved.id, isPrinted: false }) } : {}),
  });
}
beforeEach(() => {
  jest.clearAllMocks();
  process.env.SESSION_SECRET = 'fixture-session-key-at-least-32-characters';
  process.env.ADMIN_PASSWORD = 'fixture-admin-password';
  process.env.MANAGEMENT_PASSWORD = 'fixture-management-password';
  jest.mocked(db.user.findUnique).mockResolvedValue({ password: 'participant-hash' } as never);
  jest.mocked(db.printChecklistItem.findMany).mockResolvedValue([saved] as never);
  jest.mocked(db.printChecklistItem.findUnique).mockResolvedValue(null);
  jest.mocked(db.printChecklistItem.create).mockResolvedValue({ ...saved, name: '追加する印刷物', isPrinted: false } as never);
  jest.mocked(db.printChecklistItem.update).mockResolvedValue({ ...saved, isPrinted: false } as never);
  jest.mocked(db.printChecklistItem.delete).mockResolvedValue(saved as never);
});

describe.each(['management', 'admin'] as const)('%s checklist access', role => {
  test('loads the saved list and checked state without reinitializing it', async () => {
    const response = await GET(request('GET', role));
    expect(response.status).toBe(200);
    expect(response.headers.get('Cache-Control')).toBe('private, no-store');
    expect(await response.json()).toEqual({ items: [saved] });
    expect(db.printChecklistItem.findMany).toHaveBeenCalledWith({
      where: { projectId: 'event' }, orderBy: { createdAt: 'asc' },
    });
    expect(db.printChecklistItem.createMany).not.toHaveBeenCalled();
  });
  test('can add an item to the selected tournament', async () => {
    expect((await POST(request('POST', role))).status).toBe(200);
    expect(db.printChecklistItem.create).toHaveBeenCalledWith({
      data: { projectId: 'event', name: '追加する印刷物', isPrinted: false },
    });
  });
  test('can save the checked state', async () => {
    expect((await PATCH(request('PATCH', role))).status).toBe(200);
    expect(db.printChecklistItem.update).toHaveBeenCalledWith({
      where: { id: saved.id }, data: { isPrinted: false },
    });
  });
  test('can delete the requested item', async () => {
    expect((await DELETE(request('DELETE', role))).status).toBe(200);
    expect(db.printChecklistItem.delete).toHaveBeenCalledWith({ where: { id: saved.id } });
  });
});
describe.each([undefined, 'user'] as const)('checklist rejects %s', role => {
  test.each(methods)('%s is rejected before accessing checklist data', async method => {
    expect((await handlers[method](request(method, role))).status).toBe(role ? 403 : 401);
    for (const operation of Object.values(db.printChecklistItem)) {
      expect(operation).not.toHaveBeenCalled();
    }
  });
});
test('cross-origin checklist updates remain forbidden for operations staff', async () => {
  expect((await PATCH(request('PATCH', 'management', 'https://other.example.test'))).status).toBe(403);
  expect(db.printChecklistItem.update).not.toHaveBeenCalled();
});
