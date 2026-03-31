import { Prisma } from '@/generated/prisma/client'
import { NextResponse } from 'next/server'
import { logger } from '@/lib/logging/logger'
import crypto from 'crypto'

export function isDevelopment(): boolean {
  return process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test'
}

export function getSafeErrorMessage(error: unknown): string {
  if (isDevelopment()) {
    return error instanceof Error ? error.message : 'Unknown error'
  }
  return 'Internal server error'
}

export function handleError(error: unknown): NextResponse {
  const errorId = crypto.randomUUID().substring(0, 8)
  logger.error('Error', { errorId, error: error instanceof Error ? error.message : String(error) })

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: 'Duplicate entry', errorId },
        { status: 409 }
      )
    }
    if (error.code === 'P2025') {
      return NextResponse.json(
        { error: 'Resource not found', errorId },
        { status: 404 }
      )
    }
    // Generic db error
    return NextResponse.json(
      { error: 'Database error', errorId },
      { status: 500 }
    )
  }

  if (error instanceof SyntaxError) {
    return NextResponse.json(
      { error: 'Invalid request format', errorId },
      { status: 400 }
    )
  }

  return NextResponse.json(
    { error: getSafeErrorMessage(error), errorId },
    { status: 500 }
  )
}
