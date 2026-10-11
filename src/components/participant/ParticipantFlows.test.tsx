import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PlayerForm } from "@/components/ui/PlayerForm";
import RegisterPage from "@/app/team/register/page";
import TeamDashboard from "@/app/team/dashboard/page";
import EditTeamPage from "@/app/team/edit/page";
import UserDashboard from "@/app/dashboard/page";

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
  expect(await screen.findByText("登録完了！")).toBeInTheDocument();
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
