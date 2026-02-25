// parseMentions extracts @username patterns from text
// Returns array of unique usernames (without the @)
export function parseMentions(content: string): string[] {
  const mentions = content.match(/@([a-zA-Z0-9_-]+)/g);
  if (!mentions) return [];
  return Array.from(new Set(mentions.map(m => m.slice(1))));
}

// renderMentionsHtml wraps @mentions in styled spans for display
export function renderMentionsHtml(content: string): string {
  return content.replace(
    /@([a-zA-Z0-9_-]+)/g,
    '<span class="text-cyan-400 font-medium cursor-pointer hover:underline">@$1</span>'
  );
}
