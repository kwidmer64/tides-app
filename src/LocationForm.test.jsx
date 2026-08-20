import { describe, test, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import LocationForm from './LocationForm.jsx';

describe('LocationForm', () => {
    test('renders a location input and a submit button', () => {
        render(<LocationForm onSubmit={() => {}} />);
        expect(screen.getByPlaceholderText('Enter location')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Go' })).toBeInTheDocument();
    });

    test('submits the trimmed value when the form is submitted', async () => {
        const user = userEvent.setup();
        const handleSubmit = vi.fn();
        render(<LocationForm onSubmit={handleSubmit} />);

        await user.type(screen.getByPlaceholderText('Enter location'), '  Miami, FL  ');
        await user.click(screen.getByRole('button', { name: 'Go' }));

        expect(handleSubmit).toHaveBeenCalledWith('Miami, FL');
    });

    test('does not submit when the input is empty', async () => {
        const user = userEvent.setup();
        const handleSubmit = vi.fn();
        render(<LocationForm onSubmit={handleSubmit} />);

        await user.click(screen.getByRole('button', { name: 'Go' }));

        expect(handleSubmit).not.toHaveBeenCalled();
    });

    test('does not submit when the input is only whitespace', async () => {
        const user = userEvent.setup();
        const handleSubmit = vi.fn();
        render(<LocationForm onSubmit={handleSubmit} />);

        await user.type(screen.getByPlaceholderText('Enter location'), '   ');
        await user.click(screen.getByRole('button', { name: 'Go' }));

        expect(handleSubmit).not.toHaveBeenCalled();
    });

    test('exposes the input by an accessible name, not just a placeholder', () => {
        render(<LocationForm onSubmit={() => {}} />);
        expect(screen.getByRole('textbox', { name: 'Location' })).toBeInTheDocument();
    });

    test('marks the button busy while loading without changing its accessible name', () => {
        render(<LocationForm onSubmit={() => {}} loading />);

        const button = screen.getByRole('button', { name: 'Go' });
        expect(button).toHaveAttribute('aria-busy', 'true');
        expect(button).toHaveAttribute('aria-disabled', 'true');
    });

    test('keeps the button label in the layout flow while loading', () => {
        // taking the label out of flow (sr-only, hidden, unmounted) collapses the
        // button to the spinner's height and makes the whole form jump
        render(<LocationForm onSubmit={() => {}} loading />);

        const label = screen.getByText('Go');
        expect(label).toBeInTheDocument();
        expect(label).not.toHaveClass('sr-only');
    });

    test('does not submit while loading', async () => {
        const user = userEvent.setup();
        const handleSubmit = vi.fn();
        render(<LocationForm onSubmit={handleSubmit} loading />);

        await user.type(screen.getByPlaceholderText('Enter location'), 'Miami, FL');
        await user.click(screen.getByRole('button', { name: 'Go' }));

        expect(handleSubmit).not.toHaveBeenCalled();
    });
});
