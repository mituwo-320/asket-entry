import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ParticipantRegistrationComplete } from "./ParticipantRegistrationComplete";

const entry = { teamName: "コートサイド", projectName: "秋のヴァンキーカップ", email: "leader@example.test", password: "entry-password", existingAccount: false, isWaitlist: false };

test("receipt shows the submitted team, focuses the result, and keeps passwords hidden until requested", async () => {
  const user = userEvent.setup();
  render(<ParticipantRegistrationComplete {...entry} />);
  expect(screen.getByRole("heading", { level: 1 })).toHaveFocus();
  expect(screen.getByText(entry.teamName)).toBeInTheDocument();
  expect(screen.getByText(entry.projectName)).toBeInTheDocument();
  expect(screen.getByText("申し込み受付済み")).toBeInTheDocument();
  expect(screen.queryByText(entry.password)).not.toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: "パスワードを表示" }));
  expect(screen.getByText(entry.password)).toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: "パスワードを隠す" }));
  expect(screen.queryByText(entry.password)).not.toBeInTheDocument();
  expect(screen.getByRole("link", { name: "マイページで準備を進める" })).toHaveAttribute("href", "/dashboard");
  expect(screen.queryByRole("link", { name: /LINEオープンチャットに参加/ })).not.toBeInTheDocument();
});

test("waitlist and existing accounts have accurate guidance and preserve the configured contact link", () => {
  render(<ParticipantRegistrationComplete {...entry} password={null} existingAccount isWaitlist lineOpenChatLink="https://example.test/contact" />);
  expect(screen.getByRole("heading", { name: "キャンセル待ちを受け付けました" })).toBeInTheDocument();
  expect(screen.getByText("キャンセル待ち（参加未確定）")).toBeInTheDocument();
  expect(screen.getByText("この時点では、大会への参加は確定していません。")).toBeInTheDocument();
  expect(screen.getByText(/お使いのアカウントで申し込みました/)).toBeInTheDocument();
  expect(screen.getByText("登録済みのパスワードをご利用ください。")).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "パスワードをコピー" })).not.toBeInTheDocument();
  const contact = screen.getByRole("link", { name: /LINEオープンチャットに参加/ });
  expect(contact).toHaveAttribute("href", "https://example.test/contact");
  expect(contact).toHaveAttribute("target", "_blank");
  expect(contact).toHaveAttribute("rel", "noopener noreferrer");
  expect(screen.getByRole("link", { name: "マイページで受付状況を確認" })).toHaveAttribute("href", "/dashboard");
});

test("copy only reports success after the clipboard resolves and blocks another pending copy", async () => {
  const user = userEvent.setup();
  let finish!: () => void;
  const writeText = jest.spyOn(navigator.clipboard, "writeText").mockImplementation(() => new Promise<void>(resolve => { finish = resolve; }));
  render(<ParticipantRegistrationComplete {...entry} />);
  await user.click(screen.getByRole("button", { name: "メールアドレスをコピー" }));
  expect(screen.getByRole("status")).toBeEmptyDOMElement();
  expect(screen.getByRole("button", { name: "パスワードをコピー" })).toBeDisabled();
  await user.click(screen.getByRole("button", { name: "パスワードをコピー" }));
  expect(writeText).toHaveBeenCalledTimes(1);
  expect(writeText).toHaveBeenCalledWith(entry.email);
  await act(async () => finish());
  expect(screen.getByRole("status")).toHaveTextContent("メールアドレスをコピーしました。");
  writeText.mockRestore();
});

test("clipboard failures offer manual saving and allow a successful retry", async () => {
  const user = userEvent.setup();
  const writeText = jest.spyOn(navigator.clipboard, "writeText").mockRejectedValueOnce(new Error("Permission denied")).mockResolvedValue(undefined);
  render(<ParticipantRegistrationComplete {...entry} />);
  await user.click(screen.getByRole("button", { name: "パスワードをコピー" }));
  expect(screen.getByRole("alert")).toHaveTextContent("コピーできませんでした");
  expect(screen.getByRole("status")).toBeEmptyDOMElement();
  await user.click(screen.getByRole("button", { name: "パスワードをコピー" }));
  expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  expect(screen.getByRole("status")).toHaveTextContent("パスワードをコピーしました。");
  expect(writeText).toHaveBeenLastCalledWith(entry.password);
  writeText.mockRestore();
});
