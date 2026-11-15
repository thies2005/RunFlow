import React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { ArrowUpDown, ArrowUp, ArrowDown, TrendingUp, TrendingDown, Zap } from 'lucide-react';

interface RouteStats {
  id: string;
  routePath: string;
  method: string;
  requestCount: number;
  errorCount: number;
  avgResponseTime: number;
  p50ResponseTime: number;
  p95ResponseTime: number;
  p99ResponseTime: number;
  avgCpuUsage: number;
  avgMemoryUsage: number;
}

interface ApiRoutesTableProps {
  routes: RouteStats[];
  onRouteClick?: (_route: RouteStats) => void;
  _sortBy?: keyof RouteStats;
  _sortOrder?: 'asc' | 'desc';
  onSort?: (_sortBy: keyof RouteStats) => void;
}

export default function ApiRoutesTable({
  routes,
  onRouteClick,
  _sortBy,
  _sortOrder,
  onSort,
}: ApiRoutesTableProps) {
  const getHealthStatus = (route: RouteStats) => {
    const errorRate = route.requestCount > 0 ? (route.errorCount / route.requestCount) * 100 : 0;

    if (errorRate > 5) return { status: 'critical', color: 'bg-negative' };
    if (errorRate > 1) return { status: 'warning', color: 'bg-workout-tempo' };
    if (route.avgResponseTime > 1000) return { status: 'slow', color: 'bg-workout-race' };
    return { status: 'healthy', color: 'bg-positive' };
  };

  const formatResponseTime = (ms: number | null | undefined) => {
    if (ms == null) return '0ms';
    if (ms < 1000) return `${ms.toFixed(0)}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  };

  const getTrendIcon = (value: number, threshold: number, inverse?: boolean) => {
    const isGood = inverse ? value < threshold : value <= threshold;
    return isGood ? (
      <TrendingDown className="w-3.5 h-3.5 text-positive shrink-0" aria-hidden="true" />
    ) : (
      <TrendingUp className="w-3.5 h-3.5 text-negative shrink-0" aria-hidden="true" />
    );
  };

  const getAriaSort = (col: keyof RouteStats): 'ascending' | 'descending' | 'none' => {
    if (_sortBy !== col) return 'none';
    return _sortOrder === 'asc' ? 'ascending' : 'descending';
  };

  const renderSortButton = (col: keyof RouteStats, label: string, alignRight = false) => {
    const active = _sortBy === col;
    const SortIcon = active ? (_sortOrder === 'asc' ? ArrowUp : ArrowDown) : ArrowUpDown;
    return (
      <button
        type="button"
        onClick={() => onSort?.(col)}
        className={`inline-flex items-center gap-1 font-semibold hover:text-foreground transition-colors ${alignRight ? 'ml-auto' : ''} ${active ? 'text-accent-orange' : ''}`}
      >
        <span>{label}</span>
        <SortIcon className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
      </button>
    );
  };

  return (
    <div className="bg-background-secondary rounded border border-line overflow-hidden">
      <div className="px-5 py-4 border-b border-line">
        <h3 id="api-routes-heading" className="text-base font-semibold text-foreground flex items-center gap-2">
          <Zap className="w-4 h-4 text-accent-orange" aria-hidden="true" />
          API Routes
        </h3>
      </div>

      <div
        className="overflow-x-auto"
        role="region"
        tabIndex={0}
        aria-labelledby="api-routes-heading"
      >
        <Table>
          <caption className="sr-only">API route performance metrics, sortable by column</caption>
          <TableHeader>
            <TableRow>
              <TableHead scope="col" aria-sort={getAriaSort('routePath')}>
                {renderSortButton('routePath', 'Route')}
              </TableHead>
              <TableHead scope="col" aria-sort={getAriaSort('method')}>
                {renderSortButton('method', 'Method')}
              </TableHead>
              <TableHead scope="col" aria-sort={getAriaSort('requestCount')} className="text-right">
                {renderSortButton('requestCount', 'Requests', true)}
              </TableHead>
              <TableHead scope="col" aria-sort={getAriaSort('avgResponseTime')} className="text-right">
                {renderSortButton('avgResponseTime', 'Avg Time', true)}
              </TableHead>
              <TableHead scope="col" aria-sort={getAriaSort('p95ResponseTime')} className="text-right">
                {renderSortButton('p95ResponseTime', 'P95', true)}
              </TableHead>
              <TableHead scope="col" aria-sort={getAriaSort('p99ResponseTime')} className="text-right">
                {renderSortButton('p99ResponseTime', 'P99', true)}
              </TableHead>
              <TableHead scope="col" aria-sort={getAriaSort('errorCount')} className="text-right">
                {renderSortButton('errorCount', 'Errors', true)}
              </TableHead>
              <TableHead scope="col" aria-sort={getAriaSort('avgCpuUsage')} className="text-right">
                {renderSortButton('avgCpuUsage', 'CPU', true)}
              </TableHead>
              <TableHead scope="col" aria-sort={getAriaSort('avgMemoryUsage')} className="text-right">
                {renderSortButton('avgMemoryUsage', 'Memory', true)}
              </TableHead>
              <TableHead scope="col">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {routes.length === 0 ? (
              <TableRow>
                <TableCell colSpan={10} className="text-center text-foreground-muted py-8">
                  No data available
                </TableCell>
              </TableRow>
            ) : (
              routes.map((route) => {
                const health = getHealthStatus(route);
                const errorRate = route.requestCount > 0 ? ((route.errorCount / route.requestCount) * 100).toFixed(2) : '0.00';

                return (
                  <TableRow
                    key={route.id}
                    className="hover:bg-background transition-colors"
                  >
                    <TableCell className="font-mono text-sm">
                      <button
                        type="button"
                        onClick={() => onRouteClick?.(route)}
                        className="text-left font-mono text-sm hover:text-accent-orange hover:underline focus-visible:outline-2 focus-visible:outline-accent-orange rounded"
                        title="Filter error analytics by this route"
                      >
                        {route.routePath}
                      </button>
                    </TableCell>
                    <TableCell>
                      <Badge variant={route.method === 'GET' ? 'secondary' : 'outline'}>
                        {route.method}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-mono tabular-nums">{route.requestCount.toLocaleString()}</TableCell>
                    <TableCell className="text-right font-mono tabular-nums">
                      <div className="flex items-center justify-end gap-1.5">
                        {formatResponseTime(route.avgResponseTime)}
                        {getTrendIcon(route.avgResponseTime, 500)}
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-mono tabular-nums">{formatResponseTime(route.p95ResponseTime)}</TableCell>
                    <TableCell className="text-right font-mono tabular-nums">{formatResponseTime(route.p99ResponseTime)}</TableCell>
                    <TableCell className="text-right font-mono tabular-nums">
                      <div className="flex items-center justify-end gap-1.5">
                        <span className={route.errorCount > 0 ? 'text-negative font-medium' : ''}>
                          {route.errorCount}
                        </span>
                        <span className="text-foreground-muted">({errorRate}%)</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-mono tabular-nums">{(route.avgCpuUsage ?? 0).toFixed(1)}%</TableCell>
                    <TableCell className="text-right font-mono tabular-nums">{(route.avgMemoryUsage ?? 0).toFixed(0)}MB</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${health.color}`} aria-hidden="true" />
                        <span className="text-xs font-mono uppercase tracking-wider">{health.status}</span>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
