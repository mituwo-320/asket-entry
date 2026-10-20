import { act, fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import EditTeamPage from "@/app/team/edit/page";
import { ParticipantContactBoard } from "./ParticipantContactBoard";
import type { Project, TeamEntry } from "@/lib/types";

let mockParams = new URLSearchParams("id=entry-1");
jest.mock("next/navigation", () => ({ useSearchParams: () => mockParams }));
const team = { id: "entry-1", userId: "user", tournamentId: "project-1", teamName: "コートサイド", teamNameKana: "コートサイド", teamIntroduction: "楽しんで参加します", players: [{ id: "leader", name: "代表 太郎", furigana: "ダイヒョウ タロウ", insurance: true, wristbandColor: "赤", isRepresentative: true }], status: "draft", projectEndDate: "2099-12-31" };
const response = (data: unknown, ok = true) => Promise.resolve({ ok, json: async () => data } as Response);
beforeEach(() => { mockParams = new URLSearchParams("id=entry-1"); global.fetch = jest.fn(); });

test("contact board uses the right tournament link and requires all entries in a tournament to be confirmed", async () => {
  const user = userEvent.setup();
  const projects = [{ id: "a", name: "春の大会" }, { id: "b", name: "秋の大会", lineOpenChatLink: "https://example.test/autumn" }] as Project[];
  const entries = [{ tournamentId: "a", isOpenChatJoined: true }, { tournamentId: "a", isOpenChatJoined: false }, { tournamentId: "b", isOpenChatJoined: true }] as TeamEntry[];
  const dismiss = jest.fn();
  render(<ParticipantContactBoard projects={projects} entries={entries} defaultLink="https://example.test/common" onDismiss={dismiss} />);
  const spring = screen.getByRole("heading", { name: "春の大会" }).closest("li")!;
  const autumn = screen.getByRole("heading", { name: "秋の大会" }).closest("li")!;
  expect(within(spring).getByText("参加状況をご確認ください")).toBeInTheDocument();
  expect(within(spring).getByRole("link")).toHaveAttribute("href", "https://example.test/common");
  expect(within(autumn).getByText("運営が参加を確認済み")).toBeInTheDocument();
  expect(within(autumn).getByRole("link")).toHaveAttribute("href", "https://example.test/autumn");
  await user.click(screen.getByRole("button", { name: "LINEのお知らせを閉じる" }));
  expect(dismiss).toHaveBeenCalledTimes(1);
});

test("contact board excludes unregistered, old and unconfigured tournaments", () => {
  const projects = [{ id: "old", name: "終了", entryEndDate: "2000-01-01", lineOpenChatLink: "https://example.test/old" }, { id: "absent", name: "未登録", lineOpenChatLink: "https://example.test/absent" }, { id: "no-link", name: "案内なし" }] as Project[];
  const { container } = render(<ParticipantContactBoard projects={projects} entries={[{ tournamentId: "old" }, { tournamentId: "no-link" }] as TeamEntry[]} onDismiss={jest.fn()} />);
  expect(container).toBeEmptyDOMElement();
});

test("team settings preserves failed edits and saves the existing payload before clearing dirty status", async () => {
  const user = userEvent.setup();
  let attempts = 0;
  jest.mocked(fetch).mockImplementation(url => url === "/api/team/update" ? response({}, ++attempts > 1) : response(url === "/api/team/data" ? { teamEntry: team, user: { phone: "09000000000" } } : {}));
  render(<EditTeamPage />);
  const name = await screen.findByLabelText("チーム名");
  expect(screen.getByRole("button", { name: "保存" })).toBeDisabled();
  await user.clear(name);
  await user.type(name, "新しいチーム名");
  expect(screen.getByText("未保存の変更あり")).toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: "保存" }));
  expect(await screen.findByRole("alert")).toHaveTextContent("保存に失敗しました");
  expect(name).toHaveValue("新しいチーム名");
  expect(screen.getByRole("button", { name: "保存" })).toBeEnabled();
  await user.click(screen.getByRole("button", { name: "保存" }));
  expect(await screen.findByRole("status")).toHaveTextContent("保存しました");
  expect(screen.getByRole("button", { name: "保存" })).toBeDisabled();
  expect(screen.queryByText("未保存の変更あり")).not.toBeInTheDocument();
  expect(fetch).toHaveBeenLastCalledWith("/api/team/update", { method: "POST", headers: { "Content-Type": "application/json", "x-team-id": "entry-1" }, body: JSON.stringify({ teamName: "新しいチーム名", teamNameKana: team.teamNameKana, teamIntroduction: team.teamIntroduction, representativeName: "代表 太郎", phone: "09000000000", repFurigana: "ダイヒョウ タロウ", wristbandColor: "赤", insurance: true, clinicParticipation: null, clinicCount: 0 }) });
});

test("pending settings save freezes input and prevents a second submission", async () => {
  const user = userEvent.setup();
  let finish!: (response: Response) => void;
  jest.mocked(fetch).mockImplementation(url => url === "/api/team/update" ? new Promise<Response>(resolve => { finish = resolve; }) : response(url === "/api/team/data" ? { teamEntry: team, user: { phone: "09000000000" } } : {}));
  render(<EditTeamPage />);
  const name = await screen.findByLabelText("チーム名");
  await user.type(name, "A");
  await user.click(screen.getByRole("button", { name: "保存" }));
  expect(name).toBeDisabled();
  fireEvent.submit(name.closest("form")!);
  expect(jest.mocked(fetch).mock.calls.filter(([url]) => url === "/api/team/update")).toHaveLength(1);
  await act(async () => finish({ ok: true, json: async () => ({}) } as Response));
  expect(name).toBeEnabled();
});

test.each([{ status: "submitted", date: "2099-12-31", heading: "本エントリーは完了しています" }, { status: "draft", date: "2000-01-01", heading: "編集受付期間が終了しました" }])("settings respects $heading", async ({ status, date, heading }) => {
  jest.mocked(fetch).mockImplementation(url => response(url === "/api/team/data" ? { teamEntry: { ...team, status, projectEndDate: date }, isAdmin: false } : {}));
  render(<EditTeamPage />);
  expect(await screen.findByRole("heading", { name: heading })).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "保存" })).not.toBeInTheDocument();
});
