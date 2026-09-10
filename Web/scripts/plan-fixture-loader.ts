/**
 * Lightweight CommonJS loader shim for the plan-fixture exporter.
 *
 * The plan generator lives under Web/src and imports some of its dependencies
 * through the Next.js `@/*` path alias (e.g. `@/generated/prisma/browser`,
 * `@/lib/constants`). Plain ts-node CommonJS execution does not understand the
 * alias, so this module patches Module._resolveFilename to rewrite `@/x`
 * requests to `<repo>/Web/src/x` before resolution. No Web source is touched.
 *
 * The generated prisma browser module only exports enums for the generator's
 * purposes; if its internal client-runtime import ever breaks under Node, add
 * a mapping here (e.g. '@/generated/prisma/browser' -> a local enum stub)
 * instead of editing the generator.
 */

import path from 'path';
import Module from 'module';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const M = Module as any;
const srcRoot = path.resolve(__dirname, '..', 'src');

if (!M.__runflowPlanFixtureLoader) {
    M.__runflowPlanFixtureLoader = true;
    const originalResolve = M._resolveFilename;
    M._resolveFilename = function (request: string, ...rest: any[]) {
        if (typeof request === 'string' && request.startsWith('@/')) {
            return originalResolve.call(this, path.join(srcRoot, request.slice(2)), ...rest);
        }
        return originalResolve.apply(this, [request, ...rest]);
    };
}
