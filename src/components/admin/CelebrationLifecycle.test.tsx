import type { ReactNode } from 'react';
import { act, render, screen } from '@testing-library/react';
import BracketFullscreen from './BracketFullscreen';
import { generateBracket } from '@/lib/bracket-generator';

// Test the display lifecycle independently of Framer's interpolation/exit frames.
jest.mock('framer-motion', () => {
    const React = jest.requireActual<typeof import('react')>('react');
    const Motion = React.forwardRef<HTMLDivElement, { children?: ReactNode }>((props, ref) => React.createElement('div', { ref }, props.children));
    Motion.displayName = 'MotionFixture';
    const Wrapper = ({ children }: { children?: ReactNode }) => children;
    return { motion: { div: Motion, span: Motion, button: Motion }, AnimatePresence: Wrapper, LayoutGroup: Wrapper };
});

test('a newly completed match celebrates once and the winner overlay closes after eight seconds', () => {
    jest.useFakeTimers();
    localStorage.clear();
    const initial = generateBracket(8);
    const props = { isOpen: true, readOnly: true, onClose: jest.fn(), entries: [], onWin: jest.fn() };
    const { rerender, unmount } = render(<BracketFullscreen {...props} bracketData={initial} />);
    try {
        const first = initial.initialMatches[0];
        const completed = { ...initial, initialMatches: [{ ...first, status: 'completed' as const, winnerId: 'a', slotA: { ...first.slotA, teamId: 'a', teamName: '赤チーム' } }, ...initial.initialMatches.slice(1)] };
        rerender(<BracketFullscreen {...props} bracketData={completed} />);
        act(() => jest.advanceTimersByTime(20));
        expect(screen.getByText('MATCH WINNER')).toBeInTheDocument();
        act(() => jest.advanceTimersByTime(7900));
        expect(screen.getByText('MATCH WINNER')).toBeInTheDocument();
        act(() => jest.advanceTimersByTime(200));
        expect(screen.queryByText('MATCH WINNER')).not.toBeInTheDocument();
    } finally { unmount(); jest.useRealTimers(); }
});
