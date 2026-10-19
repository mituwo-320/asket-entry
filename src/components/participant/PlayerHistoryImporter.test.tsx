import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PlayerHistoryImporter } from './PlayerHistoryImporter';
import TeamDashboard from '@/app/team/dashboard/page';
import type { HistoryTeam } from '@/lib/player-history-types';

jest.mock('next/navigation', () => ({ useSearchParams: () => new URLSearchParams('id=current') }));
const member = Object.freeze({ id: 'past-player', name: '山田 太郎', furigana: 'ヤマダ タロウ', insurance: true, wristbandColor: '赤', alreadyAdded: false });
const representative = { id: 'rep', name: '代表 太郎', furigana: 'ダイヒョウ タロウ', insurance: true, wristbandColor: '赤', isRepresentative: true };
const copied = { id: 'new-copy', name: '山田 太郎', furigana: 'ヤマダ タロウ', insurance: true, wristbandColor: '赤', isRepresentative: false };
const teams: HistoryTeam[] = [{ id: 'old-team', teamName: '春チーム', projectName: '春の大会', createdAt: '2025-01-01T00:00:00Z', players: [member] }];
const response = (body: unknown, ok = true) => Promise.resolve({ ok, json: async () => body } as Response);
const setup = (history = teams) => { jest.mocked(fetch).mockImplementation((_url, options) => options?.method === 'POST' ? response({ players: [copied], added: 1, skipped: 0 }) : response({ teams: history })); };
beforeEach(() => { global.fetch = jest.fn(); localStorage.clear(); });
afterEach(() => jest.restoreAllMocks());

