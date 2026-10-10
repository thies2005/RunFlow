import { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft, Key, Shield, Zap, Database, Activity, BarChart, Trophy, Heart } from 'lucide-react';

export const metadata: Metadata = {
    title: 'RunFlow API Documentation',
    description: 'Documentation for accessing RunFlow data externally via API.',
};

export default function ApiDocsPage() {
    return (
        <div className="min-h-screen bg-background text-foreground font-sans selection:bg-accent-orange/30">
            {/* Header */}
            <header className="border-b border-line sticky top-0 bg-background z-50">
                <div className="container mx-auto px-4 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Link href="/" className="text-foreground-muted hover:text-foreground transition-colors">
                            <ArrowLeft className="w-5 h-5" />
                        </Link>
                        <h1 className="text-xl font-bold text-foreground tracking-tight">
                            RunFlow <span className="text-accent-orange">API</span>
                        </h1>
                    </div>
                    <div className="text-xs font-mono text-foreground-muted">v1.0</div>
                </div>
            </header>

            <main className="container mx-auto px-4 py-12 max-w-4xl">
                {/* Introduction */}
                <section className="mb-16">
                    <h2 className="text-3xl font-bold text-foreground mb-6">Introduction</h2>
                    <p className="text-lg leading-relaxed text-foreground-muted mb-8">
                        The RunFlow External API allows you to securely access your running data, training statistics, and goals from external applications or AI assistants (like OpenClaw). All endpoints are read-only and designed for high performance.
                    </p>

                    <div className="grid md:grid-cols-3 gap-4">
                        <FeatureCard
                            icon={<Shield className="w-5 h-5 text-positive" />}
                            title="Secure Access"
                            description="Authenticated via scoped API keys unique to your user profile."
                        />
                        <FeatureCard
                            icon={<Zap className="w-5 h-5 text-accent-blue" />}
                            title="Fast & Read-Only"
                            description="Optimized read-only endpoints protect your data integrity."
                        />
                        <FeatureCard
                            icon={<Database className="w-5 h-5 text-workout-long-run" />}
                            title="Comprehensive Data"
                            description="Access activities, fitness metrics, goals, and training history."
                        />
                    </div>
                </section>

                {/* Authentication */}
                <section className="mb-16">
                    <h2 className="text-2xl font-bold text-foreground mb-6 flex items-center gap-2">
                        <Key className="w-6 h-6 text-accent-orange" /> Authentication
                    </h2>
                    <div className="prose prose-invert max-w-none text-foreground-muted">
                        <p className="mb-4">
                            Authenticate your requests by including your API key in the <code className="text-accent-orange">Authorization</code> header.
                        </p>

                        <div className="bg-background-secondary border border-line rounded-md p-4 mb-6">
                            <div className="flex items-center justify-between text-xs text-foreground-muted mb-2 font-mono">
                                <span>HTTP Header</span>
                            </div>
                            <code className="block font-mono text-sm text-positive">
                                Authorization: Bearer rf_YOUR_API_KEY
                            </code>
                        </div>

                        <div className="bg-workout-tempo/10 border border-workout-tempo/30 rounded-md p-4 flex gap-3 items-start">
                            <Shield className="w-5 h-5 text-workout-tempo shrink-0 mt-0.5" />
                            <div>
                                <h4 className="text-workout-tempo font-medium text-sm mb-1">Security Best Practices</h4>
                                <ul className="list-disc pl-4 text-sm space-y-1">
                                    <li>Never share your API key or commit it to public repositories.</li>
                                    <li>Keys have read-only access to your personal data.</li>
                                    <li>You can revoke/regenerate your key at any time in Profile Settings.</li>
                                </ul>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Endpoints */}
                <h2 className="text-2xl font-bold text-foreground mb-8 border-b border-line pb-4">Endpoints</h2>

                {/* Activities Endpoint */}
                <EndpointSection
                    method="GET"
                    path="/api/external/v1/activities"
                    title="List Activities"
                    icon={<Activity className="w-5 h-5 text-accent-blue" />}
                >
                    <p className="text-foreground-muted mb-6">
                        Retrieve a paginated list of your activities with detailed metrics.
                    </p>

                    <h4 className="text-sm font-medium text-foreground mb-3">Query Parameters</h4>
                    <ParameterTable params={[
                        { name: 'limit', type: 'number', required: false, desc: 'Max records to return (default: 50, max: 100)' },
                        { name: 'offset', type: 'number', required: false, desc: 'Pagination offset (default: 0)' },
                        { name: 'type', type: 'string', required: false, desc: 'Filter by type: RUN, RIDE, SWIM, WORKOUT, etc.' },
                        { name: 'startDate', type: 'ISO Date', required: false, desc: 'Filter activities after this date' },
                        { name: 'endDate', type: 'ISO Date', required: false, desc: 'Filter activities before this date' },
                    ]} />

                    <h4 className="text-sm font-medium text-foreground mb-3 mt-6">Example Request</h4>
                    <CodeBlock code={`curl "https://runflow.app/api/external/v1/activities?type=RUN&limit=5" \\
  -H "Authorization: Bearer rf_abc123..."`} />
                </EndpointSection>

                {/* Stats Endpoint */}
                <EndpointSection
                    method="GET"
                    path="/api/external/v1/stats"
                    title="Training Stats"
                    icon={<BarChart className="w-5 h-5 text-positive" />}
                >
                    <p className="text-foreground-muted mb-6">
                        Get high-level training metrics including VO2max estimates, marathon shape, and current fitness scores.
                    </p>

                    <h4 className="text-sm font-medium text-foreground mb-3 text-right">Rate Limit: <span className="text-foreground font-normal font-mono tabular-nums">100 req/min</span></h4>

                    <CodeBlock code={`curl "https://runflow.app/api/external/v1/stats" \\
  -H "Authorization: Bearer rf_abc123..."`} />

                    <div className="mt-4">
                        <h4 className="text-sm font-medium text-foreground mb-2">Response Includes:</h4>
                        <ul className="grid grid-cols-2 gap-2 text-sm text-foreground-muted">
                            <li>• User Settings (HR Zones)</li>
                            <li>• Effective VO2max</li>
                            <li>• Marathon Shape Score</li>
                            <li>• Fitness (CTL/ATL/TSB)</li>
                        </ul>
                    </div>
                </EndpointSection>

                {/* Goals Endpoint */}
                <EndpointSection
                    method="GET"
                    path="/api/external/v1/goals"
                    title="Race Goals"
                    icon={<Trophy className="w-5 h-5 text-workout-race" />}
                >
                    <p className="text-foreground-muted mb-6">
                        Retrieve your active race goals and predicted completion times based on current fitness.
                    </p>

                    <h4 className="text-sm font-medium text-foreground mb-3">Query Parameters</h4>
                    <ParameterTable params={[
                        { name: 'activeOnly', type: 'boolean', required: false, desc: 'Return only active goals (default: true)' },
                    ]} />

                    <CodeBlock code={`curl "https://runflow.app/api/external/v1/goals" \\
  -H "Authorization: Bearer rf_abc123..."`} />
                </EndpointSection>

                {/* Plan Endpoint */}
                <EndpointSection
                    method="GET"
                    path="/api/external/v1/plan"
                    title="Training Plan & Workouts"
                    icon={<Activity className="w-5 h-5 text-accent-orange" />}
                >
                    <p className="text-foreground-muted mb-6">
                        Retrieve the active training plan, race details, and scheduled workouts.
                    </p>

                    <h4 className="text-sm font-medium text-foreground mb-3">Query Parameters</h4>
                    <ParameterTable params={[
                        { name: 'from', type: 'ISO Date', required: false, desc: 'Start date for workouts (default: today)' },
                        { name: 'to', type: 'ISO Date', required: false, desc: 'End date (default: +14 days)' },
                    ]} />

                    <CodeBlock code={`curl "https://runflow.app/api/external/v1/plan?to=2024-06-01" \\
  -H "Authorization: Bearer rf_abc123..."`} />

                    <div className="mt-4">
                        <h4 className="text-sm font-medium text-foreground mb-2">Response Includes:</h4>
                        <ul className="grid grid-cols-2 gap-2 text-sm text-foreground-muted">
                            <li>• Active Goal & Race Info</li>
                            <li>• Workouts list (Type, Desc)</li>
                            <li>• Target Paces & Zones</li>
                            <li>• Completion Status</li>
                        </ul>
                    </div>
                </EndpointSection>

                {/* Fitness Endpoint */}
                <EndpointSection
                    method="GET"
                    path="/api/external/v1/fitness"
                    title="Fitness History"
                    icon={<Heart className="w-5 h-5 text-accent-pink" />}
                >
                    <p className="text-foreground-muted mb-6">
                        Get historical fitness data points (CTL, ATL, TSB) for trend analysis.
                    </p>

                    <h4 className="text-sm font-medium text-foreground mb-3">Query Parameters</h4>
                    <ParameterTable params={[
                        { name: 'days', type: 'number', required: false, desc: 'Number of past days to fetch (default: 90, max: 365)' },
                    ]} />

                    <CodeBlock code={`curl "https://runflow.app/api/external/v1/fitness?days=30" \\
  -H "Authorization: Bearer rf_abc123..."`} />
                </EndpointSection>

                {/* Footer */}
                <footer className="mt-24 pt-8 border-t border-line text-center text-foreground-muted text-sm">
                    <p>© {new Date().getFullYear()} RunFlow. API Access for personal use only.</p>
                </footer>
            </main>
        </div>
    );
}

