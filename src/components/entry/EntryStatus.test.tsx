import { render, screen } from '@testing-library/react';
import { EntryStatus } from './EntryStatus';

const fetchMock = jest.fn();
const originalFetch = global.fetch;

beforeEach(() => {
  fetchMock.mockReset();
  global.fetch = fetchMock;
});

afterAll(() => {
  global.fetch = originalFetch;
});

it('shows the accepting tournament without claiming that places remain', async () => {
  fetchMock.mockResolvedValue({ ok: true, json: async () => ({ projects: [{ id: 'cup', name: '春大会', maxTeams: 10, currentEntryCount: 10 }] }) });
  render(<EntryStatus />);
  expect(await screen.findByText('春大会')).toBeInTheDocument();
  expect(screen.getByText('空き状況・キャンセル待ちは登録画面でご確認ください。')).toBeInTheDocument();
});

it('shows closed registration when the API returns an empty list', async () => {
  fetchMock.mockResolvedValue({ ok: true, json: async () => ({ projects: [] }) });
  render(<EntryStatus />);
  expect(await screen.findByText('現在、参加申し込みを受け付けている大会はありません。')).toBeInTheDocument();
});

it.each([
  { ok: false, json: async () => ({ error: 'Unavailable' }) },
  { ok: true, json: async () => ({ error: 'Invalid response' }) },
])('distinguishes a failed status request from closed registration', async response => {
  fetchMock.mockResolvedValue(response);
  render(<EntryStatus />);
  expect(await screen.findByText('受付状況を取得できませんでした。時間をおいて再度ご確認ください。')).toBeInTheDocument();
  expect(screen.queryByText('現在、参加申し込みを受け付けている大会はありません。')).not.toBeInTheDocument();
});
