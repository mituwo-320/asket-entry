import type { Player } from './types';

export const MAX_HISTORY_IMPORT = 50;
export type HistoryPlayer = Player & { alreadyAdded: boolean };
export type HistoryTeam = { id: string; teamName: string; projectName: string; createdAt: string; players: HistoryPlayer[] };
export type PlayerImportDraft = { sourcePlayerId: string; name: string; furigana: string; insurance: boolean; wristbandColor: string };

/** Used only to flag likely duplicates; it is not a global person identifier. */
export function playerIdentity(player: Pick<Player, 'name' | 'furigana'>): string {
    return JSON.stringify([player.name, player.furigana].map(value => value.normalize('NFKC').replace(/\s+/g, '').toLocaleLowerCase('ja-JP')));
}
