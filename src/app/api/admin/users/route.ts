import { NextRequest, NextResponse } from 'next/server';
import { UserRole } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { recordAdminActivity, requireAdminRole } from '@/lib/admin-server';

const ALLOWED_ROLES = Object.values(UserRole);

export async function GET(req: NextRequest) {
  const { error } = await requireAdminRole(['SUPER_ADMIN', 'ADMIN']);
  if (error) return error;

  try {
    const q = (req.nextUrl.searchParams.get('q') || '').trim().toLowerCase();
    const roleFilter = (req.nextUrl.searchParams.get('role') || 'ALL').trim().toUpperCase();

    const users = await prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        fullName: true,
        username: true,
        email: true,
        role: true,
        emailVerified: true,
        lockedUntil: true,
        createdAt: true,
      },
    });

    const filtered = users
      .map((u) => {
        const isLocked = Boolean(u.lockedUntil && u.lockedUntil > new Date());
        return {
          ...u,
          isActive: !isLocked,
        };
      })
      .filter((u) => {
        const matchesRole = roleFilter === 'ALL' || u.role === roleFilter;
        const matchesQuery =
          !q ||
          (u.fullName || '').toLowerCase().includes(q) ||
          (u.username || '').toLowerCase().includes(q) ||
          (u.email || '').toLowerCase().includes(q);
        return matchesRole && matchesQuery;
      });

    return NextResponse.json({ users: filtered });
  } catch (err) {
    console.error('GET /api/admin/users error:', err);
    return NextResponse.json({ error: 'Failed to load users' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  const { user: actor, error } = await requireAdminRole(['SUPER_ADMIN']);
  if (error) return error;

  try {
    let body: Record<string, unknown>;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON request body' }, { status: 400 });
    }

    const targetUserId = String(body?.userId || '').trim();
    const rawRole = body?.role !== undefined ? String(body.role).trim().toUpperCase() : undefined;
    const isActive = typeof body?.isActive === 'boolean' ? body.isActive : undefined;

    if (!targetUserId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 });
    }

    if (rawRole !== undefined && !ALLOWED_ROLES.includes(rawRole as UserRole)) {
      return NextResponse.json({ error: 'Invalid role specified' }, { status: 400 });
    }

    if (rawRole === undefined && isActive === undefined) {
      return NextResponse.json(
        { error: 'Provide at least one field to update (role or isActive)' },
        { status: 400 }
      );
    }

    if (actor?.id && actor.id === targetUserId && isActive === false) {
      return NextResponse.json(
        { error: 'You cannot lock or suspend your own active account' },
        { status: 400 }
      );
    }

    const existing = await prisma.user.findUnique({
      where: { id: targetUserId },
      select: {
        id: true,
        email: true,
        role: true,
        lockedUntil: true,
      },
    });

    if (!existing) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const nextLockedUntil =
      isActive === undefined
        ? existing.lockedUntil
        : isActive
          ? null
          : new Date(Date.now() + 1000 * 60 * 60 * 24 * 365 * 10);

    const updated = await prisma.user.update({
      where: { id: targetUserId },
      data: {
        ...(rawRole !== undefined ? { role: rawRole as UserRole } : {}),
        ...(isActive !== undefined ? { lockedUntil: nextLockedUntil, failedLogins: 0 } : {}),
      },
      select: {
        id: true,
        fullName: true,
        username: true,
        email: true,
        role: true,
        emailVerified: true,
        lockedUntil: true,
        createdAt: true,
      },
    });

    const updatedIsActive = !(updated.lockedUntil && updated.lockedUntil > new Date());

    await recordAdminActivity({
      actorId: actor?.id,
      action: 'USER_RBAC_UPDATE',
      entity: 'USER',
      entityId: updated.id,
      summary: `Updated user ${updated.email} (role: ${updated.role}, active: ${updatedIsActive})`,
      metadata: {
        previous: { role: existing.role, lockedUntil: existing.lockedUntil },
        next: { role: updated.role, lockedUntil: updated.lockedUntil },
      },
    });

    return NextResponse.json({
      user: {
        ...updated,
        isActive: updatedIsActive,
      },
    });
  } catch (err) {
    console.error('PATCH /api/admin/users error:', err);
    return NextResponse.json({ error: 'Failed to update user' }, { status: 500 });
  }
}