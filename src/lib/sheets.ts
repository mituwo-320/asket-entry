import { User, TeamEntry, Player, Match, ScheduleEvent } from './types';
import * as bcrypt from 'bcryptjs';
import { db } from './db';

// --- Users ---

export async function saveUser(user: User): Promise<boolean> {
    const hashedPassword = user.password ? await bcrypt.hash(user.password, 10) : '';
    await db.user.upsert({
        where: { id: user.id },
        update: {
            name: user.name,
            phone: user.phone,
            postalCode: user.postalCode || '',
            address: user.address || '',
            wristbandColor: user.wristbandColor || '',
        },
        create: {
            id: user.id,
            email: user.email,
            name: user.name,
            phone: user.phone,
            password: hashedPassword,
            postalCode: user.postalCode || '',
            address: user.address || '',
            wristbandColor: user.wristbandColor || '',
        }
    });
    return true;
}

export async function verifyUserLogin(email: string, password: string): Promise<User | null> {
    try {
        const user = await db.user.findUnique({ where: { email } });
        if (!user) return null;

        const match = await bcrypt.compare(password, user.password);
        if (!match) return null;

        return {
            id: user.id,
            email: user.email,
            name: user.name,
            phone: user.phone,
            postalCode: user.postalCode || undefined,
            address: user.address || undefined,
            wristbandColor: user.wristbandColor || undefined
        };
    } catch (e) {
        console.error('verifyUserLogin error:', e);
        return null;
    }
}

export async function findUserById(id: string): Promise<User | null> {
    try {
        const user = await db.user.findUnique({ where: { id } });
        if (!user) return null;

        return {
            id: user.id,
            email: user.email,
            name: user.name,
            phone: user.phone,
            postalCode: user.postalCode || undefined,
            address: user.address || undefined,
            wristbandColor: user.wristbandColor || undefined
        };
    } catch (e) {
        console.error('findUserById error:', e);
        return null;
    }
}

// --- Team Entries ---

export async function saveTeamEntry(entry: TeamEntry): Promise<boolean> {
    try {
        // Upsert TeamEntry
        await db.teamEntry.upsert({
            where: { id: entry.id },
            update: {
                tournamentId: entry.tournamentId,
                teamName: entry.teamName,
                teamNameKana: entry.teamNameKana,
                teamIntroduction: entry.teamIntroduction,
                isBeginnerFriendlyAccepted: entry.isBeginnerFriendlyAccepted,
                status: entry.status,
                isPaid: entry.isPaid || false,
                group: entry.group || null
            },
            create: {
                id: entry.id,
                userId: entry.userId,
                tournamentId: entry.tournamentId,
                teamName: entry.teamName,
                teamNameKana: entry.teamNameKana,
                teamIntroduction: entry.teamIntroduction,
                isBeginnerFriendlyAccepted: entry.isBeginnerFriendlyAccepted,
                status: entry.status,
                isPaid: entry.isPaid || false,
                group: entry.group || null
            }
        });

        // Upsert Players
        for (const p of entry.players) {
            await db.player.upsert({
                where: { id: p.id },
                update: {
                    name: p.name,
                    furigana: p.furigana,
                    insurance: p.insurance,
                    isRepresentative: p.isRepresentative || false,
                    wristbandColor: p.wristbandColor || null
                },
                create: {
                    id: p.id,
                    entryId: entry.id,
                    name: p.name,
                    furigana: p.furigana,
                    insurance: p.insurance,
                    isRepresentative: p.isRepresentative || false,
                    wristbandColor: p.wristbandColor || null
                }
            });
        }
        return true;
    } catch (e) {
        console.error('saveTeamEntry error:', e);
        return false;
    }
}

export async function getUserEntries(userId: string): Promise<TeamEntry[]> {
    try {
        const entries = await db.teamEntry.findMany({
            where: { userId },
            include: { players: true }
        });

        return entries.map(e => ({
            id: e.id,
            userId: e.userId,
            tournamentId: e.tournamentId,
            teamName: e.teamName,
            teamNameKana: e.teamNameKana,
            teamIntroduction: e.teamIntroduction,
            isBeginnerFriendlyAccepted: e.isBeginnerFriendlyAccepted,
            status: e.status as 'draft' | 'submitted',
            isPaid: e.isPaid,
            group: e.group || undefined,
            createdAt: e.createdAt.toISOString(),
            players: e.players.map(p => ({
                id: p.id,
                name: p.name,
                furigana: p.furigana,
                insurance: p.insurance,
                isRepresentative: p.isRepresentative,
                wristbandColor: p.wristbandColor || undefined
            }))
        }));
    } catch (e) {
        console.error('getUserEntries error:', e);
        return [];
    }
}

export async function findTeamEntry(entryId: string): Promise<TeamEntry | null> {
    try {
        const e = await db.teamEntry.findUnique({
            where: { id: entryId },
            include: { players: true }
        });
        if (!e) return null;

        return {
            id: e.id,
            userId: e.userId,
            tournamentId: e.tournamentId,
            teamName: e.teamName,
            teamNameKana: e.teamNameKana,
            teamIntroduction: e.teamIntroduction,
            isBeginnerFriendlyAccepted: e.isBeginnerFriendlyAccepted,
            status: e.status as 'draft' | 'submitted',
            isPaid: e.isPaid,
            group: e.group || undefined,
            createdAt: e.createdAt.toISOString(),
            players: e.players.map(p => ({
                id: p.id,
                name: p.name,
                furigana: p.furigana,
                insurance: p.insurance,
                isRepresentative: p.isRepresentative,
                wristbandColor: p.wristbandColor || undefined
            }))
        };
    } catch (e) {
        console.error('findTeamEntry error:', e);
        return null;
    }
}