// --- Helper Components ---

function FeatureCard({ icon, title, description }: { icon: React.ReactNode, title: string, description: string }) {
    return (
        <div className="bg-background-secondary border border-line rounded-md p-4 hover:bg-surface-hover transition-colors">
            <div className="mb-3">{icon}</div>
            <h3 className="text-foreground font-medium mb-1">{title}</h3>
            <p className="text-sm text-foreground-muted leading-snug">{description}</p>
        </div>
    );
}

function EndpointSection({ method, path, title, icon, children }: { method: string, path: string, title: string, icon: React.ReactNode, children: React.ReactNode }) {
    return (
        <section className="mb-12 bg-background-secondary border border-line rounded-md p-6 md:p-8">
            <div className="flex items-start justify-between mb-6">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-background-tertiary rounded-md border border-line">{icon}</div>
                    <div>
                        <h3 className="text-lg font-bold text-foreground">{title}</h3>
                        <div className="flex items-center gap-2 mt-1">
                            <span className="bg-accent-blue/10 text-accent-blue px-1.5 py-0.5 rounded-sm text-[10px] font-bold tracking-wide">{method}</span>
                            <code className="text-sm font-mono text-foreground">{path}</code>
                        </div>
                    </div>
                </div>
            </div>
            {children}
        </section>
    );
}

function ParameterTable({ params }: { params: { name: string, type: string, required: boolean, desc: string }[] }) {
    return (
        <div className="border border-line rounded-md overflow-hidden mb-6">
            <table className="w-full text-left text-sm">
                <thead className="bg-background-tertiary text-foreground-muted font-medium">
                    <tr>
                        <th className="p-3 border-b border-line w-32">Param</th>
                        <th className="p-3 border-b border-line w-24">Type</th>
                        <th className="p-3 border-b border-line">Description</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-line">
                    {params.map((p, i) => (
                        <tr key={i} className="hover:bg-surface-hover">
                            <td className="p-3 font-mono text-accent-orange">{p.name} {p.required && <span className="text-negative">*</span>}</td>
                            <td className="p-3 text-foreground-muted">{p.type}</td>
                            <td className="p-3 text-foreground-muted">{p.desc}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

function CodeBlock({ code }: { code: string }) {
    return (
        <div className="relative group">
            <div className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 transition-opacity">
                {/* Simplified copy button could go here */}
            </div>
            <pre className="bg-background-tertiary border border-line rounded-md p-4 overflow-x-auto text-sm text-foreground font-mono leading-relaxed">
                {code}
            </pre>
        </div>
    );
}
