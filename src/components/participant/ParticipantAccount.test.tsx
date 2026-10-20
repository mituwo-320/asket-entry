import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import LoginPage from "@/app/login/page";
import ResetPasswordPage from "@/app/login/reset/page";

const mockPush = jest.fn();
let mockParams = new URLSearchParams();
jest.mock("next/navigation", () => ({ useRouter: () => ({ push: mockPush }), useSearchParams: () => mockParams }));
beforeEach(() => { mockParams = new URLSearchParams(); mockPush.mockReset(); localStorage.clear(); global.fetch = jest.fn(); });

test("login retains failed credentials, offers password visibility and carries email to recovery", async () => {
  const user = userEvent.setup();
  mockParams = new URLSearchParams("email=leader@example.test");
  jest.mocked(fetch).mockResolvedValue({ ok: false, json: async () => ({ message: "入力を確認してください" }) } as Response);
  render(<LoginPage />);
  const password = screen.getByLabelText("パスワード", { selector: "input" });
  await user.type(password, "secret");
  await user.click(screen.getByRole("button", { name: "パスワードを表示" }));
  expect(password).toHaveAttribute("type", "text");
  expect(screen.getByRole("button", { name: "パスワードを隠す" })).toHaveAttribute("aria-pressed", "true");
  expect(screen.getByRole("link", { name: "パスワードを忘れた場合" })).toHaveAttribute("href", "/login/reset?email=leader%40example.test");
  await user.click(screen.getByRole("button", { name: "ログイン" }));
  expect(await screen.findByRole("alert")).toHaveTextContent("入力を確認してください");
  expect(password).toHaveValue("secret");
  expect(fetch).toHaveBeenCalledWith("/api/team/login", expect.objectContaining({ body: JSON.stringify({ email: "leader@example.test", password: "secret" }) }));
});

test("reset requests freeze pending inputs, reject duplicate submits and let users correct the address", async () => {
  const user = userEvent.setup();
  let resolve!: (value: Response) => void;
  jest.mocked(fetch).mockReturnValue(new Promise<Response>(done => { resolve = done; }));
  render(<ResetPasswordPage />);
  const email = screen.getByLabelText("メールアドレス");
  await user.type(email, "leader@example.test");
  const form = email.closest("form")!;
  fireEvent.submit(form);
  expect(email).toBeDisabled();
  fireEvent.submit(form);
  expect(fetch).toHaveBeenCalledTimes(1);
  await act(async () => resolve({ ok: true, json: async () => ({ success: true }) } as Response));
  const heading = await screen.findByRole("heading", { name: "受信トレイをご確認ください" });
  expect(heading).toHaveFocus();
  expect(screen.getByText("leader@example.test")).toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: "メールアドレスを確認し直す" }));
  expect(screen.getByLabelText("メールアドレス")).toHaveValue("leader@example.test");
});

test("reset validation avoids requests for mismatches and preserves the existing confirmation payload", async () => {
  const user = userEvent.setup();
  mockParams = new URLSearchParams("token=test-token&email=leader@example.test");
  jest.mocked(fetch).mockResolvedValue({ ok: true, json: async () => ({ success: true }) } as Response);
  render(<ResetPasswordPage />);
  await user.type(screen.getByLabelText("新しいパスワード", { selector: "input" }), "abcd");
  const confirmation = screen.getByLabelText("新しいパスワード（確認）", { selector: "input" });
  await user.type(confirmation, "different");
  await user.click(screen.getByRole("button", { name: "パスワードを再設定する" }));
  expect(screen.getByRole("alert")).toHaveTextContent("一致しません");
  expect(fetch).not.toHaveBeenCalled();
  await user.clear(confirmation);
  await user.type(confirmation, "abcd");
  await user.click(screen.getByRole("button", { name: "パスワードを再設定する" }));
  await waitFor(() => expect(screen.getByRole("heading", { name: "再設定が完了しました" })).toHaveFocus());
  expect(fetch).toHaveBeenCalledWith("/api/auth/reset/confirm", expect.objectContaining({ body: JSON.stringify({ email: "leader@example.test", token: "test-token", newPassword: "abcd" }) }));
  await user.click(screen.getByRole("button", { name: "ログイン画面へ戻る" }));
  expect(mockPush).toHaveBeenCalledWith("/login?email=leader%40example.test");
});
