'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
    Plus,
    Search,
    Pencil,
    Trash2,
    RefreshCw,
    Loader2,
    AlertTriangle,
    CheckCircle,
    ListChecks,
} from 'lucide-react';
import { csrfHeaders } from '@/lib/admin/csrfHelper';
import { Modal } from '@/components/ui/Modal';
import useConfirmAction from '@/hooks/useConfirmAction';

const WORKOUT_TYPES = [
    'EASY',
    'LONG_RUN',
    'TEMPO',
    'INTERVALS',
    'FARTLEK',
    'REPETITIONS',
    'RECOVERY',
    'RACE',
    'REST',
    'CROSS_TRAIN',
    'RIDE',
    'SWIM',
    'STRENGTH',
    'OTHER',
    'BRICK',
    'OPEN_WATER_SWIM',
    'LONG_RIDE',
    'RIDE_INTERVALS',
    'SWIM_DRILL',
    'TRANSITION_PRACTICE',
    'DOUBLE_DAY',
] as const;

const SPORTS = ['RUN', 'BIKE', 'SWIM', 'STRENGTH', 'OTHER'] as const;

const CATEGORIES = ['speed', 'endurance', 'recovery', 'threshold', 'long', 'strength'] as const;

const DIFFICULTIES = ['beginner', 'intermediate', 'advanced'] as const;

export interface WorkoutTemplateItem {
    id: string;
    name: string;
    description: string | null;
    workoutType: string;
    sport: string;
    targetDistance: number | null;
    targetDuration: number | null;
    targetPace: number | null;
    structuredSteps: unknown;
    difficulty: string | null;
    tags: string[];
    category: string | null;
    isPublished: boolean;
    createdAt: string;
    updatedAt: string;
}

interface TemplateFormState {
    name: string;
    description: string;
    workoutType: string;
    sport: string;
    category: string;
    difficulty: string;
    targetDistance: string;
    targetDuration: string;
    targetPace: string;
    tags: string;
    structuredStepsText: string;
    isPublished: boolean;
}

const INITIAL_FORM: TemplateFormState = {
    name: '',
    description: '',
    workoutType: 'TEMPO',
    sport: 'RUN',
    category: 'threshold',
    difficulty: 'intermediate',
    targetDistance: '',
    targetDuration: '',
    targetPace: '',
    tags: '',
    structuredStepsText: '',
    isPublished: true,
};

