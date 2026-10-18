import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ManagementLogin from "@/app/management/login/page";
import ManagementList from "@/app/management/page";
import ManagementDetail from "@/app/management/[projectId]/page";

const mockPush = jest.fn();
const mockRouter = { push: mockPush };
jest.mock("next/navigation", () => ({ useRouter: () => mockRouter, useParams: () => ({ projectId: "event" }) }));
const project = { id: "event", name: "秋の大会", isActive: true, maxTeams: 1 };
const player = { id: "p1", name: "代表 太郎", furigana: "ダイヒョウ タロウ", insurance: true, wristbandColor: "赤", isRepresentative: true };
const entry = { id: "entry", userId: "user", tournamentId: "event", teamName: "コートサイド", teamNameKana: "コートサイド", teamIntroduction: "よろしくお願いします", players: [player], status: "draft", createdAt: "2026-01-01", preliminaryNumber: 3, isPaid: false, isOpenChatJoined: false };
const response = (data: unknown, ok = true) => Promise.resolve({ ok, json: async () => data } as Response);
function mockData(entries = [entry]) {
  jest.mocked(fetch).mockImplementation(url => response(url === "/api/admin/projects" ? { projects: [project, { id: "test", name: "動作確認大会", isActive: true, isTestProject: true }] } : url === "/api/admin/data" ? { entries, users: [{ id: "user", name: "代表 太郎", phone: "09000000000" }] } : url === "/api/settings" ? { participationFee: 2500, insuranceFee: 150 } : {}));
}
beforeEach(() => { global.fetch = jest.fn(); mockPush.mockReset(); });

test("staff login retains a rejected password, locks pending input and preserves the auth payload", async () => {
  const user = userEvent.setup();
  let finish!: (response: Response) => void;
  jest.mocked(fetch).mockReturnValue(new Promise<Response>(resolve => { finish = resolve; }));
  render(<ManagementLogin />);
  const password = screen.getByLabelText("運営用パスワード");
  await user.type(password, "test-password");
  await user.click(screen.getByRole("button", { name: "ログイン" }));
  expect(password).toBeDisabled();
  fireEvent.submit(password.closest("form")!);
  expect(fetch).toHaveBeenCalledTimes(1);
  expect(fetch).toHaveBeenCalledWith("/api/management/auth", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password: "test-password" }) });
  await act(async () => finish({ ok: false, json: async () => ({ error: "認証に失敗しました" }) } as Response));
  expect(screen.getByRole("alert")).toHaveTextContent("認証に失敗しました");
  expect(password).toHaveValue("test-password");
  expect(password).toBeEnabled();
});

test("project selection keeps waitlist allocation and fee totals, with test projects initially hidden", async () => {
  const user = userEvent.setup();
  mockData([entry, { ...entry, id: "wait", teamName: "待機チーム", createdAt: "2026-02-01" }]);
  render(<ManagementList />);
  const link = await screen.findByRole("link", { name: /秋の大会/ });
  expect(link).toHaveAttribute("href", "/management/event");
  expect(within(link).getByText("¥2,650")).toBeInTheDocument();
  expect(within(link).getByText("キャンセル待ち")).toBeInTheDocument();
  expect(screen.queryByRole("link", { name: /動作確認大会/ })).not.toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: /テストプロジェクトを表示/ }));
  expect(await screen.findByRole("link", { name: /動作確認大会/ })).toHaveAttribute("href", "/management/test");
});

test("desk totals exclude waitlist and cancelled teams and search still finds the representative", async () => {
  const user = userEvent.setup();
  mockData([entry, { ...entry, id: "wait", createdAt: "2026-02-01", teamName: "待機チーム" }, { ...entry, id: "cancelled", status: "cancelled", teamName: "辞退チーム" }]);
  render(<ManagementDetail />);
  await screen.findByRole("heading", { name: "秋の大会" });
  const totals = screen.getByLabelText("受付状況の集計");
  for (const label of ["参加枠内", "メンバー未確定", "未入金", "LINE未確認"]) {
    expect(within(totals).getByText(label).parentElement?.querySelector("dd")).toHaveTextContent("1チーム");
  }
  expect(screen.getAllByText("¥2,650").length).toBeGreaterThan(0);
  await user.type(screen.getByRole("searchbox", { name: "チーム名・代表者・電話番号で検索" }), "一致しない名前");
  await waitFor(() => expect(screen.queryByRole("heading", { name: "コートサイド" })).not.toBeInTheDocument());
  await user.clear(screen.getByRole("searchbox"));
  await user.type(screen.getByRole("searchbox"), "09000000000");
  expect(screen.getByRole("heading", { name: "コートサイド" })).toBeInTheDocument();
});

