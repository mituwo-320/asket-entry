import { BracketMatch, BracketSlot, TournamentBracketData } from './types';

/**
 * Generate a double-elimination tournament bracket.
 * 
 * Structure:
 *   Losers Bracket (Left) ← Initial Matches (Center) → Winners Bracket (Right)
 * 
 * - Win in initial → move to Winners bracket (right)
 * - Lose in initial → move to Losers bracket (left)
 * - Win in Winners → continue right
 * - Lose in Winners → drop to Losers bracket (left)
 * - Win in Losers → continue left (stay alive)
 * - Lose in Losers → eliminated
 */

function nextPowerOf2(n: number): number {
    let p = 1;
    while (p < n) p *= 2;
    return p;
}

function generateSeedNumbers(teamCount: number): number[] {
    const numbers = Array.from({ length: teamCount }, (_, i) => i + 1);
    // Fisher-Yates shuffle
    for (let i = numbers.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [numbers[i], numbers[j]] = [numbers[j], numbers[i]];
    }
    return numbers;
}

function createSlot(slotId: string, seedNumber?: number, isBye?: boolean): BracketSlot {
    return {
        slotId,
        seedNumber,
        isBye: isBye || false,
    };
}

export function generateBracket(teamCount: number): TournamentBracketData {
    const bracketSize = nextPowerOf2(teamCount);
    const totalInitialMatches = bracketSize / 2;
    const byeCount = bracketSize - teamCount;
    const seedNumbers = generateSeedNumbers(bracketSize);

    // ===== INITIAL MATCHES (Center) =====
    const initialMatches: BracketMatch[] = [];
    for (let i = 0; i < totalInitialMatches; i++) {
        const matchId = `I-R1-M${i + 1}`;
        const seedA = seedNumbers[i * 2];
        const seedB = seedNumbers[i * 2 + 1];
        const isByeA = seedA > teamCount;
        const isByeB = seedB > teamCount;

        const match: BracketMatch = {
            matchId,
            round: 1,
            bracket: 'initial',
            slotA: createSlot(`${matchId}-A`, seedA, isByeA),
            slotB: createSlot(`${matchId}-B`, seedB, isByeB),
            status: 'ready',
            nextWinMatchId: `W-R1-M${Math.floor(i / 2) + 1}`,
            nextLoseMatchId: `L-R1-M${Math.floor(i / 2) + 1}`,
        };

        initialMatches.push(match);
    }

    // ===== WINNERS BRACKET (Right) =====
    const winnersMatches: BracketMatch[] = [];
    let winnersRoundMatches = totalInitialMatches / 2;
    let round = 1;

    while (winnersRoundMatches >= 1) {
        for (let i = 0; i < winnersRoundMatches; i++) {
            const matchId = `W-R${round}-M${i + 1}`;
            const nextRound = round + 1;
            const nextMatchIndex = Math.floor(i / 2) + 1;

            const match: BracketMatch = {
                matchId,
                round,
                bracket: 'winners',
                slotA: createSlot(`${matchId}-A`),
                slotB: createSlot(`${matchId}-B`),
                status: 'pending',
                nextWinMatchId: winnersRoundMatches > 1 ? `W-R${nextRound}-M${nextMatchIndex}` : undefined,
                nextLoseMatchId: `L-R${round}-M${i + 1}`,
            };

            winnersMatches.push(match);
        }

        winnersRoundMatches = Math.floor(winnersRoundMatches / 2);
        round++;
    }

    // ===== LOSERS BRACKET (Left) =====
    const losersMatches: BracketMatch[] = [];
    let losersRoundMatches = totalInitialMatches / 2;
    round = 1;

    // Losers bracket has approximately 2x the rounds of winners
    // R1: losers from initial play
    // R2: winners of L-R1 play against losers dropped from W-R1
    // pattern continues...
    while (losersRoundMatches >= 1) {
        for (let i = 0; i < losersRoundMatches; i++) {
            const matchId = `L-R${round}-M${i + 1}`;
            const nextRound = round + 1;
            const nextMatchIndex = Math.floor(i / 2) + 1;

            const match: BracketMatch = {
                matchId,
                round,
                bracket: 'losers',
                slotA: createSlot(`${matchId}-A`),
                slotB: createSlot(`${matchId}-B`),
                status: 'pending',
                nextWinMatchId: losersRoundMatches > 1 ? `L-R${nextRound}-M${nextMatchIndex}` : undefined,
                // Losers bracket: lose = eliminated (no nextLoseMatchId)
            };

            losersMatches.push(match);
        }

        // In a proper double elimination, losers bracket shrinks every other round
        // Simplified: halve each round
        if (losersRoundMatches === 1) break;
        losersRoundMatches = Math.floor(losersRoundMatches / 2);
        round++;
    }

    return {
        teamCount,
        initialMatches,
        winnersMatches,
        losersMatches,
        eliminatedTeams: [],
    };
}

/**
 * Place a team into a bracket slot by seed number.
 */