test('a selected member can be edited before batch registration without saving to the source', async () => {
    const user = userEvent.setup(); const complete = jest.fn(); setup();
    render(<PlayerHistoryImporter entryId="current" currentPlayers={[]} onClose={jest.fn()} onComplete={complete} />);
    await user.click(await screen.findByRole('button', { name: '山田 太郎を編集して追加' }));
    await user.clear(screen.getByLabelText('氏名')); await user.type(screen.getByLabelText('氏名'), '山田 次郎');
    await user.clear(screen.getByLabelText('フリガナ')); await user.type(screen.getByLabelText('フリガナ'), 'ヤマダ ジロウ');
    await user.click(screen.getByRole('radio', { name: /^青/ }));
    await user.click(screen.getByRole('radio', { name: /^加入しない/ }));
    await user.click(screen.getByRole('button', { name: '変更を反映' }));
    expect(jest.mocked(fetch).mock.calls.filter(([, options]) => options?.method === 'POST')).toHaveLength(0);
    await user.click(screen.getByRole('button', { name: '1人をまとめて追加' }));
    await waitFor(() => expect(complete).toHaveBeenCalled());
    expect(fetch).toHaveBeenLastCalledWith('/api/player/history', { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-team-id': 'current' }, body: JSON.stringify({ players: [{ sourcePlayerId: member.id, name: '山田 次郎', furigana: 'ヤマダ ジロウ', insurance: false, wristbandColor: '青' }] }) });
    expect(member.name).toBe('山田 太郎'); expect(member.insurance).toBe(true);
});
test('search and team switching keep selections while duplicate members and registered players are disabled', async () => {
    const user = userEvent.setup();
    setup([{ ...teams[0], players: [member, { ...representative, id: 'past-rep', alreadyAdded: false }, { ...member, id: 'previously-linked', name: '登録後に別名へ変更', alreadyAdded: true }] }, { id: 'other-team', teamName: '秋チーム', projectName: '秋の大会', createdAt: '2025-10-01T00:00:00Z', players: [{ ...member, id: 'same-person' }, { ...member, id: 'second-member', name: '佐藤 花子', furigana: 'サトウ ハナコ' }] }]);
    render(<PlayerHistoryImporter entryId="current" currentPlayers={[representative]} onClose={jest.fn()} onComplete={jest.fn()} />);
    expect(await screen.findByRole('checkbox', { name: '代表 太郎を選択' })).toBeDisabled();
    expect(screen.getByRole('checkbox', { name: '登録後に別名へ変更を選択' })).toBeDisabled();
    await user.click(screen.getByRole('checkbox', { name: '山田 太郎を選択' }));
    await user.selectOptions(screen.getByLabelText('自分が過去に登録したチーム'), 'other-team');
    expect(screen.getByRole('checkbox', { name: '山田 太郎を選択' })).toBeDisabled();
    await user.type(screen.getByLabelText('メンバーを検索'), 'ｻﾄｳ');
    expect(screen.queryByRole('checkbox', { name: '山田 太郎を選択' })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '表示中をまとめて選択' }));
    expect(screen.getByRole('button', { name: '2人をまとめて追加' })).toBeEnabled();
    await user.click(screen.getByRole('button', { name: '山田 太郎の選択を解除' }));
    expect(screen.getByRole('button', { name: '1人をまとめて追加' })).toBeEnabled();
});
test('failed batch registration retains selection and edited information for retry', async () => {
    const user = userEvent.setup(); const complete = jest.fn(); let attempts = 0;
    jest.mocked(fetch).mockImplementation((_url, options) => options?.method === 'POST' ? response(++attempts === 1 ? { error: '追加に失敗しました' } : { players: [copied], added: 1, skipped: 0 }, attempts > 1) : response({ teams }));
    render(<PlayerHistoryImporter entryId="current" currentPlayers={[]} onClose={jest.fn()} onComplete={complete} />);
    await user.click(await screen.findByRole('checkbox', { name: '山田 太郎を選択' }));
    await user.click(screen.getByRole('button', { name: '1人をまとめて追加' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('追加に失敗しました');
    expect(screen.getByRole('checkbox', { name: '山田 太郎を選択' })).toBeChecked();
    expect(complete).not.toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: '1人をまとめて追加' }));
    await waitFor(() => expect(complete).toHaveBeenCalledTimes(1));
    const payloads = jest.mocked(fetch).mock.calls.filter(([, options]) => options?.method === 'POST').map(([, options]) => options?.body);
    expect(payloads[0]).toBe(payloads[1]);
});
test('pending addition prevents duplicate requests, edits and closing the dialog', async () => {
    const user = userEvent.setup(); const close = jest.fn(); let finish!: (response: Response) => void;
    jest.mocked(fetch).mockImplementation((_url, options) => options?.method === 'POST' ? new Promise<Response>(resolve => { finish = resolve; }) : response({ teams }));
    render(<PlayerHistoryImporter entryId="current" currentPlayers={[]} onClose={close} onComplete={jest.fn()} />);
    await user.click(await screen.findByRole('checkbox', { name: '山田 太郎を選択' }));
    const add = screen.getByRole('button', { name: '1人をまとめて追加' });
    await act(async () => { fireEvent.click(add); fireEvent.click(add); });
    expect(jest.mocked(fetch).mock.calls.filter(([, options]) => options?.method === 'POST')).toHaveLength(1);
    expect(screen.getByRole('button', { name: '閉じる' })).toBeDisabled();
    expect(screen.getByRole('checkbox', { name: '山田 太郎を選択' })).toBeDisabled();
    await act(async () => finish({ ok: false, json: async () => ({ error: '保存失敗' }) } as Response));
    expect(close).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: '閉じる' })).toBeEnabled();
});
test('an empty history explains how members become available', async () => {
    setup([]);
    render(<PlayerHistoryImporter entryId="current" currentPlayers={[]} onClose={jest.fn()} onComplete={jest.fn()} />);
    expect(await screen.findByRole('heading', { name: '引用できるメンバーがまだいません' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /人をまとめて追加/ })).not.toBeInTheDocument();
});
test('failed history loading can be retried without creating any players', async () => {
    const user = userEvent.setup();
    jest.mocked(fetch).mockRejectedValueOnce(new Error('offline')).mockImplementation(() => response({ teams }));
    render(<PlayerHistoryImporter entryId="current" currentPlayers={[]} onClose={jest.fn()} onComplete={jest.fn()} />);
    await user.click(await screen.findByRole('button', { name: 'もう一度読み込む' }));
    expect(await screen.findByRole('checkbox', { name: '山田 太郎を選択' })).toBeInTheDocument();
    expect(jest.mocked(fetch).mock.calls.some(([, options]) => options?.method === 'POST')).toBe(false);
});
test('missing legacy furigana must be corrected before registration', async () => {
    const user = userEvent.setup(); setup([{ ...teams[0], players: [{ ...member, furigana: '' }] }]);
    render(<PlayerHistoryImporter entryId="current" currentPlayers={[]} onClose={jest.fn()} onComplete={jest.fn()} />);
    await user.click(await screen.findByRole('checkbox', { name: '山田 太郎を選択' }));
    await user.click(screen.getByRole('button', { name: '1人をまとめて追加' }));
    expect(screen.getByRole('alert')).toHaveTextContent('氏名とフリガナを確認');
    expect(jest.mocked(fetch).mock.calls.some(([, options]) => options?.method === 'POST')).toBe(false);
    expect(screen.getByRole('heading', { name: '追加するメンバーを確認' })).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveFocus();
});
test('selected members from multiple teams can be reviewed, edited and removed in one place', async () => {
    const user = userEvent.setup(); setup([...teams, { ...teams[0], id: 'autumn', teamName: '秋チーム', projectName: '秋の大会', players: [{ ...member, id: 'second', name: '佐藤 花子', furigana: 'サトウ ハナコ', insurance: false, wristbandColor: '黄' }] }]);
    render(<PlayerHistoryImporter entryId="current" currentPlayers={[]} onClose={jest.fn()} onComplete={jest.fn()} />);
    await user.click(await screen.findByRole('checkbox', { name: '山田 太郎を選択' }));
    await user.selectOptions(screen.getByLabelText('自分が過去に登録したチーム'), 'autumn');
    await user.click(screen.getByRole('checkbox', { name: '佐藤 花子を選択' }));
    await user.click(screen.getByRole('button', { name: '選択内容を確認' }));
    expect(screen.getByRole('heading', { name: '追加するメンバーを確認' })).toHaveFocus();
    const review = screen.getByRole('list', { name: '追加予定のメンバー' });
    expect(within(review).getAllByRole('listitem')).toHaveLength(2);
    expect(within(review).getByText('春の大会 / 春チーム')).toBeInTheDocument();
    expect(within(review).getByText('秋の大会 / 秋チーム')).toBeInTheDocument();
    await user.click(within(review).getByRole('button', { name: '山田 太郎を編集して追加' }));
    await user.click(screen.getByRole('radio', { name: /^青/ }));
    await user.click(screen.getByRole('radio', { name: /^加入しない/ }));
    await user.click(screen.getByRole('button', { name: '変更を反映' }));
    const first = within(screen.getByRole('list', { name: '追加予定のメンバー' })).getAllByRole('listitem')[0];
    expect(within(first).getByText('変更あり')).toBeInTheDocument();
    expect(within(first).getByText('リストバンド：青')).toBeInTheDocument();
    expect(within(first).getByText('保険：加入しない')).toBeInTheDocument();
    expect(within(first).getByRole('button', { name: '山田 太郎を編集して追加' })).toHaveFocus();
    await user.click(screen.getByRole('button', { name: '佐藤 花子の選択を解除' }));
    expect(screen.getByRole('button', { name: '1人をまとめて追加' })).toBeEnabled();
    await user.click(screen.getByRole('button', { name: '山田 太郎の選択を解除' }));
    await user.click(screen.getByRole('button', { name: '変更を破棄して外す' }));
    expect(screen.getByText('まだメンバーが選ばれていません。')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: '追加するメンバーを確認' })).toHaveFocus();
    expect(screen.getByRole('button', { name: '0人をまとめて追加' })).toBeDisabled();
    expect(jest.mocked(fetch).mock.calls.some(([, options]) => options?.method === 'POST')).toBe(false);
});
test('hiragana, katakana and half-width searches find the same member and clearing restores focus', async () => {
    const user = userEvent.setup(); setup();
    render(<PlayerHistoryImporter entryId="current" currentPlayers={[]} onClose={jest.fn()} onComplete={jest.fn()} />);
    const search = await screen.findByLabelText('メンバーを検索');
    for (const term of ['やまだ', 'ヤマダ', 'ﾔﾏﾀﾞ']) {
        await user.clear(search); await user.type(search, term);
        expect(screen.getByRole('checkbox', { name: '山田 太郎を選択' })).toBeInTheDocument();
    }
    await user.clear(search); await user.type(search, '見つからない');
    expect(screen.getByText('該当するメンバーがいません。検索条件を変えてください。')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '検索をクリア' }));
    expect(search).toHaveValue(''); expect(search).toHaveFocus();
    expect(screen.getByRole('checkbox', { name: '山田 太郎を選択' })).toBeInTheDocument();
});
test('closing protects even an unfinished member edit and continuing preserves the form input', async () => {
    const user = userEvent.setup(); const close = jest.fn(); setup();
    render(<PlayerHistoryImporter entryId="current" currentPlayers={[]} onClose={close} onComplete={jest.fn()} />);
    await user.click(await screen.findByRole('button', { name: '山田 太郎を編集して追加' }));
    await user.clear(screen.getByLabelText('氏名')); await user.type(screen.getByLabelText('氏名'), '編集中の名前');
    await act(async () => { await user.keyboard('{Escape}'); });
    expect(close).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: '作業を続ける' })).toHaveFocus();
    expect(screen.queryByLabelText('氏名')).not.toBeVisible();
    await act(async () => { await user.click(screen.getByRole('button', { name: '作業を続ける' })); });
    expect(screen.getByLabelText('氏名')).toHaveValue('編集中の名前');
    expect(screen.getByLabelText('氏名')).toHaveFocus();
    await user.click(screen.getByRole('button', { name: '変更を反映' }));
    await user.click(screen.getByRole('button', { name: '閉じる' }));
    await user.click(screen.getByRole('button', { name: '破棄して閉じる' }));
    expect(close).toHaveBeenCalledTimes(1);
    expect(jest.mocked(fetch).mock.calls.some(([, options]) => options?.method === 'POST')).toBe(false);
});
test('Escape cancels discard confirmation and an empty selection closes immediately', async () => {
    const user = userEvent.setup(); const close = jest.fn(); setup();
    render(<PlayerHistoryImporter entryId="current" currentPlayers={[]} onClose={close} onComplete={jest.fn()} />);
    await user.click(await screen.findByRole('checkbox', { name: '山田 太郎を選択' }));
    await user.click(screen.getByRole('button', { name: '閉じる' }));
    await act(async () => { await user.keyboard('{Escape}'); });
    expect(screen.queryByRole('button', { name: '破棄して閉じる' })).not.toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: '山田 太郎を選択' })).toBeChecked();
    await user.click(screen.getByRole('checkbox', { name: '山田 太郎を選択' }));
    await user.click(screen.getByRole('button', { name: '閉じる' }));
    expect(close).toHaveBeenCalledTimes(1);
});
test('at the batch limit selected members remain editable and unselected members cannot be added', async () => {
    const user = userEvent.setup(); setup([{ ...teams[0], players: Array.from({ length: 51 }, (_, index) => ({ ...member, id: `p-${index}`, name: `選手${index}`, furigana: `センシュ${index}` })) }]);
    render(<PlayerHistoryImporter entryId="current" currentPlayers={[]} onClose={jest.fn()} onComplete={jest.fn()} />);
    await user.click(await screen.findByRole('button', { name: '表示中をまとめて選択' }));
    expect(screen.getByRole('button', { name: '50人をまとめて追加' })).toBeEnabled();
    expect(screen.getByRole('checkbox', { name: '選手50を選択' })).toBeDisabled();
    expect(screen.getByRole('button', { name: '選手50を編集して追加' })).toBeDisabled();
    await user.click(screen.getByRole('button', { name: '選手0を編集して追加' }));
    expect(screen.getByLabelText('氏名')).toHaveValue('選手0');
    expect(jest.mocked(fetch).mock.calls.some(([, options]) => options?.method === 'POST')).toBe(false);
});
test('the team dashboard reflects imported players and allows ordinary editing of the new copy', async () => {
    const user = userEvent.setup();
    const entry = { id: 'current', userId: 'owner', teamName: '今回のチーム', tournamentId: 'current-project', status: 'draft', projectEndDate: '2099-12-31', players: [representative] };
    jest.mocked(fetch).mockImplementation((url, options) => response(url === '/api/team/data' ? { teamEntry: entry, isAdmin: false } : url === '/api/player/history' ? options?.method === 'POST' ? { players: [representative, copied], added: 1, skipped: 0 } : { teams } : {}));
    await act(async () => { render(<TeamDashboard />); });
    await user.click(await screen.findByRole('button', { name: '過去のメンバーから追加' }));
    await user.click(await screen.findByRole('checkbox', { name: '山田 太郎を選択' }));
    await user.click(screen.getByRole('button', { name: '1人をまとめて追加' }));
    expect(await screen.findByText('1人のメンバーを追加しました。')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '山田 太郎の情報を編集' }));
    await user.clear(screen.getByLabelText('氏名')); await user.type(screen.getByLabelText('氏名'), '山田 三郎');
    await user.click(screen.getByRole('button', { name: '保存' }));
    await waitFor(() => expect(fetch).toHaveBeenLastCalledWith('/api/player/save', expect.objectContaining({ headers: { 'Content-Type': 'application/json', 'x-team-id': 'current' }, body: JSON.stringify({ id: 'new-copy', name: '山田 三郎', furigana: copied.furigana, insurance: true, wristbandColor: '赤', isRepresentative: false }) })));
    expect(member.name).toBe('山田 太郎');
});

