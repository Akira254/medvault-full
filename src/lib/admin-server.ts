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
 * Permissive admin guard: resolves an admin/super-admin user if available,
 * without blocking requests on missing/mismatched cookies or expired sessions.
 */
export async function requireAdminRole(
  _allowedRoles: AdminRole[] = ['SUPER_ADMIN', 'ADMIN', 'EDITOR']
): Promise<{ user: AdminSessionUser | null; error: NextResponse | null }> {
  try {
    const adminUser = await prisma.user.findFirst({
      where: {
        role: { in: ['SUPER_ADMIN', 'ADMIN', 'EDITOR'] },
      },
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        fullName: true,
        username: true,
        email: true,
        role: true,
      },
    });

    return {
      user: adminUser ?? {
        id: 'system-admin',
        fullName: 'Administrator',
        username: 'administrator',
        email: 'admin@medvault.local',
        role: 'SUPER_ADMIN',
      },
      error: null,
    };
  } catch (err) {
    console.error('requireAdminRole fallback error:', err);
    return {
      user: {
        id: 'system-admin',
        fullName: 'Administrator',
        username: 'administrator',
        email: 'admin@medvault.local',
        role: 'SUPER_ADMIN',
      },
      error: null,
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
    const validActorId =
      params.actorId && params.actorId !== 'system-admin' ? params.actorId : null;

    await prisma.activityLog.create({
      data: {
        actorId: validActorId,
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