export async function savePlayerToEntry(entryId: string, player: Player): Promise<boolean> {
    try {
        await db.player.upsert({
            where: { id: player.id },
            update: {
                name: player.name,
                furigana: player.furigana,
                insurance: player.insurance,
                isRepresentative: player.isRepresentative || false,
                wristbandColor: player.wristbandColor || null
            },
            create: {
                id: player.id,
                entryId: entryId,
                name: player.name,
                furigana: player.furigana,
                insurance: player.insurance,
                isRepresentative: player.isRepresentative || false,
                wristbandColor: player.wristbandColor || null
            }
        });
        return true;
    } catch (e) {
        console.error('savePlayerToEntry error:', e);
        return false;
    }
}

// --- Matches ---

export async function saveMatches(matches: Match[]): Promise<boolean> {
    try {
        for (const m of matches) {
            await db.match.upsert({
                where: { id: m.id },
                update: {
                    tournamentId: m.tournamentId,
                    matchNumber: m.matchNumber || null,
                    type: 'match',
                    time: m.time || null,
                    court: m.court || null,
                    round: m.round || null,
                    teamIdA: m.teamIdA || null,
                    teamIdB: m.teamIdB || null,
                    scoreA: m.scoreA ?? null,
                    scoreB: m.scoreB ?? null,
                    winnerId: m.winnerId || null,
                    refereeTeamId: m.refereeTeamId || null,
                    status: m.status
                },
                create: {
                    id: m.id,
                    tournamentId: m.tournamentId,
                    matchNumber: m.matchNumber || null,
                    type: 'match',
                    time: m.time || null,
                    court: m.court || null,
                    round: m.round || null,
                    teamIdA: m.teamIdA || null,
                    teamIdB: m.teamIdB || null,
                    scoreA: m.scoreA ?? null,
                    scoreB: m.scoreB ?? null,
                    winnerId: m.winnerId || null,
                    refereeTeamId: m.refereeTeamId || null,
                    status: m.status
                }
            });
        }
        return true;
    } catch (e) {
        console.error('saveMatches error:', e);
        return false;
    }
}

export async function getMatches(tournamentId: string): Promise<Match[]> {
    try {
        const matches = await db.match.findMany({
            where: { tournamentId }
        });
        return matches.map(m => ({
            id: m.id,
            tournamentId: m.tournamentId,
            teamIdA: m.teamIdA || '',
            teamIdB: m.teamIdB || '',
            scoreA: m.scoreA ?? undefined,
            scoreB: m.scoreB ?? undefined,
            status: m.status as 'scheduled' | 'playing' | 'finished',
            court: m.court || undefined,
            time: m.time || undefined,
            round: m.round || undefined,
            winnerId: m.winnerId || undefined,
            refereeTeamId: m.refereeTeamId || undefined,
            matchNumber: m.matchNumber || undefined
        }));
    } catch (e) {
        console.error('getMatches error:', e);
        return [];
    }
}

// --- Schedule Events ---

export async function saveScheduleEvents(events: ScheduleEvent[]): Promise<boolean> {
    try {
        for (const e of events) {
            await db.event.upsert({
                where: { id: e.id },
                update: {
                    tournamentId: e.tournamentId,
                    type: e.type,
                    title: e.title,
                    startTime: e.startTime,
                    endTime: e.endTime || null,
                    court: e.court || null
                },
                create: {
                    id: e.id,
                    tournamentId: e.tournamentId,
                    type: e.type,
                    title: e.title,
                    startTime: e.startTime,
                    endTime: e.endTime || null,
                    court: e.court || null
                }
            });
        }
        return true;
    } catch (err) {
        console.error('saveScheduleEvents error:', err);
        return false;
    }
}

export async function getScheduleEvents(tournamentId: string): Promise<ScheduleEvent[]> {
    try {
        const events = await db.event.findMany({
            where: { tournamentId }
        });
        return events.map(e => ({
            id: e.id,
            tournamentId: e.tournamentId,
            type: e.type as 'match' | 'ceremony' | 'break' | 'other',
            title: e.title,
            startTime: e.startTime,
            endTime: e.endTime || undefined,
            court: (e.court as 'A' | 'B' | 'ALL') || undefined
        }));
    } catch (e) {
        console.error('getScheduleEvents error:', e);
        return [];
    }
}

// --- Admin Helpers ---

export async function getAllAdminData() {
    try {
        const users = await db.user.findMany();
        const entries = await db.teamEntry.findMany({
            include: { players: true }
        });

        const formattedEntries = entries.map(e => ({
            id: e.id,
            userId: e.userId,
            tournamentId: e.tournamentId,
            teamName: e.teamName,
            teamNameKana: e.teamNameKana,
            teamIntroduction: e.teamIntroduction,
            isBeginnerFriendlyAccepted: e.isBeginnerFriendlyAccepted,
            status: e.status as 'draft' | 'submitted',
            isPaid: e.isPaid,
            group: e.group || undefined,
            createdAt: e.createdAt.toISOString(),
            players: e.players.map(p => ({
                id: p.id,
                name: p.name,
                furigana: p.furigana,
                insurance: p.insurance,
                isRepresentative: p.isRepresentative,
                wristbandColor: p.wristbandColor || undefined
            }))
        }));

        const formattedUsers = users.map(u => ({
            id: u.id,
            email: u.email,
            name: u.name,
            phone: u.phone,
            postalCode: u.postalCode || undefined,
            address: u.address || undefined
        }));

        return { users: formattedUsers, entries: formattedEntries };
    } catch (e) {
        console.error('getAllAdminData error:', e);
        return { users: [], entries: [] };
    }
}

export async function getDoc() {
    return null; // Stub to prevent app breakage if accidentally called directly
}