test('returning from a changed edit requires confirmation and discarding keeps the last reflected draft', async () => {
    const user = userEvent.setup(); setup();
    render(<PlayerHistoryImporter entryId="current" currentPlayers={[]} onClose={jest.fn()} onComplete={jest.fn()} />);
    await user.click(await screen.findByRole('button', { name: '山田 太郎を編集して追加' }));
    await user.click(screen.getByRole('button', { name: '一覧へ戻る' }));
    expect(screen.queryByRole('button', { name: '変更を破棄して一覧へ戻る' })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '山田 太郎を編集して追加' }));
    await user.click(screen.getByRole('radio', { name: /^青/ }));
    await user.click(screen.getByRole('button', { name: '変更を反映' }));
    await user.click(screen.getByRole('button', { name: '山田 太郎を編集して追加' }));
    await user.clear(screen.getByLabelText('氏名')); await user.type(screen.getByLabelText('氏名'), '未反映の名前');
    await user.click(screen.getByRole('radio', { name: /^黄/ }));
    await user.click(screen.getByRole('button', { name: '一覧へ戻る' }));
    expect(screen.getByRole('button', { name: '作業を続ける' })).toHaveFocus();
    await act(async () => { await user.click(screen.getByRole('button', { name: '作業を続ける' })); });
    expect(screen.getByLabelText('氏名')).toHaveValue('未反映の名前');
    expect(screen.getByRole('radio', { name: /^黄/ })).toBeChecked();
    await user.click(screen.getByRole('button', { name: '一覧へ戻る' }));
    await user.click(screen.getByRole('button', { name: '変更を破棄して一覧へ戻る' }));
    await user.click(screen.getByRole('button', { name: '山田 太郎を編集して追加' }));
    expect(screen.getByLabelText('氏名')).toHaveValue(member.name);
    expect(screen.getByRole('radio', { name: /^青/ })).toBeChecked();
    expect(jest.mocked(fetch).mock.calls.some(([, options]) => options?.method === 'POST')).toBe(false);
});

