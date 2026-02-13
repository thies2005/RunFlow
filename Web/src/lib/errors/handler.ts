import { Prisma } from '@prisma/client'
import { NextResponse } from 'next/server'
import { logger } from '@/lib/logging/logger'

export function handleError(error: unknown): NextResponse {
  logger.error('Error', { error: error instanceof Error ? error.message : String(error) })

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: 'Duplicate entry' },
        { status: 409 }
      )
    }
    if (error.code === 'P2025') {
      return NextResponse.json(
        { error: 'Resource not found' },
        { status: 404 }
      )
    }
    return NextResponse.json(
      { error: 'Database error' },
      { status: 500 }
    )
  }

  if (error instanceof SyntaxError) {
    return NextResponse.json(
      { error: 'Invalid request format' },
      { status: 400 }
    )
  }

  return NextResponse.json(
    { error: getSafeErrorMessage(error) },
    { status: 500 }
  )
}

export function isDevelopment(): boolean {
  return process.env.NODE_ENV === 'development'
}

export function getSafeErrorMessage(error: unknown): string {
  if (isDevelopment()) {
    return error instanceof Error ? error.message : 'Unknown error'
  }
  return 'Internal server error'
}
