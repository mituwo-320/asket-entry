import { act, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PlayerForm } from "@/components/ui/PlayerForm";
import RegisterPage from "@/app/team/register/page";
import TeamDashboard from "@/app/team/dashboard/page";
import EditTeamPage from "@/app/team/edit/page";
import UserDashboard from "@/app/dashboard/page";
import InvoicePage from "@/app/team/invoice/page";
import ReceiptPage from "@/app/team/receipt/page";

const mockPush = jest.fn();
let mockParams = new URLSearchParams("id=test-entry");
const mockRouter = { push: mockPush };
jest.mock("next/navigation", () => ({ useRouter: () => mockRouter, useSearchParams: () => mockParams }));

const representative = { id: "rep", name: "代表 太郎", furigana: "ダイヒョウ タロウ", insurance: true, wristbandColor: "赤", isRepresentative: true };
const baseEntry = { id: "test-entry", userId: "test-user", tournamentId: "test-project", teamName: "テストチーム", teamNameKana: "テストチーム", teamIntroduction: "よろしくお願いします。", isBeginnerFriendlyAccepted: true, players: [representative], status: "draft", createdAt: "2026-01-01", projectEndDate: "2099-12-31" };
const account = { id: "test-user", name: "代表 太郎", email: "representative@example.test", phone: "09000000000" };
const project = { id: "test-project", name: "テスト大会", isActive: true, entryEndDate: "2099-12-31", maxTeams: 16 };
const response = (data: unknown) => Promise.resolve({ ok: true, json: async () => data });

beforeEach(() => {
  mockParams = new URLSearchParams("id=test-entry");
  mockPush.mockReset();
  localStorage.clear();
  global.fetch = jest.fn();
});

test("member form supports keyboard selection and submits the selected wristband and insurance", async () => {
  const user = userEvent.setup();
  const onSave = jest.fn();
  render(<PlayerForm onSave={onSave} onCancel={jest.fn()} />);
  await user.type(screen.getByLabelText("氏名"), "追加 花子");
  await user.type(screen.getByLabelText("フリガナ"), "ツイカ ハナコ");
  await user.tab();
  expect(screen.getByRole("radio", { name: /赤/ })).toHaveFocus();
  await user.keyboard("{ArrowRight}");
  expect(screen.getByRole("radio", { name: /青/ })).toBeChecked();
  await user.click(screen.getByRole("radio", { name: /加入しない/ }));
  await user.click(screen.getByRole("button", { name: "保存" }));
  expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ name: "追加 花子", furigana: "ツイカ ハナコ", wristbandColor: "青", insurance: false }));
});

test("draft team can add a member through the dialog and existing save API", async () => {
  const user = userEvent.setup();
  jest.mocked(fetch).mockImplementation((url) => response(String(url) === "/api/team/data" ? { teamEntry: baseEntry, isAdmin: false } : {} ) as ReturnType<typeof fetch>);
  render(<TeamDashboard />);
  await user.click(await screen.findByRole("button", { name: "選手を追加" }));
  const dialog = screen.getByRole("dialog", { name: "選手を追加" });
  await user.type(within(dialog).getByLabelText("氏名"), "追加 花子");
  await user.type(within(dialog).getByLabelText("フリガナ"), "ツイカ ハナコ");
  await user.click(within(dialog).getByRole("radio", { name: /黄/ }));
  await user.click(within(dialog).getByRole("button", { name: "保存" }));
  await waitFor(() => expect(fetch).toHaveBeenCalledWith("/api/player/save", expect.objectContaining({ method: "POST", headers: expect.objectContaining({ "x-team-id": "test-entry" }), body: expect.stringContaining('"wristbandColor":"黄"') })));
  expect(await screen.findByText("追加 花子")).toBeInTheDocument();
});

test("failed member saves retain the entered values and retry with the same player ID", async () => {
  const user = userEvent.setup();
  let saves = 0;
  jest.mocked(fetch).mockImplementation((url) => {
    if (url === "/api/player/save" && saves++ === 0) return Promise.resolve({ ok: false, json: async () => ({}) }) as ReturnType<typeof fetch>;
    return response(url === "/api/team/data" ? { teamEntry: baseEntry, isAdmin: false } : {}) as ReturnType<typeof fetch>;
  });
  render(<TeamDashboard />);
  await user.click(await screen.findByRole("button", { name: "選手を追加" }));
  const dialog = screen.getByRole("dialog", { name: "選手を追加" });
  await user.type(within(dialog).getByLabelText("氏名"), "再試行 花子");
  await user.type(within(dialog).getByLabelText("フリガナ"), "サイシコウ ハナコ");
  await user.click(within(dialog).getByRole("button", { name: "保存" }));
  expect(await within(dialog).findByRole("alert")).toHaveTextContent("入力内容は残っています");
  expect(within(dialog).getByLabelText("氏名")).toHaveValue("再試行 花子");
  await user.click(within(dialog).getByRole("button", { name: "保存" }));
  await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  expect(screen.getByText("再試行 花子")).toBeInTheDocument();
  const requests = jest.mocked(fetch).mock.calls.filter(([url]) => url === "/api/player/save");
  expect(requests).toHaveLength(2);
  expect(JSON.parse(requests[0][1]!.body as string).id).toBe(JSON.parse(requests[1][1]!.body as string).id);
});