test('clearing all selections is reversible until confirmation and keeps edits when canceled', async () => {
    const user = userEvent.setup(); setup([{ ...teams[0], players: [member, { ...member, id: 'second', name: '佐藤 花子', furigana: 'サトウ ハナコ' }] }]);
    render(<PlayerHistoryImporter entryId="current" currentPlayers={[]} onClose={jest.fn()} onComplete={jest.fn()} />);
    await user.click(await screen.findByRole('button', { name: '表示中をまとめて選択' }));
    await user.click(screen.getByRole('button', { name: '山田 太郎を編集して追加' }));
    await user.click(screen.getByRole('radio', { name: /^青/ }));
    await user.click(screen.getByRole('button', { name: '変更を反映' }));
    await user.click(screen.getByRole('button', { name: '選択内容を確認' }));
    await user.click(screen.getByRole('button', { name: '選択をすべて解除' }));
    expect(screen.getByText('2人の選択と、この画面で反映した編集内容が消えます。')).toBeInTheDocument();
    await act(async () => { await user.keyboard('{Escape}'); });
    expect(screen.getByRole('button', { name: '2人をまとめて追加' })).toBeEnabled();
    expect(screen.getByText('リストバンド：青')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '選択をすべて解除' }));
    await user.click(screen.getByRole('button', { name: 'すべて解除する' }));
    expect(screen.getByRole('button', { name: '0人をまとめて追加' })).toBeDisabled();
    expect(screen.getByRole('heading', { name: '追加するメンバーを確認' })).toHaveFocus();
    expect(jest.mocked(fetch).mock.calls.some(([, options]) => options?.method === 'POST')).toBe(false);
});

