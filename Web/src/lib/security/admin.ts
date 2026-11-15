import { auth } from '@/auth'
import { isAdmin as checkAdminEmail } from '@/lib/admin/adminCheck'

export async function isAdmin(user: { email?: string | null }): Promise<boolean> {
  return checkAdminEmail(user.email)
}

export async function requireAdminAuth() {
  const session = await auth()

  if (!session?.user?.email) {
    return { error: 'Unauthorized', status: 401 }
  }

  const adminCheck = await isAdmin({ email: session.user.email })

  if (!adminCheck) {
    return { error: 'Forbidden', status: 403 }
  }

  return { user: session.user }
}
