import { 
    BracketMatch, BracketSlot, TournamentBracketData, TeamEntry, 
    TournamentBlock, BlockMatch, PlacementGroup, BlockStandingRow 
} from './types';

function nextPowerOf2(n: number): number {
    let p = 1;
    while (p < n) p *= 2;
    return p;
}

function generateSeedNumbers(teamCount: number): number[] {
    const numbers = Array.from({ length: teamCount }, (_, i) => i + 1);
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

/**
 * Generate tournament bracket.
 * - 8 teams or >=12 teams: Double Elimination (Winners on Left, Losers on Right).
 * - 9-11 teams: Block Qualifying (Leagues/Tournaments) + Final Placement Leagues.
 */
export function generateBracket(teamCount: number): TournamentBracketData {
    if (teamCount === 8 || teamCount >= 12) {
        return generateDoubleElimination(teamCount);
    } else {
        return generateBlocksAndPlacement(teamCount);
    }
}

/**
 * Double Elimination:
 * - Winners Bracket is visualised on the LEFT (flows right-to-left).
 * - Losers Bracket is visualised on the RIGHT (flows left-to-right).
 * - Initial Matches are in the CENTER.
 */
function generateDoubleElimination(teamCount: number): TournamentBracketData {
    const bracketSize = nextPowerOf2(teamCount);
    const totalInitialMatches = bracketSize / 2;
    const seedNumbers = generateSeedNumbers(bracketSize);
    
    // Court count rules: 8 teams = 1 court, 9+ teams = 2 courts
    const useTwoCourts = teamCount > 8;

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
            court: useTwoCourts ? (i % 2 === 0 ? 'Aコート' : 'Bコート') : 'Aコート',
        };

        initialMatches.push(match);
    }

    // ===== WINNERS BRACKET (Left) =====
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
                court: useTwoCourts ? (i % 2 === 0 ? 'Aコート' : 'Bコート') : 'Aコート',
            };

            winnersMatches.push(match);
        }

        winnersRoundMatches = Math.floor(winnersRoundMatches / 2);
        round++;
    }

    // ===== LOSERS BRACKET (Right) =====
    const losersMatches: BracketMatch[] = [];
    let losersRoundMatches = totalInitialMatches / 2;
    round = 1;

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
                court: useTwoCourts ? (i % 2 === 0 ? 'Aコート' : 'Bコート') : 'Aコート',
            };

            losersMatches.push(match);
        }

        if (losersRoundMatches === 1) break;
        losersRoundMatches = Math.floor(losersRoundMatches / 2);
        round++;
    }

    return {
        format: 'double_elimination',
        teamCount,
        initialMatches,
        winnersMatches,
        losersMatches,
        eliminatedTeams: [],
    };
}

/**
 * Blocks + Placement Groups format for 9-11 teams.
 */
