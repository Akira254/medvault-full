import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getStudentSession } from '@/lib/auth';
import { generateWithFallback } from '@/lib/ai/providers';
import { stripHtml } from '@/lib/sanitize';

const guestDailyRate = new Map<string, { date: string; count: number }>();

export async function POST(req: NextRequest) {
  try {
    const { questionId, messages } = await req.json();
    if (!questionId || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ error: 'Question ID and prompt are required.' }, { status: 400 });
    }

    const student = await getStudentSession();
    const ip = req.headers.get('x-forwarded-for') || 'guest';
    const today = new Date().toISOString().slice(0, 10);

    if (!student) {
      const entry = guestDailyRate.get(ip);
      if (entry && entry.date === today && entry.count >= 5) {
        return NextResponse.json(
          { error: 'Daily guest AI limit reached (5 prompts/day). Please Log In or Register to continue.' },
          { status: 429 }
        );
      }
      guestDailyRate.set(ip, {
        date: today,
        count: entry && entry.date === today ? entry.count + 1 : 1,
      });
    }

    const [question, sysPromptSetting] = await Promise.all([
      prisma.question.findUnique({
        where: { id: questionId },
        include: {
          sections: { orderBy: { orderIndex: 'asc' } },
          options: { orderBy: { orderIndex: 'asc' } },
        },
      }),
      prisma.systemSetting.findUnique({ where: { key: 'ai_system_prompt' } }),
    ]);

    if (!question || question.status !== 'PUBLISHED') {
      return NextResponse.json({ error: 'Published question not found.' }, { status: 404 });
    }

    let questionContext = `CATEGORY: ${question.category}\n`;
    if (question.totalMarks != null) questionContext += `TOTAL MARKS: ${question.totalMarks}\n`;
    questionContext += `QUESTION STEM:\n${stripHtml(question.stemHtml)}\n`;

    if (question.sections.length > 0) {
      questionContext += `SECTIONS:\n`;
      for (const s of question.sections) {
        questionContext += `${s.label} ${stripHtml(s.contentHtml)} [${s.marks ?? 'unallocated'} marks]\n`;
      }
    }

    if (question.category === 'MCQ' && question.options.length > 0) {
      questionContext += `OPTIONS:\n`;
      for (const o of question.options) {
        questionContext += `${o.label}. ${stripHtml(o.contentHtml)}\n`;
      }
      if (question.mcqAnswerStatus === 'ANSWERED' && question.correctOptionId) {
        const keyOpt = question.options.find((o) => o.id === question.correctOptionId);
        if (keyOpt) {
          questionContext += `ADMIN-VERIFIED ANSWER KEY: Option ${keyOpt.label}. Align with this key unless clinically erroneous (if erroneous, politely note the discrepancy).\n`;
        }
      }
    }

    const basePrompt =
      sysPromptSetting?.value ||
      'You are an expert medical educator. Be concise, precise, structured, and never fabricate references.';

    const fullSystemPrompt = `${basePrompt}\n\n--- ACTIVE QUESTION CONTEXT ---\n${questionContext}`;

    const aiRes = await generateWithFallback({
      systemPrompt: fullSystemPrompt,
      messages: messages.slice(-10),
      temperature: 0.1,
      maxTokens: 1200,
      feature: 'student_assistant',
    });

    if (student) {
      const existingConv = await prisma.aiConversation.findFirst({
        where: { userId: student.userId, questionId },
      });
      const updatedMsgs = [
        ...messages,
        {
          role: 'assistant',
          content: aiRes.content,
          provider: aiRes.provider,
          model: aiRes.model,
          createdAt: new Date().toISOString(),
        },
      ];
      if (existingConv) {
        await prisma.aiConversation.update({
          where: { id: existingConv.id },
          data: { messages: updatedMsgs },
        });
      } else {
        await prisma.aiConversation.create({
          data: {
            userId: student.userId,
            questionId,
            messages: updatedMsgs,
          },
        });
      }
    }

    return NextResponse.json({
      reply: aiRes.content,
      provider: aiRes.provider,
      model: aiRes.model,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || 'Unable to generate AI response right now.' },
      { status: 500 }
    );
  }
}