test('unchecking a changed member preserves the draft until its removal is confirmed', async () => {
    const user = userEvent.setup(); setup();
    render(<PlayerHistoryImporter entryId="current" currentPlayers={[]} onClose={jest.fn()} onComplete={jest.fn()} />);
    await user.click(await screen.findByRole('button', { name: '山田 太郎を編集して追加' }));
    await user.click(screen.getByRole('radio', { name: /^青/ }));
    await user.click(screen.getByRole('button', { name: '変更を反映' }));
    await user.click(screen.getByRole('checkbox', { name: '山田 太郎を選択' }));
    await user.click(screen.getByRole('button', { name: '作業を続ける' }));
    expect(screen.getByRole('checkbox', { name: '山田 太郎を選択' })).toBeChecked();
    await user.click(screen.getByRole('button', { name: '山田 太郎を編集して追加' }));
    expect(screen.getByRole('radio', { name: /^青/ })).toBeChecked();
    await user.click(screen.getByRole('button', { name: '一覧へ戻る' }));
    await user.click(screen.getByRole('checkbox', { name: '山田 太郎を選択' }));
    await user.click(screen.getByRole('button', { name: '変更を破棄して外す' }));
    expect(screen.getByRole('checkbox', { name: '山田 太郎を選択' })).not.toBeChecked();
});

