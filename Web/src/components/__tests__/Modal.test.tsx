import React, { useState } from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Modal } from '../ui/Modal';

test('names the dialog, focuses initial control, and restores focus on Escape', async () => {
    const rects = jest.spyOn(HTMLElement.prototype, 'getClientRects').mockReturnValue([{}] as unknown as DOMRectList);
    function Example() {
        const [open, setOpen] = useState(false);
        return (
            <>
                <button onClick={() => setOpen(true)}>Open recovery</button>
                <Modal isOpen={open} onClose={() => setOpen(false)} title="Reset Password">
                    <label htmlFor="email">Email</label>
                    <input id="email" />
                    <button>Send</button>
                </Modal>
            </>
        );
    }
    const user = userEvent.setup();
    render(<Example />);
    const trigger = screen.getByRole('button', { name: 'Open recovery' });
    await user.click(trigger);
    const dialog = screen.getByRole('dialog', { name: 'Reset Password' });
    expect(dialog).toBeInTheDocument();
    expect(dialog).toHaveAttribute('closedby', 'any');
    expect(dialog).not.toHaveAttribute('aria-modal');
    await waitFor(() => expect(screen.getByRole('button', { name: 'Close modal' })).toHaveFocus());
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog', { name: 'Reset Password' })).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
    rects.mockRestore();
});

test('only the top dialog closes on Escape without mutating body overflow', async () => {
    const rects = jest.spyOn(HTMLElement.prototype, 'getClientRects').mockReturnValue([{}] as unknown as DOMRectList);
    function Example() {
        const [outer, setOuter] = useState(false);
        const [inner, setInner] = useState(false);
        return (
            <>
                <button onClick={() => setOuter(true)}>Open outer</button>
                <Modal isOpen={outer} onClose={() => setOuter(false)} title="Outer">
                    <button onClick={() => setInner(true)}>Open inner</button>
                    <Modal isOpen={inner} onClose={() => setInner(false)} title="Inner">
                        <button>Inner action</button>
                    </Modal>
                </Modal>
            </>
        );
    }
    const user = userEvent.setup();
    render(<Example />);
    await user.click(screen.getByRole('button', { name: 'Open outer' }));
    await user.click(screen.getByRole('button', { name: 'Open inner' }));
    expect(document.body.style.overflow).toBe('');
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog', { name: 'Inner' })).not.toBeInTheDocument();
    expect(screen.getByRole('dialog', { name: 'Outer' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Open inner' })).toHaveFocus();
    expect(document.body.style.overflow).toBe('');
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog', { name: 'Outer' })).not.toBeInTheDocument();
    rects.mockRestore();
});
