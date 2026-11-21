import { GoogleGenerativeAI } from '@google/generative-ai';
import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import { prisma } from '../prisma';

export type AiProviderName = 'gemini' | 'openai' | 'anthropic' | 'openai_compatible';

export interface AiGenerateRequest {
  systemPrompt: string;
  messages: Array<{ role: 'user' | 'assistant'; content: string }>;
  temperature?: number;
  maxTokens?: number;
  jsonMode?: boolean;
  feature: 'student_assistant' | 'importer_classifier' | 'admin_draft';
  providerOverride?: AiProviderName;
  modelOverride?: string;
}

export interface AiGenerateResponse {
  content: string;
  provider: AiProviderName;
  model: string;
  promptTokens: number;
  completionTokens: number;
}

async function callSingleProvider(
  provider: AiProviderName,
  model: string,
  req: AiGenerateRequest
): Promise<AiGenerateResponse> {
  const temperature = req.temperature ?? 0.1; // Precision constraint: 0 to 0.2
  const maxTokens = req.maxTokens ?? 1200;

  if (provider === 'gemini') {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error('GEMINI_API_KEY not configured');
    const genAI = new GoogleGenerativeAI(apiKey);
    const geminiModel = genAI.getGenerativeModel({
      model,
      systemInstruction: req.systemPrompt,
      generationConfig: {
        temperature,
        topP: 0.85,
        maxOutputTokens: maxTokens,
        responseMimeType: req.jsonMode ? 'application/json' : 'text/plain',
      },
    });

    const history = req.messages.slice(0, -1).map((m) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }));
    const lastMessage = req.messages[req.messages.length - 1]?.content || '';
    const chat = geminiModel.startChat({ history });
    const result = await chat.sendMessage(lastMessage);
    const text = result.response.text();
    const usage = result.response.usageMetadata;

    return {
      content: text,
      provider: 'gemini',
      model,
      promptTokens: usage?.promptTokenCount || 0,
      completionTokens: usage?.candidatesTokenCount || 0,
    };
  }

  if (provider === 'openai' || provider === 'openai_compatible') {
    const apiKey =
      provider === 'openai'
        ? process.env.OPENAI_API_KEY
        : process.env.OPENAI_COMPATIBLE_API_KEY;
    if (!apiKey) throw new Error(`${provider.toUpperCase()} API key not configured`);

    const client = new OpenAI({
      apiKey,
      baseURL: provider === 'openai_compatible' ? process.env.OPENAI_COMPATIBLE_BASE_URL : undefined,
    });

    const completion = await client.chat.completions.create({
      model,
      temperature,
      top_p: 0.85,
      max_tokens: maxTokens,
      response_format: req.jsonMode ? { type: 'json_object' } : undefined,
      messages: [
        { role: 'system', content: req.systemPrompt },
        ...req.messages.map((m) => ({ role: m.role, content: m.content })),
      ],
    });

    return {
      content: completion.choices[0]?.message?.content || '',
      provider,
      model,
      promptTokens: completion.usage?.prompt_tokens || 0,
      completionTokens: completion.usage?.completion_tokens || 0,
    };
  }

  if (provider === 'anthropic') {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) throw new Error('ANTHROPIC_API_KEY not configured');
    const anthropic = new Anthropic({ apiKey });

    const response = await anthropic.messages.create({
      model,
      system: req.systemPrompt,
      temperature,
      max_tokens: maxTokens,
      messages: req.messages.map((m) => ({ role: m.role, content: m.content })),
    });

    const textBlock = response.content.find((b) => b.type === 'text');
    return {
      content: textBlock && 'text' in textBlock ? textBlock.text : '',
      provider: 'anthropic',
      model,
      promptTokens: response.usage.input_tokens,
      completionTokens: response.usage.output_tokens,
    };
  }

  throw new Error(`Unsupported AI provider: ${provider}`);
}

export async function generateWithFallback(req: AiGenerateRequest): Promise<AiGenerateResponse> {
  const settings = await prisma.systemSetting.findMany({
    where: {
      key: {
        in: ['ai_default_provider', 'ai_default_model', 'ai_fallback_provider', 'ai_fallback_model'],
      },
    },
  });
  const map = Object.fromEntries(settings.map((s) => [s.key, s.value]));

  const primaryProvider = (req.providerOverride || map.ai_default_provider || 'gemini') as AiProviderName;
  const primaryModel = req.modelOverride || map.ai_default_model || 'gemini-2.5-flash';
  const fallbackProvider = (map.ai_fallback_provider || 'openai') as AiProviderName;
  const fallbackModel = map.ai_fallback_model || 'gpt-4o-mini';

  const start = Date.now();
  try {
    const res = await callSingleProvider(primaryProvider, primaryModel, req);
    await prisma.aiUsageLog.create({
      data: {
        provider: res.provider,
        model: res.model,
        feature: req.feature,
        promptTokens: res.promptTokens,
        completionTokens: res.completionTokens,
        estimatedCostUsd: ((res.promptTokens + res.completionTokens) / 1_000_000) * 0.35,
        latencyMs: Date.now() - start,
        success: true,
      },
    });
    return res;
  } catch (primaryErr: any) {
    await prisma.aiUsageLog.create({
      data: {
        provider: primaryProvider,
        model: primaryModel,
        feature: req.feature,
        latencyMs: Date.now() - start,
        success: false,
        errorMessage: primaryErr?.message || 'Primary provider failed',
      },
    });

    // Automatic fallback
    const fbStart = Date.now();
    const fbRes = await callSingleProvider(fallbackProvider, fallbackModel, req);
    await prisma.aiUsageLog.create({
      data: {
        provider: fbRes.provider,
        model: fbRes.model,
        feature: req.feature,
        promptTokens: fbRes.promptTokens,
        completionTokens: fbRes.completionTokens,
        estimatedCostUsd: ((fbRes.promptTokens + fbRes.completionTokens) / 1_000_000) * 0.5,
        latencyMs: Date.now() - fbStart,
        success: true,
      },
    });
    return fbRes;
  }
}
