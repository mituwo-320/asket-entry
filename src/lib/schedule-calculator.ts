import { Match, ScheduleEvent } from './types';

interface ScheduleItem {
    type: 'match' | 'event';
    data: Match | ScheduleEvent;
    startTime: string; // HH:MM
    durationMinutes: number;
}

export function calculateSchedule(
    items: (Match | ScheduleEvent)[],
    startTimeStr: string,
    matchDurationMinutes: number,
    intervalMinutes: number,
    courts: string[] = ['A', 'B']
): (Match | ScheduleEvent)[] {
    // 1. Separate fixed events and movable matches
    const fixedEvents: ScheduleEvent[] = [];
    const movableMatches: Match[] = [];

    items.forEach(item => {
        if ('type' in item) { // Is ScheduleEvent
            if (item.startTime) {
                fixedEvents.push(item);
            }
        } else {
            movableMatches.push(item);
        }
    });

    // Sort fixed events by time
    fixedEvents.sort((a, b) => a.startTime.localeCompare(b.startTime));

    // Sort matches by matchNumber if available, or keep existing order
    // For now, we assume the input list order is the desired order
    // If 'matchNumber' exists, maybe sort by that? 
    // Let's assume input order is priority for "Drag and Drop" reordering

    let currentTime = parseTime(startTimeStr);
    const updatedItems: (Match | ScheduleEvent)[] = [...fixedEvents]; // start with fixed events

    // We need to track court availability?
    // Simplified logic: Just sequence them based on time.
    // If 2 courts, can we run 2 matches at once?
    // "Auto Schedule" usually implies assigning times.
    // Logic:
    // Iterate through matches. Find next available slot on any court.
    // But Drag & Drop implies a single timeline order?
    // The user's image shows matches on A and B happening simultaneously.
    // "10:25 A-1, 10:25 B-1"

    // Strategy:
    // Group matches into "Rounds" or "Slots". 
    // If we have 2 courts, we take 2 matches, assign them start_time X.
    // Then X + duration + interval -> Next start time.

    // Let's try to assign times to matches in order.
    // Match 1 -> Court A, Time T
    // Match 2 -> Court B, Time T
    // Match 3 -> Court A, Time T + D
    // Match 4 -> Court B, Time T + D

    let matchIndex = 0;

    // We iterate until all matches are scheduled
    while (matchIndex < movableMatches.length) {
        // Check if current time overlaps with any fixed event (on ALL courts or specific court)
        // For simplicity, if there is a "Break" or "Ceremony" (ALL courts), we skip that time.

        const timeStr = formatTime(currentTime);
        const collidingEvent = fixedEvents.find(e =>
            isTimeOverlap(timeStr, addMinutes(timeStr, matchDurationMinutes), e.startTime, e.endTime || addMinutes(e.startTime, 20))
            && e.court === 'ALL'
        );

        if (collidingEvent) {
            // Jump to end of event
            currentTime = parseTime(collidingEvent.endTime || addMinutes(collidingEvent.startTime, 20));
            continue;
        }

        // Assign matches to available courts at currentTime
        for (const court of courts) {
            if (matchIndex >= movableMatches.length) break;

            const match = movableMatches[matchIndex];

            // Assign
            const updatedMatch = {
                ...match,
                court: court,
                time: timeStr
            };

            updatedItems.push(updatedMatch);
            matchIndex++;
        }

        // Advance time
        currentTime += matchDurationMinutes + intervalMinutes;
    }

    return updatedItems;
}

// Helpers
function parseTime(timeStr: string): number {
    const [h, m] = timeStr.split(':').map(Number);
    return h * 60 + m;
}

function formatTime(minutes: number): string {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
}

function addMinutes(timeStr: string, minutes: number): string {
    return formatTime(parseTime(timeStr) + minutes);
}

function isTimeOverlap(start1: string, end1: string, start2: string, end2: string): boolean {
    const s1 = parseTime(start1);
    const e1 = parseTime(end1);
    const s2 = parseTime(start2);
    const e2 = parseTime(end2);
    return Math.max(s1, s2) < Math.min(e1, e2);
}