function formatDuration(seconds: number | null): string {
    if (!seconds || seconds <= 0) return '—';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${String(secs).padStart(2, '0')}`;
}

function formatDistance(meters: number | null): string {
    if (!meters || meters <= 0) return '—';
    if (meters >= 1000) return `${(meters / 1000).toFixed(1)} km`;
    return `${Math.round(meters)} m`;
}

export default function WorkoutTemplatesTab() {
    const { confirm, ConfirmDialog } = useConfirmAction();

    const [templates, setTemplates] = useState<WorkoutTemplateItem[]>([]);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const [searchQuery, setSearchQuery] = useState('');
    const [filterType, setFilterType] = useState('');
    const [filterCategory, setFilterCategory] = useState('');
    const [filterPublished, setFilterPublished] = useState('');

    const [banner, setBanner] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    const [modalOpen, setModalOpen] = useState(false);
    const [editingTemplate, setEditingTemplate] = useState<WorkoutTemplateItem | null>(null);
    const [form, setForm] = useState<TemplateFormState>(INITIAL_FORM);
    const [formError, setFormError] = useState('');

    const fetchTemplates = useCallback(async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams({ limit: '100', offset: '0' });
            if (searchQuery.trim()) params.set('q', searchQuery.trim());
            if (filterType) params.set('workoutType', filterType);
            if (filterCategory) params.set('category', filterCategory);
            if (filterPublished) params.set('isPublished', filterPublished);

            const res = await fetch(`/api/admin/workout-templates?${params.toString()}`);
            const data = await res.json();
            if (!res.ok) {
                throw new Error(data.error || 'Failed to load workout templates');
            }
            setTemplates(data.templates || []);
            setTotal(data.total ?? (data.templates?.length || 0));
        } catch (err: unknown) {
            setBanner({
                type: 'error',
                text: err instanceof Error ? err.message : 'Failed to load workout templates',
            });
        } finally {
            setLoading(false);
        }
    }, [searchQuery, filterType, filterCategory, filterPublished]);

    useEffect(() => {
        fetchTemplates();
    }, [fetchTemplates]);

    const publishedCount = useMemo(
        () => templates.filter((t) => t.isPublished).length,
        [templates]
    );
    const draftCount = templates.length - publishedCount;

    const openCreateModal = () => {
        setEditingTemplate(null);
        setForm(INITIAL_FORM);
        setFormError('');
        setModalOpen(true);
    };

    const openEditModal = (tpl: WorkoutTemplateItem) => {
        setEditingTemplate(tpl);
        setForm({
            name: tpl.name,
            description: tpl.description || '',
            workoutType: tpl.workoutType,
            sport: tpl.sport || 'RUN',
            category: tpl.category || '',
            difficulty: tpl.difficulty || '',
            targetDistance: tpl.targetDistance != null ? String(tpl.targetDistance) : '',
            targetDuration: tpl.targetDuration != null ? String(tpl.targetDuration) : '',
            targetPace: tpl.targetPace != null ? String(tpl.targetPace) : '',
            tags: Array.isArray(tpl.tags) ? tpl.tags.join(', ') : '',
            structuredStepsText: tpl.structuredSteps != null ? JSON.stringify(tpl.structuredSteps, null, 2) : '',
            isPublished: tpl.isPublished,
        });
        setFormError('');
        setModalOpen(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setFormError('');

        if (!form.name.trim()) {
            setFormError('Template name is required.');
            return;
        }

        let parsedSteps: unknown = null;
        if (form.structuredStepsText.trim()) {
            try {
                parsedSteps = JSON.parse(form.structuredStepsText);
            } catch {
                setFormError('Structured steps must be valid JSON.');
                return;
            }
        }

        const parseOptionalNumber = (raw: string, integer = false): number | null => {
            if (!raw.trim()) return null;
            const parsed = integer ? parseInt(raw, 10) : parseFloat(raw);
            return Number.isFinite(parsed) ? parsed : null;
        };

        const payload = {
            name: form.name.trim(),
            description: form.description.trim() || null,
            workoutType: form.workoutType,
            sport: form.sport,
            category: form.category || null,
            difficulty: form.difficulty || null,
            targetDistance: parseOptionalNumber(form.targetDistance, false),
            targetDuration: parseOptionalNumber(form.targetDuration, true),
            targetPace: parseOptionalNumber(form.targetPace, false),
            tags: form.tags
                .split(',')
                .map((tag) => tag.trim())
                .filter(Boolean),
            structuredSteps: parsedSteps,
            isPublished: form.isPublished,
        };

        setSaving(true);
        try {
            const url = editingTemplate
                ? `/api/admin/workout-templates/${editingTemplate.id}`
                : '/api/admin/workout-templates';
            const method = editingTemplate ? 'PATCH' : 'POST';

            const res = await fetch(url, {
                method,
                headers: csrfHeaders(),
                body: JSON.stringify(payload),
            });
            const data = await res.json();
            if (!res.ok) {
                throw new Error(data.error || 'Failed to save workout template');
            }

            setModalOpen(false);
            setBanner({
                type: 'success',
                text: editingTemplate
                    ? `Updated "${payload.name}"`
                    : `Created "${payload.name}"`,
            });
            fetchTemplates();
        } catch (err: unknown) {
            setFormError(err instanceof Error ? err.message : 'Failed to save template');
        } finally {
            setSaving(false);
        }
    };

    const handleTogglePublish = async (tpl: WorkoutTemplateItem) => {
        const nextPublished = !tpl.isPublished;
        setTemplates((prev) =>
            prev.map((item) => (item.id === tpl.id ? { ...item, isPublished: nextPublished } : item))
        );
        try {
            const res = await fetch(`/api/admin/workout-templates/${tpl.id}`, {
                method: 'PATCH',
                headers: csrfHeaders(),
                body: JSON.stringify({ isPublished: nextPublished }),
            });
            const data = await res.json();
            if (!res.ok) {
                throw new Error(data.error || 'Failed to update publish status');
            }
            setBanner({
                type: 'success',
                text: `${tpl.name} ${nextPublished ? 'published' : 'moved to draft'}`,
            });
        } catch (err: unknown) {
            setTemplates((prev) =>
                prev.map((item) => (item.id === tpl.id ? { ...item, isPublished: tpl.isPublished } : item))
            );
            setBanner({
                type: 'error',
                text: err instanceof Error ? err.message : 'Failed to update template',
            });
        }
    };

    const handleDelete = async (tpl: WorkoutTemplateItem) => {
        const confirmed = await confirm({
            title: 'Delete Workout Template',
            message: `Delete "${tpl.name}" permanently? This action cannot be undone.`,
            confirmText: 'Delete',
            isDestructive: true,
        });
        if (!confirmed) return;

        try {
            const res = await fetch(`/api/admin/workout-templates/${tpl.id}`, {
                method: 'DELETE',
                headers: csrfHeaders(),
            });
            const data = await res.json();
            if (!res.ok) {
                throw new Error(data.error || 'Failed to delete template');
            }
            setBanner({ type: 'success', text: `Deleted "${tpl.name}"` });
            fetchTemplates();
        } catch (err: unknown) {
            setBanner({
                type: 'error',
                text: err instanceof Error ? err.message : 'Failed to delete template',
            });
        }
    };

    return (
        <div className="space-y-6">
            {/* Telemetry Strip */}
            <div className="grid grid-cols-3 border border-line bg-background-secondary divide-x divide-line rounded">
                <div className="p-4">
                    <p className="font-mono text-[11px] uppercase tracking-wider text-foreground-muted">Matching Templates</p>
                    <p className="text-2xl font-bold font-mono tabular-nums text-foreground mt-1">{total}</p>
                </div>
                <div className="p-4">
                    <p className="font-mono text-[11px] uppercase tracking-wider text-foreground-muted">Published (Shown)</p>
                    <p className="text-2xl font-bold font-mono tabular-nums text-positive mt-1">{publishedCount}</p>
                </div>
                <div className="p-4">
                    <p className="font-mono text-[11px] uppercase tracking-wider text-foreground-muted">Drafts (Shown)</p>
                    <p className="text-2xl font-bold font-mono tabular-nums text-foreground-secondary mt-1">{draftCount}</p>
                </div>
            </div>

            {banner && (
                <div
                    role={banner.type === 'error' ? 'alert' : 'status'}
                    className={`p-3.5 rounded border text-sm flex items-center justify-between gap-3 ${
                        banner.type === 'success'
                            ? 'bg-positive/10 border-positive/30 text-positive'
                            : 'bg-negative/10 border-negative/30 text-negative'
                    }`}
                >
                    <div className="flex items-center gap-2">
                        {banner.type === 'success' ? (
                            <CheckCircle className="w-4 h-4 shrink-0" aria-hidden="true" />
                        ) : (
                            <AlertTriangle className="w-4 h-4 shrink-0" aria-hidden="true" />
                        )}
                        <span>{banner.text}</span>
                    </div>
                    <button
                        type="button"
                        onClick={() => setBanner(null)}
                        className="text-xs font-mono uppercase tracking-wider hover:underline"
                    >
                        Dismiss
                    </button>
                </div>
            )}

            {/* Filter & Action Toolbar */}
            <div className="bg-background-secondary border border-line rounded p-4 flex flex-col lg:flex-row gap-3 lg:items-center lg:justify-between">
                <div role="search" aria-label="Filter workout templates" className="flex flex-1 flex-wrap items-center gap-2.5">
                    <div className="relative flex-1 min-w-[200px]">
                        <Search className="w-4 h-4 text-foreground-muted absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" aria-hidden="true" />
                        <label htmlFor="tpl-search" className="sr-only">Search workout templates</label>
                        <input
                            id="tpl-search"
                            type="search"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search templates by name or description..."
                            className="w-full pl-9 pr-3 py-2 bg-background border border-line rounded text-sm text-foreground placeholder-foreground-muted focus:ring-2 focus:ring-accent-orange focus:border-accent-orange"
                        />
                    </div>

                    <div>
                        <label htmlFor="tpl-filter-type" className="sr-only">Filter by workout type</label>
                        <select
                            id="tpl-filter-type"
                            value={filterType}
                            onChange={(e) => setFilterType(e.target.value)}
                            className="px-3 py-2 bg-background border border-line rounded text-sm text-foreground"
                        >
                            <option value="">All Types</option>
                            {WORKOUT_TYPES.map((t) => (
                                <option key={t} value={t}>{t}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label htmlFor="tpl-filter-category" className="sr-only">Filter by category</label>
                        <select
                            id="tpl-filter-category"
                            value={filterCategory}
                            onChange={(e) => setFilterCategory(e.target.value)}
                            className="px-3 py-2 bg-background border border-line rounded text-sm text-foreground capitalize"
                        >
                            <option value="">All Categories</option>
                            {CATEGORIES.map((c) => (
                                <option key={c} value={c}>{c}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label htmlFor="tpl-filter-status" className="sr-only">Filter by publish status</label>
                        <select
                            id="tpl-filter-status"
                            value={filterPublished}
                            onChange={(e) => setFilterPublished(e.target.value)}
                            className="px-3 py-2 bg-background border border-line rounded text-sm text-foreground"
                        >
                            <option value="">All States</option>
                            <option value="true">Published</option>
                            <option value="false">Draft</option>
                        </select>
                    </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                    <button
                        type="button"
                        onClick={fetchTemplates}
                        disabled={loading}
                        aria-label="Refresh workout templates"
                        className="p-2 border border-line bg-background text-foreground-secondary hover:text-foreground rounded transition disabled:opacity-50"
                    >
                        <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} aria-hidden="true" />
                    </button>
                    <button
                        type="button"
                        onClick={openCreateModal}
                        className="px-4 py-2 bg-accent-orange hover:bg-accent-orange/90 text-white rounded text-sm font-medium flex items-center gap-1.5 transition"
                    >
                        <Plus className="w-4 h-4" aria-hidden="true" />
                        New Template
                    </button>
                </div>
            </div>

            {/* Templates Table */}
            <div className="bg-background-secondary border border-line rounded overflow-hidden">
                <div className="px-5 py-3.5 border-b border-line flex items-center justify-between">
                    <h2 id="workout-templates-heading" className="text-sm font-semibold uppercase tracking-wider font-mono text-foreground-secondary flex items-center gap-2">
                        <ListChecks className="w-4 h-4 text-accent-orange" aria-hidden="true" />
                        Workout Templates Catalog
                    </h2>
                </div>

                <div className="overflow-x-auto" role="region" tabIndex={0} aria-labelledby="workout-templates-heading">
                    <table className="w-full text-left text-sm">
                        <caption className="sr-only">Admin workout templates with type, sport, targets, publish switch, and actions</caption>
                        <thead className="bg-background border-b border-line font-mono text-[11px] uppercase tracking-wider text-foreground-muted">
                            <tr>
                                <th scope="col" className="px-4 py-3">Template</th>
                                <th scope="col" className="px-4 py-3">Type / Sport</th>
                                <th scope="col" className="px-4 py-3">Category</th>
                                <th scope="col" className="px-4 py-3 text-right">Distance</th>
                                <th scope="col" className="px-4 py-3 text-right">Duration</th>
                                <th scope="col" className="px-4 py-3 text-center">Published</th>
                                <th scope="col" className="px-4 py-3 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-line">
                            {loading && templates.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="px-4 py-12 text-center text-foreground-muted">
                                        <Loader2 className="w-5 h-5 animate-spin inline mr-2" aria-hidden="true" />
                                        Loading workout templates...
                                    </td>
                                </tr>
                            ) : templates.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="px-4 py-12 text-center text-foreground-muted">
                                        No workout templates match your current filters.
                                    </td>
                                </tr>
                            ) : (
                                templates.map((tpl) => (
                                    <tr key={tpl.id} className="hover:bg-background transition-colors">
                                        <td className="px-4 py-3.5 max-w-xs">
                                            <div className="font-medium text-foreground">{tpl.name}</div>
                                            {tpl.description && (
                                                <p className="text-xs text-foreground-muted truncate mt-0.5">{tpl.description}</p>
                                            )}
                                            {tpl.tags?.length > 0 && (
                                                <div className="flex flex-wrap gap-1 mt-1.5">
                                                    {tpl.tags.slice(0, 4).map((tag) => (
                                                        <span
                                                            key={tag}
                                                            className="px-1.5 py-0.5 bg-background-tertiary border border-line rounded text-[10px] font-mono text-foreground-secondary"
                                                        >
                                                            {tag}
                                                        </span>
                                                    ))}
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-4 py-3.5 whitespace-nowrap">
                                            <span className="font-mono text-xs font-semibold text-foreground">{tpl.workoutType}</span>
                                            <div className="text-[11px] font-mono text-foreground-muted mt-0.5">{tpl.sport}</div>
                                        </td>
                                        <td className="px-4 py-3.5 whitespace-nowrap">
                                            <span className="text-xs capitalize text-foreground-secondary">{tpl.category || '—'}</span>
                                            {tpl.difficulty && (
                                                <div className="text-[11px] font-mono text-foreground-muted capitalize">{tpl.difficulty}</div>
                                            )}
                                        </td>
                                        <td className="px-4 py-3.5 text-right font-mono tabular-nums text-foreground-secondary whitespace-nowrap">
                                            {formatDistance(tpl.targetDistance)}
                                        </td>
                                        <td className="px-4 py-3.5 text-right font-mono tabular-nums text-foreground-secondary whitespace-nowrap">
                                            {formatDuration(tpl.targetDuration)}
                                        </td>
                                        <td className="px-4 py-3.5 text-center whitespace-nowrap">
                                            <button
                                                type="button"
                                                role="switch"
                                                aria-checked={tpl.isPublished}
                                                aria-label={`Publish status for ${tpl.name}`}
                                                onClick={() => handleTogglePublish(tpl)}
                                                className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border transition-colors ${
                                                    tpl.isPublished
                                                        ? 'bg-accent-orange border-accent-orange'
                                                        : 'bg-background-tertiary border-line'
                                                }`}
                                            >
                                                <span
                                                    className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow transition ${
                                                        tpl.isPublished ? 'translate-x-4' : 'translate-x-0'
                                                    }`}
                                                />
                                            </button>
                                        </td>
                                        <td className="px-4 py-3.5 text-right whitespace-nowrap">
                                            <div className="flex justify-end items-center gap-1">
                                                <button
                                                    type="button"
                                                    onClick={() => openEditModal(tpl)}
                                                    aria-label={`Edit template ${tpl.name}`}
                                                    className="p-2 text-foreground-muted hover:text-foreground hover:bg-background-tertiary rounded transition"
                                                >
                                                    <Pencil className="w-4 h-4" aria-hidden="true" />
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => handleDelete(tpl)}
                                                    aria-label={`Delete template ${tpl.name}`}
                                                    className="p-2 text-foreground-muted hover:text-negative hover:bg-negative/10 rounded transition"
                                                >
                                                    <Trash2 className="w-4 h-4" aria-hidden="true" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Create / Edit Template Native Dialog */}
            <Modal
                isOpen={modalOpen}
                onClose={() => setModalOpen(false)}
                title={editingTemplate ? `Edit Template: ${editingTemplate.name}` : 'Create Workout Template'}
                maxWidth="xl"
            >
                <form onSubmit={handleSubmit} className="space-y-4">
                    {formError && (
                        <div role="alert" className="p-3 rounded border border-negative/30 bg-negative/10 text-negative text-sm">
                            {formError}
                        </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="sm:col-span-2">
                            <label htmlFor="wt-name" className="block text-sm font-medium text-foreground-secondary mb-1">
                                Name
                            </label>
                            <input
                                id="wt-name"
                                type="text"
                                required
                                value={form.name}
                                onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                                placeholder="e.g. 5x1000m VO2max Intervals"
                                className="w-full px-3 py-2 bg-background border border-line rounded text-sm text-foreground focus:ring-2 focus:ring-accent-orange focus:border-accent-orange"
                            />
                        </div>

                        <div>
                            <label htmlFor="wt-type" className="block text-sm font-medium text-foreground-secondary mb-1">
                                Workout Type
                            </label>
                            <select
                                id="wt-type"
                                value={form.workoutType}
                                onChange={(e) => setForm((p) => ({ ...p, workoutType: e.target.value }))}
                                className="w-full px-3 py-2 bg-background border border-line rounded text-sm text-foreground"
                            >
                                {WORKOUT_TYPES.map((t) => (
                                    <option key={t} value={t}>{t}</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label htmlFor="wt-sport" className="block text-sm font-medium text-foreground-secondary mb-1">
                                Sport
                            </label>
                            <select
                                id="wt-sport"
                                value={form.sport}
                                onChange={(e) => setForm((p) => ({ ...p, sport: e.target.value }))}
                                className="w-full px-3 py-2 bg-background border border-line rounded text-sm text-foreground"
                            >
                                {SPORTS.map((s) => (
                                    <option key={s} value={s}>{s}</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label htmlFor="wt-category" className="block text-sm font-medium text-foreground-secondary mb-1">
                                Category
                            </label>
                            <select
                                id="wt-category"
                                value={form.category}
                                onChange={(e) => setForm((p) => ({ ...p, category: e.target.value }))}
                                className="w-full px-3 py-2 bg-background border border-line rounded text-sm text-foreground capitalize"
                            >
                                <option value="">None</option>
                                {CATEGORIES.map((c) => (
                                    <option key={c} value={c}>{c}</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label htmlFor="wt-difficulty" className="block text-sm font-medium text-foreground-secondary mb-1">
                                Difficulty
                            </label>
                            <select
                                id="wt-difficulty"
                                value={form.difficulty}
                                onChange={(e) => setForm((p) => ({ ...p, difficulty: e.target.value }))}
                                className="w-full px-3 py-2 bg-background border border-line rounded text-sm text-foreground capitalize"
                            >
                                <option value="">Unspecified</option>
                                {DIFFICULTIES.map((d) => (
                                    <option key={d} value={d}>{d}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div>
                            <label htmlFor="wt-distance" className="block text-sm font-medium text-foreground-secondary mb-1">
                                Target Distance (m)
                            </label>
                            <input
                                id="wt-distance"
                                type="number"
                                step="any"
                                min={0}
                                value={form.targetDistance}
                                onChange={(e) => setForm((p) => ({ ...p, targetDistance: e.target.value }))}
                                placeholder="e.g. 10000"
                                className="w-full px-3 py-2 bg-background border border-line rounded text-sm font-mono tabular-nums text-foreground"
                            />
                        </div>

                        <div>
                            <label htmlFor="wt-duration" className="block text-sm font-medium text-foreground-secondary mb-1">
                                Target Duration (sec)
                            </label>
                            <input
                                id="wt-duration"
                                type="number"
                                step={1}
                                min={0}
                                value={form.targetDuration}
                                onChange={(e) => setForm((p) => ({ ...p, targetDuration: e.target.value }))}
                                placeholder="e.g. 2700"
                                className="w-full px-3 py-2 bg-background border border-line rounded text-sm font-mono tabular-nums text-foreground"
                            />
                        </div>

                        <div>
                            <label htmlFor="wt-pace" className="block text-sm font-medium text-foreground-secondary mb-1">
                                Target Pace (sec/km)
                            </label>
                            <input
                                id="wt-pace"
                                type="number"
                                step="any"
                                min={0}
                                value={form.targetPace}
                                onChange={(e) => setForm((p) => ({ ...p, targetPace: e.target.value }))}
                                placeholder="e.g. 255"
                                className="w-full px-3 py-2 bg-background border border-line rounded text-sm font-mono tabular-nums text-foreground"
                            />
                        </div>
                    </div>

                    <div>
                        <label htmlFor="wt-tags" className="block text-sm font-medium text-foreground-secondary mb-1">
                            Tags (comma-separated)
                        </label>
                        <input
                            id="wt-tags"
                            type="text"
                            value={form.tags}
                            onChange={(e) => setForm((p) => ({ ...p, tags: e.target.value }))}
                            placeholder="vo2max, track, 5k"
                            className="w-full px-3 py-2 bg-background border border-line rounded text-sm font-mono text-foreground"
                        />
                    </div>

                    <div>
                        <label htmlFor="wt-description" className="block text-sm font-medium text-foreground-secondary mb-1">
                            Description
                        </label>
                        <textarea
                            id="wt-description"
                            rows={2}
                            value={form.description}
                            onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                            placeholder="Warmup, work intervals, recovery jogs, and cooldown instructions..."
                            className="w-full px-3 py-2 bg-background border border-line rounded text-sm text-foreground"
                        />
                    </div>

                    <div>
                        <label htmlFor="wt-steps" className="block text-sm font-medium text-foreground-secondary mb-1">
                            Structured Steps (JSON, optional)
                        </label>
                        <textarea
                            id="wt-steps"
                            rows={4}
                            value={form.structuredStepsText}
                            onChange={(e) => setForm((p) => ({ ...p, structuredStepsText: e.target.value }))}
                            placeholder='[{"stepType":"WARMUP","durationSeconds":600}]'
                            className="w-full px-3 py-2 bg-background border border-line rounded text-xs font-mono text-foreground"
                        />
                    </div>

                    <div className="flex items-center gap-2 pt-1">
                        <input
                            id="wt-published"
                            type="checkbox"
                            checked={form.isPublished}
                            onChange={(e) => setForm((p) => ({ ...p, isPublished: e.target.checked }))}
                            className="h-4 w-4 accent-[var(--accent-orange)]"
                        />
                        <label htmlFor="wt-published" className="text-sm text-foreground-secondary">
                            Publish immediately to athletes
                        </label>
                    </div>

                    <div className="flex justify-end gap-3 pt-4 border-t border-line">
                        <button
                            type="button"
                            onClick={() => setModalOpen(false)}
                            className="px-4 py-2 border border-line text-foreground-secondary hover:bg-background-tertiary rounded text-sm font-medium transition"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={saving}
                            className="px-5 py-2 bg-accent-orange hover:bg-accent-orange/90 text-white rounded text-sm font-medium transition flex items-center gap-2 disabled:opacity-50"
                        >
                            {saving && <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />}
                            {editingTemplate ? 'Save Changes' : 'Create Template'}
                        </button>
                    </div>
                </form>
            </Modal>

            <ConfirmDialog />
        </div>
    );
}