function generateBlocksAndPlacement(teamCount: number): TournamentBracketData {
    const blocks: TournamentBlock[] = [];
    
    // Determine block structures based on teamCount
    // 9 teams = Block A (3, league), B (3, league), C (3, league)
    // 10 teams = Block A (4, tournament), B (3, league), C (3, league)
    // 11 teams = Block A (4, tournament), B (4, tournament), C (3, league)
    const blockConfigs: { id: string; name: string; type: 'league' | 'tournament'; size: number }[] = [
        { id: 'A', name: 'Aブロック', type: teamCount >= 10 ? 'tournament' : 'league', size: teamCount >= 10 ? 4 : 3 },
        { id: 'B', name: 'Bブロック', type: teamCount === 11 ? 'tournament' : 'league', size: teamCount === 11 ? 4 : 3 },
        { id: 'C', name: 'Cブロック', type: 'league', size: 3 }
    ];

    let matchGlobalIndex = 0;

    blockConfigs.forEach(config => {
        const slots = Array.from({ length: config.size }, (_, i) => ({
            slotId: `S-${config.id}-${i + 1}`,
            teamId: undefined,
            teamName: undefined
        }));

        const matches: BlockMatch[] = [];

        if (config.type === 'league') {
            // 3-team round robin: Match 1: 1 vs 2, Match 2: 2 vs 3, Match 3: 3 vs 1
            const matchups = [
                { a: 0, b: 1, round: 1 },
                { a: 1, b: 2, round: 2 },
                { a: 2, b: 0, round: 3 }
            ];

            matchups.forEach((m, idx) => {
                const matchId = `B-${config.id}-M${idx + 1}`;
                matches.push({
                    matchId,
                    type: 'league',
                    round: m.round,
                    slotA: { slotId: slots[m.a].slotId },
                    slotB: { slotId: slots[m.b].slotId },
                    status: 'pending',
                    court: matchGlobalIndex % 2 === 0 ? 'Aコート' : 'Bコート',
                });
                matchGlobalIndex++;
            });
        } else {
            // 4-team tournament
            // Semifinals (Round 1)
            const sf1Id = `B-${config.id}-SF1`;
            const sf2Id = `B-${config.id}-SF2`;
            // Final & 3rd Place (Round 2)
            const fId = `B-${config.id}-F`;
            const tpId = `B-${config.id}-3P`;

            matches.push({
                matchId: sf1Id,
                type: 'semifinal',
                round: 1,
                slotA: { slotId: slots[0].slotId },
                slotB: { slotId: slots[1].slotId },
                status: 'pending',
                nextWinMatchId: fId,
                nextLoseMatchId: tpId,
                court: matchGlobalIndex % 2 === 0 ? 'Aコート' : 'Bコート',
            });
            matchGlobalIndex++;

            matches.push({
                matchId: sf2Id,
                type: 'semifinal',
                round: 1,
                slotA: { slotId: slots[2].slotId },
                slotB: { slotId: slots[3].slotId },
                status: 'pending',
                nextWinMatchId: fId,
                nextLoseMatchId: tpId,
                court: matchGlobalIndex % 2 === 0 ? 'Aコート' : 'Bコート',
            });
            matchGlobalIndex++;

            matches.push({
                matchId: fId,
                type: 'final',
                round: 2,
                slotA: { sourceMatchId: sf1Id, isWinner: true },
                slotB: { sourceMatchId: sf2Id, isWinner: true },
                status: 'pending',
                court: matchGlobalIndex % 2 === 0 ? 'Aコート' : 'Bコート',
            });
            matchGlobalIndex++;

            matches.push({
                matchId: tpId,
                type: 'third_place',
                round: 2,
                slotA: { sourceMatchId: sf1Id, isWinner: false },
                slotB: { sourceMatchId: sf2Id, isWinner: false },
                status: 'pending',
                court: matchGlobalIndex % 2 === 0 ? 'Aコート' : 'Bコート',
            });
            matchGlobalIndex++;
        }

        blocks.push({
            id: config.id,
            name: config.name,
            type: config.type,
            slots,
            matches,
            standings: []
        });
    });

    // ===== PLACEMENT GROUPS =====
    const placementGroups: PlacementGroup[] = [
        {
            id: '1st-place',
            name: '1位グループ決定リーグ',
            rankTarget: 1,
            teams: [],
            matches: generatePlacementLeagueMatches('1st')
        },
        {
            id: '2nd-place',
            name: '2位グループ決定リーグ',
            rankTarget: 2,
            teams: [],
            matches: generatePlacementLeagueMatches('2nd')
        },
        {
            id: '3rd-place',
            name: '3位グループ決定リーグ',
            rankTarget: 3,
            teams: [],
            matches: generatePlacementLeagueMatches('3rd')
        }
    ];

    // Group 4 (4位決定戦) - only if 10 or 11 teams
    if (teamCount === 10) {
        placementGroups.push({
            id: '4th-place',
            name: '4位最終決定 (Aブロック4位)',
            rankTarget: 4,
            teams: [],
            matches: [] // A4 gets 10th place automatically, no match needed
        });
    } else if (teamCount === 11) {
        // A4 vs B4 (1 match)
        placementGroups.push({
            id: '4th-place',
            name: '10位決定戦 (A-4位 vs B-4位)',
            rankTarget: 4,
            teams: [],
            matches: [{
                matchId: 'P-4th-M1',
                type: 'placement',
                round: 1,
                slotA: {},
                slotB: {},
                status: 'pending',
                court: 'Aコート'
            }]
        });
    }

    return {
        format: 'blocks_and_placement',
        teamCount,
        blocks,
        placementGroups,
        initialMatches: [],
        winnersMatches: [],
        losersMatches: [],
        eliminatedTeams: []
    };
}

function generatePlacementLeagueMatches(groupId: string): BlockMatch[] {
    // 3 teams (A-rank, B-rank, C-rank):
    // Match 1 (Round 1): Block A vs Block B
    // Match 2 (Round 2): Block B vs Block C
    // Match 3 (Round 3): Block C vs Block A
    return [
        {
            matchId: `P-${groupId}-M1`,
            type: 'placement',
            round: 1,
            slotA: {}, // Will be filled with Block A team
            slotB: {}, // Will be filled with Block B team
            status: 'pending',
            court: 'Aコート'
        },
        {
            matchId: `P-${groupId}-M2`,
            type: 'placement',
            round: 2,
            slotA: {}, // Block B team
            slotB: {}, // Block C team
            status: 'pending',
            court: 'Bコート'
        },
        {
            matchId: `P-${groupId}-M3`,
            type: 'placement',
            round: 3,
            slotA: {}, // Block C team
            slotB: {}, // Block A team
            status: 'pending',
            court: 'Aコート'
        }
    ];
}

/**
 * Place a team into a slot (Handles both double-elimination and blocks).
 */