export function placeTeamInSlot(
    bracket: TournamentBracketData,
    slotId: string,
    teamId: string,
    teamName: string
): TournamentBracketData {
    const updateSlotInMatch = (match: BracketMatch): BracketMatch => {
        const newMatch = { ...match };
        if (match.slotA.slotId === slotId) {
            newMatch.slotA = { ...match.slotA, teamId, teamName };
        }
        if (match.slotB.slotId === slotId) {
            newMatch.slotB = { ...match.slotB, teamId, teamName };
        }
        return newMatch;
    };

    return {
        ...bracket,
        initialMatches: bracket.initialMatches.map(updateSlotInMatch),
        winnersMatches: bracket.winnersMatches.map(updateSlotInMatch),
        losersMatches: bracket.losersMatches.map(updateSlotInMatch),
    };
}

/**
 * Remove a team from all slots (for re-arrangement).
 */
export function removeTeamFromSlots(
    bracket: TournamentBracketData,
    teamId: string
): TournamentBracketData {
    const clearTeamInMatch = (match: BracketMatch): BracketMatch => {
        const newMatch = { ...match };
        if (match.slotA.teamId === teamId) {
            newMatch.slotA = { ...match.slotA, teamId: undefined, teamName: undefined };
        }
        if (match.slotB.teamId === teamId) {
            newMatch.slotB = { ...match.slotB, teamId: undefined, teamName: undefined };
        }
        return newMatch;
    };

    return {
        ...bracket,
        initialMatches: bracket.initialMatches.map(clearTeamInMatch),
        winnersMatches: bracket.winnersMatches.map(clearTeamInMatch),
        losersMatches: bracket.losersMatches.map(clearTeamInMatch),
    };
}

/**
 * Record a match result and advance teams.
 * Winner moves to nextWinMatchId, Loser moves to nextLoseMatchId (or eliminated).
 */
export function recordMatchResult(
    bracket: TournamentBracketData,
    matchId: string,
    winnerId: string
): TournamentBracketData {
    let result = { ...bracket };
    const allMatches = [
        ...result.initialMatches,
        ...result.winnersMatches,
        ...result.losersMatches,
    ];

    // Find the match
    const match = allMatches.find(m => m.matchId === matchId);
    if (!match) return result;

    const loserId = match.slotA.teamId === winnerId
        ? match.slotB.teamId
        : match.slotA.teamId;

    const winnerName = match.slotA.teamId === winnerId
        ? match.slotA.teamName
        : match.slotB.teamName;

    const loserName = match.slotA.teamId === winnerId
        ? match.slotB.teamName
        : match.slotA.teamName;

    // Update match result
    const updateMatch = (m: BracketMatch): BracketMatch => {
        if (m.matchId !== matchId) return m;
        return { ...m, winnerId, loserId, status: 'completed' };
    };

    result.initialMatches = result.initialMatches.map(updateMatch);
    result.winnersMatches = result.winnersMatches.map(updateMatch);
    result.losersMatches = result.losersMatches.map(updateMatch);

    // Place winner in next match
    if (match.nextWinMatchId && winnerId && winnerName) {
        result = placeTeamInNextMatch(result, match.nextWinMatchId, winnerId, winnerName);
    }

    // Place loser in next match (losers bracket entry) or eliminate
    if (match.nextLoseMatchId && loserId && loserName) {
        result = placeTeamInNextMatch(result, match.nextLoseMatchId, loserId, loserName);
    } else if (loserId && match.bracket === 'losers') {
        // Lost in losers bracket = eliminated
        result.eliminatedTeams = [...result.eliminatedTeams, loserId];
    }

    return result;
}

/**
 * Place a team in the next available slot of a match.
 */
function placeTeamInNextMatch(
    bracket: TournamentBracketData,
    targetMatchId: string,
    teamId: string,
    teamName: string
): TournamentBracketData {
    const fillNextSlot = (m: BracketMatch): BracketMatch => {
        if (m.matchId !== targetMatchId) return m;
        const newMatch = { ...m };
        if (!m.slotA.teamId) {
            newMatch.slotA = { ...m.slotA, teamId, teamName };
        } else if (!m.slotB.teamId) {
            newMatch.slotB = { ...m.slotB, teamId, teamName };
        }
        // If both slots are now filled, mark as ready
        if (newMatch.slotA.teamId && newMatch.slotB.teamId) {
            newMatch.status = 'ready';
        }
        return newMatch;
    };

    return {
        ...bracket,
        initialMatches: bracket.initialMatches.map(fillNextSlot),
        winnersMatches: bracket.winnersMatches.map(fillNextSlot),
        losersMatches: bracket.losersMatches.map(fillNextSlot),
    };
}

/**
 * Get all teams currently placed in the bracket.
 */
export function getPlacedTeamIds(bracket: TournamentBracketData): Set<string> {
    const ids = new Set<string>();
    const allMatches = [...bracket.initialMatches];

    for (const match of allMatches) {
        if (match.slotA.teamId) ids.add(match.slotA.teamId);
        if (match.slotB.teamId) ids.add(match.slotB.teamId);
    }

    return ids;
}
