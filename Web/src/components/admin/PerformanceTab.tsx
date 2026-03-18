import React, { useEffect, useState } from 'react';
import { 
    Activity, 
    Cpu, 
    HardDrive, 
    Database, 
    AlertTriangle, 
    CheckCircle, 
    Zap, 
    Clock,
    TrendingUp,
    TrendingDown,
    RefreshCw,
    Server
} from 'lucide-react';

interface PerformanceData {
    timestamp: string;
    data: {
        health: {
            status: 'healthy' | 'unhealthy';
            checks: {
                database: { status: string; latency?: number; error?: string };
                strava: { status: string; error?: string };
                aiProviders: { status: string; error?: string };
                memory: { status: string; usedMB: number; totalMB: number; percentage: number };
            };
        };
        system: {
            uptime: number;
            platform: string;
            nodeVersion: string;
            memory: {
                used: number;
                total: number;
                percentage: number;
                rss: number;
                heapTotal: number;
                heapUsed: number;
                external: number;
                arrayBuffers: number;
            };
            cpu: {
                usage: number;
                loadAverage: number[];
            };
        };
        requests: {
            errorRate: number;
            avgResponseTime: number;
            uptime: number;
            totalMetrics: number;
        };
        customMetrics: Record<string, any[]>;
        database: {
            connectionPool: {
                totalCount: number;
                activeCount: number;
                idleCount: number;
            };
            queriesLastMinute: number;
        };
    };
}

const StatCard = ({ title, value, subtext, icon: Icon, color, trend, trendValue }: any) => (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
        <div className="flex items-start justify-between">
            <div className="flex items-start space-x-4">
                <div className={`p-3 rounded-lg ${color}`}>
                    <Icon className="w-6 h-6 text-white" />
                </div>
                <div>
                    <p className="text-gray-500 text-sm font-medium">{title}</p>
                    <h3 className="text-2xl font-bold text-gray-800 mt-1">{value}</h3>
                    {subtext && <p className="text-xs text-gray-400 mt-1">{subtext}</p>}
                </div>
            </div>
            {trend && (
                <div className={`flex items-center text-xs ${trend === 'up' ? 'text-red-500' : 'text-green-500'}`}>
                    {trend === 'up' ? <TrendingUp className="w-4 h-4 mr-1" /> : <TrendingDown className="w-4 h-4 mr-1" />}
                    {trendValue}
                </div>
            )}
        </div>
    </div>
);

