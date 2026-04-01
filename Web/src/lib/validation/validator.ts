import { z } from 'zod'
import { NextResponse } from 'next/server'

export async function validateBody<T>(
  schema: z.ZodSchema<T>,
  request: Request
): Promise<{ success: true; data: T } | { success: false; error: NextResponse }> {
  try {
    const body = await request.json()
    const result = schema.safeParse(body)

    if (!result.success) {
      const errors = result.error.issues.map(err => ({
        path: err.path.join('.'),
        message: err.message,
      }))

      return {
        success: false,
        error: NextResponse.json(
          { error: 'Validation failed', details: errors },
          { status: 400 }
        ),
      }
    }

    return { success: true, data: result.data }
  } catch {
    return {
      success: false,
      error: NextResponse.json(
        { error: 'Invalid JSON' },
        { status: 400 }
      ),
    }
  }
}