test("member save keeps the dialog visible and disables editing while the request is pending", async () => {
  const user = userEvent.setup();
  let finish!: (value: Response) => void;
  jest.mocked(fetch).mockImplementation(url => url === "/api/player/save" ? new Promise(resolve => { finish = resolve; }) : response(url === "/api/team/data" ? { teamEntry: baseEntry, isAdmin: false } : {}) as ReturnType<typeof fetch>);
  render(<TeamDashboard />);
  await user.click(await screen.findByRole("button", { name: "選手を追加" }));
  const dialog = screen.getByRole("dialog", { name: "選手を追加" });
  await user.type(within(dialog).getByLabelText("氏名"), "保存 花子");
  await user.type(within(dialog).getByLabelText("フリガナ"), "ホゾン ハナコ");
  await user.click(within(dialog).getByRole("button", { name: "保存" }));
  expect(within(dialog).getByRole("button", { name: "保存中…" })).toBeDisabled();
  expect(within(dialog).getByLabelText("氏名")).toBeDisabled();
  await user.keyboard("{Escape}");
  expect(dialog).toBeInTheDocument();
  await act(async () => { finish({ ok: true, json: async () => ({}) } as Response); });
  await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
});

test("clinic changes keep the team page visible while saving and preserve the update payload", async () => {
  const user = userEvent.setup();
  let finish!: (value: Response) => void;
  const entry = { ...baseEntry, status: "submitted", hasClinic: true, clinicParticipation: null, clinicCount: 0 };
  jest.mocked(fetch).mockImplementation(url => url === "/api/team/update" ? new Promise(resolve => { finish = resolve; }) : response(url === "/api/team/data" ? { teamEntry: entry, isAdmin: false } : {}) as ReturnType<typeof fetch>);
  render(<TeamDashboard />);
  await user.click(await screen.findByRole("button", { name: "希望を回答する" }));
  const dialog = screen.getByRole("dialog", { name: "バスケクリニック参加希望の変更" });
  await user.click(within(dialog).getByRole("radio", { name: "参加しない" }));
  await user.click(within(dialog).getByRole("radio", { name: "クリニックに参加する" }));
  expect(within(dialog).getByLabelText(/参加予定人数/)).toHaveValue("1");
  await user.click(within(dialog).getByRole("button", { name: "希望を更新する" }));
  expect(screen.getByRole("heading", { name: "テストチーム" })).toBeInTheDocument();
  expect(within(dialog).getByRole("button", { name: "処理中..." })).toBeDisabled();
  expect(fetch).toHaveBeenCalledWith("/api/team/update", expect.objectContaining({ method: "POST", body: JSON.stringify({ clinicParticipation: true, clinicCount: 1 }) }));
  await act(async () => { finish({ ok: true, json: async () => ({}) } as Response); });
  expect(await screen.findByRole("dialog", { name: "完了" })).toBeInTheDocument();
});

test.each([
  { status: "draft", closed: false, action: "選手リストへ" },
  { status: "submitted", closed: false, action: "書類の確認へ" },
  { status: "draft", closed: true, action: null },
])("preparation guide follows $status and closed=$closed", async ({ status, closed, action }) => {
  jest.mocked(fetch).mockImplementation(url => response(url === "/api/team/data" ? { teamEntry: { ...baseEntry, status, projectEndDate: closed ? "2020-01-01" : "2099-12-31" }, isAdmin: false } : {}) as ReturnType<typeof fetch>);
  render(<TeamDashboard />);
  const guide = await screen.findByRole("region", { name: "大会までの準備" });
  if (action) expect(within(guide).getByRole("link", { name: action })).toHaveAttribute("href", status === "submitted" ? "#team-confirmation" : "#team-members");
  else {
    expect(within(guide).getByText("変更受付終了")).toBeInTheDocument();
    expect(within(guide).queryByRole("link", { name: "選手リストへ" })).not.toBeInTheDocument();
  }
});

test("invoice saving opens the print dialog without changing the invoice amount", async () => {
  const print = jest.spyOn(window, "print").mockImplementation(() => {});
  const user = userEvent.setup();
  jest.mocked(fetch).mockImplementation(url => response(url === "/api/team/data" ? { teamEntry: baseEntry, user: account } : { participationFee: 2500, insuranceFee: 150 }) as ReturnType<typeof fetch>);
  render(<InvoicePage />);
  await user.click(await screen.findByRole("button", { name: "PDF保存・印刷" }));
  expect(print).toHaveBeenCalledTimes(1);
  expect(screen.getAllByText(/2,650/).length).toBeGreaterThan(0);
  print.mockRestore();
});