const HealthStatus = ({ status, checks }: any) => (
    <div className="space-y-3">
        <div className={`flex items-center space-x-2 ${status === 'healthy' ? 'text-green-600' : 'text-red-600'}`}>
            {status === 'healthy' ? <CheckCircle className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
            <span className="font-semibold">{status === 'healthy' ? 'System Healthy' : 'System Unhealthy'}</span>
        </div>
        <div className="grid grid-cols-2 gap-3 mt-4">
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <span className="text-sm text-gray-600">Database</span>
                <span className={`text-sm font-medium ${checks.database.status === 'healthy' ? 'text-green-600' : 'text-red-600'}`}>
                    {checks.database.latency ? `${checks.database.latency}ms` : checks.database.status}
                </span>
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <span className="text-sm text-gray-600">Strava</span>
                <span className={`text-sm font-medium ${checks.strava.status === 'healthy' ? 'text-green-600' : 'text-yellow-600'}`}>
                    {checks.strava.status}
                </span>
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <span className="text-sm text-gray-600">AI Providers</span>
                <span className={`text-sm font-medium ${checks.aiProviders.status === 'healthy' ? 'text-green-600' : 'text-yellow-600'}`}>
                    {checks.aiProviders.status}
                </span>
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <span className="text-sm text-gray-600">Memory</span>
                <span className={`text-sm font-medium ${checks.memory.status === 'healthy' ? 'text-green-600' : 'text-red-600'}`}>
                    {checks.memory.percentage.toFixed(1)}%
                </span>
            </div>
        </div>
    </div>
);

const MemoryBar = ({ used, total, percentage, label }: any) => (
    <div className="space-y-2">
        <div className="flex justify-between text-sm">
            <span className="text-gray-600">{label}</span>
            <span className="font-medium text-gray-800">{used}MB / {total}MB ({percentage.toFixed(1)}%)</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
                className={`h-2 rounded-full transition-all duration-300 ${
                    percentage > 90 ? 'bg-red-500' : percentage > 70 ? 'bg-yellow-500' : 'bg-green-500'
                }`}
                style={{ width: `${Math.min(percentage, 100)}%` }}
            />
        </div>
    </div>
);

export default function PerformanceTab() {
    const [data, setData] = useState<PerformanceData | null>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const fetchPerformanceData = async () => {
        try {
            setRefreshing(true);
            const res = await fetch('/api/admin/performance');
            if (res.ok) {
                const json = await res.json();
                setData(json);
            }
        } catch (e) {
            console.error('Failed to fetch performance data:', e);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchPerformanceData();
        const interval = setInterval(fetchPerformanceData, 10000);
        return () => clearInterval(interval);
    }, []);

    const formatUptime = (seconds: number) => {
        const days = Math.floor(seconds / 86400);
        const hours = Math.floor((seconds % 86400) / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        if (days > 0) return `${days}d ${hours}h ${minutes}m`;
        if (hours > 0) return `${hours}h ${minutes}m`;
        return `${minutes}m`;
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
            </div>
        );
    }

    if (!data) {
        return (
            <div className="p-8 text-center text-gray-500">
                Failed to load performance data
            </div>
        );
    }

    const { health, system, requests, database } = data.data;

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold text-gray-800">System Performance</h2>
                <button
                    onClick={fetchPerformanceData}
                    disabled={refreshing}
                    className="flex items-center space-x-2 px-4 py-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition disabled:opacity-50"
                >
                    <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
                    <span>Refresh</span>
                </button>
            </div>

            {/* Health Status */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <div className="flex items-center space-x-2 mb-4">
                    <Activity className="w-5 h-5 text-gray-600" />
                    <h3 className="font-semibold text-gray-800">Health Status</h3>
                </div>
                <HealthStatus status={health.status} checks={health.checks} />
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard
                    title="Uptime"
                    value={formatUptime(system.uptime)}
                    icon={Clock}
                    color="bg-blue-500"
                />
                <StatCard
                    title="Avg Response"
                    value={`${requests.avgResponseTime.toFixed(0)}ms`}
                    subtext={`${requests.totalMetrics} requests`}
                    icon={Zap}
                    color="bg-violet-500"
                />
                <StatCard
                    title="Error Rate"
                    value={`${requests.errorRate.toFixed(2)}%`}
                    icon={AlertTriangle}
                    color={requests.errorRate > 1 ? 'bg-red-500' : 'bg-green-500'}
                />
                <StatCard
                    title="CPU Usage"
                    value={`${system.cpu.usage.toFixed(1)}%`}
                    subtext={`Load: ${system.cpu.loadAverage[0].toFixed(2)}`}
                    icon={Cpu}
                    color={system.cpu.usage > 80 ? 'bg-red-500' : system.cpu.usage > 60 ? 'bg-yellow-500' : 'bg-green-500'}
                />
            </div>

            {/* Memory Usage */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <div className="flex items-center space-x-2 mb-6">
                    <HardDrive className="w-5 h-5 text-gray-600" />
                    <h3 className="font-semibold text-gray-800">Memory Usage</h3>
                </div>
                <div className="space-y-4">
                    <MemoryBar 
                        used={system.memory.rss} 
                        total={system.memory.total} 
                        percentage={system.memory.percentage}
                        label="Memory Usage (RSS / Container Limit)"
                    />
                    <MemoryBar 
                        used={system.memory.heapUsed} 
                        total={system.memory.heapTotal} 
                        percentage={(system.memory.heapUsed / system.memory.heapTotal) * 100}
                        label="Heap Memory (Used / Max Heap)"
                    />
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
                        <div className="p-4 bg-gray-50 rounded-lg">
                            <p className="text-xs text-gray-500 mb-1">External</p>
                            <p className="text-lg font-semibold text-gray-800">{system.memory.external}MB</p>
                        </div>
                        <div className="p-4 bg-gray-50 rounded-lg">
                            <p className="text-xs text-gray-500 mb-1">Array Buffers</p>
                            <p className="text-lg font-semibold text-gray-800">{system.memory.arrayBuffers}MB</p>
                        </div>
                        <div className="p-4 bg-gray-50 rounded-lg">
                            <p className="text-xs text-gray-500 mb-1">Heap Total</p>
                            <p className="text-lg font-semibold text-gray-800">{system.memory.heapTotal}MB</p>
                        </div>
                        <div className="p-4 bg-gray-50 rounded-lg">
                            <p className="text-xs text-gray-500 mb-1">Platform</p>
                            <p className="text-sm font-semibold text-gray-800">{system.platform}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Database Metrics */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <div className="flex items-center space-x-2 mb-6">
                    <Database className="w-5 h-5 text-gray-600" />
                    <h3 className="font-semibold text-gray-800">Database Connection Pool</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="p-4 bg-blue-50 rounded-lg">
                        <p className="text-sm text-blue-600 mb-1">Total Connections</p>
                        <p className="text-2xl font-bold text-blue-700">{database.connectionPool.totalCount}</p>
                    </div>
                    <div className="p-4 bg-green-50 rounded-lg">
                        <p className="text-sm text-green-600 mb-1">Active Connections</p>
                        <p className="text-2xl font-bold text-green-700">{database.connectionPool.activeCount}</p>
                    </div>
                    <div className="p-4 bg-gray-50 rounded-lg">
                        <p className="text-sm text-gray-600 mb-1">Idle Connections</p>
                        <p className="text-2xl font-bold text-gray-700">{database.connectionPool.idleCount}</p>
                    </div>
                </div>
            </div>

            {/* System Info */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <div className="flex items-center space-x-2 mb-6">
                    <Server className="w-5 h-5 text-gray-600" />
                    <h3 className="font-semibold text-gray-800">System Information</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="p-4 bg-gray-50 rounded-lg">
                        <p className="text-xs text-gray-500 mb-1">Node.js Version</p>
                        <p className="text-sm font-semibold text-gray-800">{system.nodeVersion}</p>
                    </div>
                    <div className="p-4 bg-gray-50 rounded-lg">
                        <p className="text-xs text-gray-500 mb-1">Platform</p>
                        <p className="text-sm font-semibold text-gray-800">{system.platform}</p>
                    </div>
                    <div className="p-4 bg-gray-50 rounded-lg">
                        <p className="text-xs text-gray-500 mb-1">Container Limit</p>
                        <p className="text-sm font-semibold text-gray-800">{system.memory.total}MB</p>
                    </div>
                    <div className="p-4 bg-gray-50 rounded-lg">
                        <p className="text-xs text-gray-500 mb-1">Last Updated</p>
                        <p className="text-sm font-semibold text-gray-800">
                            {new Date(data.timestamp).toLocaleString()}
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
