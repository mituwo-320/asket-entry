import { useState } from "react";
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import AdminLogin from "@/app/admin/login/page";
import AdminDashboard from "@/app/admin/page";
import AdminLotteryPrint from "@/app/admin/print/lottery/page";
import ProjectManagerModal from "./ProjectManagerModal";
import BackupManagerModal from "./BackupManagerModal";
import MatchResultModal from "./MatchResultModal";
import TimeScheduleEditor from "./TimeScheduleEditor";
import BracketFullscreen from "./BracketFullscreen";
import { generateBracket, placeTeamInSlot } from "@/lib/bracket-generator";
import type { TeamEntry, Match } from "@/lib/types";

const project = { id: "autumn", name: "秋の大会", isActive: true };
const secondProject = { id: "winter", name: "冬の大会", isActive: true };
const entry: TeamEntry = { id: "a", userId: "u", tournamentId: "autumn", teamName: "赤チーム", teamNameKana: "アカチーム", teamIntroduction: "よろしくお願いします", isBeginnerFriendlyAccepted: true, players: [{ id: "p", name: "代表 太郎", furigana: "ダイヒョウ タロウ", insurance: true }], status: "submitted", isPaid: false, createdAt: "2026-01-01" };
const match: Match = { id: "m", tournamentId: "autumn", teamIdA: "a", teamIdB: "b", status: "scheduled" };
const response = (data: unknown, ok = true) => Promise.resolve({ ok, json: async () => data } as Response);
function mockData() {
  jest.mocked(fetch).mockImplementation(url => response(url === "/api/admin/data" ? { entries: [entry, { ...entry, id: "b", tournamentId: "winter", teamName: "白チーム" }], users: [{ id: "u", name: "代表 太郎", phone: "09000000000" }] } : url === "/api/admin/projects" ? { projects: [project, secondProject] } : url === "/api/settings" ? { participationFee: 2500, insuranceFee: 150 } : url === "/api/admin/backups" ? { backups: [{ fileName: "autumn.json", tournamentId: "autumn", size: 100, createdAt: "2026-01-01" }] } : { matches: [], events: [], items: [], success: true }));
}
beforeEach(() => { global.fetch = jest.fn(); localStorage.clear(); });
afterEach(() => jest.restoreAllMocks());

test("admin sign-in retains failed input and prevents a second pending submission without changing auth payload", async () => {
  const user = userEvent.setup();
  let finish!: (response: Response) => void;
  jest.mocked(fetch).mockReturnValue(new Promise<Response>(resolve => { finish = resolve; }));
  render(<AdminLogin />);
  const password = screen.getByLabelText("管理者パスワード");
  await user.type(password, "example-password");
  await user.click(screen.getByRole("button", { name: "ログイン" }));
  expect(password).toBeDisabled();
  fireEvent.submit(password.closest("form")!);
  expect(fetch).toHaveBeenCalledTimes(1);
  expect(fetch).toHaveBeenCalledWith("/api/admin/auth", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password: "example-password" }) });
  await act(async () => finish({ ok: false, json: async () => ({ error: "認証に失敗しました" }) } as Response));
  expect(screen.getByRole("alert")).toHaveTextContent("認証に失敗しました");
  expect(password).toHaveValue("example-password");
  expect(password).toBeEnabled();
});

test("dashboard searches the representative and resets the schedule editor to the newly selected tournament", async () => {
  const user = userEvent.setup();
  mockData();
  render(<AdminDashboard />);
  await screen.findByRole("heading", { name: "大会を動かす、管理室。" });
  expect(screen.getByRole("link", { name: /01 チーム・受付/ })).toHaveAttribute("href", "#admin-teams");
  await user.type(screen.getByLabelText("チーム名・代表者名・電話番号で検索"), "一致しない名前");
  expect(screen.getByText("該当するチームが見つかりません。")).toBeInTheDocument();
  await user.clear(screen.getByLabelText("チーム名・代表者名・電話番号で検索"));
  await user.type(screen.getByLabelText("チーム名・代表者名・電話番号で検索"), "09000000000");
  expect(screen.getAllByText("赤チーム").length).toBeGreaterThan(0);
  await user.click(screen.getByRole("button", { name: "イベント追加" }));
  expect(screen.getByRole("dialog", { name: "予定の編集" })).toBeInTheDocument();
  await user.selectOptions(screen.getByLabelText("対象日程", { exact: true }), "winter");
  await waitFor(() => expect(fetch).toHaveBeenCalledWith("/api/schedule/events?tournamentId=winter"));
  expect(screen.queryByRole("dialog", { name: "予定の編集" })).not.toBeInTheDocument();
  expect(screen.getAllByText("白チーム").length).toBeGreaterThan(0);
});

