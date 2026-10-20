'use client';

import { useState, useCallback, useRef } from 'react';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { X, FileUp, Loader2, AlertCircle } from 'lucide-react';

interface ZwoImportDialogProps {
    goalId: string;
    isOpen: boolean;
    onClose: () => void;
    onImported: () => void;
}

interface ImportResponse {
    created: number;
    firstDate: string;
    lastDate: string;
    filesProcessed: number;
    rejectedFiles: Array<{ file: string; reason: string }>;
}

interface RejectedFile {
    file: string;
    reason: string;
}

/** Error body of a 413/422 from the import route (see src/lib/apiError.ts). */
interface ImportErrorBody {
    message?: string;
    details?: {
        rejectedFiles?: RejectedFile[];
    };
}

/** Carries the parsed rejectedFiles alongside the server message to the onError handler. */
class ImportFilesError extends Error {
    constructor(
        message: string,
        public readonly rejectedFiles: RejectedFile[], // eslint-disable-line no-unused-vars
    ) {
        super(message);
        this.name = 'ImportFilesError';
    }
}

/** Short day label used across the editor (e.g. "Oct 20"). */
function formatDay(iso: string): string {
    return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function todayIso(): string {
    return new Date().toISOString().split('T')[0];
}

function isImportableFile(file: File): boolean {
    return /\.(zwo|json)$/i.test(file.name);
}

export function ZwoImportDialog({ goalId, isOpen, onClose, onImported }: ZwoImportDialogProps) {
    const [files, setFiles] = useState<File[]>([]);
    const [startDate, setStartDate] = useState(todayIso);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [rejectedFiles, setRejectedFiles] = useState<RejectedFile[]>([]);
    const [isDragOver, setIsDragOver] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const importMutation = useMutation({
        mutationFn: async () => {
            if (files.length === 0) throw new Error('No files selected');
            const formData = new FormData();
            for (const file of files) {
                formData.append('files', file);
            }
            formData.append('startDate', startDate);

            const res = await fetch(`/api/plan-advanced/${goalId}/mywhoosh/import-files`, {
                method: 'POST',
                body: formData,
            });
            if (!res.ok) {
                const data = (await res.json().catch(() => ({}))) as ImportErrorBody;
                throw new ImportFilesError(
                    data.message || 'Failed to import workout files',
                    data.details?.rejectedFiles ?? [],
                );
            }
            return (await res.json()) as ImportResponse;
        },
        onSuccess: (data) => {
            toast.success(
                `${data.created} workout${data.created === 1 ? '' : 's'} imported · ${formatDay(data.firstDate)} – ${formatDay(data.lastDate)}`,
            );
            onImported();
            handleClose();
        },
        onError: (err: Error) => {
            // Surface 413/422 inline and keep the dialog open so the user can adjust.
            setErrorMessage(err.message);
            setRejectedFiles(err instanceof ImportFilesError ? err.rejectedFiles : []);
        },
    });

    const handleFiles = useCallback((selected: FileList | null) => {
        if (!selected || selected.length === 0) return;
        const valid: File[] = [];
        let skipped = 0;
        for (const file of Array.from(selected)) {
            if (isImportableFile(file)) {
                valid.push(file);
            } else {
                skipped += 1;
            }
        }
        if (skipped > 0) {
            toast.error(`Skipped ${skipped} file${skipped === 1 ? '' : 's'} — only .zwo and .json files are supported`);
        }
        if (valid.length > 0) {
            setFiles(valid);
            setErrorMessage(null);
            setRejectedFiles([]);
        }
    }, []);

    const handleDrop = useCallback(
        (e: React.DragEvent) => {
            e.preventDefault();
            setIsDragOver(false);
            handleFiles(e.dataTransfer.files);
        },
        [handleFiles],
    );

    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragOver(true);
    }, []);

    const handleDragLeave = useCallback(() => {
        setIsDragOver(false);
    }, []);

    const clearFiles = () => {
        setFiles([]);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const handleClose = () => {
        if (importMutation.isPending) return;
        clearFiles();
        setErrorMessage(null);
        setRejectedFiles([]);
        setStartDate(todayIso());
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
            <div className="bg-background-secondary border border-glass-border rounded-md w-full max-w-lg mx-4 max-h-[85vh] flex flex-col">
                <div className="flex items-center justify-between p-4 border-b border-glass-border shrink-0">
                    <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
                        <FileUp className="w-4 h-4 text-accent-orange" />
                        Import .zwo / MyWhoosh files
                    </h2>
                    <button
                        type="button"
                        onClick={handleClose}
                        className="p-1 rounded-md text-foreground-muted hover:text-foreground-secondary hover:bg-background-tertiary transition-colors"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    <div
                        onDrop={handleDrop}
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onClick={() => fileInputRef.current?.click()}
                        className={`border-2 border-dashed rounded-md p-8 text-center cursor-pointer transition-colors ${
                            isDragOver
                                ? 'border-accent-orange/50 bg-accent-orange/5'
                                : 'border-foreground/20 bg-background-secondary hover:border-foreground/30 hover:bg-background-tertiary'
                        }`}
                    >
                        <FileUp className={`w-8 h-8 mx-auto mb-3 ${isDragOver ? 'text-accent-orange' : 'text-foreground-muted'}`} />
                        <p className="text-sm text-foreground-secondary font-medium">
                            Drop your workout files here
                        </p>
                        <p className="text-xs text-foreground-muted mt-1">
                            or click to browse
                        </p>
                        <p className="text-[10px] text-foreground-muted mt-2">
                            Supports MyWhoosh .json exports and Zwift .zwo files (parsed locally — nothing is uploaded to third parties)
                        </p>
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept=".zwo,.json"
                            multiple
                            className="hidden"
                            onChange={(e) => handleFiles(e.target.files)}
                        />
                    </div>

                    {files.length > 0 && (
                        <div className="flex items-center justify-between gap-2 px-3 py-2 rounded-md bg-background-tertiary border border-glass-border">
                            <div className="flex items-center gap-2 min-w-0">
                                <FileUp className="w-4 h-4 text-positive shrink-0" />
                                <div className="min-w-0">
                                    <p className="text-xs text-foreground-secondary font-medium">
                                        {files.length} file{files.length === 1 ? '' : 's'} selected
                                    </p>
                                    <p className="text-[10px] text-foreground-muted truncate">
                                        {files.map((f) => f.name).join(', ')}
                                    </p>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={clearFiles}
                                className="text-xs text-foreground-muted hover:text-foreground-secondary transition-colors shrink-0"
                            >
                                Change files
                            </button>
                        </div>
                    )}

                    <div>
                        <label htmlFor="zwo-import-start-date" className="block text-xs font-medium text-foreground-secondary mb-2">
                            Start Date
                        </label>
                        <input
                            id="zwo-import-start-date"
                            type="date"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                            className="bg-background-tertiary border border-foreground/20 rounded-md px-2.5 py-1.5 text-xs text-foreground-secondary focus:outline-none focus:ring-1 focus:ring-foreground-muted"
                        />
                        <p className="text-[10px] text-foreground-muted mt-1.5">
                            Workouts are scheduled on consecutive days starting from this date.
                        </p>
                    </div>

                    {importMutation.isPending && (
                        <div className="flex flex-col items-center py-4 gap-3">
                            <Loader2 className="w-6 h-6 text-accent-orange animate-spin" />
                            <p className="text-xs text-foreground-muted">Importing workouts...</p>
                        </div>
                    )}

                    {!importMutation.isPending && errorMessage && (
                        <div className="flex items-start gap-2 px-3 py-2 rounded-md bg-negative/10 border border-negative/30">
                            <AlertCircle className="w-4 h-4 text-negative shrink-0 mt-0.5" />
                            <div className="flex-1 min-w-0">
                                <p className="text-xs text-negative">{errorMessage}</p>
                                {rejectedFiles.length > 0 && (
                                    <ul className="mt-1 space-y-0.5">
                                        {rejectedFiles.map((rejected) => (
                                            <li key={rejected.file} className="text-[10px] text-negative/80 truncate">
                                                {rejected.file} — {rejected.reason}
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                <div className="flex items-center justify-between p-4 border-t border-glass-border shrink-0">
                    <button
                        type="button"
                        onClick={handleClose}
                        className="px-3 py-1.5 rounded-md text-xs text-foreground-secondary hover:text-foreground transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={() => importMutation.mutate()}
                        disabled={files.length === 0 || !startDate || importMutation.isPending}
                        className="flex items-center gap-1.5 px-4 py-1.5 rounded-md bg-accent-orange text-white text-xs font-medium hover:bg-accent-orange/85 transition-colors disabled:opacity-50"
                    >
                        {importMutation.isPending && <Loader2 className="w-3 h-3 animate-spin" />}
                        {files.length > 0 ? `Import (${files.length})` : 'Import'}
                    </button>
                </div>
            </div>
        </div>
    );
}
