import React from 'react';
import { Upload, Plus, Database, Download } from 'lucide-react';
import { csrfHeaders, getCsrfToken } from '@/lib/admin/csrfHelper';
import useConfirmAction from '@/hooks/useConfirmAction';

interface BackupsTabProps {
    backups: any[];
    processing: boolean;
    setProcessing: (val: boolean) => void;
    setActionMessage: (msg: { type: 'success' | 'error', text: string } | null) => void;
    fetchAllData: () => void;
}

export default function BackupsTab({
    backups,
    processing,
    setProcessing,
    setActionMessage,
    fetchAllData
}: BackupsTabProps) {
    const { confirm, ConfirmDialog } = useConfirmAction();

    const handleUploadBackup = async (file: File) => {
        setProcessing(true);
        setActionMessage(null);

        const formData = new FormData();
        formData.append('file', file);

        try {
            const res = await fetch('/api/admin/backups/upload', {
                method: 'POST',
                headers: { 'X-CSRF-Token': getCsrfToken() },
                body: formData,
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Upload failed');

            setActionMessage({ type: 'success', text: `Uploaded: ${data.filename}` });
            fetchAllData();
        } catch (error: any) {
            setActionMessage({ type: 'error', text: error.message });
        } finally {
            setProcessing(false);
        }
    };

    const handleBackupAction = async (action: 'create' | 'restore', backupName?: string) => {
        if (action === 'restore') {
            const isConfirmed = await confirm({
                title: 'Restore Database',
                message: `WARNING: This will overwrite the current database with ${backupName}. This action is destructive. Are you sure?`,
                confirmText: 'Restore',
                isDestructive: true
            });
            if (!isConfirmed) return;
        }

        setProcessing(true);
        setActionMessage(null);

        try {
            const res = await fetch('/api/admin/backups', {
                method: 'POST',
                headers: csrfHeaders(),
                body: JSON.stringify({ action, backupName }),
            });

            const data = await res.json();

            if (!res.ok) throw new Error(data.error || 'Backup action failed');

            setActionMessage({
                type: 'success',
                text: action === 'create'
                    ? `Backup created: ${data.backup.name}`
                    : 'Database restored successfully'
            });

            fetchAllData();
        } catch (error: any) {
            setActionMessage({ type: 'error', text: error.message });
        } finally {
            setProcessing(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center bg-gray-50 p-4 rounded-lg border border-gray-100">
                <div>
                    <h3 className="font-semibold text-gray-800">Manage Backups</h3>
                    <p className="text-sm text-gray-500">Create new snapshots or upload existing backup files.</p>
                </div>
                <div className="flex space-x-2">
                    {/* Hidden file input */}
                    <input
                        type="file"
                        id="backup-upload"
                        className="hidden"
                        accept=".sql,.sql.gz"
                        onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleUploadBackup(file);
                            // Reset input
                            e.target.value = '';
                        }}
                    />
                    <button
                        onClick={() => document.getElementById('backup-upload')?.click()}
                        disabled={processing}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition flex items-center disabled:opacity-50"
                    >
                        <Upload className="w-4 h-4 mr-2" />
                        Upload
                    </button>
                    <button
                        onClick={() => handleBackupAction('create')}
                        disabled={processing}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition flex items-center disabled:opacity-50"
                    >
                        <Plus className="w-4 h-4 mr-2" />
                        Create
                    </button>
                </div>
            </div>

            <div className="space-y-4">
                <h3 className="font-semibold text-gray-800">Available Backups</h3>
                <div className="space-y-2">
                    {backups.map((backup: any) => (
                        <div key={backup.name} className="flex items-center justify-between p-4 bg-white border border-gray-100 rounded-lg hover:border-gray-200 transition">
                            <div className="flex items-center space-x-3">
                                <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                                    <Database className="w-5 h-5" />
                                </div>
                                <div>
                                    <p className="font-medium text-gray-900">{backup.name}</p>
                                    <p className="text-xs text-gray-500">
                                        {new Date(backup.createdAt).toLocaleString()} • {backup.sizeFormatted}
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center space-x-2">
                                <a
                                    href={`/api/admin/backups/${backup.name}`}
                                    className="px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 border border-gray-200 rounded-lg transition flex items-center"
                                    title="Download Backup"
                                >
                                    <Download className="w-3 h-3 mr-1" />
                                    Download
                                </a>
                                <button
                                    onClick={() => handleBackupAction('restore', backup.name)}
                                    disabled={processing}
                                    className="px-3 py-1.5 text-xs font-medium text-orange-600 hover:bg-orange-50 border border-orange-200 rounded-lg transition disabled:opacity-50"
                                >
                                    Restore
                                </button>
                            </div>
                        </div>
                    ))}
                    {backups.length === 0 && (
                        <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-lg">
                            No backups available. Create one to get started.
                        </div>
                    )}
                </div>
            </div>
            <ConfirmDialog />
        </div>
    );
}
