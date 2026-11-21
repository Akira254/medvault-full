import sanitizeHtml from 'sanitize-html';

export function cleanRichHtml(dirty: string): string {
  return sanitizeHtml(dirty, {
    allowedTags: [
      'p', 'br', 'b', 'i', 'em', 'strong', 'u', 'sub', 'sup',
      'ul', 'ol', 'li', 'table', 'thead', 'tbody', 'tr', 'th', 'td',
      'img', 'span', 'div', 'h3', 'h4', 'blockquote', 'code', 'pre'
    ],
    allowedAttributes: {
      img: ['src', 'alt', 'width', 'height'],
      td: ['colspan', 'rowspan'],
      th: ['colspan', 'rowspan'],
      span: ['class'],
      div: ['class'],
    },
    allowedSchemes: ['http', 'https', 'data'],
  });
}

export function stripHtml(html: string): string {
  return sanitizeHtml(html, { allowedTags: [], allowedAttributes: {} }).replace(/\s+/g, ' ').trim();
}

/**
 * Prevents CSV/Excel formula injection (=, +, -, @, tab, CR)
 */
export function neutralizeFormulaInjection(value: unknown): string {
  if (value === null || value === undefined) return '';
  const str = String(value).trim();
  if (/^[=+\-@\t\r]/.test(str)) {
    return `'${str}`;
  }
  return str;
}