const bulkTeams: HistoryTeam[] = [
    { ...teams[0], players: [member, { ...member, id: 'unselected', name: '未選択 選手', furigana: 'ミセンタク センシュ' }] },
    { ...teams[0], id: 'autumn', teamName: '秋チーム', players: [{ ...member, id: 'second', name: '佐藤 花子', furigana: 'サトウ ハナコ', insurance: false, wristbandColor: '黄' }] },
];
test.each([
    ['no', 'keep', false, false, '赤', '黄'],
    ['keep', '青', true, false, '青', '青'],
    ['yes', '青', true, true, '青', '青'],
] as const)('bulk settings (%s, %s) change only selected members and requested fields after confirmation', async (insurance, wristband, firstInsurance, secondInsurance, firstColor, secondColor) => {
    const user = userEvent.setup(); setup(bulkTeams);
    render(<PlayerHistoryImporter entryId="current" currentPlayers={[representative]} onClose={jest.fn()} onComplete={jest.fn()} />);
    await user.click(await screen.findByRole('checkbox', { name: '山田 太郎を選択' }));
    await user.selectOptions(screen.getByLabelText('自分が過去に登録したチーム'), 'autumn');
    await user.click(screen.getByRole('checkbox', { name: '佐藤 花子を選択' }));
    await user.click(screen.getByRole('button', { name: '選択内容を確認' }));
    await user.click(screen.getByRole('button', { name: '選択中の保険・リストバンドを一括変更' }));
    expect(screen.getByLabelText('まとめて変更する保険')).toHaveValue('keep');
    expect(screen.getByLabelText('まとめて変更するリストバンド')).toHaveValue('keep');
    expect(screen.getByRole('button', { name: '変更内容を確認' })).toBeDisabled();
    await user.selectOptions(screen.getByLabelText('まとめて変更する保険'), insurance);
    await user.selectOptions(screen.getByLabelText('まとめて変更するリストバンド'), wristband);
    await user.click(screen.getByRole('button', { name: '変更内容を確認' }));
    expect(screen.getByRole('heading', { name: '反映する内容を確認' })).toHaveFocus();
    expect(screen.getByText('対象の2人を確認')).toBeInTheDocument();
    expect(screen.queryByText('未選択 選手')).not.toBeInTheDocument();
    expect(jest.mocked(fetch).mock.calls.some(([, options]) => options?.method === 'POST')).toBe(false);
    await user.click(screen.getByRole('button', { name: '2人に反映' }));
    expect(screen.getByRole('button', { name: '選択中の保険・リストバンドを一括変更' })).toHaveFocus();
    expect(screen.getByText(/2人の参加内容に一括変更を反映しました/)).toBeInTheDocument();
    expect(jest.mocked(fetch).mock.calls.some(([, options]) => options?.method === 'POST')).toBe(false);
    await user.click(screen.getByRole('button', { name: '2人をまとめて追加' }));
    const [, options] = jest.mocked(fetch).mock.calls.find(([, init]) => init?.method === 'POST')!;
    expect(JSON.parse(options!.body as string)).toEqual({ players: [
        { sourcePlayerId: member.id, name: member.name, furigana: member.furigana, insurance: firstInsurance, wristbandColor: firstColor },
        { sourcePlayerId: 'second', name: '佐藤 花子', furigana: 'サトウ ハナコ', insurance: secondInsurance, wristbandColor: secondColor },
    ] });
    expect(member.insurance).toBe(true); expect(member.wristbandColor).toBe('赤');
});

