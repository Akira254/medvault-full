import { NextRequest, NextResponse } from 'next/server';
import { getValidAdminSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { sanitizeCell } from '@/lib/admin-utils';
import * as XLSX from 'xlsx';
import mammoth from 'mammoth';

export const dynamic = 'force-dynamic';

const MAX_BYTES = 15 * 1024 * 1024; // 15 MB

function parseDocumentBlocks(rawText: string) {
  const blocks = rawText
    .split(/\n(?=\s*(?:Q?\d+[\.\)]\s))/i)
    .map((b) => b.trim())
    .filter((b) => b.length > 10);

  return blocks.map((block, idx) => {
    const lines = block.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    const stemLine = lines[0]?.replace(/^Q?\d+[\.\)]\s*/i, '') || '';
    const options: Record<string, string> = {};
    let answer = '';
    let marks = '';

    for (const line of lines.slice(1)) {
      const optMatch = line.match(/^([A-E])[\.\)]\s*(.+)$/i);
      if (optMatch) {
        options[optMatch[1].toUpperCase()] = sanitizeCell(optMatch[2]);
        continue;
      }
      const ansMatch = line.match(/^(?:Answer|Ans|Key)\s*[:\-]\s*([A-E])/i);
      if (ansMatch) {
        answer = ansMatch[1].toUpperCase();
        continue;
      }
      const markMatch = line.match(/\[(\d+(?:\.\d+)?)\s*marks?\]/i);
      if (markMatch) {
        marks = markMatch[1];
      }
    }

    const hasOptions = Object.keys(options).length >= 2;
    return {
      rowIndex: idx + 1,
      category: hasOptions ? 'MCQ' : 'SAQ',
      stemPlain: sanitizeCell(stemLine),
      optionA: options.A || '',
      optionB: options.B || '',
      optionC: options.C || '',
      optionD: options.D || '',
      optionE: options.E || '',
      correctAnswer: answer,
      marks,
      discipline: '',
      subdiscipline: '',
      topic: '',
      examYear: '',
      explanation: '',
    };
  });
}

export async function POST(req: NextRequest) {
  const session = await getValidAdminSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const formData = await req.formData();
  const file = formData.get('file') as File | null;
  if (!file) {
    return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: 'File exceeds 15MB limit' }, { status: 400 });
  }

  const ext = file.name.split('.').pop()?.toLowerCase() || '';
  const allowed = ['csv', 'xls', 'xlsx', 'docx', 'pdf'];
  if (!allowed.includes(ext)) {
    return NextResponse.json(
      { error: 'Unsupported file type. Allowed: CSV, XLS, XLSX, DOCX, PDF' },
      { status: 400 }
    );
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  // 1. Spreadsheets (multi-sheet support)
  if (ext === 'csv' || ext === 'xls' || ext === 'xlsx') {
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const sheets: Record<
      string,
      { headers: string[]; rows: Record<string, string>[] }
    > = {};

    for (const sheetName of workbook.SheetNames) {
      const sheet = workbook.Sheets[sheetName];
      const jsonRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
        defval: '',
      });
      const sanitizedRows = jsonRows.map((row) => {
        const clean: Record<string, string> = {};
        for (const [k, v] of Object.entries(row)) {
          clean[k] = sanitizeCell(v);
        }
        return clean;
      });
      const headers = sanitizedRows[0] ? Object.keys(sanitizedRows[0]) : [];
      sheets[sheetName] = { headers, rows: sanitizedRows };
    }

    return NextResponse.json({
      mode: 'spreadsheet',
      fileName: file.name,
      fileType: ext,
      sheetNames: workbook.SheetNames,
      sheets,
    });
  }

  // 2. DOCX / PDF documents
  let extractedText = '';
  if (ext === 'docx') {
    const result = await mammoth.extractRawText({ buffer });
    extractedText = result.value;
  } else if (ext === 'pdf') {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const pdfParse = require('pdf-parse');
    const parsed = await pdfParse(buffer);
    extractedText = parsed.text || '';
  }

  const parsedRows = parseDocumentBlocks(extractedText);

  // Flag potential duplicates against existing questions
  const existingStems = await prisma.question.findMany({
    select: { stemPlain: true },
    take: 5000,
  });
  const stemSet = new Set(existingStems.map((q) => q.stemPlain.toLowerCase()));

  const previewRows = parsedRows.map((r) => ({
    ...r,
    isDuplicate: stemSet.has(r.stemPlain.toLowerCase()),
  }));

  return NextResponse.json({
    mode: 'document',
    fileName: file.name,
    fileType: ext,
    rows: previewRows,
  });
}