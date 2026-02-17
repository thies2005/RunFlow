import { NextRequest } from 'next/server'

const ALLOWED_ORIGINS = process.env.EXTERNAL_API_ALLOWED_ORIGINS
  ? process.env.EXTERNAL_API_ALLOWED_ORIGINS.split(',')
  : []

export function validateOrigin(request: NextRequest): boolean {
  const origin = request.headers.get('origin')

  if (!origin) {
    return true
  }

  return ALLOWED_ORIGINS.includes(origin)
}

export function setCorsHeaders(request: NextRequest, headers: Headers): void {
  const origin = request.headers.get('origin')

  if (origin && ALLOWED_ORIGINS.includes(origin)) {
    headers.set('Access-Control-Allow-Origin', origin)
    headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
    headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization')
    headers.set('Access-Control-Max-Age', '86400')
  }
}
