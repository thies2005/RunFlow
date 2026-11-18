'use client';

import { useState } from 'react';
import { Download } from 'lucide-react';

export function ExportDataButton() {
    const [isExporting, setIsExporting] = useState(false);
    const [message, setMessage] = useState('');

    const handleExportData = async () => {
        setIsExporting(true);
        setMessage('');
        try {
            const res = await fetch('/api/user/export');
            if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                throw new Error(data.error || 'Failed to export data');
            }

            const disposition = res.headers.get('Content-Disposition');
            let filename = `runflow-data-export-${new Date().toISOString().split('T')[0]}.json`;
            if (disposition && disposition.indexOf('attachment') !== -1) {
                const filenameRegex = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/;
                const matches = filenameRegex.exec(disposition);
                if (matches != null && matches[1]) {
                    filename = matches[1].replace(/['"]/g, '');
                }
            }

            const blob = await res.blob();
            const windowUrl = window.URL || window.webkitURL;
            const url = windowUrl.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            windowUrl.revokeObjectURL(url);
            document.body.removeChild(a);

            setMessage('Data exported successfully!');
        } catch (error: any) {
            setMessage(`Export failed: ${error.message}`);
        } finally {
            setIsExporting(false);
        }
    };

    return (
        <>
            <button
                onClick={handleExportData}
                disabled={isExporting}
                className="w-full flex items-center gap-3 px-3.5 py-3 bg-surface rounded-md transition-colors hover:bg-surface-hover"
            >
                <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-positive/15">
                    <Download className={`w-4 h-4 text-positive ${isExporting ? 'animate-spin' : ''}`} />
                </div>
                <div className="flex-1 text-left">
                    <div className="text-sm font-medium text-foreground">Export Data</div>
                    <div className="text-[11px] text-foreground-muted">{isExporting ? 'Generating export...' : 'Download all your data as JSON'}</div>
                </div>
            </button>
            {message && (
                <p className={`text-xs px-3.5 ${message.includes('failed') ? 'text-negative' : 'text-positive'}`}>{message}</p>
            )}
        </>
    );
}
