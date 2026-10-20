/** @jest-environment node */
import { participantFetch } from './participant-fetch';
import { staffFetch } from './staff-fetch';
const assign = jest.fn();
const removeItem = jest.fn();
beforeEach(() => {
  global.fetch = jest.fn();
  assign.mockReset(); removeItem.mockReset();
  Object.defineProperty(global, 'window', { configurable: true, value: { location: { pathname: '/management/event', assign } } });
  Object.defineProperty(global, 'localStorage', { configurable: true, value: { removeItem } });
});
afterAll(() => { Reflect.deleteProperty(global, 'window'); Reflect.deleteProperty(global, 'localStorage'); });
test('expired participant sessions clear the stale user and return to login', async () => {
  jest.mocked(fetch).mockResolvedValue(new Response('{}', { status: 401 }));
  await participantFetch('/api/user/entries');
  expect(removeItem).toHaveBeenCalledWith('currentUser'); expect(assign).toHaveBeenCalledWith('/login');
});
test('expired staff sessions return to the correct staff login', async () => {
  jest.mocked(fetch).mockResolvedValue(new Response('{}', { status: 401 }));
  await staffFetch('/api/admin/data'); expect(assign).toHaveBeenCalledWith('/management/login');
  window.location.pathname = '/admin';
  await staffFetch('/api/admin/data'); expect(assign).toHaveBeenLastCalledWith('/admin/login');
});
test('successful requests preserve the original request and response', async () => {
  const response = new Response('{"success":true}'); const options = { method: 'POST', body: '{}' };
  jest.mocked(fetch).mockResolvedValue(response);
  expect(await participantFetch('/api/player/save', options)).toBe(response);
  expect(fetch).toHaveBeenCalledWith('/api/player/save', options); expect(assign).not.toHaveBeenCalled();
});