test("project deletion retains its confirmation and cancellation makes no delete request", async () => {
  const user = userEvent.setup();
  const confirm = jest.spyOn(window, "confirm").mockReturnValue(false);
  render(<ProjectManagerModal isOpen onClose={jest.fn()} projects={[project]} onProjectsUpdate={jest.fn()} />);
  await user.click(screen.getByRole("button", { name: "削除" }));
  expect(confirm).toHaveBeenCalledWith(expect.stringContaining("関連するすべてのエントリー"));
  expect(fetch).not.toHaveBeenCalled();
});

test("backup restore retains its warning and cancellation does not post", async () => {
  const user = userEvent.setup();
  const confirm = jest.spyOn(window, "confirm").mockReturnValue(false);
  mockData();
  render(<BackupManagerModal isOpen onClose={jest.fn()} projects={[project]} onRestoreSuccess={jest.fn()} />);
  await user.click(await screen.findByRole("button", { name: /復元/ }));
  expect(confirm).toHaveBeenCalledWith(expect.stringContaining("秋の大会"));
  expect(jest.mocked(fetch).mock.calls.some(([url]) => url === "/api/admin/backups/restore")).toBe(false);
});

test("match results retain numeric scores and the existing winner calculation and payload", async () => {
  const user = userEvent.setup();
  const onUpdate = jest.fn();
  jest.mocked(fetch).mockImplementation(() => response({ success: true, match: { ...match, scoreA: 32, scoreB: 28, status: "finished", winnerId: "a" } }));
  render(<MatchResultModal isOpen onClose={jest.fn()} match={match} getTeamName={id => id === "a" ? "赤チーム" : "白チーム"} onUpdate={onUpdate} />);
  await user.type(screen.getByLabelText("赤チームの得点"), "32");
  await user.type(screen.getByLabelText("白チームの得点"), "28");
  await user.click(screen.getByRole("button", { name: "終了" }));
  await user.click(screen.getByRole("button", { name: "保存する" }));
  await waitFor(() => expect(fetch).toHaveBeenCalledWith("/api/match/update", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ matchId: "m", updates: { scoreA: 32, scoreB: 28, status: "finished", winnerId: "a" } }) }));
  expect(onUpdate).toHaveBeenCalledWith(expect.objectContaining({ winnerId: "a" }));
});

test("schedule event creation and generation both target the selected tournament", async () => {
  const user = userEvent.setup();
  mockData();
  render(<TimeScheduleEditor tournamentId="winter" entries={[]} matches={[]} refreshData={jest.fn()} />);
  await waitFor(() => expect(fetch).toHaveBeenCalledWith("/api/schedule/events?tournamentId=winter"));
  await user.click(screen.getByRole("button", { name: "イベント追加" }));
  await user.click(within(screen.getByRole("dialog", { name: "予定の編集" })).getByRole("button", { name: "保存" }));
  await waitFor(() => expect(jest.mocked(fetch).mock.calls.some(([url, options]) => url === "/api/schedule/events" && JSON.parse(String(options?.body)).events[0].tournamentId === "winter")).toBe(true));
  await user.click(screen.getByRole("button", { name: "自動生成" }));
  await user.click(within(screen.getByRole("dialog", { name: "スケジュール自動生成" })).getByRole("button", { name: /生成/ }));
  await waitFor(() => expect(fetch).toHaveBeenCalledWith("/api/admin/schedule/generate", expect.objectContaining({ body: JSON.stringify({ tournamentId: "winter", config: { startTime: "10:00", courts: 2, matchDuration: 15, interval: 5, slotsPerCourt: 8 } }) })));
});

