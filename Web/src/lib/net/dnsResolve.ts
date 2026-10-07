/**
 * Thin wrapper around dns.promises.lookup.
 *
 * Exists so callers (and tests) depend on a userland module instead of the
 * Node builtin directly: jest.mock('dns/promises') does not reliably
 * intercept ES-import bindings of core modules, while mocking this wrapper
 * always works.
 */

import { lookup } from 'dns/promises';

/**
 * Resolve a hostname the same way an outgoing fetch will (getaddrinfo,
 * all A/AAAA records) and return the resolved IP address strings.
 * IPv6 literals may arrive with brackets; they are preserved here and
 * normalized by the caller's address classifier.
 */
export async function resolveHostAddresses(hostname: string): Promise<string[]> {
    const host = hostname.replace(/^\[|\]$/g, '');
    const addresses = await lookup(host, { all: true });
    return addresses.map((a) => a.address);
}
