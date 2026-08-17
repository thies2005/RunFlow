'use client';

import { useState, useCallback, useRef } from 'react';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import Papa from 'papaparse';
import { X, Upload, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { FormatSelector, type CsvFormat } from './FormatSelector';
import { CsvPreview } from './CsvPreview';

interface CsvImportDialogProps {
    goalId: string;
    isOpen: boolean;
    onClose: () => void;
    onImported: () => void;
}

interface PreviewResponse {
    previewId: string;
    totalRows: number;
    validRows: number;
    invalidRows: number;
    errors: Array<{ row: number; message: string }>;
    skipped: number;
    sampleWorkouts: Array<Record<string, string>>;
}

export function CsvImportDialog({ goalId, isOpen, onClose, onImported }: CsvImportDialogProps) {
    const [format, setFormat] = useState<CsvFormat>('runflow');
    const [autoDetected, setAutoDetected] = useState<string | undefined>();
    const [file, setFile] = useState<File | null>(null);
    const [parsedRows, setParsedRows] = useState<Array<Record<string, string>>>([]);
    const [parseErrors, setParseErrors] = useState<Array<{ row: number; message: string }>>([]);
    const [isDragOver, setIsDragOver] = useState(false);
    const [step, setStep] = useState<'upload' | 'preview' | 'confirming'>('upload');
    const [previewData, setPreviewData] = useState<PreviewResponse | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const previewMutation = useMutation({
        mutationFn: async () => {
            if (!file) throw new Error('No file selected');
            const formData = new FormData();
            formData.append('file', file);
            formData.append('formatHint', format);

            const res = await fetch(`/api/plan-advanced/${goalId}/csv/import`, {
                method: 'POST',
                body: formData,
            });
            if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                throw new Error(data.error || 'Failed to parse CSV');
            }
            return res.json() as Promise<PreviewResponse>;
        },
        onSuccess: (data) => {
            setPreviewData(data);
            setStep('preview');
        },
        onError: (err: Error) => {
            toast.error(err.message);
        },
    });

    const confirmMutation = useMutation({
        mutationFn: async () => {
            if (!previewData?.previewId) throw new Error('No preview data');
            const res = await fetch(`/api/plan-advanced/${goalId}/csv/import`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ previewId: previewData.previewId, confirm: true }),
            });
            if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                throw new Error(data.error || 'Failed to import');
            }
            return res.json();
        },
        onSuccess: (data) => {
            toast.success(`Imported ${data.created} workouts`);
            onImported();
            handleClose();
        },
        onError: (err: Error) => {
            toast.error(err.message);
            setStep('preview');
        },
    });

    const handleFile = useCallback((selectedFile: File) => {
        if (!selectedFile.name.endsWith('.csv')) {
            toast.error('Please select a .csv file');
            return;
        }

        setFile(selectedFile);

        Papa.parse(selectedFile, {
            header: true,
            skipEmptyLines: true,
            preview: 10,
            complete: (results: Papa.ParseResult<Record<string, string>>) => {
                const rows = results.data as Array<Record<string, string>>;
                setParsedRows(rows);

                if (results.meta.fields && results.meta.fields.length > 0) {
                    const headers = results.meta.fields;
                    const normalized = headers.map((h: string) => h.trim().toLowerCase().replace(/[^a-z0-9]/g, ''));

                    if (normalized.includes('date') && normalized.includes('title') && normalized.includes('totaldistance')) {
                        setAutoDetected('trainingpeaks');
                        setFormat('trainingpeaks');
                    } else if (normalized.includes('date') && normalized.includes('activitytype')) {
                        setAutoDetected('finalsurge');
                        setFormat('finalsurge');
                    } else if (normalized.includes('date') && normalized.includes('workouttype')) {
                        setAutoDetected('runflow');
                        setFormat('runflow');
                    }
                }

                const errors: Array<{ row: number; message: string }> = [];
                results.errors.forEach((err: Papa.ParseError) => {
                    errors.push({ row: err.row ?? 0, message: err.message });
                });
                setParseErrors(errors);
                setStep('preview');
            },
            error: (err: Error) => {
                toast.error(`Failed to parse CSV: ${err.message}`);
            },
        });
    }, []);

    const handleDrop = useCallback(
        (e: React.DragEvent) => {
            e.preventDefault();
            setIsDragOver(false);
            const droppedFile = e.dataTransfer.files[0];
            if (droppedFile) handleFile(droppedFile);
        },
        [handleFile],
    );

    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragOver(true);
    }, []);

    const handleDragLeave = useCallback(() => {
        setIsDragOver(false);
    }, []);

    const handleClose = () => {
        if (previewMutation.isPending || confirmMutation.isPending) return;
        setFile(null);
        setParsedRows([]);
        setParseErrors([]);
        setPreviewData(null);
        setStep('upload');
        setAutoDetected(undefined);
        setFormat('runflow');
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <div className="bg-background-secondary border border-glass-border rounded-xl w-full max-w-lg mx-4 shadow-2xl max-h-[85vh] flex flex-col">
                <div className="flex items-center justify-between p-4 border-b border-glass-border shrink-0">
                    <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
                        <Upload className="w-4 h-4 text-orange-400" />
                        Import CSV
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
                    {step === 'upload' && (
                        <>
                            <div
                                onDrop={handleDrop}
                                onDragOver={handleDragOver}
                                onDragLeave={handleDragLeave}
                                onClick={() => fileInputRef.current?.click()}
                                className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
                                    isDragOver
                                        ? 'border-orange-500/50 bg-orange-500/5'
                                        : 'border-foreground/20 bg-background-secondary/50 hover:border-foreground/30 hover:bg-background-tertiary/50'
                                }`}
                            >
                                <Upload className={`w-8 h-8 mx-auto mb-3 ${isDragOver ? 'text-orange-400' : 'text-foreground-muted'}`} />
                                <p className="text-sm text-foreground-secondary font-medium">
                                    Drop your CSV file here
                                </p>
                                <p className="text-xs text-foreground-muted mt-1">
                                    or click to browse
                                </p>
                                <p className="text-[10px] text-foreground-muted mt-2">
                                    Supports .csv files from TrainingPeaks, FinalSurge, or RunFlow
                                </p>
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept=".csv"
                                    className="hidden"
                                    onChange={(e) => {
                                        const f = e.target.files?.[0];
                                        if (f) handleFile(f);
                                    }}
                                />
                            </div>

                            <FormatSelector value={format} onChange={(f) => setFormat(f)} autoDetected={autoDetected} />
                        </>
                    )}

                    {(step === 'preview' || step === 'confirming') && (
                        <>
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-xs text-foreground-secondary font-medium">{file?.name}</p>
                                    <p className="text-[10px] text-foreground-muted">{(file?.size ? (file.size / 1024).toFixed(1) : 0)} KB</p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setStep('upload');
                                        setFile(null);
                                        setParsedRows([]);
                                        setParseErrors([]);
                                        setPreviewData(null);
                                    }}
                                    className="text-xs text-foreground-muted hover:text-foreground-secondary transition-colors"
                                >
                                    Change file
                                </button>
                            </div>

                            <FormatSelector value={format} onChange={(f) => setFormat(f)} autoDetected={autoDetected} />

                            {previewMutation.isPending && (
                                <div className="flex flex-col items-center py-8 gap-3">
                                    <Loader2 className="w-6 h-6 text-orange-400 animate-spin" />
                                    <p className="text-xs text-foreground-muted">Parsing CSV...</p>
                                </div>
                            )}

                            {!previewMutation.isPending && !previewData && (
                                <CsvPreview
                                    rows={parsedRows}
                                    format={format}
                                    errors={parseErrors}
                                />
                            )}

                            {!previewMutation.isPending && previewData && (
                                <>
                                    <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-background-tertiary/50 border border-glass-border">
                                        <CheckCircle2 className="w-4 h-4 text-green-400 shrink-0" />
                                        <div className="flex-1 min-w-0">
                                            <p className="text-xs text-foreground-secondary">
                                                {previewData.validRows} valid workouts found
                                            </p>
                                            {previewData.invalidRows > 0 && (
                                                <p className="text-[10px] text-amber-400">
                                                    {previewData.invalidRows} rows skipped or had errors
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                    <CsvPreview
                                        rows={previewData.sampleWorkouts}
                                        format={format}
                                        errors={previewData.errors}
                                    />
                                </>
                            )}

                            {step === 'confirming' && (
                                <div className="flex flex-col items-center py-4 gap-3">
                                    <Loader2 className="w-6 h-6 text-orange-400 animate-spin" />
                                    <p className="text-xs text-foreground-muted">Importing workouts...</p>
                                </div>
                            )}
                        </>
                    )}
                </div>

                <div className="flex items-center justify-between p-4 border-t border-glass-border shrink-0">
                    {step === 'upload' ? (
                        <button
                            type="button"
                            onClick={handleClose}
                            className="px-3 py-1.5 rounded-md text-xs text-foreground-secondary hover:text-foreground transition-colors"
                        >
                            Cancel
                        </button>
                    ) : (
                        <button
                            type="button"
                            onClick={() => {
                                setStep('upload');
                                setFile(null);
                                setParsedRows([]);
                                setParseErrors([]);
                                setPreviewData(null);
                            }}
                            className="px-3 py-1.5 rounded-md text-xs text-foreground-secondary hover:text-foreground transition-colors"
                            disabled={previewMutation.isPending || confirmMutation.isPending}
                        >
                            Back
                        </button>
                    )}

                    {step === 'upload' ? null : step === 'preview' ? (
                        <div className="flex items-center gap-2">
                            {!previewData && (
                                <button
                                    type="button"
                                    onClick={() => previewMutation.mutate()}
                                    disabled={previewMutation.isPending}
                                    className="flex items-center gap-1.5 px-4 py-1.5 rounded-md bg-foreground/15 text-foreground text-xs font-medium hover:bg-foreground/20 transition-colors disabled:opacity-50"
                                >
                                    {previewMutation.isPending && <Loader2 className="w-3 h-3 animate-spin" />}
                                    Parse Server-Side
                                </button>
                            )}
                            {previewData && (
                                <button
                                    type="button"
                                    onClick={() => {
                                        setStep('confirming');
                                        confirmMutation.mutate();
                                    }}
                                    disabled={confirmMutation.isPending}
                                    className="flex items-center gap-1.5 px-4 py-1.5 rounded-md bg-orange-500 text-white text-xs font-medium hover:bg-orange-400 transition-colors disabled:opacity-50"
                                >
                                    {confirmMutation.isPending && <Loader2 className="w-3 h-3 animate-spin" />}
                                    Confirm Import ({previewData.validRows})
                                </button>
                            )}
                        </div>
                    ) : null}
                </div>
            </div>
        </div>
    );
}