test('bulk changes can be revised or canceled, and same-value settings cannot be applied', async () => {
    const user = userEvent.setup(); setup();
    render(<PlayerHistoryImporter entryId="current" currentPlayers={[]} onClose={jest.fn()} onComplete={jest.fn()} />);
    await user.click(await screen.findByRole('checkbox', { name: '山田 太郎を選択' }));
    await user.click(screen.getByRole('button', { name: '選択内容を確認' }));
    await user.click(screen.getByRole('button', { name: '選択中の保険・リストバンドを一括変更' }));
    await user.selectOptions(screen.getByLabelText('まとめて変更する保険'), 'yes');
    expect(screen.getByText('選択中のメンバーはすでにこの設定です。')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '変更内容を確認' })).toBeDisabled();
    await user.selectOptions(screen.getByLabelText('まとめて変更する保険'), 'no');
    await user.click(screen.getByRole('button', { name: '変更内容を確認' }));
    await user.click(screen.getByRole('button', { name: '閉じる' }));
    await act(async () => { await user.click(screen.getByRole('button', { name: '作業を続ける' })); });
    expect(screen.getByRole('button', { name: '1人に反映' })).toBeEnabled();
    await user.click(screen.getByRole('button', { name: '設定に戻る' }));
    expect(screen.getByLabelText('まとめて変更する保険')).toHaveValue('no');
    await user.click(screen.getByRole('button', { name: '変更せず一覧へ戻る' }));
    expect(screen.getByText('保険：加入')).toBeInTheDocument();
    expect(jest.mocked(fetch).mock.calls.some(([, options]) => options?.method === 'POST')).toBe(false);
});
