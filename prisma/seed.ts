import { PrismaClient, UserRole } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const adminEmail = (process.env.SEED_ADMIN_EMAIL || 'admin@medvault.example.com').toLowerCase();
  const adminUsername = (process.env.SEED_ADMIN_USERNAME || 'superadmin').toLowerCase();
  const adminPassword = process.env.SEED_ADMIN_PASSWORD || 'ChangeMeImmediately123!';

  const passwordHash = await bcrypt.hash(adminPassword, 12);

  await prisma.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      fullName: 'MedVault Super Administrator',
      username: adminUsername,
      email: adminEmail,
      passwordHash,
      role: UserRole.SUPER_ADMIN,
      emailVerified: true,
    },
  });

  const defaultSettings: Record<string, string> = {
    about_content:
      'MedVault is an academic medical revision platform built to help medical and health-sciences students organize, practice, and master examination questions across preclinical and clinical disciplines.',
    hero_bg_path: '/images/hero-bg.jpg',
    ai_default_provider: process.env.DEFAULT_AI_PROVIDER || 'gemini',
    ai_default_model: process.env.DEFAULT_AI_MODEL || 'gemini-2.5-flash',
    ai_fallback_provider: process.env.FALLBACK_AI_PROVIDER || 'openai',
    ai_fallback_model: process.env.FALLBACK_AI_MODEL || 'gpt-4o-mini',
    ai_system_prompt_version: '1.0.0',
    ai_system_prompt: `You are an expert medical educator assisting a health-sciences student on MedVault.
STRICT RULES:
1. Answer ONLY what is asked using the provided question text, sections, category, and marks.
2. Never include motivational filler, greetings, or conversational padding.
3. Size depth to the allocated marks (~1 distinct, clinically accurate point per mark for SAQs). Answer nested sections (a), (b), (c) separately and in order.
4. Formatting:
   - SAQ: Concise headed bullet points matching the sections.
   - MCQ: State the single best option first, explain why it is clinically/mechanistically correct, then explicitly explain why every other option is incorrect. If the stem is ambiguous or flawed, state so plainly.
   - Essay: Structured headings (Introduction, Core Pathophysiology/Discussion, Conclusion).
5. Honesty: Separate established consensus facts from guideline-dependent values. Never fabricate references, trials, guidelines, statistics, or URLs.`,
  };

  for (const [key, value] of Object.entries(defaultSettings)) {
    await prisma.systemSetting.upsert({
      where: { key },
      update: {},
      create: { key, value },
    });
  }

  console.log('Seed completed: First Super Admin & minimal system settings initialized. Zero questions preloaded.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
