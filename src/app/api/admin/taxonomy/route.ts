import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { recordAdminActivity, requireAdminRole, slugify } from '@/lib/admin-server';

export async function GET(req: NextRequest) {
  const { error } = await requireAdminRole(['SUPER_ADMIN', 'ADMIN', 'EDITOR']);
  if (error) return error;

  try {
    const q = (req.nextUrl.searchParams.get('q') || '').trim().toLowerCase();

    const [disciplines, subdisciplines, topics] = await Promise.all([
      prisma.discipline.findMany({
        orderBy: [{ orderIndex: 'asc' }, { name: 'asc' }],
        include: {
          _count: {
            select: {
              subdisciplines: true,
              topics: true,
              questions: true,
            },
          },
        },
      }),
      prisma.subdiscipline.findMany({
        orderBy: [{ orderIndex: 'asc' }, { name: 'asc' }],
        include: {
          discipline: { select: { id: true, name: true, slug: true } },
          _count: {
            select: {
              topics: true,
              questions: true,
            },
          },
        },
      }),
      prisma.topic.findMany({
        orderBy: [{ orderIndex: 'asc' }, { name: 'asc' }],
        include: {
          discipline: { select: { id: true, name: true, slug: true } },
          subdiscipline: { select: { id: true, name: true, slug: true } },
          _count: {
            select: {
              questions: true,
            },
          },
        },
      }),
    ]);

    const matches = (text?: string | null) => !q || (text || '').toLowerCase().includes(q);

    return NextResponse.json({
      disciplines: disciplines.filter((d) => matches(d.name) || matches(d.slug)),
      subdisciplines: subdisciplines.filter(
        (s) => matches(s.name) || matches(s.discipline?.name)
      ),
      topics: topics.filter(
        (t) =>
          matches(t.name) ||
          matches(t.discipline?.name) ||
          matches(t.subdiscipline?.name)
      ),
    });
  } catch (err) {
    console.error('GET /api/admin/taxonomy error:', err);
    return NextResponse.json({ error: 'Failed to load taxonomy' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const { user, error } = await requireAdminRole(['SUPER_ADMIN', 'ADMIN', 'EDITOR']);
  if (error) return error;

  try {
    const body = await req.json();
    const kind = body?.kind as 'DISCIPLINE' | 'SUBDISCIPLINE' | 'TOPIC';
    const name = String(body?.name || '').trim();
    const description = body?.description ? String(body.description).trim() : null;

    if (!name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    const baseSlug = slugify(body?.slug || name) || 'item';

    if (kind === 'DISCIPLINE') {
      const created = await prisma.discipline.create({
        data: {
          name,
          slug: baseSlug,
          description,
        },
      });
      await recordAdminActivity({
        actorId: user?.id,
        action: 'TAXONOMY_CREATE_DISCIPLINE',
        entity: 'DISCIPLINE',
        entityId: created.id,
        summary: `Created discipline "${created.name}"`,
      });
      return NextResponse.json({ item: created }, { status: 201 });
    }

    if (kind === 'SUBDISCIPLINE') {
      const disciplineId = String(body?.disciplineId || '').trim();
      if (!disciplineId) {
        return NextResponse.json({ error: 'Parent discipline is required' }, { status: 400 });
      }
      const created = await prisma.subdiscipline.create({
        data: {
          name,
          slug: baseSlug,
          description,
          disciplineId,
        },
      });
      await recordAdminActivity({
        actorId: user?.id,
        action: 'TAXONOMY_CREATE_SUBDISCIPLINE',
        entity: 'SUBDISCIPLINE',
        entityId: created.id,
        summary: `Created subdiscipline "${created.name}"`,
        metadata: { disciplineId },
      });
      return NextResponse.json({ item: created }, { status: 201 });
    }

    if (kind === 'TOPIC') {
      const disciplineId = String(body?.disciplineId || '').trim();
      const subdisciplineId = body?.subdisciplineId ? String(body.subdisciplineId).trim() : null;
      if (!disciplineId) {
        return NextResponse.json({ error: 'Discipline is required for a topic' }, { status: 400 });
      }
      const created = await prisma.topic.create({
        data: {
          name,
          slug: baseSlug,
          description,
          disciplineId,
          subdisciplineId,
        },
      });
      await recordAdminActivity({
        actorId: user?.id,
        action: 'TAXONOMY_CREATE_TOPIC',
        entity: 'TOPIC',
        entityId: created.id,
        summary: `Created topic "${created.name}"`,
        metadata: { disciplineId, subdisciplineId },
      });
      return NextResponse.json({ item: created }, { status: 201 });
    }

    return NextResponse.json({ error: 'Invalid taxonomy kind' }, { status: 400 });
  } catch (err) {
    console.error('POST /api/admin/taxonomy error:', err);
    return NextResponse.json({ error: 'Failed to create taxonomy item' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  const { user, error } = await requireAdminRole(['SUPER_ADMIN', 'ADMIN', 'EDITOR']);
  if (error) return error;

  try {
    const body = await req.json();
    const kind = body?.kind as 'DISCIPLINE' | 'SUBDISCIPLINE' | 'TOPIC';
    const id = String(body?.id || '').trim();
    const name = String(body?.name || '').trim();
    const description =
      body?.description !== undefined ? String(body.description || '').trim() || null : undefined;

    if (!id || !name) {
      return NextResponse.json({ error: 'ID and name are required' }, { status: 400 });
    }

    if (kind === 'DISCIPLINE') {
      const updated = await prisma.discipline.update({
        where: { id },
        data: { name, ...(description !== undefined ? { description } : {}) },
      });
      await recordAdminActivity({
        actorId: user?.id,
        action: 'TAXONOMY_UPDATE_DISCIPLINE',
        entity: 'DISCIPLINE',
        entityId: id,
        summary: `Updated discipline "${updated.name}"`,
      });
      return NextResponse.json({ item: updated });
    }

    if (kind === 'SUBDISCIPLINE') {
      const updated = await prisma.subdiscipline.update({
        where: { id },
        data: {
          name,
          ...(body?.disciplineId ? { disciplineId: String(body.disciplineId) } : {}),
          ...(description !== undefined ? { description } : {}),
        },
      });
      await recordAdminActivity({
        actorId: user?.id,
        action: 'TAXONOMY_UPDATE_SUBDISCIPLINE',
        entity: 'SUBDISCIPLINE',
        entityId: id,
        summary: `Updated subdiscipline "${updated.name}"`,
      });
      return NextResponse.json({ item: updated });
    }

    if (kind === 'TOPIC') {
      const updated = await prisma.topic.update({
        where: { id },
        data: {
          name,
          ...(body?.disciplineId ? { disciplineId: String(body.disciplineId) } : {}),
          ...(body?.subdisciplineId !== undefined
            ? { subdisciplineId: body.subdisciplineId || null }
            : {}),
          ...(description !== undefined ? { description } : {}),
        },
      });
      await recordAdminActivity({
        actorId: user?.id,
        action: 'TAXONOMY_UPDATE_TOPIC',
        entity: 'TOPIC',
        entityId: id,
        summary: `Updated topic "${updated.name}"`,
      });
      return NextResponse.json({ item: updated });
    }

    return NextResponse.json({ error: 'Invalid taxonomy kind' }, { status: 400 });
  } catch (err) {
    console.error('PATCH /api/admin/taxonomy error:', err);
    return NextResponse.json({ error: 'Failed to update taxonomy item' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const { user, error } = await requireAdminRole(['SUPER_ADMIN', 'ADMIN']);
  if (error) return error;

  try {
    const kind = req.nextUrl.searchParams.get('kind') as
      | 'DISCIPLINE'
      | 'SUBDISCIPLINE'
      | 'TOPIC'
      | null;
    const id = (req.nextUrl.searchParams.get('id') || '').trim();

    if (!kind || !id) {
      return NextResponse.json({ error: 'kind and id are required' }, { status: 400 });
    }

    if (kind === 'DISCIPLINE') {
      const linkedQuestions = await prisma.question.count({ where: { disciplineId: id } });
      const linkedTopics = await prisma.topic.count({ where: { disciplineId: id } });
      if (linkedQuestions > 0 || linkedTopics > 0) {
        return NextResponse.json(
          {
            error: `Cannot delete discipline with ${linkedQuestions} linked question(s) and ${linkedTopics} topic(s). Reassign or remove them first.`,
          },
          { status: 409 }
        );
      }
      await prisma.subdiscipline.deleteMany({ where: { disciplineId: id } });
      await prisma.discipline.delete({ where: { id } });
      await recordAdminActivity({
        actorId: user?.id,
        action: 'TAXONOMY_DELETE_DISCIPLINE',
        entity: 'DISCIPLINE',
        entityId: id,
        summary: `Deleted discipline (${id})`,
      });
      return NextResponse.json({ deleted: true });
    }

    if (kind === 'SUBDISCIPLINE') {
      const linkedQuestions = await prisma.question.count({ where: { subdisciplineId: id } });
      if (linkedQuestions > 0) {
        return NextResponse.json(
          { error: `Cannot delete subdiscipline with ${linkedQuestions} linked question(s).` },
          { status: 409 }
        );
      }
      await prisma.topic.updateMany({ where: { subdisciplineId: id }, data: { subdisciplineId: null } });
      await prisma.subdiscipline.delete({ where: { id } });
      await recordAdminActivity({
        actorId: user?.id,
        action: 'TAXONOMY_DELETE_SUBDISCIPLINE',
        entity: 'SUBDISCIPLINE',
        entityId: id,
        summary: `Deleted subdiscipline (${id})`,
      });
      return NextResponse.json({ deleted: true });
    }

    if (kind === 'TOPIC') {
      const linkedQuestions = await prisma.question.count({ where: { topicId: id } });
      if (linkedQuestions > 0) {
        return NextResponse.json(
          { error: `Cannot delete topic with ${linkedQuestions} linked question(s). Move questions first.` },
          { status: 409 }
        );
      }
      await prisma.topic.delete({ where: { id } });
      await recordAdminActivity({
        actorId: user?.id,
        action: 'TAXONOMY_DELETE_TOPIC',
        entity: 'TOPIC',
        entityId: id,
        summary: `Deleted topic (${id})`,
      });
      return NextResponse.json({ deleted: true });
    }

    return NextResponse.json({ error: 'Invalid taxonomy kind' }, { status: 400 });
  } catch (err) {
    console.error('DELETE /api/admin/taxonomy error:', err);
    return NextResponse.json({ error: 'Failed to delete taxonomy item' }, { status: 500 });
  }
}