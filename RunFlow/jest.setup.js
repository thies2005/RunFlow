import '@testing-library/jest-dom'
import { TextEncoder, TextDecoder } from 'util'

Object.assign(global, { TextDecoder, TextEncoder })

// Polyfill Request/Response for JSDOM
// Only if not already defined
if (typeof global.Request === 'undefined') {
    // Attempt to grab from the node global scope (if Node 18+)
    // In Jest, 'global' is the JSDOM global, but we can access process.
    // However, Node's Request/Response might not be exposed to the VM context easily without this:
    try {
        const { Request, Response, Headers } = require('next/dist/compiled/@edge-runtime/primitives/fetch')
        Object.assign(global, { Request, Response, Headers })
    } catch {
        // Fallback or ignore
    }
}
