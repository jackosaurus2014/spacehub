// ─── Enhanced Weekly Intelligence Brief HTML Template ────────────────────────
// Dark theme, branded, with multiple sections and forward-to-colleague link.

export function renderEnhancedBrief(data: {
  weekDate: string;
  launches: { name: string; status: string; date: string }[];
  topFunding: { company: string; amount: string; round: string } | null;
  healthMover: { company: string; score: number; change: string } | null;
  topArticle: { title: string; url: string } | null;
  toolSpotlight: { name: string; description: string; url: string };
}): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>SpaceNexus Weekly Intelligence Brief — ${data.weekDate}</title>
  <style>
    body { margin: 0; padding: 0; background-color: #0a0a0f; color: #e2e8f0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { text-align: center; padding: 30px 0; border-bottom: 1px solid rgba(255,255,255,0.06); }
    .header h1 { color: #ffffff; font-size: 24px; margin: 0 0 5px 0; }
    .header p { color: #94a3b8; font-size: 14px; margin: 0; }
    .section { padding: 20px 0; border-bottom: 1px solid rgba(255,255,255,0.06); }
    .section-title { color: #06b6d4; font-size: 12px; text-transform: uppercase; letter-spacing: 1px; font-weight: 700; margin: 0 0 12px 0; }
    .item { padding: 8px 12px; background: rgba(255,255,255,0.02); border-radius: 8px; margin: 6px 0; }
    .item-title { color: #ffffff; font-size: 14px; font-weight: 600; }
    .item-detail { color: #94a3b8; font-size: 12px; }
    .highlight { padding: 16px; background: linear-gradient(135deg, rgba(6,182,212,0.05), rgba(139,92,246,0.05)); border: 1px solid rgba(6,182,212,0.15); border-radius: 12px; margin: 12px 0; }
    .btn { display: inline-block; padding: 10px 20px; background: linear-gradient(135deg, #06b6d4, #8b5cf6); color: #ffffff; text-decoration: none; border-radius: 8px; font-size: 13px; font-weight: 600; }
    .footer { text-align: center; padding: 20px 0; color: #64748b; font-size: 11px; }
    .footer a { color: #06b6d4; text-decoration: none; }
    .stat { display: inline-block; padding: 4px 10px; background: rgba(6,182,212,0.1); border: 1px solid rgba(6,182,212,0.2); border-radius: 6px; color: #06b6d4; font-size: 12px; font-weight: 600; }
  </style>
</head>
<body>
  <div class="container">
    <!-- Header -->
    <div class="header">
      <h1>🛰️ Space Intelligence Brief</h1>
      <p>Week of ${data.weekDate} — SpaceNexus</p>
    </div>

    <!-- This Week's Launches -->
    <div class="section">
      <p class="section-title">🚀 This Week's Launches</p>
      ${data.launches.length > 0 ? data.launches.map(l => `
        <div class="item">
          <div class="item-title">${l.name}</div>
          <div class="item-detail">${l.date} · Status: ${l.status}</div>
        </div>
      `).join('') : '<p style="color: #64748b; font-size: 13px;">No launches this week.</p>'}
    </div>

    <!-- Top Funding Round -->
    ${data.topFunding ? `
    <div class="section">
      <p class="section-title">💰 Top Funding Round</p>
      <div class="highlight">
        <div class="item-title">${data.topFunding.company}</div>
        <div style="margin-top: 4px;">
          <span class="stat">${data.topFunding.amount}</span>
          <span style="color: #94a3b8; font-size: 12px; margin-left: 8px;">${data.topFunding.round}</span>
        </div>
      </div>
    </div>
    ` : ''}

    <!-- Health Index Mover -->
    ${data.healthMover ? `
    <div class="section">
      <p class="section-title">📊 Health Index Mover</p>
      <div class="item">
        <div class="item-title">${data.healthMover.company}</div>
        <div class="item-detail">Score: ${data.healthMover.score}/100 · ${data.healthMover.change}</div>
      </div>
    </div>
    ` : ''}

    <!-- Featured Article -->
    ${data.topArticle ? `
    <div class="section">
      <p class="section-title">📝 Featured Article</p>
      <div class="item">
        <a href="https://spacenexus.us${data.topArticle.url}?utm_source=newsletter&utm_medium=brief" style="color: #ffffff; text-decoration: none; font-size: 14px; font-weight: 600;">${data.topArticle.title} →</a>
      </div>
    </div>
    ` : ''}

    <!-- Tool Spotlight -->
    <div class="section">
      <p class="section-title">🔧 Tool of the Week</p>
      <div class="highlight">
        <div class="item-title">${data.toolSpotlight.name}</div>
        <div class="item-detail" style="margin: 6px 0;">${data.toolSpotlight.description}</div>
        <a href="https://spacenexus.us${data.toolSpotlight.url}?utm_source=newsletter&utm_medium=brief" class="btn">Try it free →</a>
      </div>
    </div>

    <!-- CTA -->
    <div style="text-align: center; padding: 24px 0;">
      <a href="https://spacenexus.us/dashboard?utm_source=newsletter&utm_medium=brief" class="btn">Open SpaceNexus Dashboard</a>
    </div>

    <!-- Footer -->
    <div class="footer">
      <p>
        <a href="https://spacenexus.us?utm_source=newsletter">SpaceNexus</a> · Space Industry Intelligence Platform<br>
        <a href="https://spacenexus.us/newsletter?action=unsubscribe">Unsubscribe</a> ·
        <a href="https://spacenexus.us/report/monthly">Monthly Report</a> ·
        Forward this to a colleague who works in space
      </p>
      <p style="margin-top: 8px;">Houston, TX · © 2026 SpaceNexus LLC</p>
    </div>
  </div>
</body>
</html>`;
}
