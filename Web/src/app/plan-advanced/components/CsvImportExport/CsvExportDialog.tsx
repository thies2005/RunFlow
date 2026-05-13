'use client';

import { useState, useCallback } from 'react';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { saveAs } from 'file-saver';
import { X, Download, Loader2, FileSpreadsheet } from 'lucide-react';
import { FormatSelector, type CsvFormat } from './FormatSelector';
import { CsvPreview } from './CsvPreview';

interface CsvExportDialogProps {
    goalId: string;
    isOpen: boolean;
    onClose: () => void;
}

type DateRange = 'full' | 'custom';

export function CsvExportDialog({ goalId, isOpen, onClose }: CsvExportDialogProps) {
    const [format, setFormat] = useState<CsvFormat>('runflow');
    const [dateRange, setDateRange] = useState<DateRange>('full');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [previewRows, setPreviewRows] = useState<Array<Record<string, string>>>([]);


    const exportMutation = useMutation({
        mutationFn: async () => {
            const params = new URLSearchParams({ format });
            if (dateRange === 'custom' && startDate) params.set('startDate', startDate);
            if (dateRange === 'custom' && endDate) params.set('endDate', endDate);

            const res = await fetch(`/api/plan-advanced/${goalId}/csv/export?${params.toString()}`);
            if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                throw new Error(data.error || 'Export failed');
            }
            return res.text();
        },
        onSuccess: (csvText) => {
            const parsed = csvText.split('\n').slice(0, 6).filter(Boolean);
            if (parsed.length > 1) {
                const headers = parsed[0].split(',').map((h) => h.replace(/^"|"$/g, '').trim());
                const rows = parsed.slice(1).map((line) => {
                    const values = line.split(',').map((v) => v.replace(/^"|"$/g, '').trim());
                    const row: Record<string, string> = {};
                    headers.forEach((h, i) => {
                        row[h] = values[i] || '';
                    });
                    return row;
                });
                setPreviewRows(rows);
            }
        },
        onError: (err: Error) => {
            toast.error(err.message);
        },
    });

    const downloadMutation = useMutation({
        mutationFn: async () => {
            const params = new URLSearchParams({ format });
            if (dateRange === 'custom' && startDate) params.set('startDate', startDate);
            if (dateRange === 'custom' && endDate) params.set('endDate', endDate);

            const res = await fetch(`/api/plan-advanced/${goalId}/csv/export?${params.toString()}`);
            if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                throw new Error(data.error || 'Download failed');
            }
            return res.text();
        },
        onSuccess: (csvText, _vars, _ctx) => {
            const formatLabels: Record<CsvFormat, string> = {
                trainingpeaks: 'trainingpeaks',
                finalsurge: 'finalsurge',
                runflow: 'runflow',
            };
            const blob = new Blob([csvText], { type: 'text/csv;charset=utf-8' });
            saveAs(blob, `plan-${goalId}-${formatLabels[format]}.csv`);
            toast.success('CSV downloaded');
        },
        onError: (err: Error) => {
            toast.error(err.message);
        },
    });

    const handlePreview = useCallback(() => {
        exportMutation.mutate();
    }, [exportMutation]);

    const handleDownload = useCallback(() => {
        downloadMutation.mutate();
    }, [downloadMutation]);

    const handleClose = () => {
        if (exportMutation.isPending || downloadMutation.isPending) return;
        setPreviewRows([]);
        setDateRange('full');
        setStartDate('');
        setEndDate('');
        setFormat('runflow');
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl w-full max-w-lg mx-4 shadow-2xl max-h-[85vh] flex flex-col">
                <div className="flex items-center justify-between p-4 border-b border-zinc-800 shrink-0">
                    <h2 className="text-sm font-semibold text-zinc-100 flex items-center gap-2">
                        <Download className="w-4 h-4 text-orange-400" />
                        Export CSV
                    </h2>
                    <button
                        type="button"
                        onClick={handleClose}
                        className="p-1 rounded-md text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 transition-colors"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    <FormatSelector value={format} onChange={(f) => setFormat(f)} />

                    <div>
                        <label className="block text-xs font-medium text-zinc-400 mb-2">Date Range</label>
                        <div className="flex gap-2 mb-2">
                            {(['full', 'custom'] as const).map((opt) => (
                                <button
                                    key={opt}
                                    type="button"
                                    onClick={() => setDateRange(opt)}
                                    className={`px-3 py-1.5 rounded-md text-xs font-medium border transition-colors ${
                                        dateRange === opt
                                            ? 'border-zinc-500 bg-zinc-800 text-zinc-100'
                                            : 'border-zinc-800 bg-zinc-900 text-zinc-400 hover:border-zinc-700'
                                    }`}
                                >
                                    {opt === 'full' ? 'Full Plan' : 'Custom Range'}
                                </button>
                            ))}
                        </div>
                        {dateRange === 'custom' && (
                            <div className="grid grid-cols-2 gap-2">
                                <input
                                    type="date"
                                    value={startDate}
                                    onChange={(e) => setStartDate(e.target.value)}
                                    className="bg-zinc-800 border border-zinc-700 rounded-md px-2.5 py-1.5 text-xs text-zinc-300 focus:outline-none focus:ring-1 focus:ring-zinc-600"
                                />
                                <input
                                    type="date"
                                    value={endDate}
                                    onChange={(e) => setEndDate(e.target.value)}
                                    className="bg-zinc-800 border border-zinc-700 rounded-md px-2.5 py-1.5 text-xs text-zinc-300 focus:outline-none focus:ring-1 focus:ring-zinc-600"
                                />
                            </div>
                        )}
                    </div>

                    {exportMutation.isPending && (
                        <div className="flex flex-col items-center py-6 gap-3">
                            <Loader2 className="w-5 h-5 text-orange-400 animate-spin" />
                            <p className="text-xs text-zinc-500">Loading preview...</p>
                        </div>
                    )}

                    {!exportMutation.isPending && previewRows.length > 0 && (
                        <>
                            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-zinc-800/50 border border-zinc-800">
                                <FileSpreadsheet className="w-4 h-4 text-green-400 shrink-0" />
                                <span className="text-xs text-zinc-300">
                                    Preview ready — first {previewRows.length} rows
                                </span>
                            </div>
                            <CsvPreview rows={previewRows} format={format} errors={[]} maxRows={5} />
                        </>
                    )}

                    {!exportMutation.isPending && previewRows.length === 0 && exportMutation.isError && (
                        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/20">
                            <X className="w-4 h-4 text-red-400 shrink-0" />
                            <span className="text-xs text-red-400">{exportMutation.error?.message}</span>
                        </div>
                    )}
                </div>

                <div className="flex items-center justify-between p-4 border-t border-zinc-800 shrink-0">
                    <button
                        type="button"
                        onClick={handleClose}
                        className="px-3 py-1.5 rounded-md text-xs text-zinc-400 hover:text-zinc-200 transition-colors"
                    >
                        Cancel
                    </button>
                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={handlePreview}
                            disabled={exportMutation.isPending}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-zinc-700 text-zinc-200 text-xs font-medium hover:bg-zinc-600 transition-colors disabled:opacity-50"
                        >
                            {exportMutation.isPending && <Loader2 className="w-3 h-3 animate-spin" />}
                            Preview
                        </button>
                        <button
                            type="button"
                            onClick={handleDownload}
                            disabled={downloadMutation.isPending}
                            className="flex items-center gap-1.5 px-4 py-1.5 rounded-md bg-orange-500 text-white text-xs font-medium hover:bg-orange-400 transition-colors disabled:opacity-50"
                        >
                            {downloadMutation.isPending && <Loader2 className="w-3 h-3 animate-spin" />}
                            <Download className="w-3 h-3" />
                            Download
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
