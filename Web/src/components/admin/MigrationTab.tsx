'use client';

import React, { useRef, useState } from 'react';
import { Download, Upload, AlertTriangle, CheckCircle, Loader2, Info } from 'lucide-react';
import { getCsrfToken } from '@/lib/admin/csrfHelper';
import { MigrationResult } from '@/app/admin/types';

export default function MigrationTab() {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [importing, setImporting] = useState(false);
    const [exporting, setExporting] = useState(false);
    const [result, setResult] = useState<{ success: boolean; results?: MigrationResult; error?: string } | null>(null);

    // -------------------------------------------------------------------------
    // Export — triggers a file download via the browser
    // -------------------------------------------------------------------------
    const handleExport = async () => {
        setExporting(true);
        setResult(null);
        try {
            const res = await fetch('/api/admin/migration');
            if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                throw new Error(data.error || `Export failed (${res.status})`);
            }
            // Extract filename from Content-Disposition or fall back to a default
            const disposition = res.headers.get('Content-Disposition') ?? '';
            const match = disposition.match(/filename="([^"]+)"/);
            const filename = match ? match[1] : 'runflow-migration.json';

            const blob = await res.blob();
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            a.click();
            URL.revokeObjectURL(url);
        } catch (err: any) {
            setResult({ success: false, error: err.message });
        } finally {
            setExporting(false);
        }
    };

    // -------------------------------------------------------------------------
    // Import — uploads the selected JSON file
    // -------------------------------------------------------------------------
    const handleImport = async (file: File) => {
        setImporting(true);
        setResult(null);
        try {
            const text = await file.text();
            const bundle = JSON.parse(text);

            const res = await fetch('/api/admin/migration', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-Token': getCsrfToken(),
                },
                body: JSON.stringify(bundle),
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || `Import failed (${res.status})`);
            setResult({ success: true, results: data.results });
        } catch (err: any) {
            setResult({ success: false, error: err.message });
        } finally {
            setImporting(false);
            // Reset file input so the same file can be re-selected
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    return (
        <div className="space-y-6">
            {/* Info panel */}
            <div className="bg-accent-blue/10 border border-accent-blue/30 rounded-md p-4 flex gap-3">
                <Info className="w-5 h-5 text-accent-blue shrink-0 mt-0.5" />
                <div className="text-sm text-foreground-secondary space-y-1">
                    <p className="font-semibold">What this does</p>
                    <p>
                        The config bundle captures <strong>AI provider credentials</strong> and{' '}
                        <strong>global AI settings</strong> — the configuration that lives outside
                        the PostgreSQL dump and would otherwise need to be re-entered manually on a
                        new instance.
                    </p>
                    <p className="font-semibold mt-2">Recommended migration workflow</p>
                    <ol className="list-decimal list-inside space-y-1 pl-1">
                        <li>On the old instance: export a config bundle here.</li>
                        <li>On the old instance: create a database backup (Backup &amp; Restore tab).</li>
                        <li>
                            On the new instance: restore the database backup (Backup &amp; Restore
                            tab).
                        </li>
                        <li>On the new instance: import the config bundle here.</li>
                    </ol>
                    <p className="mt-2 text-accent-blue">
                        User accounts, activities, and all other data are in the database backup —
                        not in this bundle.
                    </p>
                </div>
            </div>

            {/* Actions */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Export */}
                <div className="bg-background-secondary border border-line rounded-md p-5 space-y-3">
                    <h3 className="font-semibold text-foreground">Export Config Bundle</h3>
                    <p className="text-sm text-foreground-muted">
                        Downloads a JSON file containing all AI providers (with decrypted API keys)
                        and global AI settings.
                    </p>
                    <button
                        onClick={handleExport}
                        disabled={exporting || importing}
                        className="w-full bg-accent-orange hover:bg-accent-orange/90 text-white px-4 py-2 rounded-md text-sm font-medium transition flex items-center justify-center disabled:opacity-50"
                    >
                        {exporting ? (
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                            <Download className="w-4 h-4 mr-2" />
                        )}
                        {exporting ? 'Exporting…' : 'Export Config Bundle'}
                    </button>
                </div>

                {/* Import */}
                <div className="bg-background-secondary border border-line rounded-md p-5 space-y-3">
                    <h3 className="font-semibold text-foreground">Import Config Bundle</h3>
                    <p className="text-sm text-foreground-muted">
                        Upload a previously exported bundle. Providers will be created or updated;
                        API keys will be re-encrypted with this instance&apos;s key.
                    </p>
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept=".json,application/json"
                        className="hidden"
                        onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleImport(file);
                        }}
                    />
                    <button
                        onClick={() => fileInputRef.current?.click()}
                        disabled={importing || exporting}
                        className="w-full bg-accent-blue hover:bg-accent-blue/90 text-white px-4 py-2 rounded-md text-sm font-medium transition flex items-center justify-center disabled:opacity-50"
                    >
                        {importing ? (
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                            <Upload className="w-4 h-4 mr-2" />
                        )}
                        {importing ? 'Importing…' : 'Import Config Bundle'}
                    </button>
                </div>
            </div>

            {/* Result */}
            {result && (
                <div
                    className={`rounded-md border p-4 space-y-3 ${result.success ? 'bg-positive/10 border-positive/30' : 'bg-negative/10 border-negative/30'}`}
                >
                    <div className="flex items-center gap-2">
                        {result.success ? (
                            <CheckCircle className="w-5 h-5 text-positive" />
                        ) : (
                            <AlertTriangle className="w-5 h-5 text-negative" />
                        )}
                        <span
                            className={`font-semibold text-sm ${result.success ? 'text-positive' : 'text-negative'}`}
                        >
                            {result.success ? 'Import successful' : 'Import failed'}
                        </span>
                    </div>

                    {result.error && (
                        <p className="text-sm text-negative">{result.error}</p>
                    )}

                    {result.results && (
                        <ul className="text-sm text-positive space-y-1 pl-1">
                            <li>
                                Global AI settings:{' '}
                                <span className="font-medium">{result.results.globalAiSettings}</span>
                            </li>
                            <li>
                                Providers created:{' '}
                                <span className="font-medium">{result.results.providersCreated}</span>
                            </li>
                            <li>
                                Providers updated:{' '}
                                <span className="font-medium">{result.results.providersUpdated}</span>
                            </li>
                            {result.results.providersSkipped > 0 && (
                                <li>
                                    Providers skipped:{' '}
                                    <span className="font-medium">{result.results.providersSkipped}</span>
                                </li>
                            )}
                        </ul>
                    )}

                    {result.results?.warnings && result.results.warnings.length > 0 && (
                        <div className="mt-2 space-y-1">
                            {result.results.warnings.map((w, i) => (
                                <div key={i} className="flex gap-2 text-sm text-workout-tempo bg-workout-tempo/10 border border-workout-tempo/30 rounded-sm p-2">
                                    <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-workout-tempo" />
                                    {w}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
