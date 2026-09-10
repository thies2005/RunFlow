/**
 * CommonJS launcher for the plan-fixture exporter.
 *
 * The repo's Web/package.json sets "type": "module", so Node >= 20 executes a
 * plain `ts-node scripts/export-plan-fixtures.ts` through the native ESM
 * loader and the generator's CommonJS transpilation (needed by the ts-node
 * path-alias shim) never kicks in. This launcher forces the CJS pipeline:
 *
 *   node scripts/run-export-plan-fixtures.cjs
 *
 * (equivalent to the seed:templates pattern
 *  `ts-node --transpile-only --compiler-options '{"module":"commonjs"}' …`
 *  plus the scripts/tsconfig.fixtures.json module-type overrides).
 */

process.env.TZ = 'UTC';
process.env.TS_NODE_PROJECT = require('path').join(__dirname, 'tsconfig.fixtures.json');

require('ts-node/register/transpile-only');
require('./export-plan-fixtures');