test("LINE confirmation retains the existing update API and pressed state", async () => {
  const user = userEvent.setup();
  mockData();
  render(<ManagementDetail />);
  const toggle = await screen.findByRole("button", { name: "コートサイドのLINE参加確認" });
  expect(toggle).toHaveAttribute("aria-pressed", "false");
  await user.click(toggle);
  expect(toggle).toHaveAttribute("aria-pressed", "true");
  expect(fetch).toHaveBeenCalledWith("/api/management/entry/update", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ entryId: "entry", updates: { isOpenChatJoined: true } }) });
});

test("payment confirmation is still required and only its acceptance posts the paid flag", async () => {
  const user = userEvent.setup();
  const confirm = jest.spyOn(window, "confirm").mockReturnValueOnce(false).mockReturnValueOnce(true);
  mockData();
  render(<ManagementDetail />);
  const toggle = await screen.findByRole("button", { name: "コートサイドの入金確認" });
  await user.click(toggle);
  expect(jest.mocked(fetch).mock.calls.some(([url]) => url === "/api/management/entry/update")).toBe(false);
  await user.click(toggle);
  await waitFor(() => expect(fetch).toHaveBeenCalledWith("/api/management/entry/update", expect.objectContaining({ body: JSON.stringify({ entryId: "entry", updates: { isPaid: true } }) })));
  expect(toggle).toHaveAttribute("aria-pressed", "true");
  confirm.mockRestore();
});

test("team file keeps blur saving, status updates and cancellation of destructive actions", async () => {
  const user = userEvent.setup();
  const confirm = jest.spyOn(window, "confirm").mockReturnValue(false);
  const open = jest.spyOn(window, "open").mockReturnValue(null);
  mockData();
  render(<ManagementDetail />);
  await user.click(await screen.findByRole("button", { name: "詳細・全メモ" }));
  const dialog = screen.getByRole("dialog", { name: "コートサイド" });
  const uniform = within(dialog).getByLabelText("ユニフォーム色");
  await user.type(uniform, "白");
  expect(jest.mocked(fetch).mock.calls.some(([url]) => url === "/api/management/entry/update")).toBe(false);
  await user.tab();
  await waitFor(() => expect(fetch).toHaveBeenCalledWith("/api/management/entry/update", expect.objectContaining({ body: JSON.stringify({ entryId: "entry", updates: { uniformColor: "白" } }) })));
  const memo = within(dialog).getByLabelText("運営用メモ");
  await user.type(memo, "受付で確認");
  await user.tab();
  await waitFor(() => expect(fetch).toHaveBeenCalledWith("/api/management/entry/update", expect.objectContaining({ body: JSON.stringify({ entryId: "entry", updates: { managementMemo: "受付で確認" } }) })));
  await user.click(within(dialog).getByRole("button", { name: "OPチャット未確認" }));
  await waitFor(() => expect(within(dialog).getByRole("button", { name: "OPチャット参加済" })).toHaveAttribute("aria-pressed", "true"));
  await user.click(within(dialog).getByRole("button", { name: "このチームの情報を印刷 (A4)" }));
  expect(open).toHaveBeenCalledWith("/management/print?teamId=entry", "_blank");
  await user.click(within(dialog).getByRole("button", { name: "仮エントリーに戻す" }));
  await user.click(within(dialog).getByRole("button", { name: "このチームを完全に削除する" }));
  expect(confirm).toHaveBeenCalledTimes(2);
  expect(jest.mocked(fetch).mock.calls.some(([url]) => url === "/api/admin/entry/delete")).toBe(false);
  expect(jest.mocked(fetch).mock.calls.some(([, options]) => options?.body === JSON.stringify({ entryId: "entry", updates: { status: "draft" } }))).toBe(false);
  await user.click(within(dialog).getByRole("button", { name: "チーム詳細を閉じる" }));
  await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  confirm.mockRestore();
  open.mockRestore();
});

test("a rejected operational update leaves the confirmation unchanged", async () => {
  const user = userEvent.setup();
  const alert = jest.spyOn(window, "alert").mockImplementation(() => {});
  mockData();
  const read = jest.mocked(fetch).getMockImplementation()!;
  jest.mocked(fetch).mockImplementation((url, options) => url === "/api/management/entry/update" ? response({ error: "保存できません" }, false) : read(url, options));
  render(<ManagementDetail />);
  const toggle = await screen.findByRole("button", { name: "コートサイドのLINE参加確認" });
  await user.click(toggle);
  await waitFor(() => expect(alert).toHaveBeenCalled());
  expect(toggle).toHaveAttribute("aria-pressed", "false");
  alert.mockRestore();
});
