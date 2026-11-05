/** @jest-environment jsdom */
import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { EngineGenerateModal } from '../EngineGenerateModal';

describe('plan generation review', () => {
    it('does not mutate the plan when review is opened and cancelled', () => {
        const fetchSpy = jest.fn();
        global.fetch = fetchSpy;
        const onClose = jest.fn();
        render(<EngineGenerateModal isOpen goalId="plan" onClose={onClose} workouts={[]} />);
        fireEvent.click(screen.getByRole('button', { name: 'Review replacement' }));
        expect(screen.getByText('Review plan replacement')).toBeInTheDocument();
        expect(fetchSpy).not.toHaveBeenCalled();
        fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
        expect(onClose).toHaveBeenCalled();
        expect(fetchSpy).not.toHaveBeenCalled();
        delete (global as { fetch?: typeof fetch }).fetch;
    });
});
