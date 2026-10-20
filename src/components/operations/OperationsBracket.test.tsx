import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import BracketFullscreen from "@/components/admin/BracketFullscreen";
import TournamentBracket from "@/components/admin/TournamentBracket";
import { generateBracket, placeTeamInSlot } from "@/lib/bracket-generator";

beforeEach(() => localStorage.clear());

test.each(["default", "operations", "admin"] as const)("%s fullscreen preserves score display, theme preference and close callback", appearance => {
  const onClose = jest.fn();
  const { container } = render(<BracketFullscreen appearance={appearance} isOpen onClose={onClose} bracketData={generateBracket(8)} entries={[]} onWin={jest.fn()} />);
  fireEvent.click(screen.getByRole("button", { name: "得点表示: OFF" }));
  expect(localStorage.getItem("tournament-bracket-show-scores")).toBe("true");
  fireEvent.click(screen.getByTitle("テーマ切り替え"));
  expect(localStorage.getItem("tournament-bracket-theme")).toBe("dark");
  expect(container.firstChild).toHaveAttribute("data-theme", "dark");
  fireEvent.click(screen.getByTitle("閉じる"));
  expect(onClose).toHaveBeenCalledTimes(1);
});

test.each(["default", "operations", "admin"] as const)("%s editor keeps the same match result and save workflow", async appearance => {
  let data = generateBracket(8);
  const match = data.initialMatches[0];
  data = placeTeamInSlot(data, match.slotA.slotId, "a", "赤チーム");
  data = placeTeamInSlot(data, match.slotB.slotId, "b", "白チーム");
  const onBracketUpdate = jest.fn();
  const onSave = jest.fn().mockResolvedValue(undefined);
  const { rerender } = render(<TournamentBracket appearance={appearance} bracketData={data} entries={[]} bracketId="bracket" onBracketUpdate={onBracketUpdate} onSave={onSave} />);
  expect(screen.getByRole("button", { name: "保存" })).toBeDisabled();
  fireEvent.click(screen.getAllByTitle("勝ち")[0]);
  expect(onBracketUpdate).toHaveBeenCalledTimes(1);
  expect(onBracketUpdate.mock.calls[0][0].initialMatches[0].winnerId).toBe("a");
  expect(screen.getByRole("button", { name: "保存" })).toBeEnabled();
  const updated = onBracketUpdate.mock.calls[0][0];
  rerender(<TournamentBracket appearance={appearance} bracketData={updated} entries={[]} bracketId="bracket" onBracketUpdate={onBracketUpdate} onSave={onSave} />);
  fireEvent.click(screen.getByRole("button", { name: "保存" }));
  await waitFor(() => expect(onSave).toHaveBeenCalledWith(updated, "in_progress"));
});

test("fullscreen follows a preference changed by another browser tab", () => {
  const { container } = render(<BracketFullscreen isOpen onClose={jest.fn()} bracketData={generateBracket(8)} entries={[]} onWin={jest.fn()} />);
  localStorage.setItem("tournament-bracket-theme", "dark");
  fireEvent(window, new StorageEvent("storage", { key: "tournament-bracket-theme", newValue: "dark" }));
  expect(container.firstChild).toHaveAttribute("data-theme", "dark");
});