test("an already viewed receipt cannot display the save action or mark another view", async () => {
  jest.mocked(fetch).mockImplementation(url => response(url === "/api/team/data" ? { teamEntry: { ...baseEntry, isPaid: true, receiptIssuedAt: "2026-01-01", receiptViewedAt: "2026-01-02" }, user: account } : {}) as ReturnType<typeof fetch>);
  render(<ReceiptPage />);
  await screen.findByRole("heading", { name: "領収書を表示できません" });
  expect(screen.queryByRole("button", { name: "PDF保存・印刷" })).not.toBeInTheDocument();
  expect(jest.mocked(fetch).mock.calls.some(([url]) => url === "/api/team/receipt/viewed")).toBe(false);
});

test.each([
  { label: "submitted", entry: { ...baseEntry, status: "submitted" } },
  { label: "deadline passed", entry: { ...baseEntry, projectEndDate: "2020-01-01" } },
])("member editing is unavailable when $label", async ({ entry }) => {
  jest.mocked(fetch).mockImplementation((url) => response(String(url) === "/api/team/data" ? { teamEntry: entry, isAdmin: false } : {}) as ReturnType<typeof fetch>);
  render(<TeamDashboard />);
  await screen.findByRole("heading", { name: "テストチーム" });
  expect(screen.queryByRole("button", { name: "選手を追加" })).not.toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "代表 太郎の情報を編集" })).not.toBeInTheDocument();
  if (entry.status === "draft") expect(screen.getByRole("button", { name: /本エントリーを完了し/ })).toBeDisabled();
});

test("registration sends the number and native radio choices without changing the API payload", async () => {
  const user = userEvent.setup();
  jest.mocked(fetch).mockImplementation((url) => response(String(url) === "/api/projects/active" ? { projects: [project] } : String(url) === "/api/team/register" ? { teamId: "new-entry" } : {}) as ReturnType<typeof fetch>);
  render(<RegisterPage />);
  await screen.findByRole("heading", { name: "チームの参加申し込み" });
  for (const [label, value] of [
    ["チーム名（必須）", "テストチーム"], ["チーム名のフリガナ（必須）", "テストチーム"],
    ["代表者氏名（必須）", "代表 太郎"], ["代表者氏名のフリガナ（必須）", "ダイヒョウ タロウ"],
    ["メールアドレス（必須）", "representative@example.test"], ["電話番号・緊急連絡先（必須）", "09000000000"],
    ["チーム紹介・意気込み *必須", "よろしくお願いします。"], ["パスワード（必須）", "1234"], ["パスワードの確認（必須）", "1234"],
  ]) await user.type(screen.getByLabelText(label), value);
  await user.click(screen.getByRole("button", { name: "予選抽選の数字 7" }));
  await user.click(screen.getByRole("radio", { name: /青/ }));
  await user.click(screen.getByRole("radio", { name: /加入しない/ }));
  await user.click(screen.getByRole("checkbox"));
  await user.click(screen.getByRole("button", { name: "上記の内容でエントリーする" }));
  await waitFor(() => expect(fetch).toHaveBeenCalledWith("/api/team/register", expect.objectContaining({ method: "POST", body: expect.stringContaining('"preliminaryNumber":7') })));
  const request = jest.mocked(fetch).mock.calls.find(([url]) => url === "/api/team/register")![1];
  expect(JSON.parse(request!.body as string)).toMatchObject({ tournamentId: "test-project", wristbandColor: "青", insurance: false });
  expect(await screen.findByRole("heading", { name: "チームの申し込みを受け付けました" })).toBeInTheDocument();
});

test("team settings without an entry ID shows a return path instead of an endless loading state", async () => {
  mockParams = new URLSearchParams();
  jest.mocked(fetch).mockImplementation(() => response({}) as ReturnType<typeof fetch>);
  render(<EditTeamPage />);
  expect(screen.getByRole("heading", { name: "チームを選択してください" })).toBeInTheDocument();
  expect(screen.getByRole("link", { name: "マイページへ戻る" })).toHaveAttribute("href", "/dashboard");
  await waitFor(() => expect(fetch).toHaveBeenCalledTimes(1));
});

test("account with completed registrations does not show an unfinished-member warning", async () => {
  localStorage.setItem("currentUser", JSON.stringify(account));
  jest.mocked(fetch).mockImplementation((url) => response(String(url).startsWith("/api/user/entries") ? { entries: [{ ...baseEntry, status: "submitted" }] } : String(url) === "/api/admin/projects" ? { projects: [project] } : {}) as ReturnType<typeof fetch>);
  render(<UserDashboard />);
  await screen.findByRole("heading", { name: "マイページ" });
  expect(screen.queryByText("【重要】メンバー登録のお願い")).not.toBeInTheDocument();
  expect(screen.getByRole("button", { name: "ログアウト" })).toBeInTheDocument();
  expect(screen.getByRole("link", { name: /チーム編集・メンバー追加/ })).toHaveAttribute("href", "/team/dashboard?id=test-entry");
});
