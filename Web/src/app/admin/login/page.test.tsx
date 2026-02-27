import React from 'react';
import '@testing-library/jest-dom';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import AdminLoginPage from './page';
import { useRouter } from 'next/navigation';

// Mock next/navigation
jest.mock('next/navigation', () => ({
    useRouter: jest.fn(),
}));

// Mock fetch
global.fetch = jest.fn();

describe('AdminLoginPage', () => {
    const mockPush = jest.fn();

    beforeEach(() => {
        mockPush.mockClear();
        (useRouter as jest.Mock).mockReturnValue({
            push: mockPush,
        });
        (global.fetch as jest.Mock).mockClear();
    });

    it('renders login form correctly', () => {
        render(<AdminLoginPage />);
        expect(screen.getByText('Admin Portal')).toBeInTheDocument();
        expect(screen.getByPlaceholderText('Enter admin username')).toBeInTheDocument();
        expect(screen.getByPlaceholderText('••••••••••••')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /access dashboard/i })).toBeInTheDocument();
    });

    it('handles successful login', async () => {
        (global.fetch as jest.Mock).mockResolvedValueOnce({
            ok: true,
            json: async () => ({ success: true }),
        });

        render(<AdminLoginPage />);

        fireEvent.change(screen.getByPlaceholderText('Enter admin username'), {
            target: { value: 'admin' },
        });
        fireEvent.change(screen.getByPlaceholderText('••••••••••••'), {
            target: { value: 'password' },
        });

        fireEvent.click(screen.getByRole('button', { name: /access dashboard/i }));

        await waitFor(() => {
            expect(global.fetch).toHaveBeenCalledWith('/api/admin/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username: 'admin', password: 'password' }),
            });
            expect(mockPush).toHaveBeenCalledWith('/admin');
        });
    });

    it('handles login failure from API', async () => {
        (global.fetch as jest.Mock).mockResolvedValueOnce({
            ok: false,
            json: async () => ({ error: 'Invalid credentials' }),
        });

        render(<AdminLoginPage />);

        fireEvent.change(screen.getByPlaceholderText('Enter admin username'), {
            target: { value: 'admin' },
        });
        fireEvent.change(screen.getByPlaceholderText('••••••••••••'), {
            target: { value: 'wrongpassword' },
        });

        fireEvent.click(screen.getByRole('button', { name: /access dashboard/i }));

        await waitFor(() => {
            expect(screen.getByText('Invalid credentials')).toBeInTheDocument();
            expect(mockPush).not.toHaveBeenCalled();
        });
    });

    it('handles network error', async () => {
        (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

        render(<AdminLoginPage />);

        fireEvent.change(screen.getByPlaceholderText('Enter admin username'), {
            target: { value: 'admin' },
        });
        fireEvent.change(screen.getByPlaceholderText('••••••••••••'), {
            target: { value: 'password' },
        });

        fireEvent.click(screen.getByRole('button', { name: /access dashboard/i }));

        await waitFor(() => {
            expect(screen.getByText('Network error')).toBeInTheDocument();
            expect(mockPush).not.toHaveBeenCalled();
        });
    });
});
