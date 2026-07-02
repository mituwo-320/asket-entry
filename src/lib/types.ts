export interface Player {
    id: string;
    name: string;
    furigana: string;
    wristbandColor?: string;
    insurance: boolean;
    isRepresentative?: boolean; // True if this player is the representative
}

// User Account (Representative)
export interface User {
    id: string;
    email: string; // Login ID
    password?: string;
    name: string; // Representative Name
    phone: string;
    postalCode?: string; // Opting to keep optional to not break user code completely yet
    address?: string; // Opting to keep optional
    wristbandColor?: string; // Rep's wristband color
}

// Tournament Entry (Context for a specific tournament)
export interface Project {
    id: string;
    name: string;
    isActive: boolean;
    isWaitlistEnabled?: boolean; // NEW: Enable/Disable waitlist registration
    isTestProject?: boolean; // NEW: テスト用プロジェクトかどうか
    entryStartDate?: string;
    entryEndDate?: string;
    eventDate?: string; // NEW: 大会本番日程
    lineOpenChatLink?: string;
    maxTeams?: number; // NEW: Maximum number of teams allowed
    createdAt?: string;
    hasClinic?: boolean;
    clinicTitle?: string;
    clinicDescription?: string;
    clinicLimit?: number;
}

export interface TeamEntry {
    id: string;
    userId: string; // Link to User
    tournamentId: string; // e.g., "2024-Spring"
    teamName: string;
    teamNameKana: string; // NEW: Team Name Furigana
    teamIntroduction: string; // NEW: Team Introduction
    isBeginnerFriendlyAccepted: boolean; // NEW: Agreement
    players: Player[];
    status: 'draft' | 'submitted' | 'cancelled';
    isPaid?: boolean; // NEW: Payment Status
    group?: string; // NEW: Group assignment (e.g. "A", "B")
    preliminaryNumber?: number; // NEW: Lottery selection 1-16
    isOpenChatJoined?: boolean; // NEW: Management OpenChat check
    managementMemo?: string; // NEW: Management Memo
    uniformColor?: string; // NEW: Uniform color
    receiptName?: string; // 領収書の宛名（御社名）
    receiptIssuedAt?: string; // 領収書発行日時
    receiptViewedAt?: string; // 領収書閲覧日時
    clinicParticipation?: boolean | null; // クリニック参加希望有無（未選択時はnull）
    clinicCount?: number; // クリニック参加人数

    createdAt: string;
}

export interface Match {
    id: string;
    tournamentId: string;
    teamIdA: string; // "Bye" if empty? Or handle odd numbers logic
    teamIdB: string;
    scoreA?: number;
    scoreB?: number;
    status: 'scheduled' | 'playing' | 'finished';
    court?: string; // e.g. "A Court"
    time?: string;  // e.g. "10:00"
    round?: number; // 1 for 1st round, 2 for 2nd, etc.
    winnerId?: string;
    refereeTeamId?: string; // Team ID assigned to judge/score
    matchNumber?: string;   // e.g. "A-1", "B-1"
}

export interface ScheduleEvent {
    id: string;
    tournamentId: string;
    type: 'match' | 'ceremony' | 'break' | 'other';
    title: string;
    startTime: string; // "HH:MM"
    endTime?: string;
    court?: 'A' | 'B' | 'ALL'; // Specific court or all
}

// Legacy Team interface for compatibility (Deprecated)
// export interface Team { ... }

// Settings
export interface Setting {
    id: string;
    participationFee: number;
    insuranceFee: number;
    lineOpenChatLink?: string;
    entryDeadline?: string;
}

// ========== Tournament Bracket Types ==========

export interface BracketSlot {
    slotId: string;          // Unique identifier e.g. "W-R1-M1-A"
    teamId?: string;         // Team ID if assigned
    teamName?: string;       // Cached team name for display
    seedNumber?: number;     // Random draw number (抽選番号)
    isBye?: boolean;         // BYE slot
}

export interface BracketMatch {
    matchId: string;         // e.g. "W-R1-M1"
    round: number;           // Round number (1-based)
    bracket: 'winners' | 'losers' | 'initial'; // Which bracket
    slotA: BracketSlot;      // Top/Left team
    slotB: BracketSlot;      // Bottom/Right team
    winnerId?: string;       // Winner team ID
    loserId?: string;        // Loser team ID
    status: 'pending' | 'ready' | 'completed';
    nextWinMatchId?: string; // Where winner goes
    nextLoseMatchId?: string;// Where loser goes (for winners bracket)
    court?: string;          // NEW: Court name (e.g. "Aコート")
    referee?: string;        // NEW: Referee team/person
    scoreA?: string | number;// NEW: Score for team A
    scoreB?: string | number;// NEW: Score for team B
}

export interface BlockStandingRow {
    teamId: string;
    teamName: string;
    played: number;
    won: number;
    lost: number;
    pointsFor: number;
    pointsAgainst: number;
    diff: number;
    rank?: number;
}

export interface BlockMatch {
    matchId: string; // e.g. "B-A-M1" (Block A Match 1)
    type: 'league' | 'semifinal' | 'final' | 'third_place' | 'placement';
    round: number;
    court?: string;
    referee?: string;
    slotA: { teamId?: string; teamName?: string; sourceMatchId?: string; isWinner?: boolean; slotId?: string };
    slotB: { teamId?: string; teamName?: string; sourceMatchId?: string; isWinner?: boolean; slotId?: string };
    scoreA?: string | number;
    scoreB?: string | number;
    winnerId?: string;
    loserId?: string;
    status: 'pending' | 'ready' | 'completed';
    nextWinMatchId?: string;
    nextLoseMatchId?: string;
}

export interface TournamentBlock {
    id: string; // "A" | "B" | "C"
    name: string; // "Aブロック", "Bブロック", etc.
    type: 'league' | 'tournament';
    slots: { slotId: string; teamId?: string; teamName?: string }[]; // Draft slots for dragging teams
    matches: BlockMatch[];
    standings?: BlockStandingRow[]; // Dynamically computed standings
}

export interface PlacementGroup {
    id: string; // e.g. "1st-place"
    name: string; // "1位決定リーグ", "4位決定戦", etc.
    rankTarget: number; // 1 for 1st place group, etc.
    teams: { id: string; name: string; blockId: string }[]; // Populated when block rankings are ready
    matches: BlockMatch[];
    standings?: BlockStandingRow[];
}

export interface TournamentBracketData {
    format?: 'double_elimination' | 'blocks_and_placement';
    teamCount: number;
    // For double_elimination:
    initialMatches: BracketMatch[];  // First round (center)
    winnersMatches: BracketMatch[];  // Winners bracket (left)
    losersMatches: BracketMatch[];   // Losers bracket (right)
    eliminatedTeams: string[];       // Teams that lost in losers bracket
    champion?: string;               // Final champion team ID
    
    // For blocks_and_placement:
    blocks?: TournamentBlock[];
    placementGroups?: PlacementGroup[];
}

export interface PrintChecklistItem {
    id: string;
    projectId: string;
    name: string;
    isPrinted: boolean;
    createdAt?: string;
    updatedAt?: string;
}



