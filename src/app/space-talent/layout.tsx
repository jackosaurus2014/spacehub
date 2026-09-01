// Metadata for /space-talent lives in page.tsx now that the page is a server
// component (title/description/canonical moved there 2026-08-31). This layout
// is a pure passthrough; the social-card image still comes from the co-located
// opengraph-image.tsx file convention.
export default function SpaceTalentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
