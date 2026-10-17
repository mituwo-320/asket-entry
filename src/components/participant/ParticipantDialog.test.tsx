import { act, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { ParticipantConfirmDialog, ParticipantDialog } from "./ParticipantDialog";
import { EditProfileModal } from "@/components/profile/EditProfileModal";

test("participant dialog contains keyboard focus, closes with Escape, and returns focus to its trigger", async () => {
  const user = userEvent.setup();
  function Example() {
    const [open, setOpen] = useState(false);
    return <><button onClick={() => setOpen(true)}>開く</button><ParticipantDialog isOpen={open} onClose={() => setOpen(false)} title="選手情報"><input aria-label="氏名" /><button>保存</button></ParticipantDialog></>;
  }
  render(<Example />);
  const trigger = screen.getByRole("button", { name: "開く" });
  await user.click(trigger);
  expect(screen.getByLabelText("氏名")).toHaveFocus();
  await user.tab();
  expect(screen.getByRole("button", { name: "保存" })).toHaveFocus();
  await user.tab();
  expect(screen.getByRole("button", { name: "閉じる" })).toHaveFocus();
  await user.tab({ shift: true });
  expect(screen.getByRole("button", { name: "保存" })).toHaveFocus();
  await user.keyboard("{Escape}");
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  expect(trigger).toHaveFocus();
});

test("confirmation waits for its action, blocks duplicate submission, and prevents closing while pending", async () => {
  const user = userEvent.setup();
  let finish!: () => void;
  const onConfirm = jest.fn(() => new Promise<void>(resolve => { finish = resolve; }));
  const onClose = jest.fn();
  render(<ParticipantConfirmDialog isOpen onClose={onClose} onConfirm={onConfirm} title="本エントリー確認" message="確定後は編集できません。" confirmLabel="完了する" />);
  expect(screen.getByRole("button", { name: "キャンセル" })).toHaveFocus();
  await user.click(screen.getByRole("button", { name: "完了する" }));
  expect(screen.getByRole("button", { name: "処理中…" })).toBeDisabled();
  await user.keyboard("{Escape}");
  expect(onClose).not.toHaveBeenCalled();
  expect(onConfirm).toHaveBeenCalledTimes(1);
  await act(async () => { finish(); });
  await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
});

test("a rejected confirmation keeps its message and allows retrying", async () => {
  const user = userEvent.setup();
  const onConfirm = jest.fn().mockRejectedValueOnce(new Error("offline")).mockResolvedValueOnce(undefined);
  const onClose = jest.fn();
  render(<ParticipantConfirmDialog isOpen onClose={onClose} onConfirm={onConfirm} title="確認" message="この内容を確認してください。" confirmLabel="続ける" />);
  await user.click(screen.getByRole("button", { name: "続ける" }));
  expect(await screen.findByRole("alert")).toHaveTextContent("処理を完了できませんでした");
  expect(onClose).not.toHaveBeenCalled();
  await user.click(screen.getByRole("button", { name: "続ける" }));
  await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
});

test("cancelling profile edits discards the unsaved values before reopening", async () => {
  const user = userEvent.setup();
  const account = { id: "sample-user", name: "代表 太郎", phone: "09000000000", email: "sample@example.test", createdAt: "2026-01-01" };
  function Example() {
    const [open, setOpen] = useState(false);
    return <><button onClick={() => setOpen(true)}>プロフィールを開く</button><EditProfileModal isOpen={open} onClose={() => setOpen(false)} user={account} onSave={jest.fn()} /></>;
  }
  render(<Example />);
  await user.click(screen.getByRole("button", { name: "プロフィールを開く" }));
  await user.clear(screen.getByLabelText("代表者氏名"));
  await user.type(screen.getByLabelText("代表者氏名"), "未保存の変更");
  await user.click(within(screen.getByRole("dialog")).getByRole("button", { name: "キャンセル" }));
  await user.click(screen.getByRole("button", { name: "プロフィールを開く" }));
  expect(screen.getByLabelText("代表者氏名")).toHaveValue("代表 太郎");
});
