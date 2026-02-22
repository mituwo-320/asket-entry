export const DEFAULT_TOURNAMENT_ID = "2024-Spring";

export const TOURNAMENTS: Record<string, { id: string; name: string; date: string }> = {
    "2024-Spring": {
        id: "2024-Spring",
        name: "2026年3月開催 ヴァンキーカップ",
        date: "2026-03-01"
    }
};

export function getTournamentName(id: string): string {
    return TOURNAMENTS[id]?.name || id;
}
