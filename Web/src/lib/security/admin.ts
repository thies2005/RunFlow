import { auth } from '@/auth'
import { prisma } from '@/lib/db'

async function isAdminFromDatabase(email: string): Promise<boolean> {
  try {
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      select: { isAdmin: true }
    })
    return user?.isAdmin ?? false
  } catch {
    return false
  }
}

function isAdminFromEnv(email: string): boolean {
  const adminEmail = process.env.ADMIN_EMAIL
  const adminEmails = process.env.ADMIN_EMAILS

  if (!adminEmail && !adminEmails) {
    return false
  }

  const emailLower = email.toLowerCase()

  if (adminEmail && emailLower === adminEmail.toLowerCase()) {
    return true
  }

  if (adminEmails) {
    const adminList = adminEmails.split(',').map(e => e.trim().toLowerCase()).filter(Boolean)
    return adminList.includes(emailLower)
  }

  return false
}

export async function isAdmin(user: { email?: string | null }): Promise<boolean> {
  if (!user.email) {
    return false
  }

  const emailLower = user.email.toLowerCase()

  const isAdminEnv = isAdminFromEnv(emailLower)
  const isAdminDb = await isAdminFromDatabase(emailLower)

  return isAdminEnv || isAdminDb
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
