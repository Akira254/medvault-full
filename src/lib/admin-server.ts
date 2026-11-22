import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export type AdminRole = 'SUPER_ADMIN' | 'ADMIN' | 'EDITOR';

export interface AdminSessionUser {
  id: string;
  fullName: string;
  username: string;
  email: string;
  role: string;
}

/**
 * Verifies the admin session token stored in cookies against AdminSession.
 * Adjust the cookie name ('medvault_admin_session' / 'session') if your login sets a different cookie name.
 */
export async function requireAdminRole(
  allowedRoles: AdminRole[] = ['SUPER_ADMIN', 'ADMIN', 'EDITOR']
): Promise<{ user: AdminSessionUser | null; error: NextResponse | null }> {
  try {
    const cookieStore = cookies();
    const token =
      cookieStore.get('medvault_admin_session')?.value ||
      cookieStore.get('medvault_session')?.value ||
      cookieStore.get('session')?.value;

    if (!token) {
      return {
        user: null,
        error: NextResponse.json({ error: 'Authentication required' }, { status: 401 }),
      };
    }

    // Matches either raw token or hashed token if you hash before storing in AdminSession.tokenHash
    const session = await prisma.adminSession.findFirst({
      where: {
        tokenHash: token,
        expiresAt: { gt: new Date() },
      },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            username: true,
            email: true,
            role: true,
            lockedUntil: true,
          },
        },
      },
    });

    if (!session || !session.user) {
      return {
        user: null,
        error: NextResponse.json({ error: 'Invalid or expired admin session' }, { status: 401 }),
      };
    }

    if (session.user.lockedUntil && session.user.lockedUntil > new Date()) {
      return {
        user: null,
        error: NextResponse.json({ error: 'Account is temporarily locked' }, { status: 403 }),
      };
    }

    if (!allowedRoles.includes(session.user.role as AdminRole)) {
      return {
        user: null,
        error: NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 }),
      };
    }

    await prisma.adminSession.update({
      where: { id: session.id },
      data: { lastActiveAt: new Date() },
    });

    return {
      user: {
        id: session.user.id,
        fullName: session.user.fullName,
        username: session.user.username,
        email: session.user.email,
        role: session.user.role,
      },
      error: null,
    };
  } catch (err) {
    console.error('requireAdminRole error:', err);
    return {
      user: null,
      error: NextResponse.json({ error: 'Failed to verify admin session' }, { status: 500 }),
    };
  }
}

export async function recordAdminActivity(params: {
  actorId?: string | null;
  action: string;
  entity: string;
  entityId?: string | null;
  summary: string;
  metadata?: Record<string, unknown>;
  ipAddress?: string | null;
}) {
  try {
    await prisma.activityLog.create({
      data: {
        actorId: params.actorId ?? null,
        action: params.action,
        entity: params.entity,
        entityId: params.entityId ?? null,
        ipAddress: params.ipAddress ?? null,
        metadata: {
          summary: params.summary,
          ...(params.metadata ?? {}),
        },
      },
    });
  } catch (err) {
    console.error('Activity log write failed:', err);
  }
}

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}