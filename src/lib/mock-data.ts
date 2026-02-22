import { User, TeamEntry, Match, ScheduleEvent } from './types';

export const MOCK_USERS: User[] = [
    {
        id: "u1",
        email: "demo@test.com",
        password: "pass",
        name: "安西 光義",
        phone: "090-1234-5678"
    }
];

export const MOCK_ENTRIES: TeamEntry[] = [
    {
        id: "e1",
        userId: "u1",
        tournamentId: "2024-Spring",
        teamName: "湘北高校",
        teamNameKana: "ショウホクコウコウ",
        teamIntroduction: "全国制覇",
        isBeginnerFriendlyAccepted: true,
        status: 'submitted',
        createdAt: "2024-01-01T10:00:00Z",
        players: [
            { id: "1", name: "宮城 リョータ", furigana: "ミヤギ リョータ", insurance: true, wristbandColor: "赤" },
            { id: "2", name: "三井 寿", furigana: "ミツイ ヒサシ", insurance: true, wristbandColor: "赤" },
        ]
    },
    {
        id: "e2",
        userId: "u2",
        tournamentId: "2024-Spring",
        teamName: "陵南高校",
        teamNameKana: "リョウナンコウコウ",
        teamIntroduction: "打倒海南",
        isBeginnerFriendlyAccepted: true,
        status: 'submitted',
        createdAt: "2024-01-02T10:00:00Z",
        players: [
            { id: "3", name: "仙道 彰", furigana: "センドウ アキラ", insurance: true, wristbandColor: "青" },
            { id: "4", name: "魚住 純", furigana: "ウオズミ ジュン", insurance: true, wristbandColor: "青" },
        ]
    }
];

export const MOCK_MATCHES: Match[] = [];

export const MOCK_SCHEDULE_EVENTS: ScheduleEvent[] = [
    {
        id: "evt_1",
        tournamentId: "2024-Spring",
        type: "ceremony",
        title: "開会式",
        startTime: "10:00",
        endTime: "10:20",
        court: "ALL"
    },
    {
        id: "evt_2",
        tournamentId: "2024-Spring",
        type: "match", // Placeholder for logic that merges matches into events
        title: "第1試合",
        startTime: "10:25",
        endTime: "10:38",
        court: "A"
    }
];
