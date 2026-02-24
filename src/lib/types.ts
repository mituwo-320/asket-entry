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
    entryStartDate?: string;
    entryEndDate?: string;
    createdAt?: string;
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
    status: 'draft' | 'submitted';
    isPaid?: boolean; // NEW: Payment Status
    group?: string; // NEW: Group assignment (e.g. "A", "B")
    preliminaryNumber?: number; // NEW: Lottery selection 1-16
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
