import { TeamEntry, Match } from './types';
import { v4 as uuidv4 } from 'uuid';

export function generateTournamentSchedule(teams: TeamEntry[], tournamentId: string): Match[] {
    const matches: Match[] = [];

    // 1. Group Teams
    const groupedTeams: { [group: string]: TeamEntry[] } = {};
    const ungroupedTeams: TeamEntry[] = [];

    teams.forEach(team => {
        if (team.group) {
            if (!groupedTeams[team.group]) groupedTeams[team.group] = [];
            groupedTeams[team.group].push(team);
        } else {
            ungroupedTeams.push(team);
        }
    });

    // 2. Generate Round Robin for each Group
    Object.entries(groupedTeams).forEach(([groupName, groupTeams]) => {
        // Simple Round Robin
        for (let i = 0; i < groupTeams.length; i++) {
            for (let j = i + 1; j < groupTeams.length; j++) {
                matches.push({
                    id: "m_" + uuidv4(),
                    tournamentId: tournamentId,
                    teamIdA: groupTeams[i].id,
                    teamIdB: groupTeams[j].id,
                    status: 'scheduled',
                    round: 1, // Preliminary
                    time: "10:00", // Default
                    court: "A",     // Default
                    matchNumber: `${groupName}-${matches.length + 1}` // e.g. A-1, A-2... (Wait, this counter is global to loop? No, global to matches array. Suffix might be confusing. Let's make it simpler)
                });
            }
        }
    });

    // 3. Improve Match Numbering (Optional post-processing)
    // Let's re-map matchNumbers to be Group-Index based
    let groupCounters: { [key: string]: number } = {};
    matches.forEach(m => {
        // Find group of teamA
        const teamA = teams.find(t => t.id === m.teamIdA);
        const group = teamA?.group || 'U'; // U for Unknown/Ungrouped

        if (!groupCounters[group]) groupCounters[group] = 0;
        groupCounters[group]++;
        m.matchNumber = `${group}-${groupCounters[group]}`;
    });


    // 4. Handle Ungrouped Teams (Fallback to simple pairing if any)
    if (ungroupedTeams.length > 0) {
        const shuffled = [...ungroupedTeams].sort(() => Math.random() - 0.5);
        for (let i = 0; i < Math.floor(shuffled.length / 2); i++) {
            matches.push({
                id: "m_" + uuidv4(),
                tournamentId: tournamentId,
                teamIdA: shuffled[i * 2].id,
                teamIdB: shuffled[i * 2 + 1].id,
                status: 'scheduled',
                round: 1,
                time: "10:00",
                court: "B",
                matchNumber: `Ex-${i + 1}`
            });
        }
    }

    return matches;
}