export function placeTeamInSlot(
    bracket: TournamentBracketData,
    slotId: string,
    teamId: string,
    teamName: string
): TournamentBracketData {
    if (bracket.format === 'blocks_and_placement') {
        const newBlocks = bracket.blocks?.map(block => {
            const newSlots = block.slots.map(s => {
                if (s.slotId === slotId) {
                    return { ...s, teamId, teamName };
                }
                return s;
            });
            return { ...block, slots: newSlots };
        }) || [];

        let result: TournamentBracketData = { ...bracket, blocks: newBlocks };
        result = updateBlockMatchesWithSlotTeams(result);
        return checkAndPromoteToPlacementGroups(result);
    } else {
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
}

/**
 * Remove a team from all initial/draft slots.
 */
export function removeTeamFromSlots(
    bracket: TournamentBracketData,
    teamId: string
): TournamentBracketData {
    if (bracket.format === 'blocks_and_placement') {
        const newBlocks = bracket.blocks?.map(block => {
            const newSlots = block.slots.map(s => {
                if (s.teamId === teamId) {
                    return { ...s, teamId: undefined, teamName: undefined };
                }
                return s;
            });
            return { ...block, slots: newSlots };
        }) || [];

        let result: TournamentBracketData = { ...bracket, blocks: newBlocks };
        result = updateBlockMatchesWithSlotTeams(result);
        return checkAndPromoteToPlacementGroups(result);
    } else {
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
}

/**
 * Update block matches with teams from slots.
 */
function updateBlockMatchesWithSlotTeams(bracket: TournamentBracketData): TournamentBracketData {
    if (!bracket.blocks) return bracket;

    const newBlocks = bracket.blocks.map(block => {
        const slotMap = new Map<string, { id: string; name: string }>();
        block.slots.forEach(s => {
            if (s.teamId && s.teamName) {
                slotMap.set(s.slotId, { id: s.teamId, name: s.teamName });
            }
        });

        const newMatches = block.matches.map(match => {
            const newMatch = { ...match };

            // For league/semifinals, fill directly from slotId
            if (match.slotA.slotId) {
                if (slotMap.has(match.slotA.slotId)) {
                    const team = slotMap.get(match.slotA.slotId)!;
                    newMatch.slotA = { ...match.slotA, teamId: team.id, teamName: team.name };
                } else {
                    newMatch.slotA = { ...match.slotA, teamId: undefined, teamName: undefined };
                }
            }
            if (match.slotB.slotId) {
                if (slotMap.has(match.slotB.slotId)) {
                    const team = slotMap.get(match.slotB.slotId)!;
                    newMatch.slotB = { ...match.slotB, teamId: team.id, teamName: team.name };
                } else {
                    newMatch.slotB = { ...match.slotB, teamId: undefined, teamName: undefined };
                }
            }

            // Mark ready if both teams are present in initial matches
            if ((newMatch.type === 'league' || newMatch.type === 'semifinal') && newMatch.status !== 'completed') {
                if (newMatch.slotA.teamId && newMatch.slotB.teamId) {
                    newMatch.status = 'ready';
                } else {
                    newMatch.status = 'pending';
                }
            }

            return newMatch;
        });

        return { ...block, matches: newMatches };
    });

    return { ...bracket, blocks: newBlocks };
}

/**
 * Record match results.
 */
export function recordMatchResult(
    bracket: TournamentBracketData,
    matchId: string,
    winnerId: string
): TournamentBracketData {
    if (bracket.format === 'blocks_and_placement') {
        let result: TournamentBracketData = { ...bracket };
        
        // Find inside blocks
        let updatedBlock = false;
        result.blocks = result.blocks?.map(block => {
            const newMatches = block.matches.map(m => {
                if (m.matchId === matchId) {
                    const loserId = m.slotA.teamId === winnerId ? m.slotB.teamId : m.slotA.teamId;
                    const winnerName = m.slotA.teamId === winnerId ? m.slotA.teamName : m.slotB.teamName;
                    const loserName = m.slotA.teamId === winnerId ? m.slotB.teamName : m.slotA.teamName;
                    updatedBlock = true;
                    return { ...m, winnerId, loserId, status: 'completed' as const };
                }
                return m;
            });
            return { ...block, matches: newMatches };
        });

        if (updatedBlock) {
            result = advanceBlockTournamentTeams(result);
            result = updateBlockStandings(result);
            return checkAndPromoteToPlacementGroups(result);
        }

        // Find inside placement groups
        result.placementGroups = result.placementGroups?.map(group => {
            const newMatches = group.matches.map(m => {
                if (m.matchId === matchId) {
                    const loserId = m.slotA.teamId === winnerId ? m.slotB.teamId : m.slotA.teamId;
                    return { ...m, winnerId, loserId, status: 'completed' as const };
                }
                return m;
            });
            return { ...group, matches: newMatches };
        });

        result = updatePlacementStandings(result);
        return result;
    } else {
        // Double Elimination Logic
        let result: TournamentBracketData = { ...bracket };
        const allMatches = [
            ...result.initialMatches,
            ...result.winnersMatches,
            ...result.losersMatches,
        ];

        const match = allMatches.find(m => m.matchId === matchId);
        if (!match) return result;

        const loserId = match.slotA.teamId === winnerId ? match.slotB.teamId : match.slotA.teamId;
        const winnerName = match.slotA.teamId === winnerId ? match.slotA.teamName : match.slotB.teamName;
        const loserName = match.slotA.teamId === winnerId ? match.slotB.teamName : match.slotA.teamName;

        const updateMatch = (m: BracketMatch): BracketMatch => {
            if (m.matchId !== matchId) return m;
            return { ...m, winnerId, loserId, status: 'completed' };
        };

        result.initialMatches = result.initialMatches.map(updateMatch);
        result.winnersMatches = result.winnersMatches.map(updateMatch);
        result.losersMatches = result.losersMatches.map(updateMatch);

        // Place winner in Winners
        if (match.nextWinMatchId && winnerId && winnerName) {
            result = placeTeamInNextMatch(result, match.nextWinMatchId, winnerId, winnerName);
        } else if (!match.nextWinMatchId && match.bracket === 'winners') {
            result.champion = winnerId;
        }

        // Place loser in Losers
        if (match.nextLoseMatchId && loserId && loserName) {
            result = placeTeamInNextMatch(result, match.nextLoseMatchId, loserId, loserName);
        } else if (loserId && match.bracket === 'losers') {
            result.eliminatedTeams = [...result.eliminatedTeams, loserId];
        }

        return result;
    }
}

/**
 * Advance teams in block tournaments (Finals & 3rd Place Match).
 */
function advanceBlockTournamentTeams(bracket: TournamentBracketData): TournamentBracketData {
    if (!bracket.blocks) return bracket;

    const newBlocks = bracket.blocks.map(block => {
        if (block.type !== 'tournament') return block;

        const sf1 = block.matches.find(m => m.matchId.endsWith('SF1'));
        const sf2 = block.matches.find(m => m.matchId.endsWith('SF2'));
        
        let newMatches = [...block.matches];

        // Semifinal 1 updates
        if (sf1?.status === 'completed' && sf1.winnerId && sf1.loserId) {
            newMatches = newMatches.map(m => {
                if (m.matchId.endsWith('-F')) {
                    return { 
                        ...m, 
                        slotA: { ...m.slotA, teamId: sf1.winnerId, teamName: sf1.slotA.teamId === sf1.winnerId ? sf1.slotA.teamName : sf1.slotB.teamName }
                    };
                }
                if (m.matchId.endsWith('-3P')) {
                    return { 
                        ...m, 
                        slotA: { ...m.slotA, teamId: sf1.loserId, teamName: sf1.slotA.teamId === sf1.loserId ? sf1.slotA.teamName : sf1.slotB.teamName }
                    };
                }
                return m;
            });
        }

        // Semifinal 2 updates
        if (sf2?.status === 'completed' && sf2.winnerId && sf2.loserId) {
            newMatches = newMatches.map(m => {
                if (m.matchId.endsWith('-F')) {
                    return { 
                        ...m, 
                        slotB: { ...m.slotB, teamId: sf2.winnerId, teamName: sf2.slotA.teamId === sf2.winnerId ? sf2.slotA.teamName : sf2.slotB.teamName }
                    };
                }
                if (m.matchId.endsWith('-3P')) {
                    return { 
                        ...m, 
                        slotB: { ...m.slotB, teamId: sf2.loserId, teamName: sf2.slotA.teamId === sf2.loserId ? sf2.slotA.teamName : sf2.slotB.teamName }
                    };
                }
                return m;
            });
        }

        // Set Final & 3rd Place to ready if both slots populated
        newMatches = newMatches.map(m => {
            if ((m.matchId.endsWith('-F') || m.matchId.endsWith('-3P')) && m.status !== 'completed') {
                if (m.slotA.teamId && m.slotB.teamId) {
                    return { ...m, status: 'ready' };
                } else {
                    return { ...m, status: 'pending' };
                }
            }
            return m;
        });

        return { ...block, matches: newMatches };
    });

    return { ...bracket, blocks: newBlocks };
}

/**
 * Double Elimination: place team in next slot.
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
 * Undo match result.
 */
export function undoMatchResult(
    bracket: TournamentBracketData,
    matchId: string
): TournamentBracketData {
    if (bracket.format === 'blocks_and_placement') {
        let result: TournamentBracketData = { ...bracket };
        let updatedBlock = false;

        result.blocks = result.blocks?.map(block => {
            const newMatches = block.matches.map(m => {
                if (m.matchId === matchId && m.status === 'completed') {
                    updatedBlock = true;
                    return { ...m, winnerId: undefined, loserId: undefined, status: 'ready' as const, scoreA: undefined, scoreB: undefined };
                }
                return m;
            });
            return { ...block, matches: newMatches };
        });

        if (updatedBlock) {
            // Remove advanced teams downstream
            result = resetBlockTournamentDownstream(result, matchId);
            result = updateBlockStandings(result);
            return checkAndPromoteToPlacementGroups(result);
        }

        // Check placement group matches
        result.placementGroups = result.placementGroups?.map(group => {
            const newMatches = group.matches.map(m => {
                if (m.matchId === matchId && m.status === 'completed') {
                    return { ...m, winnerId: undefined, loserId: undefined, status: 'ready' as const, scoreA: undefined, scoreB: undefined };
                }
                return m;
            });
            return { ...group, matches: newMatches };
        });

        result = updatePlacementStandings(result);
        return result;
    } else {
        // Double Elimination Undo Logic
        let result: TournamentBracketData = { ...bracket };
        const allMatches = [
            ...result.initialMatches,
            ...result.winnersMatches,
            ...result.losersMatches,
        ];

        const match = allMatches.find(m => m.matchId === matchId);
        if (!match) return result;

        if (match.status === 'completed' && match.winnerId && match.loserId) {
            const winnerId = match.winnerId;
            const loserId = match.loserId;

            const updateMatch = (m: BracketMatch): BracketMatch => {
                if (m.matchId !== matchId) return m;
                return { ...m, winnerId: undefined, loserId: undefined, status: 'ready', scoreA: undefined, scoreB: undefined };
            };

            result.initialMatches = result.initialMatches.map(updateMatch);
            result.winnersMatches = result.winnersMatches.map(updateMatch);
            result.losersMatches = result.losersMatches.map(updateMatch);
            result.champion = undefined;

            const removeSlot = (targetMatchId: string, teamId: string) => {
                const clearSlot = (m: BracketMatch): BracketMatch => {
                    if (m.matchId !== targetMatchId) return m;
                    const newM = { ...m };
                    if (newM.slotA.teamId === teamId) {
                        newM.slotA = { ...newM.slotA, teamId: undefined, teamName: undefined };
                        newM.status = 'pending';
                    } else if (newM.slotB.teamId === teamId) {
                        newM.slotB = { ...newM.slotB, teamId: undefined, teamName: undefined };
                        newM.status = 'pending';
                    }
                    return newM;
                };
                result.initialMatches = result.initialMatches.map(clearSlot);
                result.winnersMatches = result.winnersMatches.map(clearSlot);
                result.losersMatches = result.losersMatches.map(clearSlot);
            };

            if (match.nextWinMatchId) removeSlot(match.nextWinMatchId, winnerId);
            if (match.nextLoseMatchId) removeSlot(match.nextLoseMatchId, loserId);

            if (!match.nextLoseMatchId && match.bracket === 'losers') {
                result.eliminatedTeams = result.eliminatedTeams.filter(id => id !== loserId);
            }
        }
        return result;
    }
}

/**
 * Remove teams from final/3rd place matches if semifinal is undone.
 */
function resetBlockTournamentDownstream(bracket: TournamentBracketData, matchId: string): TournamentBracketData {
    if (!bracket.blocks) return bracket;

    const newBlocks = bracket.blocks.map(block => {
        if (block.type !== 'tournament') return block;

        const sfMatches = ['SF1', 'SF2'];
        const targetSuffix = matchId.endsWith('SF1') ? 'SF1' : matchId.endsWith('SF2') ? 'SF2' : null;
        if (!targetSuffix) return block;

        const newMatches = block.matches.map(m => {
            if (m.matchId.endsWith('-F') || m.matchId.endsWith('-3P')) {
                const slotToClear = m.slotA.sourceMatchId === matchId ? 'slotA' : m.slotB.sourceMatchId === matchId ? 'slotB' : null;
                if (slotToClear) {
                    return {
                        ...m,
                        [slotToClear]: { ...m[slotToClear], teamId: undefined, teamName: undefined },
                        status: 'pending' as const,
                        winnerId: undefined,
                        loserId: undefined,
                        scoreA: undefined,
                        scoreB: undefined
                    };
                }
            }
            return m;
        });

        return { ...block, matches: newMatches };
    });

    return { ...bracket, blocks: newBlocks };
}

/**
 * Calculate standing ranks inside blocks.
 */
export function updateBlockStandings(bracket: TournamentBracketData): TournamentBracketData {
    if (!bracket.blocks) return bracket;

    const newBlocks = bracket.blocks.map(block => {
        const standings: BlockStandingRow[] = [];
        const isBlockCompleted = block.matches.every(m => m.status === 'completed');

        // Gather all teams in the block
        block.slots.forEach(s => {
            if (s.teamId && s.teamName) {
                standings.push({
                    teamId: s.teamId,
                    teamName: s.teamName,
                    played: 0,
                    won: 0,
                    lost: 0,
                    pointsFor: 0,
                    pointsAgainst: 0,
                    diff: 0
                });
            }
        });

        if (block.type === 'league') {
            block.matches.forEach(m => {
                if (m.status === 'completed' && m.winnerId && m.loserId) {
                    const rowA = standings.find(r => r.teamId === m.slotA.teamId);
                    const rowB = standings.find(r => r.teamId === m.slotB.teamId);

                    const scoreA = Number(m.scoreA || 0);
                    const scoreB = Number(m.scoreB || 0);

                    if (rowA && rowB) {
                        rowA.played++;
                        rowB.played++;
                        rowA.pointsFor += scoreA;
                        rowA.pointsAgainst += scoreB;
                        rowB.pointsFor += scoreB;
                        rowB.pointsAgainst += scoreA;

                        if (m.winnerId === rowA.teamId) {
                            rowA.won++;
                            rowB.lost++;
                        } else {
                            rowB.won++;
                            rowA.lost++;
                        }
                    }
                }
            });

            // Recalculate diffs
            standings.forEach(r => {
                r.diff = r.pointsFor - r.pointsAgainst;
            });

            // Sort standings: Wins -> Diff -> PointsFor
            standings.sort((a, b) => {
                if (b.won !== a.won) return b.won - a.won;
                if (b.diff !== a.diff) return b.diff - a.diff;
                return b.pointsFor - a.pointsFor;
            });

            // Assign ranks only if the block is fully completed
            if (isBlockCompleted) {
                standings.forEach((r, idx) => {
                    r.rank = idx + 1;
                });
            }
        } else {
            // Tournament block standing resolution
            const f = block.matches.find(m => m.type === 'final');
            const tp = block.matches.find(m => m.type === 'third_place');

            standings.forEach(row => {
                if (isBlockCompleted) {
                    if (row.teamId === f?.winnerId) row.rank = 1;
                    else if (row.teamId === f?.loserId) row.rank = 2;
                    else if (row.teamId === tp?.winnerId) row.rank = 3;
                    else if (row.teamId === tp?.loserId) row.rank = 4;
                }
            });
        }

        return { ...block, standings };
    });

    return { ...bracket, blocks: newBlocks };
}

/**
 * Calculate standing ranks inside placement leagues.
 */
function updatePlacementStandings(bracket: TournamentBracketData): TournamentBracketData {
    if (!bracket.placementGroups) return bracket;

    const newGroups = bracket.placementGroups.map(group => {
        const standings: BlockStandingRow[] = [];

        group.teams.forEach(t => {
            standings.push({
                teamId: t.id,
                teamName: t.name,
                played: 0,
                won: 0,
                lost: 0,
                pointsFor: 0,
                pointsAgainst: 0,
                diff: 0
            });
        });

        group.matches.forEach(m => {
            if (m.status === 'completed' && m.winnerId && m.loserId) {
                const rowA = standings.find(r => r.teamId === m.slotA.teamId);
                const rowB = standings.find(r => r.teamId === m.slotB.teamId);

                const scoreA = Number(m.scoreA || 0);
                const scoreB = Number(m.scoreB || 0);

                if (rowA && rowB) {
                    rowA.played++;
                    rowB.played++;
                    rowA.pointsFor += scoreA;
                    rowA.pointsAgainst += scoreB;
                    rowB.pointsFor += scoreB;
                    rowB.pointsAgainst += scoreA;

                    if (m.winnerId === rowA.teamId) {
                        rowA.won++;
                        rowB.lost++;
                    } else {
                        rowB.won++;
                        rowA.lost++;
                    }
                }
            }
        });

        standings.forEach(r => r.diff = r.pointsFor - r.pointsAgainst);

        standings.sort((a, b) => {
            if (b.won !== a.won) return b.won - a.won;
            if (b.diff !== a.diff) return b.diff - a.diff;
            return b.pointsFor - a.pointsFor;
        });

        standings.forEach((r, idx) => r.rank = idx + 1);

        return { ...group, standings };
    });

    return { ...bracket, placementGroups: newGroups };
}

/**
 * Promotes top ranked teams from blocks to placement groups once block round matches are fully completed.
 */
function checkAndPromoteToPlacementGroups(bracket: TournamentBracketData): TournamentBracketData {
    if (!bracket.blocks || !bracket.placementGroups) return bracket;

    let result: TournamentBracketData = { ...bracket };
    if (!result.blocks || !result.placementGroups) return result;
    
    // Check block completion individually
    const completedBlocksMap = new Map<string, boolean>();
    result.blocks.forEach(block => {
        const isCompleted = block.matches.every(m => m.status === 'completed');
        completedBlocksMap.set(block.id, isCompleted);
    });

    // Resolve standings for all blocks (updateBlockStandings respects completion status)
    result = updateBlockStandings(result);
    if (!result.blocks || !result.placementGroups) return result;

    // Populate teamRankingsMap with teams from completed blocks
    const teamRankingsMap = new Map<number, { id: string; name: string; blockId: string }[]>();
    
    result.blocks.forEach(block => {
        if (completedBlocksMap.get(block.id)) {
            block.standings?.forEach(row => {
                if (row.rank) {
                    if (!teamRankingsMap.has(row.rank)) {
                        teamRankingsMap.set(row.rank, []);
                    }
                    teamRankingsMap.get(row.rank)!.push({
                        id: row.teamId,
                        name: row.teamName,
                        blockId: block.id
                    });
                }
            });
        }
    });

    const newGroups = result.placementGroups.map(group => {
        const groupTeams = teamRankingsMap.get(group.rankTarget) || [];
        
        // Map teams into group matches
        const newMatches = group.matches.map(match => {
            const newMatch = { ...match };

            if (group.id === '1st-place' || group.id === '2nd-place' || group.id === '3rd-place') {
                // Match 1: Block A vs Block B (round 1)
                // Match 2: Block B vs Block C (round 2)
                // Match 3: Block C vs Block A (round 3)
                const depA = match.round === 1 ? 'A' : match.round === 2 ? 'B' : 'C';
                const depB = match.round === 1 ? 'B' : match.round === 2 ? 'C' : 'A';

                const isDepACompleted = completedBlocksMap.get(depA) || false;
                const isDepBCompleted = completedBlocksMap.get(depB) || false;

                const teamA = groupTeams.find(t => t.blockId === depA);
                const teamB = groupTeams.find(t => t.blockId === depB);

                if (isDepACompleted && teamA) {
                    newMatch.slotA = { teamId: teamA.id, teamName: teamA.name };
                } else {
                    newMatch.slotA = {};
                }

                if (isDepBCompleted && teamB) {
                    newMatch.slotB = { teamId: teamB.id, teamName: teamB.name };
                } else {
                    newMatch.slotB = {};
                }

                if (newMatch.slotA.teamId && newMatch.slotB.teamId) {
                    newMatch.status = 'ready' as const;
                } else {
                    newMatch.status = 'pending' as const;
                }
            } else if (group.id === '4th-place' && result.teamCount === 11) {
                // 10th Place match: Block A 4th vs Block B 4th
                const isDepACompleted = completedBlocksMap.get('A') || false;
                const isDepBCompleted = completedBlocksMap.get('B') || false;

                const teamA = groupTeams.find(t => t.blockId === 'A');
                const teamB = groupTeams.find(t => t.blockId === 'B');

                if (isDepACompleted && teamA) {
                    newMatch.slotA = { teamId: teamA.id, teamName: teamA.name };
                } else {
                    newMatch.slotA = {};
                }

                if (isDepBCompleted && teamB) {
                    newMatch.slotB = { teamId: teamB.id, teamName: teamB.name };
                } else {
                    newMatch.slotB = {};
                }

                if (newMatch.slotA.teamId && newMatch.slotB.teamId) {
                    newMatch.status = 'ready' as const;
                } else {
                    newMatch.status = 'pending' as const;
                }
            }
            
            return newMatch;
        });

        return { ...group, teams: groupTeams, matches: newMatches };
    });

    result.placementGroups = newGroups;
    result = updatePlacementStandings(result);
    return result;
}

/**
 * Update match metadata (court and referee).
 */
export function updateMatchInfo(
    bracket: TournamentBracketData,
    matchId: string,
    court?: string,
    referee?: string
): TournamentBracketData {
    let result: TournamentBracketData = { ...bracket };
    
    if (bracket.format === 'blocks_and_placement') {
        result.blocks = result.blocks?.map(block => {
            const newMatches = block.matches.map(m => {
                if (m.matchId === matchId) return { ...m, court, referee };
                return m;
            });
            return { ...block, matches: newMatches };
        });

        result.placementGroups = result.placementGroups?.map(group => {
            const newMatches = group.matches.map(m => {
                if (m.matchId === matchId) return { ...m, court, referee };
                return m;
            });
            return { ...group, matches: newMatches };
        });
    } else {
        const updateMatch = (m: BracketMatch): BracketMatch => {
            if (m.matchId !== matchId) return m;
            return { ...m, court, referee };
        };
        result.initialMatches = result.initialMatches.map(updateMatch);
        result.winnersMatches = result.winnersMatches.map(updateMatch);
        result.losersMatches = result.losersMatches.map(updateMatch);
    }
    
    return result;
}

/**
 * Update scores.
 */
export function updateMatchScore(
    bracket: TournamentBracketData,
    matchId: string,
    scoreA?: string | number,
    scoreB?: string | number
): TournamentBracketData {
    let result: TournamentBracketData = { ...bracket };
    
    if (bracket.format === 'blocks_and_placement') {
        const updateSingleMatch = (m: BlockMatch): BlockMatch => {
            if (m.matchId !== matchId) return m;
            const updated = { ...m, scoreA, scoreB };
            const sA = scoreA;
            const sB = scoreB;
            const hasA = sA !== undefined && sA !== null && sA !== '' && !isNaN(Number(sA));
            const hasB = sB !== undefined && sB !== null && sB !== '' && !isNaN(Number(sB));
            if (hasA && hasB && Number(sA) !== Number(sB)) {
                updated.status = 'completed';
                updated.winnerId = Number(sA) > Number(sB) ? m.slotA.teamId : m.slotB.teamId;
                updated.loserId = Number(sA) > Number(sB) ? m.slotB.teamId : m.slotA.teamId;
            } else {
                updated.status = (m.slotA.teamId && m.slotB.teamId) ? 'ready' : 'pending';
                updated.winnerId = undefined;
                updated.loserId = undefined;
            }
            return updated;
        };

        result.blocks = result.blocks?.map(block => {
            return { ...block, matches: block.matches.map(updateSingleMatch) };
        });

        // Auto advance block tournament teams if a semifinal match was completed/updated
        result = advanceBlockTournamentTeams(result);

        result.placementGroups = result.placementGroups?.map(group => {
            return { ...group, matches: group.matches.map(updateSingleMatch) };
        });
        
        result = updateBlockStandings(result);
        result = checkAndPromoteToPlacementGroups(result);
    } else {
        const updateMatch = (m: BracketMatch): BracketMatch => {
            if (m.matchId !== matchId) return m;
            return { ...m, scoreA, scoreB };
        };
        result.initialMatches = result.initialMatches.map(updateMatch);
        result.winnersMatches = result.winnersMatches.map(updateMatch);
        result.losersMatches = result.losersMatches.map(updateMatch);
    }
    
    return result;
}

/**
 * Randomize first round entries (or block slots for qualifying leagues).
 */
export function randomizeFirstRound(
    bracket: TournamentBracketData,
    entries: TeamEntry[]
): TournamentBracketData {
    let result: TournamentBracketData = { ...bracket };
    const availableTeams = entries.filter(e => e.status !== 'cancelled');

    for (let i = availableTeams.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [availableTeams[i], availableTeams[j]] = [availableTeams[j], availableTeams[i]];
    }

    if (bracket.format === 'blocks_and_placement') {
        // Clear slots & matches first
        result.blocks = result.blocks?.map(block => {
            const clearedSlots = block.slots.map(s => ({ ...s, teamId: undefined, teamName: undefined }));
            const clearedMatches = block.matches.map(m => ({
                ...m,
                slotA: { ...m.slotA, teamId: undefined, teamName: undefined },
                slotB: { ...m.slotB, teamId: undefined, teamName: undefined },
                status: 'pending' as const,
                winnerId: undefined,
                loserId: undefined,
                scoreA: undefined,
                scoreB: undefined
            }));
            return { ...block, slots: clearedSlots, matches: clearedMatches, standings: [] };
        });

        // Distribute teams to block slots sequentially
        let teamIdx = 0;
        result.blocks = result.blocks?.map(block => {
            const newSlots = block.slots.map(slot => {
                if (teamIdx < availableTeams.length) {
                    const team = availableTeams[teamIdx];
                    teamIdx++;
                    return { ...slot, teamId: team.id, teamName: team.teamName };
                }
                return slot;
            });
            return { ...block, slots: newSlots };
        });

        result = updateBlockMatchesWithSlotTeams(result);
        result = updateBlockStandings(result);
        return checkAndPromoteToPlacementGroups(result);
    } else {
        // Double elimination randomizer
        const clearInitial = (m: BracketMatch): BracketMatch => {
            if (m.bracket === 'initial') {
                return {
                    ...m,
                    status: m.slotA.isBye && m.slotB.isBye ? 'ready' : 'pending',
                    winnerId: undefined,
                    loserId: undefined,
                    scoreA: undefined,
                    scoreB: undefined,
                    slotA: m.slotA.isBye ? m.slotA : { ...m.slotA, teamId: undefined, teamName: undefined },
                    slotB: m.slotB.isBye ? m.slotB : { ...m.slotB, teamId: undefined, teamName: undefined }
                };
            }
            return { 
                ...m, 
                status: 'pending', 
                winnerId: undefined, 
                loserId: undefined, 
                scoreA: undefined,
                scoreB: undefined,
                slotA: { ...m.slotA, teamId: undefined, teamName: undefined }, 
                slotB: { ...m.slotB, teamId: undefined, teamName: undefined } 
            };
        };
        
        result.initialMatches = result.initialMatches.map(clearInitial);
        result.winnersMatches = result.winnersMatches.map(clearInitial);
        result.losersMatches = result.losersMatches.map(clearInitial);
        result.eliminatedTeams = [];
        result.champion = undefined;

        let teamIdx = 0;
        result.initialMatches = result.initialMatches.map(m => {
            const newMatch = { ...m };
            if (!newMatch.slotA.isBye && teamIdx < availableTeams.length) {
                newMatch.slotA.teamId = availableTeams[teamIdx].id;
                newMatch.slotA.teamName = availableTeams[teamIdx].teamName;
                teamIdx++;
            }
            if (!newMatch.slotB.isBye && teamIdx < availableTeams.length) {
                newMatch.slotB.teamId = availableTeams[teamIdx].id;
                newMatch.slotB.teamName = availableTeams[teamIdx].teamName;
                teamIdx++;
            }
            if ((newMatch.slotA.teamId || newMatch.slotA.isBye) && (newMatch.slotB.teamId || newMatch.slotB.isBye)) {
                newMatch.status = 'ready';
            }
            return newMatch;
        });

        return result;
    }
}

/**
 * Automatically fill mock results for all currently ready matches, propagating results.
 * Can be run repeatedly to simulate the entire tournament progression.
 */
export function autoFillMockResults(bracket: TournamentBracketData): TournamentBracketData {
    let result: TournamentBracketData = { ...bracket };
    
    // We will keep completing matches that are 'ready' until no more matches change.
    // To be safe and avoid infinite loops, we cap the iterations.
    let iterations = 0;
    const maxIterations = 100;
    
    while (iterations < maxIterations) {
        let matchToFill: { matchId: string; slotAId: string; slotBId: string } | null = null;
        
        if (result.format === 'blocks_and_placement') {
            // Find a ready block match
            if (result.blocks) {
                for (const block of result.blocks) {
                    const readyMatch = block.matches.find(m => m.status === 'ready' && m.slotA.teamId && m.slotB.teamId);
                    if (readyMatch) {
                        matchToFill = {
                            matchId: readyMatch.matchId,
                            slotAId: readyMatch.slotA.teamId!,
                            slotBId: readyMatch.slotB.teamId!
                        };
                        break;
                    }
                }
            }
            
            // If no block match is ready, check placement groups
            if (!matchToFill && result.placementGroups) {
                for (const group of result.placementGroups) {
                    const readyMatch = group.matches.find(m => m.status === 'ready' && m.slotA.teamId && m.slotB.teamId);
                    if (readyMatch) {
                        matchToFill = {
                            matchId: readyMatch.matchId,
                            slotAId: readyMatch.slotA.teamId!,
                            slotBId: readyMatch.slotB.teamId!
                        };
                        break;
                    }
                }
            }
        } else {
            // Double elimination: check initial, winners, losers matches
            const allMatches = [
                ...result.initialMatches,
                ...result.winnersMatches,
                ...result.losersMatches
            ];
            const readyMatch = allMatches.find(m => m.status === 'ready' && m.slotA.teamId && m.slotB.teamId && !m.slotA.isBye && !m.slotB.isBye);
            if (readyMatch) {
                matchToFill = {
                    matchId: readyMatch.matchId,
                    slotAId: readyMatch.slotA.teamId!,
                    slotBId: readyMatch.slotB.teamId!
                };
            }
        }
        
        if (!matchToFill) {
            break; // No more ready matches to fill
        }
        
        // Pick a random winner and scores
        const scoreA = Math.floor(Math.random() * 30) + 60; // 60-89
        let scoreB = Math.floor(Math.random() * 30) + 60;
        while (scoreB === scoreA) {
            scoreB = Math.floor(Math.random() * 30) + 60;
        }
        
        const winnerId = scoreA > scoreB ? matchToFill.slotAId : matchToFill.slotBId;
        
        // Update score in the bracket
        result = updateMatchScore(result, matchToFill.matchId, scoreA, scoreB);
        // Record match result (which advances teams)
        result = recordMatchResult(result, matchToFill.matchId, winnerId);
        
        iterations++;
    }
    
    return result;
}
