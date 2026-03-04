import sanitizeHtml from 'sanitize-html';

/**
 * Sanitization config for AI-generated commentary content.
 * Allows basic formatting but strips all script/event handlers.
 */
export const COMMENTARY_HTML_CONFIG: sanitizeHtml.IOptions = {
  allowedTags: ['b', 'i', 'em', 'strong', 'br', 'p', 'ul', 'ol', 'li', 'h2', 'h3', 'h4', 'span', 'div'],
  allowedAttributes: {
    'span': ['class'],
    'div': ['class'],
  },
  allowedSchemes: ['https'],
};

/**
 * Sanitization config for rendered markdown (reports, AI content).
 * Allows formatting, tables, blockquotes, and horizontal rules.
 */
export const RENDERED_MARKDOWN_CONFIG: sanitizeHtml.IOptions = {
  allowedTags: [
    'b', 'i', 'em', 'strong', 'br', 'p', 'hr',
    'h1', 'h2', 'h3', 'h4',
    'ul', 'ol', 'li',
    'blockquote', 'code', 'pre',
    'table', 'thead', 'tbody', 'tr', 'th', 'td',
    'span', 'div',
  ],
  allowedAttributes: {
    'span': ['class'],
    'div': ['class'],
    'h1': ['class'], 'h2': ['class'], 'h3': ['class'], 'h4': ['class'],
    'strong': ['class'],
    'blockquote': ['class'],
    'hr': ['class'],
    'li': ['class'],
    'ul': ['class'],
    'ol': ['class'],
    'th': ['class', 'colspan', 'rowspan'],
    'td': ['class', 'colspan', 'rowspan'],
    'table': ['class'],
    'thead': ['class'],
    'tbody': ['class'],
    'tr': ['class'],
  },
  allowedSchemes: ['https'],
};

/**
 * Sanitize AI-generated commentary content.
 * Converts newlines to <br> and wraps ## headers in <strong>.
 */
export function sanitizeCommentary(content: string): string {
  const html = content
    .replace(/\n/g, '<br/>')
    .replace(/## (.+?)(<br\/>|$)/g, '<strong>$1</strong><br/>');
  return sanitizeHtml(html, COMMENTARY_HTML_CONFIG);
}

/**
 * Sanitize rendered markdown output before injection.
 */
export function sanitizeRenderedMarkdown(html: string): string {
  return sanitizeHtml(html, RENDERED_MARKDOWN_CONFIG);
}
