import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Button } from './Button';

describe('Button component', () => {
    it('renders correctly with default props', () => {
        render(<Button>Click Me</Button>);
        const button = screen.getByRole('button', { name: /click me/i });
        expect(button).toBeInTheDocument();
        expect(button).toHaveClass('inline-flex', 'items-center', 'justify-center');
    });

    it('applies the primary variant globally by default', () => {
        render(<Button>Primary</Button>);
        const button = screen.getByRole('button', { name: /primary/i });
        expect(button).toHaveClass('bg-gradient-to-r', 'from-indigo-500');
    });

    it('handles click events', async () => {
        const handleClick = jest.fn();
        render(<Button onClick={handleClick}>Click Me</Button>);

        const button = screen.getByRole('button', { name: /click me/i });
        await userEvent.click(button);

        expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it('is disabled when disabled prop is true', () => {
        render(<Button disabled>Disabled</Button>);
        const button = screen.getByRole('button', { name: /disabled/i });
        expect(button).toBeDisabled();
    });
});
