import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import { Input } from '../ui/Input';
import { Textarea } from '../ui/Textarea';
import { Table, TableBody, TableCell, TableRow } from '../ui/table';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';

describe('Phase 2 Modern Web Primitives', () => {
    it('Button default uses primary-button tokens and Badge uses rounded-[3px]', () => {
        render(
            <>
                <Button>Save</Button>
                <Badge>Tempo</Badge>
            </>
        );
        const btn = screen.getByRole('button', { name: 'Save' });
        expect(btn.className).toContain('bg-[var(--primary-button-bg)]');
        expect(btn.className).toContain('text-[var(--primary-button-fg)]');

        const badge = screen.getByText('Tempo');
        expect(badge.className).toContain('rounded-[3px]');
        expect(badge.className).not.toContain('rounded-full');
    });

    it('ConfirmDialog renders native dialog with closedby="any" and autoFocuses Cancel', async () => {
        const onOpenChange = jest.fn();
        const onConfirm = jest.fn();
        render(
            <ConfirmDialog
                open={true}
                onOpenChange={onOpenChange}
                title="Delete workout?"
                onConfirm={onConfirm}
            />
        );
        const dialog = screen.getByRole('dialog', { name: 'Delete workout?' });
        expect(dialog).toHaveAttribute('closedby', 'any');
        expect(dialog).not.toHaveAttribute('aria-modal');
        expect(screen.getByRole('button', { name: 'Cancel' })).toHaveFocus();

        const user = userEvent.setup();
        await user.keyboard('{Escape}');
        expect(onOpenChange).toHaveBeenCalledWith(false);
    });

    it('ConfirmDialog disables light-dismiss and Escape when busy', async () => {
        const onOpenChange = jest.fn();
        const onConfirm = jest.fn();
        render(
            <ConfirmDialog
                open={true}
                onOpenChange={onOpenChange}
                title="Deleting..."
                onConfirm={onConfirm}
                busy={true}
            />
        );
        const dialog = screen.getByRole('dialog', { name: 'Deleting...' });
        expect(dialog).toHaveAttribute('closedby', 'none');
        expect(screen.getByRole('button', { name: 'Cancel' })).toBeDisabled();
        expect(screen.getByRole('button', { name: 'Delete' })).toBeDisabled();

        const user = userEvent.setup();
        await user.keyboard('{Escape}');
        expect(onOpenChange).not.toHaveBeenCalled();
    });

    it('Input and Textarea use unique useId(), wire aria-invalid/aria-describedby, and enforce text-base sm:text-sm', () => {
        render(
            <>
                <Input label="Goal Name" error="Required field" />
                <Textarea label="Notes" helperText="Optional training notes" />
            </>
        );

        const input = screen.getByLabelText('Goal Name');
        expect(input).toHaveAttribute('aria-invalid', 'true');
        const inputDescribedBy = input.getAttribute('aria-describedby');
        expect(inputDescribedBy).toBeTruthy();
        expect(document.getElementById(inputDescribedBy!)).toHaveTextContent('Required field');
        expect(input.className).toContain('text-base');
        expect(input.className).toContain('sm:text-sm');

        const textarea = screen.getByLabelText('Notes');
        expect(textarea).not.toHaveAttribute('aria-invalid');
        const textareaDescribedBy = textarea.getAttribute('aria-describedby');
        expect(textareaDescribedBy).toBeTruthy();
        expect(document.getElementById(textareaDescribedBy!)).toHaveTextContent('Optional training notes');
        expect(textarea.className).toContain('text-base');
        expect(textarea.className).toContain('sm:text-sm');
        expect(textarea.className).toContain('[field-sizing:content]');
    });

    it('Table wrapper has @container and keyboard-accessible scroll region', () => {
        render(
            <Table containerAriaLabel="Splits table">
                <TableBody>
                    <TableRow>
                        <TableCell>1 km</TableCell>
                    </TableRow>
                </TableBody>
            </Table>
        );
        const region = screen.getByRole('region', { name: 'Splits table' });
        expect(region).toHaveAttribute('tabindex', '0');
        expect(region.className).toContain('@container');
    });
});
