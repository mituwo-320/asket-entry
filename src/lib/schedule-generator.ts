import { TeamEntry, Match } from './types';
import { v4 as uuidv4 } from 'uuid';

export function generateTournamentSchedule(
    teams: TeamEntry[],
    tournamentId: string,
    config?: {
        startTime: string;
        courts: number;
        matchDuration: number;
        interval: number;
        slotsPerCourt: number; // Added new config parameter
    }
): Match[] {
    const matches: Match[] = [];

    if (!config) return matches;

    const { startTime, courts, matchDuration, interval, slotsPerCourt } = config;
    let currentTime = parseTime(startTime);
    const courtNames = ['A', 'B'];

    // Generate empty slots for each time period
    for (let i = 0; i < slotsPerCourt; i++) {
        const timeString = formatTime(currentTime);

        // Generate a match for each court in this time slot
        for (let c = 0; c < courts; c++) {
            const courtName = courtNames[c] || `Court ${c + 1}`;
            matches.push({
                id: "m_" + uuidv4(),
                tournamentId: tournamentId,
                teamIdA: "", // Empty!
                teamIdB: "", // Empty!
                status: 'scheduled',
                time: timeString,
                court: courtName,
                matchNumber: `${courtName}-${i + 1}`
            });
        }

        // Advance time for the next slot
        currentTime += matchDuration + interval;
    }


    return matches;
}

// Helper to convert "10:00" to minutes since midnight
function parseTime(timeStr: string): number {
    const [hours, mins] = timeStr.split(':').map(Number);
    return (hours * 60) + (mins || 0);
}

// Helper to convert minutes to "HH:MM"
function formatTime(minutes: number): string {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
}
