import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdminRole } from '@/lib/admin-server';

export async function GET(req: NextRequest) {
  const { error } = await requireAdminRole(['SUPER_ADMIN', 'ADMIN']);
  if (error) return error;

  try {
    const q = (req.nextUrl.searchParams.get('q') || '').trim().toLowerCase();
    const entityFilter = (req.nextUrl.searchParams.get('entity') || 'ALL').trim().toUpperCase();

    const rows = await prisma.activityLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: 250,
      include: {
        actor: {
          select: {
            id: true,
            fullName: true,
            username: true,
            email: true,
            role: true,
          },
        },
      },
    });

    const logs = rows
      .map((entry) => {
        const meta =
          entry.metadata && typeof entry.metadata === 'object' && !Array.isArray(entry.metadata)
            ? (entry.metadata as Record<string, unknown>)
            : {};
        const summary =
          typeof meta.summary === 'string' && meta.summary.trim().length > 0
            ? meta.summary
            : `${entry.action} on ${entry.entity}${entry.entityId ? ` (${entry.entityId})` : ''}`;

        return {
          id: entry.id,
          actorId: entry.actorId,
          actorEmail: entry.actor?.email || entry.actor?.fullName || 'System',
          action: entry.action,
          entity: entry.entity,
          entityId: entry.entityId,
          summary,
          metadata: entry.metadata,
          createdAt: entry.createdAt.toISOString(),
        };
      })
      .filter((item) => {
        const matchesEntity = entityFilter === 'ALL' || item.entity.toUpperCase() === entityFilter;
        const matchesQuery =
          !q ||
          item.summary.toLowerCase().includes(q) ||
          item.action.toLowerCase().includes(q) ||
          item.actorEmail.toLowerCase().includes(q);
        return matchesEntity && matchesQuery;
      });

    return NextResponse.json({ logs });
  } catch (err) {
    console.error('GET /api/admin/activity-log error:', err);
    return NextResponse.json({ error: 'Failed to load activity log' }, { status: 500 });
  }
}