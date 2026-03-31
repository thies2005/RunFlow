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
import { ArrowUpDown, TrendingUp, TrendingDown, Zap } from 'lucide-react';

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
  onRouteClick?: (route: RouteStats) => void;
  sortBy?: keyof RouteStats;
  sortOrder?: 'asc' | 'desc';
  onSort?: (sortBy: keyof RouteStats) => void;
}

export default function ApiRoutesTable({
  routes,
  onRouteClick,
  sortBy,
  sortOrder,
  onSort,
}: ApiRoutesTableProps) {
  const getHealthStatus = (route: RouteStats) => {
    const errorRate = (route.errorCount / route.requestCount) * 100;
    
    if (errorRate > 5) return { status: 'critical', color: 'bg-red-500' };
    if (errorRate > 1) return { status: 'warning', color: 'bg-yellow-500' };
    if (route.avgResponseTime > 1000) return { status: 'slow', color: 'bg-orange-500' };
    return { status: 'healthy', color: 'bg-green-500' };
  };

  const formatResponseTime = (ms: number) => {
    if (ms < 1000) return `${ms.toFixed(0)}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  };

  const getTrendIcon = (value: number, threshold: number, inverse?: boolean) => {
    const isGood = inverse ? value < threshold : value <= threshold;
    return isGood ? (
      <TrendingDown className="w-4 h-4 text-green-500" />
    ) : (
      <TrendingUp className="w-4 h-4 text-red-500" />
    );
  };

  return (
    <div className="bg-white rounded-xl shadow-xs border border-gray-100 overflow-hidden">
      <div className="p-6 border-b border-gray-100">
        <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
          <Zap className="w-5 h-5" />
          API Routes
        </h3>
      </div>
      
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="cursor-pointer hover:bg-gray-50" onClick={() => onSort?.('routePath')}>
                Route <ArrowUpDown className="w-4 h-4 inline ml-1" />
              </TableHead>
              <TableHead className="cursor-pointer hover:bg-gray-50" onClick={() => onSort?.('method')}>
                Method
              </TableHead>
              <TableHead className="cursor-pointer hover:bg-gray-50" onClick={() => onSort?.('requestCount')}>
                Requests <ArrowUpDown className="w-4 h-4 inline ml-1" />
              </TableHead>
              <TableHead className="cursor-pointer hover:bg-gray-50" onClick={() => onSort?.('avgResponseTime')}>
                Avg Time <ArrowUpDown className="w-4 h-4 inline ml-1" />
              </TableHead>
              <TableHead className="cursor-pointer hover:bg-gray-50" onClick={() => onSort?.('p95ResponseTime')}>
                P95 <ArrowUpDown className="w-4 h-4 inline ml-1" />
              </TableHead>
              <TableHead className="cursor-pointer hover:bg-gray-50" onClick={() => onSort?.('p99ResponseTime')}>
                P99 <ArrowUpDown className="w-4 h-4 inline ml-1" />
              </TableHead>
              <TableHead className="cursor-pointer hover:bg-gray-50" onClick={() => onSort?.('errorCount')}>
                Errors <ArrowUpDown className="w-4 h-4 inline ml-1" />
              </TableHead>
              <TableHead className="cursor-pointer hover:bg-gray-50" onClick={() => onSort?.('avgCpuUsage')}>
                CPU <ArrowUpDown className="w-4 h-4 inline ml-1" />
              </TableHead>
              <TableHead className="cursor-pointer hover:bg-gray-50" onClick={() => onSort?.('avgMemoryUsage')}>
                Memory <ArrowUpDown className="w-4 h-4 inline ml-1" />
              </TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {routes.length === 0 ? (
              <TableRow>
                <TableCell colSpan={10} className="text-center text-gray-500 py-8">
                  No data available
                </TableCell>
              </TableRow>
            ) : (
              routes.map((route) => {
                const health = getHealthStatus(route);
                const errorRate = ((route.errorCount / route.requestCount) * 100).toFixed(2);
                
                return (
                  <TableRow
                    key={route.id}
                    className="cursor-pointer hover:bg-gray-50 transition-colors"
                    onClick={() => onRouteClick?.(route)}
                  >
                    <TableCell className="font-mono text-sm">
                      {route.routePath}
                    </TableCell>
                    <TableCell>
                      <Badge variant={route.method === 'GET' ? 'secondary' : 'outline'}>
                        {route.method}
                      </Badge>
                    </TableCell>
                    <TableCell>{route.requestCount.toLocaleString()}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {formatResponseTime(route.avgResponseTime)}
                        {getTrendIcon(route.avgResponseTime, 500)}
                      </div>
                    </TableCell>
                    <TableCell>{formatResponseTime(route.p95ResponseTime)}</TableCell>
                    <TableCell>{formatResponseTime(route.p99ResponseTime)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className={route.errorCount > 0 ? 'text-red-600 font-medium' : ''}>
                          {route.errorCount}
                        </span>
                        <span className="text-gray-400">({errorRate}%)</span>
                      </div>
                    </TableCell>
                    <TableCell>{route.avgCpuUsage.toFixed(1)}%</TableCell>
                    <TableCell>{route.avgMemoryUsage.toFixed(0)}MB</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${health.color}`} />
                        <span className="text-sm capitalize">{health.status}</span>
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
