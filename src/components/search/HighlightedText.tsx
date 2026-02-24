import sanitizeHtml from 'sanitize-html';

export default function HighlightedText({ html, fallback }: { html: string; fallback?: string }) {
  const clean = sanitizeHtml(html || fallback || '', {
    allowedTags: ['mark'],
    allowedAttributes: {},
  });
  return <span dangerouslySetInnerHTML={{ __html: clean }} />;
}
