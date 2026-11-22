import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { recordAdminActivity, requireAdminRole } from '@/lib/admin-server';

const AI_SETTINGS_KEY = 'ai_provider_settings';

const DEFAULT_AI_CONFIG = {
  defaultProvider: 'gemini',
  defaultModel: 'gemini-2.5-flash',
  fallbackProvider: 'openai',
  fallbackModel: 'gpt-4o-mini',
  assistantModel: 'gemini-2.5-flash',
  classificationModel: 'gemini-2.5-flash',
  customBaseUrl: '',
  guestDailyLimit: 5,
  studentHourlyLimit: 30,
};

export async function GET() {
  const { error } = await requireAdminRole(['SUPER_ADMIN', 'ADMIN']);
  if (error) return error;

  try {
    const [settingRow, usageByModel] = await Promise.all([
      prisma.systemSetting.findUnique({ where: { key: AI_SETTINGS_KEY } }),
      prisma.aiUsageLog.groupBy({
        by: ['provider', 'model'],
        _sum: {
          promptTokens: true,
          completionTokens: true,
          estimatedCostUsd: true,
        },
        _count: {
          id: true,
        },
      }),
    ]);

    let parsedStored: Partial<typeof DEFAULT_AI_CONFIG> = {};
    if (settingRow?.value) {
      try {
        parsedStored = JSON.parse(settingRow.value);
      } catch {
        parsedStored = {};
      }
    }

    return NextResponse.json({
      settings: { ...DEFAULT_AI_CONFIG, ...parsedStored },
      usageByModel,
    });
  } catch (err) {
    console.error('GET /api/admin/ai-settings error:', err);
    return NextResponse.json({ error: 'Failed to load AI settings' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  const { user, error } = await requireAdminRole(['SUPER_ADMIN', 'ADMIN']);
  if (error) return error;

  try {
    const body = await req.json();
    const payload = {
      defaultProvider: String(body?.defaultProvider || DEFAULT_AI_CONFIG.defaultProvider),
      defaultModel: String(body?.defaultModel || DEFAULT_AI_CONFIG.defaultModel),
      fallbackProvider: String(body?.fallbackProvider || DEFAULT_AI_CONFIG.fallbackProvider),
      fallbackModel: String(body?.fallbackModel || DEFAULT_AI_CONFIG.fallbackModel),
      assistantModel: String(body?.assistantModel || DEFAULT_AI_CONFIG.assistantModel),
      classificationModel: String(body?.classificationModel || DEFAULT_AI_CONFIG.classificationModel),
      customBaseUrl: String(body?.customBaseUrl || ''),
      guestDailyLimit: Number(body?.guestDailyLimit ?? DEFAULT_AI_CONFIG.guestDailyLimit),
      studentHourlyLimit: Number(body?.studentHourlyLimit ?? DEFAULT_AI_CONFIG.studentHourlyLimit),
    };

    await prisma.systemSetting.upsert({
      where: { key: AI_SETTINGS_KEY },
      update: { value: JSON.stringify(payload) },
      create: { key: AI_SETTINGS_KEY, value: JSON.stringify(payload) },
    });

    await recordAdminActivity({
      actorId: user?.id,
      action: 'AI_SETTINGS_UPDATE',
      entity: 'AI_SETTINGS',
      entityId: AI_SETTINGS_KEY,
      summary: `Updated AI routing: primary ${payload.defaultProvider}/${payload.defaultModel}, fallback ${payload.fallbackProvider}/${payload.fallbackModel}`,
      metadata: payload,
    });

    return NextResponse.json({ settings: payload });
  } catch (err) {
    console.error('PUT /api/admin/ai-settings error:', err);
    return NextResponse.json({ error: 'Failed to save AI settings' }, { status: 500 });
  }
}