test("projection resolves uncached team names from entries rather than a missing name field", () => {
  let data = generateBracket(8);
  const match = data.initialMatches[0];
  data = placeTeamInSlot(data, match.slotA.slotId, "a", "");
  data = placeTeamInSlot(data, match.slotB.slotId, "b", "");
  render(<BracketFullscreen appearance="admin" isOpen readOnly onClose={jest.fn()} bracketData={data} entries={[entry, { ...entry, id: "b", teamName: "白チーム" }]} onWin={jest.fn()} />);
  expect(screen.getAllByText("赤チーム").length).toBeGreaterThan(0);
  expect(screen.getAllByText("白チーム").length).toBeGreaterThan(0);
});

test("admin lottery tickets return to the admin dashboard and retain ticket names", async () => {
  mockData();
  render(<AdminLotteryPrint />);
  expect(await screen.findByRole("link", { name: "ダッシュボードに戻る" })).toHaveAttribute("href", "/admin");
  expect(screen.getAllByText("代表 太郎").length).toBeGreaterThan(0);
});

function ProjectDialogFixture() {
  const [open, setOpen] = useState(false);
  return <><button onClick={() => setOpen(true)}>大会設定を開く</button><ProjectManagerModal isOpen={open} onClose={() => setOpen(false)} projects={[project]} onProjectsUpdate={jest.fn()} /></>;
}

test("admin dialogs contain keyboard focus, close with Escape and restore the opening control", async () => {
  const user = userEvent.setup();
  render(<ProjectDialogFixture />);
  const trigger = screen.getByRole("button", { name: "大会設定を開く" });
  await user.click(trigger);
  const dialog = screen.getByRole("dialog", { name: "プロジェクト・大会日程の管理" });
  const close = within(dialog).getAllByRole("button", { name: "閉じる" })[0];
  expect(close).toHaveFocus();
  await user.tab({ shift: true });
  expect(within(dialog).getAllByRole("button").at(-1)).toHaveFocus();
  await user.tab();
  expect(close).toHaveFocus();
  await user.keyboard("{Escape}");
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  expect(trigger).toHaveFocus();
});

test("an admin payment save failure does not mark an unpaid entry as paid", async () => {
  const user = userEvent.setup();
  const alert = jest.spyOn(window, "alert").mockImplementation(() => {});
  mockData();
  const read = jest.mocked(fetch).getMockImplementation()!;
  jest.mocked(fetch).mockImplementation((url, options) => url === "/api/admin/entry/update" ? response({ error: "保存失敗" }, false) : read(url, options));
  render(<AdminDashboard />);
  const payment = await screen.findByRole("button", { name: "赤チームの入金確認" });
  await user.click(payment);
  await waitFor(() => expect(alert).toHaveBeenCalledWith("更新に失敗しました"));
  expect(payment).toHaveAttribute("aria-pressed", "false");
});

test("a failed schedule save keeps the editor and entered event title available for retry", async () => {
  const user = userEvent.setup();
  jest.spyOn(console, "error").mockImplementation(() => {});
  const alert = jest.spyOn(window, "alert").mockImplementation(() => {});
  mockData();
  const read = jest.mocked(fetch).getMockImplementation()!;
  jest.mocked(fetch).mockImplementation((url, options) => url === "/api/schedule/events" && options?.method === "POST" ? response({ error: "保存失敗" }, false) : read(url, options));
  render(<TimeScheduleEditor tournamentId="winter" entries={[]} matches={[]} refreshData={jest.fn()} />);
  await user.click(screen.getByRole("button", { name: "イベント追加" }));
  const dialog = screen.getByRole("dialog", { name: "予定の編集" });
  const title = within(dialog).getByLabelText("イベント名");
  await user.clear(title); await user.type(title, "受付開始");
  await user.click(within(dialog).getByRole("button", { name: "保存" }));
  await waitFor(() => expect(alert).toHaveBeenCalled());
  expect(screen.getByRole("dialog", { name: "予定の編集" })).toBeInTheDocument();
  expect(title).toHaveValue("受付開始");
});
